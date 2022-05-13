import { Bot } from 'grammy';
import { run } from '@grammyjs/runner';
import { Database, SettingsManager } from '../database';
import { LocalizationManager } from '../localization';
import { BotContext } from './BotContext';
import { CommonModule } from './modules/common';
import logger from '../logger';
import { autoRetry } from '@grammyjs/auto-retry';
import { AdminModule } from './modules/admin';
import { UserModule } from './modules/user';

export class TgBotManager {
  private bot: Bot<BotContext>;
  constructor(
    token: string,
    private db: Database,
    private settingsManager: SettingsManager,
    private localizationManager: LocalizationManager,
  ) {
    this.bot = new Bot<BotContext>(token);
  }

  private applyAllHandlers() {
    this.bot.catch((err) =>
      logger.error(`Error from top-level bot.catch`, err),
    );

    this.bot.api.config.use(
      autoRetry({
        maxRetryAttempts: 2,
        retryOnInternalServerErrors: true,
        maxDelaySeconds: 30,
      }),
    );

    this.bot.use(CommonModule.getComposer(this.localizationManager));

    this.bot.use(AdminModule.getComposer(this.settingsManager));

    this.bot.use(UserModule.getComposer());
  }

  async start() {
    await this.bot.init();

    this.applyAllHandlers();

    run(this.bot);
  }

  getBotUsername() {
    if (!this.bot.botInfo) throw new Error(`No botInfo found!`);
    const username = this.bot.botInfo?.username;
    if (!username) throw new Error(`No username found!`);
    return username;
  }
}
