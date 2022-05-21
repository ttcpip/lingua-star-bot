import { createConversation } from '@grammyjs/conversations';
import { Menu } from '@grammyjs/menu';
import { Composer } from 'grammy';
import { html } from 'telegram-format';
import { language, User } from '../../../database';
import { BotContext } from '../../BotContext';
import { BotConversation } from '../../BotConversation';

const ctxt = (t: string) => (ctx: BotContext) => ctx.t(t);

export class UserModule {
  static getComposer() {
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

    const mainMenu = this.getMainMenu();
    composer.use(mainMenu);

    composer.on('message', (ctx) =>
      ctx.reply(ctx.t('btn.main-menu'), { reply_markup: mainMenu }),
    );

    return composerOuter;
  }

  private static mainMenuId = 'm.main';
  private static getMainMenu() {
    const menu = new Menu<BotContext>(this.mainMenuId, { autoAnswer: false })
      .text(ctxt('u.words-trainer'), (ctx) => ctx.answerCallbackQuery('1'))
      .text(ctxt('u.homework'), (ctx) => ctx.answerCallbackQuery('1'))
      .row()
      .submenu(ctxt('u.edu-materials'), this.eduMaterialsMenuId)
      .row()
      .submenu(ctxt('u.settings'), this.settingsMenuId, (ctx) =>
        ctx.editMessageText(
          ctx.t('u.msg-settings', { name: html.escape(ctx.dbUser.name) }),
        ),
      );

    menu.register(this.getSettingsMenu());
    menu.register(this.getEduMaterialsMenu());

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
        const resp = await conversation.wait();
        const text = resp.message?.text;
        if (!(text && text.length <= 256)) {
          await ctx.reply(ctx.t('u.invalid-name'));
          continue;
        }

        newName = text;
      } while (!newName);

      ctx.dbUser.name = newName;
      await conversation.external({
        task: () => ctx.dbUser.save(),
      });

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
