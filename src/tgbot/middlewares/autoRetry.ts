import { Bot } from 'grammy';
import { autoRetry } from '@grammyjs/auto-retry';
import { BotContext } from '../BotContext';
import { ApplicableHandlerBase } from '../ApplicableHandlerBase';

export class AutoRetry extends ApplicableHandlerBase {
  constructor(protected bot: Bot<BotContext>) {
    super();
  }

  apply() {
    this.bot.api.config.use(
      autoRetry({
        maxRetryAttempts: 2,
        retryOnInternalServerErrors: true,
        maxDelaySeconds: 30,
      }),
    );
  }
}
