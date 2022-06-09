import _ from 'lodash';
import { createConversation } from '@grammyjs/conversations';
import { Menu } from '@grammyjs/menu';
import assert from 'assert';
import { Composer, InlineKeyboard } from 'grammy';
import { DateTime } from 'luxon';
import { Op, where, fn, col } from 'sequelize';
import { html } from 'telegram-format';
import { isWebUri } from 'valid-url';
import {
  language,
  SettingsManager,
  StudyGroup,
  User,
  Word,
  WordsCollection,
} from '../../../database';
import { noop } from '../../../helpers';
import { BotContext } from '../../BotContext';
import { BotConversation } from '../../BotConversation';
import { Collections } from './handlers';
import { appendUrl, ctxt } from './helpers';
import logger from '../../../logger';

const tgpostUrl = (id: number) => `https://t.me/lingua_materials/${id}`;

export class UserModule {
  public static getMaxBtnsPerLine = (totalCnt: number) =>
    totalCnt <= 5 ? 1 : totalCnt <= 14 ? 2 : 3;

  static getComposer(settingsManager: SettingsManager) {
    const composer = new Composer<BotContext>();
    const composerOuter = new Composer<BotContext>();
    composerOuter.filter(
      (ctx: BotContext) => ctx.chat?.type === 'private',
      composer,
    );

    // db user creatinon and putting to ctx.dbUser
    composer.use(async (ctx, next) => {
      const tgid = ctx.from?.id;
      if (!tgid || !Number.isFinite(tgid)) return await next();

      const user = await User.findOne({ where: { tgid } });
      if (user) {
        ctx.dbUser = user;
      } else {
        const name = `${ctx.from.first_name} ${
          ctx.from.last_name || ''
        }`.trim();
        const user_ = await User.create({
          tgid,
          lang: language.ru,
          name,
        });
        ctx.dbUser = user_;
      }

      await ctx.fluent.renegotiateLocale();

      return await next();
    });

    composer.use(
      createConversation(
        UserModule.getGetNameConversation(),
        UserModule.getNameConversationId,
      ),
    );
    composer.use(
      createConversation(
        Collections.getCreateCollectionConversation(),
        Collections.createCollectionConversationId,
      ),
    );
    composer.use(
      createConversation(
        Collections.getEditCollectionConversation(),
        Collections.editCollectionConversationId,
      ),
    );
    composer.use(
      createConversation(
        UserModule.getAddWordConversation(),
        UserModule.addWordConversationId,
      ),
    );
    composer.use(
      createConversation(
        UserModule.getSearchWordConversation(),
        UserModule.searchWordConversationId,
      ),
    );

    const readyCollectionsMenu = Collections.getReadyCollectionsMenu();
    const wordsCollectionsMenu =
      Collections.getWordsCollectionsMenu(readyCollectionsMenu);
    const wordsTrainerMenu =
      UserModule.getWordsTrainerMenu(wordsCollectionsMenu);
    const mainMenu = UserModule.getMainMenu(settingsManager, wordsTrainerMenu);
    composer.use(mainMenu);

    Collections.applyCollectionsManualHandlers(
      composer,
      wordsCollectionsMenu,
      readyCollectionsMenu,
    );

    /** to words trainer menu */
    composer.callbackQuery(/goto:twtm/, async (ctx) => {
      await ctx.editMessageText(ctx.t('msg.words-trainer'), {
        reply_markup: wordsTrainerMenu,
      });
    });

    composer.hears(/\/start (.+)_(\d+)/, async (ctx, next) => {
      const cmd = ctx.match[1];
      const arg1 = +ctx.match[2];

      /** study group */
      if (cmd === 'sg') {
        const grId = arg1;
        const gr = await StudyGroup.findByPk(grId);
        if (!gr) return await ctx.reply(ctx.t('err.group-not-found'));
        await ctx.dbUser.update({ studyGroupId: grId });
        await ctx.reply(
          ctx.t('msg.joined-study-group', { name: html.escape(gr.name) }),
        );
      } else if (cmd === 'wc') {
        const collectionId = arg1;
        const collection = await WordsCollection.findByPk(collectionId, {
          include: [Word],
        });
        if (!collection)
          return await ctx.reply(ctx.t('err.collection-not-found'));
        if (!(collection.words && collection.words.length > 0))
          return await ctx.reply(ctx.t('err.no-words-in-collection'));

        assert(WordsCollection.sequelize);
        let createdCollectionId = NaN;
        await WordsCollection.sequelize.transaction(async (transaction) => {
          const newCollection = await WordsCollection.create(
            { name: collection.name, userId: ctx.dbUser.id },
            { transaction },
          );
          createdCollectionId = newCollection.id;
          if (!(collection.words && collection.words.length > 0)) return;
          await Word.bulkCreate(
            collection.words.map(({ word, hint, photo }) => ({
              wordsCollectionId: createdCollectionId,
              word,
              hint,
              photo,
            })),
            { transaction },
          );
        });
        await ctx.reply(
          ctx.t('msg.shared-collection-added', {
            name: html.escape(collection.name),
          }),
          {
            reply_markup: new InlineKeyboard()
              .text(ctx.t('btn.to-collection'), `goto:c${createdCollectionId}`)
              .text(ctx.t('btn.to-main-menu'), `goto:main-menu`),
          },
        );
        return;
      }

      await next();
    });

    /** add word */
    composer.callbackQuery(/goto:aw(\d+)/, async (ctx) => {
      await ctx.conversation.enter(UserModule.addWordConversationId, {
        overwrite: true,
      });
    });

    /** back to words trainer */
    composer.callbackQuery(/goto:baw/, async (ctx) => {
      await ctx.editMessageText(ctx.t('msg.words-trainer'), {
        reply_markup: wordsTrainerMenu,
      });
    });

    const reviseWordHandler = UserModule.getReviseWordHandler();
    /** revise word */
    composer.callbackQuery(
      UserModule.reviseWordHandlerRegexp,
      reviseWordHandler,
    );

    /** revise word remember controller */
    composer.callbackQuery(/goto:rwrc(\d+)_(\d)/, async (ctx) => {
      const wordId = +(ctx.match || [])[1];
      const remembers = !!+(ctx.match || [])[2];

      const word = await Word.findByPk(wordId);
      if (!word)
        return await ctx.answerCallbackQuery(ctx.t('err.no-word-found'));

      if (remembers) await word.increment({ repeatedCount: 1 });

      ctx.match = []; // so that reviseWordHandler don't know about answered word
      ctx
        .answerCallbackQuery(
          remembers
            ? ctx.t('common.remember-symbol')
            : ctx.t('common.dont-remember-symbol'),
        )
        .catch(noop);
      await reviseWordHandler(ctx);
    });

    composer.callbackQuery(/goto:main-menu/, async (ctx) =>
      ctx.editMessageText(ctx.t('msg.main-menu'), { reply_markup: mainMenu }),
    );
    composer.on('message', (ctx) =>
      ctx.reply(ctx.t('msg.main-menu'), { reply_markup: mainMenu }),
    );

    composer.on('callback_query', async (ctx) => {
      logger.warn(`Unhandled callback_query update`, {
        data: ctx.callbackQuery.data,
      });
      await ctx.answerCallbackQuery('🤷‍♂️');
    });

    return composerOuter;
  }

