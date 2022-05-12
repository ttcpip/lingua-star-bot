import { Bot } from 'grammy';
import logger from '../../logger';
import { ApplicableHandlerBase } from '../ApplicableHandlerBase';
import { BotContext } from '../BotContext';

export class OnMiddlewareError extends ApplicableHandlerBase {
  constructor(protected bot: Bot<BotContext>) {
    super();
  }

  apply() {
    this.bot.catch((err) => {
      logger.error(`Error from onMiddlewareError`, err);
    });
  }
}
