import { Composer, InlineKeyboard } from 'grammy';
import { language, User } from '../../../database';
import { BotContext } from '../../BotContext';

export class UserModule {
  static getComposer() {
    const composer = new Composer<BotContext>();

    composer.use(async (ctx, next) => {
      const tgid = ctx.from?.id;
      if (!tgid || !Number.isFinite(tgid)) return await next();

      const user = await User.findOne({ where: { tgid } });
      if (user) {
        ctx.dbUser = user;
      } else {
        const user_ = await User.create({
          tgid,
          lang: language.ru,
        });
        ctx.dbUser = user_;
      }

      await ctx.fluent.renegotiateLocale();

      return await next();
    });

    composer.command('del', (ctx) =>
      ctx.reply('Keyboard removed!', {
        reply_markup: { remove_keyboard: true },
      }),
    );

    composer.callbackQuery('u.words-trainer', async (ctx) => {
      await ctx.answerCallbackQuery('words');
    });

    composer.callbackQuery('u.homework', async (ctx) => {
      await ctx.answerCallbackQuery('homework');
    });

    composer.callbackQuery('u.edu-materials', async (ctx) => {
      await ctx.answerCallbackQuery('edu');
    });

    composer.callbackQuery('u.info', async (ctx) => {
      await ctx.answerCallbackQuery('info');
    });

    composer.callbackQuery('u.lang', async (ctx) => {
      ctx.dbUser.lang =
        ctx.dbUser.lang === language.ru ? language.en : language.ru;
      await ctx.dbUser.save();

      await ctx.fluent.renegotiateLocale();

      const kb = getMainKb(ctx);
      await ctx.editMessageText(ctx.t('user.main-menu'), { reply_markup: kb });
    });

    const getMainKb = (ctx: BotContext) => {
      return new InlineKeyboard()
        .text(ctx.t('u.words-trainer'), 'u.words-trainer')
        .text(ctx.t('u.homework'), 'u.homework')
        .row()
        .text(ctx.t('u.edu-materials'), 'u.edu-materials')
        .row()
        .text(ctx.t('u.info'), 'u.info')
        .text(ctx.t('u.lang'), 'u.lang');
    };
    composer.on('message', async (ctx) => {
      const kb = getMainKb(ctx);

      await ctx.reply(ctx.t('user.main-menu'), { reply_markup: kb });
    });

    return composer;
  }
}
