import { Bot, BotError } from 'grammy';
import { run, sequentialize } from '@grammyjs/runner';
import { html } from 'telegram-format';
import { Database, SettingsManager } from '../database';
import { LocalizationManager } from '../localization';
import logger from '../logger';
import { BotContext } from './BotContext';
import { getSessionKey } from './helpers/getSessionKey';
import {
  applyMiddlewareAutoRetry,
  applyMiddlewareHandleAdminChatUpdate,
  applyMiddlewareSession,
  applyMiddlewareUseFluent,
} from './middlewares';

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

  static onMiddlewareError(err: BotError) {
    logger.error(`Error from onMiddlewareError`, err);
  }

  private applyAllHandlers() {
    applyMiddlewareAutoRetry(this.bot);
    this.bot.use(sequentialize(getSessionKey));
    applyMiddlewareUseFluent(this.bot, this.localizationManager);
    applyMiddlewareSession(this.bot);
    this.bot.command('id', (ctx) =>
      ctx.reply(
        `${html.monospace(`${ctx.chat.id}`)} ${html.monospace(
          `${ctx.from?.id}`,
        )}`,
        { parse_mode: 'HTML' },
      ),
    );
    applyMiddlewareHandleAdminChatUpdate(this.bot, this.settingsManager);

    // pass next only private messages
    this.bot.on(['message', 'callback_query'], (ctx, next) =>
      ctx.chat?.type === 'private' ? next() : null,
    );

    this.bot.on('message', (ctx) =>
      ctx.reply(`This is not ${html.bold(`admin!`)}`, {
        parse_mode: 'HTML',
      }),
    );
  }

  async start() {
    await this.bot.init();

    this.bot.catch(TgBotManager.onMiddlewareError);

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
