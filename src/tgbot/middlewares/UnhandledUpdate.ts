import { Bot } from 'grammy';
import { html } from 'telegram-format';
import { ApplicableHandlerBase } from '../ApplicableHandlerBase';
import { BotContext } from '../BotContext';
import { DEFAULT_PARSE_MODE } from '../constants';

export class UnhandledUpdate extends ApplicableHandlerBase {
  constructor(protected bot: Bot<BotContext>) {
    super();
  }

  apply() {
    this.bot.on('message', (ctx) =>
      ctx.reply(`Unhandled update ${html.bold(`handler`)}`, {
        parse_mode: DEFAULT_PARSE_MODE,
      }),
    );

    this.bot.on('callback_query', (ctx) =>
      ctx.answerCallbackQuery(`Unhandled update ${html.bold(`handler`)}`),
    );
  }
}
