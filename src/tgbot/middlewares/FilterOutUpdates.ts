import { Bot } from 'grammy';
import { ApplicableHandlerBase } from '../ApplicableHandlerBase';
import { BotContext } from '../BotContext';

export class FilterOutUpdates extends ApplicableHandlerBase {
  constructor(protected bot: Bot<BotContext>) {
    super();
  }

  apply() {
    this.bot.on(['message', 'callback_query'], (ctx, next) =>
      ctx.chat?.type === 'private' ? next() : null,
    );
  }
}
