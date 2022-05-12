import { Bot } from 'grammy';
import { BotContext } from './BotContext';

export type ApplyFn = (...args: never[]) => void;

export abstract class ApplicableHandlerBase {
  protected abstract bot: Bot<BotContext>;
  abstract apply(...args: never[]): void;
}
