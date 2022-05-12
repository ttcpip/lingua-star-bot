import { Bot } from 'grammy';
import { html } from 'telegram-format';
import { BotContext } from '../BotContext';
import { DEFAULT_PARSE_MODE } from '../constants';
import { ApplicableHandlerBase } from '../ApplicableHandlerBase';

export class IdCommandHandler extends ApplicableHandlerBase {
  constructor(protected bot: Bot<BotContext>) {
    super();
  }

  apply() {
    this.bot.command('id', (ctx) =>
      ctx.reply(
        `${html.monospace(`${ctx.chat.id}`)} ${html.monospace(
          `${ctx.from?.id}`,
        )}`,
        { parse_mode: DEFAULT_PARSE_MODE },
      ),
    );
  }
}
