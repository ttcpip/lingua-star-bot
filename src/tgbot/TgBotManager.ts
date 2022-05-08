import { Bot, Context, session, BotError, SessionFlavor } from 'grammy';
import { run, sequentialize } from '@grammyjs/runner';
import { Database, SettingsManager } from '../database';
import logger from '../logger';

type ContextState = { isAdmin?: boolean };
type BotContext = Context &
  SessionFlavor<Record<string, unknown>> & { state: ContextState };

export class TgBotManager {
  private bot: Bot<BotContext>;
  constructor(
    token: string,
    private db: Database,
    private settingsManager: SettingsManager,
  ) {
    this.bot = new Bot<BotContext>(token);
  }

  static getSessionKey(ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    const userId = ctx.from?.id.toString();

    return chatId && userId ? `${chatId}_${userId}` : undefined;
  }

  static onMiddlewareError(err: BotError) {
    logger.error(`Error from onMiddlewareError`, err);
  }

  private applyHandlers() {
    const b = this.bot;
    b.use(sequentialize(TgBotManager.getSessionKey));
    b.use(
      session({
        getSessionKey: TgBotManager.getSessionKey,
        initial: () => ({}),
      }),
    );
    b.command('id', (ctx) => ctx.reply(`${ctx.chat.id} ${ctx.from?.id}`));

    // add ctx.state
    b.use((ctx, next) => {
      ctx.state = {};
      return next();
    });

    // handle admin chat updates
    b.use(async (ctx, next) => {
      const chatId = ctx.chat?.id;
      if (!chatId) return await next();

      const s = this.settingsManager.get();
      ctx.state.isAdmin = chatId === s.adminTgChatId;
      if (ctx.state.isAdmin) {
        await ctx.reply(`Admin chat!`);
        // await adminChatHandler(ctx);
        return;
      }

      return next();
    });

    // pass next only private messages
    b.on(['message', 'callback_query'], (ctx, next) =>
      ctx.chat?.type === 'private' ? next() : null,
    );

    b.on('message', async (ctx) => {
      await ctx.reply(`Hey <b>123</b>`, { parse_mode: 'HTML' });
    });
  }

  async start() {
    await this.bot.init();

    this.bot.catch(TgBotManager.onMiddlewareError);

    this.applyHandlers();

    run(this.bot);
  }

  getBotUsername() {
    if (!this.bot.botInfo) throw new Error(`No botInfo found!`);
    const username = this.bot.botInfo?.username;
    if (!username) throw new Error(`No username found!`);
    return username;
  }
}
