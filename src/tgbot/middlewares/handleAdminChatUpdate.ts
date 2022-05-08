import { Bot, Composer } from 'grammy';
import { SettingsManager } from '../../database';
import logger from '../../logger';
import { BotContext } from '../BotContext';

export function applyMiddlewareHandleAdminChatUpdate(
  bot: Bot<BotContext>,
  settingsManager: SettingsManager,
) {
  const composer = new Composer();

  composer.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      logger.error(`When processing admin chat message`, {
        update: ctx.update,
        err,
      });
      await ctx.reply(`Ошибка при обработке: ${(<Error>err).message}`);
    }
  });
  composer.command('cmd1', (ctx) => ctx.reply('cmd1'));
  composer.command('err', () => {
    throw new Error(`Test err`);
  });
  composer.use((ctx) => ctx.reply(`This is admin!`));

  bot.filter(
    (ctx: BotContext) => ctx.chat?.id === settingsManager.get().adminTgChatId,
    composer.middleware(),
  );
}
