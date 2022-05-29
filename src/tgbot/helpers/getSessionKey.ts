import { Context } from 'grammy';

export function getSessionKey(ctx: Context) {
  const chatId = ctx.chat?.id.toString();
  const userId = ctx.from?.id.toString();

  return chatId ? `${chatId}_${userId}` : undefined;
}
