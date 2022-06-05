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
import { ctxt } from './helpers';

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

    /** back from search word */
    composer.callbackQuery(/goto:bfsw/, async (ctx) => {
      await ctx.editMessageText(ctx.t('u.msg-words-trainer'), {
        reply_markup: wordsTrainerMenu,
      });
    });

    composer.hears(/\/start (.+)_(\d+)/, async (ctx, next) => {
      const cmd = ctx.match[1];
      const grId = +ctx.match[2];

      /** study group */
      if (cmd === 'sg') {
        const gr = await StudyGroup.findByPk(grId);
        if (!gr) return await ctx.reply(ctx.t('u.error-group-not-found'));
        await ctx.dbUser.update({ studyGroupId: grId });
        await ctx.reply(
          ctx.t('u.msg-joined-study-group', { name: html.escape(gr.name) }),
        );
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
      await ctx.editMessageText(ctx.t('u.msg-words-trainer'), {
        reply_markup: wordsTrainerMenu,
      });
    });

    composer.on('message', (ctx) =>
      ctx.reply(ctx.t('btn.main-menu'), { reply_markup: mainMenu }),
    );

    composer.on('callback_query', (ctx) => ctx.answerCallbackQuery('🤷‍♂️'));

    return composerOuter;
  }

  private static mainMenuId = 'm.main';
  private static getMainMenu(
    settingsManager: SettingsManager,
    wordsTrainerMenu: Menu<BotContext>,
  ) {
    const menu = new Menu<BotContext>(UserModule.mainMenuId, {
      autoAnswer: false,
    })
      .submenu(ctxt('u.words-trainer'), UserModule.wordsTrainerMenuId, (ctx) =>
        ctx.editMessageText(ctx.t('u.msg-words-trainer')),
      )
      .text(ctxt('u.homework'), async (ctx) => {
        const studyGroup = await ctx.dbUser.$get('studyGroup');
        if (!studyGroup)
          return await await ctx.answerCallbackQuery({
            text: ctx.t('u.msg-no-study-group'),
            show_alert: true,
          });

        const homeWorkEntries = await studyGroup.$get('homeWorkEntries');
        if (homeWorkEntries.length <= 0)
          return await await ctx.answerCallbackQuery(
            ctx.t('u.msg-no-homework'),
          );

        ctx
          .editMessageText(ctx.t('u.msg-homework'), { reply_markup: undefined })
          .catch(noop);

        assert(ctx.chat);
        for (const el of homeWorkEntries)
          await ctx.api.forwardMessage(ctx.chat.id, el.chatId, el.messageId);

        const datetime = DateTime.fromJSDate(studyGroup.lastTimeSetHomeWork)
          .setZone(settingsManager.get().displayTimeZone)
          .setLocale(ctx.dbUser.getLangCode())
          .toFormat('d MMMM, HH:mm');
        await ctx.reply(ctx.t('u.msg-homework-last-update', { datetime }), {
          reply_markup: menu.at(UserModule.fromHomeWorkBackToMainMenuMenuId),
        });
      })
      .row()
      .submenu(ctxt('u.edu-materials'), UserModule.eduMaterialsMenuId, (ctx) =>
        ctx.editMessageText(ctx.t('u.msg-edu-materials')),
      )
      .row()
      .submenu(ctxt('u.settings'), UserModule.settingsMenuId, (ctx) =>
        ctx.editMessageText(
          ctx.t('u.msg-settings', { name: html.escape(ctx.dbUser.name) }),
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
      await ctx.reply(ctx.t('btn.main-menu'), { reply_markup: mainMenu });
    });

    return menu;
  }

  private static settingsMenuId = 'm.settings';
  private static getSettingsMenu() {
    const menu = new Menu<BotContext>(UserModule.settingsMenuId, {
      autoAnswer: false,
    })
      .text(ctxt('u.change-lang'), async (ctx) => {
        ctx.dbUser.lang =
          ctx.dbUser.lang === language.ru ? language.en : language.ru;
        await ctx.dbUser.save();

        await ctx.fluent.renegotiateLocale();

        await ctx.editMessageText(
          ctx.t('u.msg-settings', { name: html.escape(ctx.dbUser.name) }),
        );
      })
      .row()
      .text(ctxt('u.edit-name'), (ctx) =>
        ctx.conversation.enter(UserModule.getNameConversationId, {
          overwrite: true,
        }),
      )
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('btn.main-menu')),
      );

    return menu;
  }

  private static getNameConversationId = 'get-name';
  /** !!! All Side-effects Must Be Wrapped !!! */
  private static getGetNameConversation() {
    return async (conversation: BotConversation, ctx: BotContext) => {
      const oldMarkup = ctx.callbackQuery?.message?.reply_markup;

      await ctx.editMessageText(ctx.t('u.send-new-name'), {
        reply_markup: undefined,
      });

      let newName = '';
      do {
        const response = await conversation.waitFor('message:text');
        const text = response.message.text;
        if (!(text && text.length <= 255)) {
          await ctx.reply(ctx.t('u.invalid-name'));
          continue;
        }

        newName = text;
      } while (!newName);

      ctx.dbUser.name = newName;
      await conversation.external({ task: () => ctx.dbUser.save() });

      await ctx.reply(
        ctx.t('u.msg-settings', { name: html.escape(ctx.dbUser.name) }),
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
      .url(ctxt('btn.dictionaries'), 'https://t.me/lingua_materials/13')
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('btn.main-menu')),
      );

    menu.register(UserModule.getEduMatTextBooksMenu());
    menu.register(UserModule.getEduMatCheatSheetsMenu());
    return menu;
  }

  private static eduMatTextBooksMenuId = 'm.edu-mat--text-books';
  private static getEduMatTextBooksMenu() {
    const menu = new Menu<BotContext>(UserModule.eduMatTextBooksMenuId, {
      autoAnswer: false,
    })
      // these may be not hardcoded (e.g. pulled from a database)
      .text(`English File:`, (ctx) =>
        ctx.answerCallbackQuery(ctx.t('u.select-from-btns-below')),
      )
      .text(`New English File:`, (ctx) =>
        ctx.answerCallbackQuery(ctx.t('u.select-from-btns-below')),
      )
      .row()
      .url(`Beginner`, 'https://t.me/lingua_materials/13')
      .url(`Beginner`, 'https://t.me/lingua_materials/13')
      .row()
      .url(`Elementary`, 'https://t.me/lingua_materials/13')
      .url(`Elementary`, 'https://t.me/lingua_materials/13')
      .row()
      .url(`Pre-Intermediate`, 'https://t.me/lingua_materials/13')
      .url(`Pre-Intermediate`, 'https://t.me/lingua_materials/13')
      .row()
      .url(`Intermediate`, 'https://t.me/lingua_materials/13')
      .url(`Intermediate`, 'https://t.me/lingua_materials/13')
      .row()
      .url(`Upper-Intermediate`, 'https://t.me/lingua_materials/13')
      .url(`Upper-Intermediate`, 'https://t.me/lingua_materials/13')
      .row()
      .url(`Advanced`, 'https://t.me/lingua_materials/13')
      .url(`Advanced`, 'https://t.me/lingua_materials/13')
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
      .url(ctxt('btn.irr-verbs'), 'https://t.me/lingua_materials/13')
      .url(ctxt('btn.irr-nouns'), 'https://t.me/lingua_materials/13')
      .row()
      .url(
        ctxt('btn.prepositions-of-place'),
        'https://t.me/lingua_materials/13',
      )
      .url(ctxt('btn.prepositions-of-time'), 'https://t.me/lingua_materials/13')
      .row()
      .url(`for/since/during/until`, 'https://t.me/lingua_materials/13')
      .row()
      .url(ctxt('btn.modal-verbs'), 'https://t.me/lingua_materials/13')
      .row()
      .url(ctxt('btn.tenses'), 'https://t.me/lingua_materials/13')
      .row()
      .url(ctxt('btn.colors'), 'https://t.me/lingua_materials/13')
      .row()
      .url(
        ctxt('btn.direct-inderect-speech'),
        'https://t.me/lingua_materials/13',
      )
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

      await ctx.editMessageText(ctx.t('u.msg-send-word'), {
        reply_markup: undefined,
      });

      do {
        const response = await conversation.waitFor('message:text');
        const [word, hint, photo] = response.message.text
          .split(/^-$/gm)
          .map((e) => e.trim());

        if (!(word && word.length <= 255)) {
          await ctx.reply(ctx.t('u.msg-invalid-word'));
          continue;
        }
        if (!(hint && hint.length <= 1024)) {
          await ctx.reply(ctx.t('u.msg-invalid-hint'));
          continue;
        }
        if (photo && !(photo.length <= 255 && isWebUri(photo))) {
          await ctx.reply(ctx.t('u.msg-invalid-photo'));
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

        await ctx.reply(ctx.t('u.msg-added-word', { word }), {
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
      .text(ctxt('u.revise-words'))
      .row()
      .text(ctxt('u.search-words'), async (ctx) => {
        await ctx.conversation.enter(UserModule.searchWordConversationId, {
          overwrite: true,
        });
      })
      .text(ctxt('u.add-word'), async (ctx) => {
        const userCollections = await ctx.dbUser.$get('wordsCollections');
        if (userCollections.length <= 0)
          return await ctx.answerCallbackQuery({
            text: ctx.t('u.no-collections'),
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

        await ctx.editMessageText(ctx.t('u.msg-add-words'), {
          reply_markup: kb,
        });
      })
      .row()
      .submenu(
        ctxt('u.words-collections'),
        Collections.wordsCollectionsMenuId,
        (ctx) => ctx.editMessageText(ctx.t('u.msg-words-collections')),
      )
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('btn.main-menu')),
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
      await ctx.editMessageText(ctx.t('u.msg-search-word'), {
        reply_markup: cancelKb,
      });

      do {
        const response = await conversation.waitFor([
          'message:text',
          'callback_query:data',
        ]);

        const cb = response.callbackQuery;
        if (cb && cb.data === 'cancel') {
          await ctx.editMessageText(oldText || '.', {
            reply_markup: oldMarkup,
          });
          return;
        }

        const t = response.message?.text;
        if (!(t && t.length <= 255)) {
          await ctx.reply(ctx.t('u.msg-invalid-word'));
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
          await ctx.reply(ctx.t('u.msg-nothing-found'), {
            reply_markup: cancelKb,
          });
          continue;
        }

        const kb = new InlineKeyboard();
        for (const { id, word, hint } of foundWords)
          kb.text(`${word} - ${hint}`, `goto:cw${id}_0`).row();
        kb.text(ctx.t('btn.back'), `goto:bfsw`);

        ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(noop);
        await ctx.reply(ctx.t('u.msg-search-result'), { reply_markup: kb });

        return;
        // eslint-disable-next-line no-constant-condition
      } while (true);
    };
  }
}