  static reviseWordHandlerRegexp = /goto:rw(\d+)_(\d)_(\d)/;
  static getReviseWordHandler() {
    return async function reviseWordHandler(ctx: BotContext) {
      const wordId = +(ctx.match || [])[1];
      const showHint = !!+(ctx.match || [])[2];
      const showPhoto = !!+(ctx.match || [])[3];

      const toNumBool = (n: unknown) => (n ? 1 : 0);

      let word: Word | null | undefined = null;
      if (wordId) {
        word = await Word.findByPk(wordId);
      } else {
        const [words] = await Promise.all([
          Promise.resolve().then(async () =>
            Word.findAll({
              where: {
                repeating: true,
                wordsCollectionId: (
                  await WordsCollection.findAll({
                    attributes: ['id'],
                    where: { userId: ctx.dbUser.id },
                  })
                ).map((e) => e.id),
              },
              order: [
                ['repeatedCount', 'ASC'],
                ['created', 'DESC'],
              ],
              limit: 15,
            }),
          ),
        ]);

        const randWord = _.sample(
          ctx.session.lastShowedWordId
            ? words.filter((e) => e.id !== ctx.session.lastShowedWordId)
            : words,
        );
        word = randWord || words[0];
      }
      if (!word)
        return await ctx.answerCallbackQuery(ctx.t('err.no-word-found'));
      ctx.session.lastShowedWordId = word.id;

      /** revise word remember controller */
      const kb = new InlineKeyboard()
        .text(ctx.t('btn.dont-remember'), `goto:rwrc${word.id}_0}`)
        .text(ctx.t('btn.remember'), `goto:rwrc${word.id}_1}`)
        .row();

      if (!showHint)
        kb.text(
          ctx.t('btn.show-hint'),
          `goto:rw${word.id}_1_${toNumBool(showPhoto)}`,
        );
      if (!showPhoto && word.photo)
        kb.text(
          ctx.t('btn.show-photo'),
          `goto:rw${word.id}_${toNumBool(showHint)}_1`,
        );

      kb.row().text(ctx.t('btn.finish'), `goto:twtm`);

      const t = showHint
        ? ctx.t('msg.revise-word-with-hint', {
            word: html.escape(word.word),
            hint: html.escape(word.hint),
          })
        : ctx.t('msg.revise-word', { word: html.escape(word.word) });
      const tt = showPhoto ? appendUrl(t, word.photo) : t;

      await ctx.editMessageText(tt, { reply_markup: kb });
    };
  }

