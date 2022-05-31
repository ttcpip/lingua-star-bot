import { BotContext } from '../../../BotContext';

export const ctxt = (t: string) => (ctx: BotContext) => ctx.t(t);
