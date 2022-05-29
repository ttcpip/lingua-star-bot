import { createConversation } from '@grammyjs/conversations';
import { Menu } from '@grammyjs/menu';
import assert from 'assert';
import { Composer, InlineKeyboard } from 'grammy';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import { html } from 'telegram-format';
import {
  language,
  SettingsManager,
  User,
  Word,
  WordsCollection,
} from '../../../database';
import { noop } from '../../../helpers';
import { BotContext } from '../../BotContext';
import { BotConversation } from '../../BotConversation';

const ctxt = (t: string) => (ctx: BotContext) => ctx.t(t);

export class UserModule {
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
        this.getGetNameConversation(),
        this.getNameConversationId,
      ),
    );

    const mainMenu = this.getMainMenu(settingsManager);
    composer.use(mainMenu);

    composer.callbackQuery(/goto:brc/, async (ctx) => {
      const kb = this.getReadyCollectionsMenu();
      await ctx.editMessageText(ctx.t('u.msg-ready-collections'), {
        reply_markup: kb,
      });
    });

    const getReadyCollectionInfo = async (
      ctx: BotContext,
      wordsCollectionId: number,
      page: number,
    ) => {
      const kb = new InlineKeyboard();

      const MAX_WORDS_PER_PAGE = 3;
      const [
        wordsCollection,
        thisPageWords,
        userWordsCollections,
        totalWordsCnt,
      ] = await Promise.all([
        WordsCollection.findByPk(wordsCollectionId),
        Word.findAll({
          where: { wordsCollectionId },
          limit: MAX_WORDS_PER_PAGE,
          offset: MAX_WORDS_PER_PAGE * page - MAX_WORDS_PER_PAGE,
        }),
        ctx.dbUser.$get('wordsCollections', { attributes: ['id'] }),
        Word.count({ where: { wordsCollectionId } }),
      ]);

      assert(wordsCollection);
      const alreadyWords = await Word.findAll({
        attributes: ['word'],
        where: {
          wordsCollectionId: { [Op.in]: userWordsCollections.map((e) => e.id) },
          word: { [Op.in]: thisPageWords.map((e) => e.word) },
        },
      });

      thisPageWords.forEach(({ word, hint }) => {
        const already = !!alreadyWords.find((e) => e.word === word);
        kb.text(`${already ? '✅ ' : ''}${word} - ${hint}`, `TODO`).row();
      });

      const totalPagesCnt = Math.ceil(totalWordsCnt / MAX_WORDS_PER_PAGE);

      // We're creating btn for the first 3 and the last 2 pages
      for (let n = 1; n <= totalPagesCnt; n++) {
        const text = n === page ? `[${n}]` : `${n}`;
        const data = `goto:rc${wordsCollectionId}_${n}`;

        if (n === 1 || n === totalPagesCnt || (n <= page + 2 && n >= page - 2))
          kb.text(text, data);
      }
      kb.row();

      kb.text(ctx.t('btn.back'), `goto:brc`);
      kb.text(
        ctx.t('btn.add-whole-collection'),
        `goto:addwc${wordsCollectionId}_${page}`,
      );

      return { kb, wordsCollection, totalWordsCnt };
    };
    composer.callbackQuery(/goto:addwc(\d+)_(\d+)/, async (ctx) => {
      const wordsCollectionId = +(ctx.match || [] || [])[1];
      const page = +(ctx.match || [] || [])[2];

      const collection = await WordsCollection.findByPk(wordsCollectionId, {
        include: [Word],
      });
      if (!collection) return await ctx.answerCallbackQuery(ctx.t('u.error'));
      if (
        !collection.words ||
        (collection.words && collection.words.length <= 0)
      )
        return await ctx.answerCallbackQuery(ctx.t('u.no-words-in-coll'));

      assert(WordsCollection.sequelize);
      await WordsCollection.sequelize.transaction(async (transaction) => {
        const newCollection = await WordsCollection.create(
          {
            name: collection.name,
            userId: ctx.dbUser.id,
            isCommon: false,
          },
          { transaction },
        );
        if (!(collection.words && collection.words.length > 0)) return;
        await Word.bulkCreate(
          collection.words.map(({ word, hint, photo }) => ({
            wordsCollectionId: newCollection.id,
            word,
            hint,
            photo,
          })),
          { transaction },
        );
      });

      const { kb } = await getReadyCollectionInfo(ctx, wordsCollectionId, page);

      ctx.answerCallbackQuery(ctx.t('u.collection-added')).catch(noop);
      await ctx.editMessageReplyMarkup({ reply_markup: kb });
    });
    composer.callbackQuery(/goto:rc(\d+)_(\d+)/, async (ctx) => {
      assert(ctx.match);
      const wordsCollectionId = +ctx.match[1];
      const page = +ctx.match[2];

      const { kb, wordsCollection, totalWordsCnt } =
        await getReadyCollectionInfo(ctx, wordsCollectionId, page);

      await ctx.editMessageText(
        ctx.t('u.msg-ready-collection', {
          name: html.escape(wordsCollection.name),
          wordsCount: totalWordsCnt,
        }),
        { reply_markup: kb },
      );
    });

    // TODO remove START
    composer.on(
      'message:photo',
      async (ctx) =>
        await ctx.reply(
          ctx.message.photo.sort((a, b) => -a.height + b.height)[0].file_id,
        ),
    );
    composer.hears(/\/photo (.+)/, async (ctx) => {
      await ctx.replyWithPhoto(ctx.match[1]);
    });
    // TODO remove END

    composer.on('message', (ctx) =>
      ctx.reply(ctx.t('btn.main-menu'), { reply_markup: mainMenu }),
    );

    return composerOuter;
  }

  private static mainMenuId = 'm.main';
  private static getMainMenu(settingsManager: SettingsManager) {
    const menu = new Menu<BotContext>(this.mainMenuId, { autoAnswer: false })
      .submenu(ctxt('u.words-trainer'), this.wordsTrainerMenuId, (ctx) =>
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
          reply_markup: menu.at(this.fromHomeWorkBackToMainMenuMenuId),
        });
      })
      .row()
      .submenu(ctxt('u.edu-materials'), this.eduMaterialsMenuId)
      .row()
      .submenu(ctxt('u.settings'), this.settingsMenuId, (ctx) =>
        ctx.editMessageText(
          ctx.t('u.msg-settings', { name: html.escape(ctx.dbUser.name) }),
        ),
      );

    menu.register(this.getWordsTrainerMenu());
    menu.register(this.getFromHomeWorkBackToMainMenuMenu(menu));
    menu.register(this.getEduMaterialsMenu());
    menu.register(this.getSettingsMenu());

    return menu;
  }

  private static fromHomeWorkBackToMainMenuMenuId = 'm.f-hw-to-main';
  private static getFromHomeWorkBackToMainMenuMenu(mainMenu: Menu<BotContext>) {
    const menu = new Menu<BotContext>(this.fromHomeWorkBackToMainMenuMenuId, {
      autoAnswer: false,
    }).text(ctxt('btn.to-main-menu'), async (ctx) => {
      ctx.menu.close();
      await ctx.reply(ctx.t('btn.main-menu'), { reply_markup: mainMenu });
    });

    return menu;
  }

  private static settingsMenuId = 'm.settings';
  private static getSettingsMenu() {
    const menu = new Menu<BotContext>(this.settingsMenuId, {
      autoAnswer: false,
    })
      .text(ctxt('u.change-lang'), async (ctx) => {
        ctx.dbUser.lang =
          ctx.dbUser.lang === language.ru ? language.en : language.ru;
        await ctx.dbUser.save();

        await ctx.fluent.renegotiateLocale();

        await ctx.editMessageText(
          ctx.t('u.msg-settings', { name: ctx.dbUser.name }),
        );
      })
      .row()
      .text(ctxt('u.edit-name'), (ctx) =>
        ctx.conversation.enter(this.getNameConversationId),
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
        if (!(text && text.length <= 256)) {
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
    const menu = new Menu<BotContext>(this.eduMaterialsMenuId, {
      autoAnswer: false,
    })
      .dynamic((ctx, range) => {
        const arr = Array.from({ length: 14 }, (_, i) => `[${i + 1}]`);
        for (let i = 0; i < arr.length; i++) {
          if (i && i % 5 === 0) range.row();

          const text = arr[i];
          range.text(`${text}`, (ctx) => ctx.answerCallbackQuery(`${text}`));
        }
      })
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('btn.main-menu')),
      );

    return menu;
  }

  private static wordsTrainerMenuId = 'm.words-trainer';
  private static getWordsTrainerMenu() {
    const menu = new Menu<BotContext>(this.wordsTrainerMenuId, {
      autoAnswer: false,
    })
      .text(ctxt('u.revise-words'))
      .row()
      .text(ctxt('u.all-words'))
      .submenu(
        ctxt('u.words-collections'),
        this.wordsCollectionsMenuId,
        (ctx) => ctx.editMessageText(ctx.t('u.msg-words-collections')),
      )
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('btn.main-menu')),
      );

    menu.register(this.getWordsCollectionsMenu());
    return menu;
  }

  private static wordsCollectionsMenuId = 'm.words-collections';
  private static getWordsCollectionsMenu() {
    const menu = new Menu<BotContext>(this.wordsCollectionsMenuId, {
      autoAnswer: false,
    })
      .submenu(
        ctxt('u.ready-collections'),
        this.readyCollectionsMenuId,
        (ctx) => ctx.editMessageText(ctx.t('u.msg-ready-collections')),
      )
      .row()
      .dynamic(async (ctx, range) => {
        const collections = await ctx.dbUser.$get('wordsCollections');
        const MAX_BTNS_PER_LINE =
          collections.length <= 5 ? 1 : collections.length <= 14 ? 2 : 3;
        collections.forEach(({ name }, i) => {
          if (i && i % MAX_BTNS_PER_LINE === 0) range.row();
          range.text(`${name}`, (ctx) => ctx.answerCallbackQuery(`#${i}`));
        });
      })
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('u.msg-words-trainer')),
      );

    menu.register(this.getReadyCollectionsMenu());
    return menu;
  }

  private static readyCollectionsMenuId = 'm.ready-collections';
  private static getReadyCollectionsMenu() {
    const menu = new Menu<BotContext>(this.readyCollectionsMenuId, {
      autoAnswer: false,
    })
      .dynamic(async (_, range) => {
        const collections = await WordsCollection.findAll({
          where: { isCommon: true },
        });
        const MAX_BTNS_PER_LINE =
          collections.length <= 5 ? 1 : collections.length <= 14 ? 2 : 3;
        collections.forEach(({ id, name }, i) => {
          if (i && i % MAX_BTNS_PER_LINE === 0) range.row();
          range.text({ text: name, payload: `goto:rc${id}_1` }, (_, next) =>
            next(),
          );
        });
      })
      .row()
      .back(ctxt('btn.back'), (ctx) =>
        ctx.editMessageText(ctx.t('u.msg-words-collections')),
      );

    return menu;
  }
}
