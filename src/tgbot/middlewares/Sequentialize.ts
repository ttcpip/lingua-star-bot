import { sequentialize } from '@grammyjs/runner';
import { Bot } from 'grammy';
import { BotContext } from '../BotContext';
import { getSessionKey } from '../helpers';
import { ApplicableHandlerBase } from '../ApplicableHandlerBase';

export class Sequentialize extends ApplicableHandlerBase {
  constructor(protected bot: Bot<BotContext>) {
    super();
  }

  apply() {
    this.bot.use(sequentialize(getSessionKey));
  }
}
