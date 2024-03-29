import { Bot, Composer, session } from 'grammy';
import { BotContext, ContextSessionData } from '../../BotContext';
import { sequentialize } from '@grammyjs/runner';
import { getSessionKey, isMessageIsNotModifiedErr } from '../../helpers';
import { LocalizationManager } from '../../../localization';
import { useFluent } from '@grammyjs/fluent';
import { PARSE_MODE_DEFAULT } from '../../constants';
import { html } from 'telegram-format/dist/source';
import { hydrate, hydrateApi } from '@grammyjs/hydrate';
import { autoRetry } from '@grammyjs/auto-retry';
import logger from '../../../logger';
import { parseMode } from '@grammyjs/parse-mode';
import { conversations } from '@grammyjs/conversations';
import { noop } from '../../../helpers';
import lodash from 'lodash';

export class CommonModule {
  static configureBotCatch(bot: Bot<BotContext>) {
    bot.catch((err) => {
      const logMsg = `From top-level bot.catch:`;
      if (isMessageIsNotModifiedErr(err)) {
        logger.warn(`${logMsg} message is not modified`);
        if (err?.ctx?.callbackQuery) err.ctx.answerCallbackQuery().catch(noop);
      } else {
        logger.error(logMsg, {
          error: err.error,
          ctx: lodash.pick(err.ctx, ['update', 'me.id', 'me.username']),
        });
      }
    });
  }

  static getComposer(localizationManager: LocalizationManager) {
    const composer = new Composer<BotContext>();

    composer.use(sequentialize(getSessionKey));

    composer.use(
      session({
        getSessionKey,
        initial: (): ContextSessionData => ({ lastShowedWordId: NaN }),
      }),
    );
    composer.use(hydrate());
    composer.use(conversations());
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

    composer.command('id', (ctx) =>
      ctx.reply(
        `${html.monospace(`${ctx.chat.id}`)} ${html.monospace(
          `${ctx.from?.id}`,
        )}`,
      ),
    );

    composer.command('del', (ctx) =>
      ctx.reply('Keyboard were removed!', {
        reply_markup: { remove_keyboard: true },
      }),
    );

    return composer;
  }

  static configureApi(bot: Bot<BotContext>) {
    bot.api.config.use(
      autoRetry({
        maxRetryAttempts: 2,
        retryOnInternalServerErrors: true,
        maxDelaySeconds: 30,
      }),
    );

    bot.api.config.use(parseMode(PARSE_MODE_DEFAULT));

    bot.api.config.use(hydrateApi());
  }
}
