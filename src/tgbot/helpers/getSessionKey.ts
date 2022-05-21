import { Context } from 'grammy';

export function getSessionKey(ctx: Context) {
  const chatId = ctx.chat?.id.toString();
  const userId = ctx.from?.id.toString();

  console.log({ chatId, userId });
  return chatId && userId ? `${chatId}_${userId}` : undefined;
}
