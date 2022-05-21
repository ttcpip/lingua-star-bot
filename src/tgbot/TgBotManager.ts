import { Bot } from 'grammy';
import { run } from '@grammyjs/runner';
import { Database, SettingsManager } from '../database';
import { LocalizationManager } from '../localization';
import { BotApi, BotContext } from './BotContext';
import { CommonModule } from './modules/common';
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
    this.bot = new Bot<BotContext, BotApi>(token);
  }

  private applyAllHandlers() {
    CommonModule.configureBotCatch(this.bot);
    CommonModule.configureApi(this.bot);
    this.bot.use(CommonModule.getComposer(this.localizationManager));

    this.bot.use(AdminModule.getComposer(this.settingsManager));

    this.bot.use(UserModule.getComposer());
  }

  async start() {
    await this.bot.init();

    this.applyAllHandlers();

    const runner = run(this.bot);
    const stopRunner = () => runner.isRunning() && runner.stop();
    process.once('SIGINT', stopRunner);
    process.once('SIGTERM', stopRunner);
  }

  getBotUsername() {
    if (!this.bot.botInfo) throw new Error(`No botInfo found!`);
    const username = this.bot.botInfo?.username;
    if (!username) throw new Error(`No username found!`);
    return username;
  }
}
