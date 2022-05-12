import { Bot } from 'grammy';
import { run } from '@grammyjs/runner';
import { Database, SettingsManager } from '../database';
import { LocalizationManager } from '../localization';
import { BotContext } from './BotContext';
import {
  AutoRetry,
  Session,
  UseFluent,
  Sequentialize,
  AdminChat,
  UnhandledUpdate,
  FilterOutUpdates,
} from './middlewares';
import { IdCommandHandler, OnMiddlewareError } from './handlers';

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
    new OnMiddlewareError(this.bot).apply();

    new AutoRetry(this.bot).apply();
    new Sequentialize(this.bot).apply();
    new UseFluent(this.bot).apply(this.localizationManager);
    new Session(this.bot).apply();
    new IdCommandHandler(this.bot).apply();
    new AdminChat(this.bot).apply(this.settingsManager);

    new FilterOutUpdates(this.bot).apply();

    new UnhandledUpdate(this.bot).apply();
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
