import { useFluent } from '@grammyjs/fluent';
import { LocalizationManager } from '../../localization';
import { Bot } from 'grammy';
import { BotContext } from '../BotContext';
import { ApplicableHandlerBase } from '../ApplicableHandlerBase';

export class UseFluent extends ApplicableHandlerBase {
  constructor(protected bot: Bot<BotContext>) {
    super();
  }

  apply(localizationManager: LocalizationManager) {
    this.bot.use(
      useFluent({
        fluent: localizationManager.getFluentInstance(),
        defaultLocale: localizationManager.getDefaultLocaleCode(),
        localeNegotiator: async (ctx) =>
          ctx.from?.language_code || localizationManager.getDefaultLocaleCode(),
      }),
    );
  }
}
