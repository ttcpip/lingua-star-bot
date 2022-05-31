import { createConversation } from '@grammyjs/conversations';
import { Menu } from '@grammyjs/menu';
import assert from 'assert';
import { Composer } from 'grammy';
import { DateTime } from 'luxon';
import { html } from 'telegram-format';
import { language, SettingsManager, User } from '../../../database';
import { noop } from '../../../helpers';
import { BotContext } from '../../BotContext';
import { BotConversation } from '../../BotConversation';
import { Collections } from './handlers';
import { ctxt } from './helpers';

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
    composer.use(
      createConversation(
        Collections.getCreateCollectionConversation(),
        Collections.createCollectionConversationId,
      ),
    );

    const readyCollectionsMenu = Collections.getReadyCollectionsMenu();
    const wordsCollectionsMenu =
      Collections.getWordsCollectionsMenu(readyCollectionsMenu);
    const wordsTrainerMenu =
      Collections.getWordsTrainerMenu(wordsCollectionsMenu);
    const mainMenu = this.getMainMenu(settingsManager, wordsTrainerMenu);
    composer.use(mainMenu);

    Collections.applyCollectionsManualHandlers(
      composer,
      wordsCollectionsMenu,
      readyCollectionsMenu,
    );

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
  private static getMainMenu(
    settingsManager: SettingsManager,
    wordsTrainerMenu: Menu<BotContext>,
  ) {
    const menu = new Menu<BotContext>(this.mainMenuId, { autoAnswer: false })
      .submenu(ctxt('u.words-trainer'), Collections.wordsTrainerMenuId, (ctx) =>
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

    menu.register(wordsTrainerMenu);
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
}