  private static mainMenuId = 'm.main';
  private static getMainMenu(
    settingsManager: SettingsManager,
    wordsTrainerMenu: Menu<BotContext>,
  ) {
    const menu = new Menu<BotContext>(UserModule.mainMenuId, {
      autoAnswer: false,
    })
      .submenu(
        ctxt('btn.words-trainer'),
        UserModule.wordsTrainerMenuId,
        (ctx) => ctx.editMessageText(ctx.t('msg.words-trainer')),
      )
      .text(ctxt('btn.homework'), async (ctx) => {
        const studyGroup = await ctx.dbUser.$get('studyGroup');
        if (!studyGroup)
          return await await ctx.answerCallbackQuery({
            text: ctx.t('msg.no-study-group'),
            show_alert: true,
          });

        const homeWorkEntries = await studyGroup.$get('homeWorkEntries');
        if (homeWorkEntries.length <= 0)
          return await await ctx.answerCallbackQuery(ctx.t('msg.no-homework'));

        ctx
          .editMessageText(ctx.t('msg.homework'), { reply_markup: undefined })
          .catch(noop);

        assert(ctx.chat);
        for (const el of homeWorkEntries)
          await ctx.api.forwardMessage(ctx.chat.id, el.chatId, el.messageId);

        const datetime = DateTime.fromJSDate(studyGroup.lastTimeSetHomeWork)
          .setZone(settingsManager.get().displayTimeZone)
          .setLocale(ctx.dbUser.getLangCode())
          .toFormat('d MMMM, HH:mm');
        await ctx.reply(ctx.t('msg.homework-last-update', { datetime }), {
          reply_markup: menu.at(UserModule.fromHomeWorkBackToMainMenuMenuId),
        });
      })
      .row()
      .submenu(
        ctxt('btn.edu-materials'),
        UserModule.eduMaterialsMenuId,
        (ctx) => ctx.editMessageText(ctx.t('msg.edu-materials')),
      )
      .row()
      .submenu(ctxt('btn.settings'), UserModule.settingsMenuId, (ctx) =>
        ctx.editMessageText(
          ctx.t('msg.settings', { name: html.escape(ctx.dbUser.name) }),
        ),
      );

    menu.register(wordsTrainerMenu);
    menu.register(UserModule.getFromHomeWorkBackToMainMenuMenu(menu));
    menu.register(UserModule.getEduMaterialsMenu());
    menu.register(UserModule.getSettingsMenu());

    return menu;
  }

