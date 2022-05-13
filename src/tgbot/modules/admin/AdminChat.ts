import { Composer } from 'grammy';
import { SettingsManager } from '../../../database';
import { BotContext } from '../../BotContext';
import logger from '../../../logger';

export class AdminModule {
  static getComposer(settingsManager: SettingsManager) {
    const composer = new Composer<BotContext>();
    const wrappedComposer = composer.errorBoundary(async (err) => {
      logger.error(`When processing admin chat message`, {
        update: err.ctx.update,
        err,
      });

      await err.ctx.reply(`Ошибка при обработке: ${(<Error>err).message}`);
    });

    wrappedComposer.command('cmd1', (ctx) => ctx.reply('cmd1 admin'));

    wrappedComposer.command('err', () => {
      throw new Error(`Test err`);
    });

    wrappedComposer.use((ctx) => ctx.reply(`This is admin chat!`));

    const composerOuter = new Composer<BotContext>();
    composerOuter.filter(
      (ctx: BotContext) => ctx.chat?.id === settingsManager.get().adminTgChatId,
      composer,
    );

    return composerOuter;
  }
}
