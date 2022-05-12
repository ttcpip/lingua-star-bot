import { Bot, session } from 'grammy';
import { BotContext } from '../BotContext';
import { ApplicableHandlerBase } from '../ApplicableHandlerBase';
import { getSessionKey } from '../helpers';

export type ContextSessionData = Record<string, unknown>;

export class Session extends ApplicableHandlerBase {
  constructor(protected bot: Bot<BotContext>) {
    super();
  }

  apply() {
    this.bot.use(
      session({
        getSessionKey,
        initial: (): ContextSessionData => ({}),
      }),
    );
  }
}