  private static fromHomeWorkBackToMainMenuMenuId = 'm.f-hw-to-main';
  private static getFromHomeWorkBackToMainMenuMenu(mainMenu: Menu<BotContext>) {
    const menu = new Menu<BotContext>(
      UserModule.fromHomeWorkBackToMainMenuMenuId,
      {
        autoAnswer: false,
      },
    ).text(ctxt('btn.to-main-menu'), async (ctx) => {
      ctx.menu.close();
      await ctx.reply(ctx.t('msg.main-menu'), { reply_markup: mainMenu });
    });

    return menu;
  }

  private static settingsMenuId = 'm.settings';
  private static getSettingsMenu() {
    const menu = new Menu<BotContext>(UserModule.settingsMenuId, {
      autoAnswer: false,
    })
      .text(ctxt('btn.change-lang'), async (ctx) => {
        ctx.dbUser.lang =
          ctx.dbUser.lang === language.ru ? language.en : language.ru;
        await ctx.dbUser.save();

        await ctx.fluent.renegotiateLocale();

        await ctx.editMessageText(
          ctx.t('msg.settings', { name: html.escape(ctx.dbUser.name) }),
        );
      })
      .row()
      .text(ctxt('btn.edit-name'), (ctx) =>
        ctx.conversation.enter(UserModule.getNameConversationId, {
          overwrite: true,
        }),
      )
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('msg.main-menu')),
      );

    return menu;
  }

  private static getNameConversationId = 'get-name';
  /** !!! All Side-effects Must Be Wrapped !!! */
  private static getGetNameConversation() {
    return async (conversation: BotConversation, ctx: BotContext) => {
      const oldMarkup = ctx.callbackQuery?.message?.reply_markup;

      await ctx.editMessageText(ctx.t('msg.send-new-name'), {
        reply_markup: undefined,
      });

      let newName = '';
      do {
        const response = await conversation.waitFor('message:text');
        const text = response.message.text;
        if (!(text && text.length <= 255)) {
          await ctx.reply(ctx.t('err.invalid-name'));
          continue;
        }

        newName = text;
      } while (!newName);

      ctx.dbUser.name = newName;
      await conversation.external({ task: () => ctx.dbUser.save() });

      await ctx.reply(
        ctx.t('msg.settings', { name: html.escape(ctx.dbUser.name) }),
        { reply_markup: oldMarkup },
      );
    };
  }

  private static eduMaterialsMenuId = 'm.edu-materials';
  private static getEduMaterialsMenu() {
    const menu = new Menu<BotContext>(UserModule.eduMaterialsMenuId, {
      autoAnswer: false,
    })
      .submenu(ctxt('btn.textbooks'), UserModule.eduMatTextBooksMenuId)
      .row()
      .submenu(ctxt('btn.cheat-sheets'), UserModule.eduMatCheatSheetsMenuId)
      .row()
      .url(ctxt('btn.dictionaries'), tgpostUrl(74))
      .row()
      .submenu(ctxt('btn.phrasebooks'), UserModule.eduMatPhrasebooksMenuId)
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('msg.main-menu')),
      );

    menu.register(UserModule.getEduMatTextBooksMenu());
    menu.register(UserModule.getEduMatCheatSheetsMenu());
    menu.register(UserModule.getPhrasebooksMenu());
    return menu;
  }

  private static eduMatTextBooksMenuId = 'm.edu-mat--text-books';
  private static getEduMatTextBooksMenu() {
    const menu = new Menu<BotContext>(UserModule.eduMatTextBooksMenuId, {
      autoAnswer: false,
    })
      // these may be not hardcoded (e.g. pulled from a database)
      .text(`English File:`, (ctx) =>
        ctx.answerCallbackQuery(ctx.t('err.select-from-btns-below')),
      )
      .text(`New English File:`, (ctx) =>
        ctx.answerCallbackQuery(ctx.t('err.select-from-btns-below')),
      )
      .row()
      .url(`Beginner`, tgpostUrl(25))
      .url(`Beginner`, tgpostUrl(49))
      .row()
      .url(`Elementary`, tgpostUrl(32))
      .url(`Elementary`, tgpostUrl(52))
      .row()
      .url(`Pre-Intermediate`, tgpostUrl(36))
      .url(`Pre-Intermediate`, tgpostUrl(55))
      .row()
      .url(`Intermediate`, tgpostUrl(39))
      .url(`Intermediate`, tgpostUrl(59))
      .row()
      .url(`Upper-Intermediate`, tgpostUrl(42))
      .url(`Upper-Intermediate`, tgpostUrl(62))
      .row()
      .url(`Advanced`, tgpostUrl(45))
      .url(`Advanced`, tgpostUrl(65))
      .row()
      .back(ctxt('btn.back'));

    return menu;
  }

  private static eduMatCheatSheetsMenuId = 'm.edu-mat--cheat-sheets';
  private static getEduMatCheatSheetsMenu() {
    const menu = new Menu<BotContext>(UserModule.eduMatCheatSheetsMenuId, {
      autoAnswer: false,
    })
      // these may be not hardcoded (e.g. pulled from a database)
      .url(ctxt('btn.irr-verbs'), tgpostUrl(76))
      .url(ctxt('btn.irr-nouns'), tgpostUrl(77))
      .row()
      .url(ctxt('btn.prepositions-of-place'), tgpostUrl(79))
      .url(ctxt('btn.prepositions-of-time'), tgpostUrl(82))
      .row()
      .url(`for/since/during/until`, tgpostUrl(83))
      .row()
      .url(ctxt('btn.modal-verbs'), tgpostUrl(84))
      .row()
      .url(ctxt('btn.tenses'), tgpostUrl(85))
      .row()
      .url(ctxt('btn.colors'), tgpostUrl(86))
      .row()
      .url(ctxt('btn.direct-indirect-speech'), tgpostUrl(87))
      .row()
      .back(ctxt('btn.back'));

    return menu;
  }

  private static eduMatPhrasebooksMenuId = 'm.edu-mat--phrasebooks';
  private static getPhrasebooksMenu() {
    const menu = new Menu<BotContext>(UserModule.eduMatPhrasebooksMenuId, {
      autoAnswer: false,
    })
      // these may be not hardcoded (e.g. pulled from a database)
      .url(`Английский для путешественников`, tgpostUrl(69))
      .row()
      .url(`Вы едете в Америку`, tgpostUrl(71))
      .row()
      .url(`Общий раговорник`, tgpostUrl(72))
      .row()
      .back(ctxt('btn.back'));

    return menu;
  }

  static addWordConversationId = 'add-word';
  /** !!! All Side-effects Must Be Wrapped !!! */
  static getAddWordConversation() {
    return async (conversation: BotConversation, ctx: BotContext) => {
      assert(ctx.match && +ctx.match[1]);
      const collectionId = +ctx.match[1];

      await ctx.editMessageText(ctx.t('msg.send-word'), {
        reply_markup: undefined,
      });

      do {
        const response = await conversation.waitFor('message:text');
        const [word, hint, photo] = response.message.text
          .split(/^-$/gm)
          .map((e) => e.trim());

        if (!(word && word.length <= 255)) {
          await ctx.reply(ctx.t('msg.invalid-word'));
          continue;
        }
        if (!(hint && hint.length <= 1024)) {
          await ctx.reply(ctx.t('msg.invalid-hint'));
          continue;
        }
        if (photo && !(photo.length <= 255 && isWebUri(photo))) {
          await ctx.reply(ctx.t('msg.invalid-photo'));
          continue;
        }

        const { id: createdId } = await conversation.external({
          task: () =>
            Word.create({
              word,
              hint,
              photo,
              wordsCollectionId: collectionId,
            }),
        });

        await ctx.reply(ctx.t('msg.added-word', { word }), {
          reply_markup: new InlineKeyboard().text(
            ctx.t(`btn.to-the-word`),
            `goto:cw${createdId}_0`,
          ),
        });

        return;
        // eslint-disable-next-line no-constant-condition
      } while (true);
    };
  }

  static wordsTrainerMenuId = 'm.words-trainer';
  static getWordsTrainerMenu(wordsCollectionsMenu: Menu<BotContext>) {
    const menu = new Menu<BotContext>(UserModule.wordsTrainerMenuId, {
      autoAnswer: false,
    })
      .text(ctxt('btn.revise-words'), UserModule.getReviseWordHandler())
      .row()
      .text(ctxt('btn.search-words'), async (ctx) => {
        await ctx.conversation.enter(UserModule.searchWordConversationId, {
          overwrite: true,
        });
      })
      .text(ctxt('btn.add-word'), async (ctx) => {
        const userCollections = await ctx.dbUser.$get('wordsCollections');
        if (userCollections.length <= 0)
          return await ctx.answerCallbackQuery({
            text: ctx.t('err.no-collections'),
            show_alert: true,
          });

        const maxBtnsPerLine = UserModule.getMaxBtnsPerLine(
          userCollections.length,
        );
        const kb = new InlineKeyboard();
        userCollections.forEach(({ id, name }, i) => {
          if (i && i % maxBtnsPerLine === 0) kb.row();
          kb.text(name, `goto:aw${id}`);
        });
        kb.row().text(ctx.t('btn.back'), `goto:baw`);

        await ctx.editMessageText(ctx.t('msg.add-words'), {
          reply_markup: kb,
        });
      })
      .row()
      .submenu(
        ctxt('btn.words-collections'),
        Collections.wordsCollectionsMenuId,
        (ctx) => ctx.editMessageText(ctx.t('msg.words-collections')),
      )
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('msg.main-menu')),
      );

    menu.register(wordsCollectionsMenu);

    return menu;
  }

  static searchWordConversationId = 'search-word';
  /** !!! All Side-effects Must Be Wrapped !!! */
  static getSearchWordConversation() {
    return async (conversation: BotConversation, ctx: BotContext) => {
      const oldText = ctx.callbackQuery?.message?.text;
      const oldMarkup = ctx.callbackQuery?.message?.reply_markup;

      const cancelKb = new InlineKeyboard().text(ctx.t('btn.cancel'), 'cancel');
      await ctx.editMessageText(ctx.t('msg.search-word'), {
        reply_markup: cancelKb,
      });

      do {
        const response = await conversation.waitFor([
          'message:text',
          'callback_query:data',
        ]);

        const cb = response.callbackQuery;
        if (cb && cb.data === 'cancel') {
          await response.editMessageText(oldText || '.', {
            reply_markup: oldMarkup,
          });
          return;
        }

        const t = response.message?.text;
        if (!(t && t.length <= 255)) {
          await ctx.reply(ctx.t('msg.invalid-word'));
          continue;
        }

        const q = `%${t.toLowerCase()}%`;
        const foundWords = await conversation.external({
          task: async () =>
            Word.findAll({
              where: {
                [Op.or]: [
                  where(fn('lower', col('word')), Op.like, q),
                  where(fn('lower', col('hint')), Op.like, q),
                ],
                wordsCollectionId: (
                  await WordsCollection.findAll({
                    where: { userId: ctx.dbUser.id },
                  })
                ).map((e) => e.id),
              },
              limit: 6,
            }),
        });
        if (foundWords.length <= 0) {
          await ctx.reply(ctx.t('msg.nothing-found'), {
            reply_markup: cancelKb,
          });
          continue;
        }

        const kb = new InlineKeyboard();
        for (const { id, word, hint } of foundWords)
          kb.text(`${word} - ${hint}`, `goto:cw${id}_0`).row();
        kb.text(ctx.t('btn.back'), `goto:twtm`);

        ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(noop);
        await ctx.reply(ctx.t('msg.search-result'), { reply_markup: kb });

        return;
        // eslint-disable-next-line no-constant-condition
      } while (true);
    };
  }
}
