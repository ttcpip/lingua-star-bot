import { Bot, session } from 'grammy';
import { BotContext } from '../BotContext';
import { getSessionKey } from '../helpers/getSessionKey';

export type ContextSessionData = Record<string, unknown>;

export function applyMiddlewareSession(bot: Bot<BotContext>) {
  bot.use(
    session({
      getSessionKey,
      initial: (): ContextSessionData => ({}),
    }),
  );
}
