import { useFluent } from '@grammyjs/fluent';
import { Bot } from 'grammy';
import { LocalizationManager } from '../../localization';
import { BotContext } from '../BotContext';

export function applyMiddlewareUseFluent(
  bot: Bot<BotContext>,
  localizationManager: LocalizationManager,
) {
  bot.use(
    useFluent({
      fluent: localizationManager.getFluentInstance(),
      defaultLocale: localizationManager.getDefaultLocaleCode(),
      localeNegotiator: async (ctx) =>
        ctx.from?.language_code || localizationManager.getDefaultLocaleCode(),
    }),
  );
}
