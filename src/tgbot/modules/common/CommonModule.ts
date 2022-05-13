import { Composer, session } from 'grammy';
import { BotContext, ContextSessionData } from '../../BotContext';
import { sequentialize } from '@grammyjs/runner';
import { getSessionKey } from '../../helpers';
import { LocalizationManager } from '../../../localization';
import { useFluent } from '@grammyjs/fluent';
import { DEFAULT_PARSE_MODE } from '../../constants';
import { html } from 'telegram-format/dist/source';

export class CommonModule {
  static getComposer(localizationManager: LocalizationManager) {
    const composer = new Composer<BotContext>();

    composer.use(sequentialize(getSessionKey));

    composer.use(
      useFluent({
        fluent: localizationManager.getFluentInstance(),
        defaultLocale: localizationManager.getDefaultLocaleCode(),
        localeNegotiator: (ctx) =>
          ctx.dbUser?.getLangCode() ||
          localizationManager.getDefaultLocaleCode(),
        // ctx.from?.language_code || localizationManager.getDefaultLocaleCode(),
      }),
    );

    composer.use(
      session({
        getSessionKey,
        initial: (): ContextSessionData => ({}),
      }),
    );

    composer.command('id', (ctx) =>
      ctx.reply(
        `${html.monospace(`${ctx.chat.id}`)} ${html.monospace(
          `${ctx.from?.id}`,
        )}`,
        { parse_mode: DEFAULT_PARSE_MODE },
      ),
    );

    return composer;
  }
}
