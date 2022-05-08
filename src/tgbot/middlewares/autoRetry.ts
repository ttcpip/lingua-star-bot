import { autoRetry } from '@grammyjs/auto-retry';
import { Bot } from 'grammy';
import { BotContext } from '../BotContext';

export function applyMiddlewareAutoRetry(bot: Bot<BotContext>) {
  bot.api.config.use(
    autoRetry({
      maxRetryAttempts: 2,
      retryOnInternalServerErrors: true,
      maxDelaySeconds: 30,
    }),
  );
}
