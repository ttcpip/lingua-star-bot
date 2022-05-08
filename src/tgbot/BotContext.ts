import { FluentContextFlavor } from '@grammyjs/fluent';
import { Context, SessionFlavor } from 'grammy';
import { ContextSessionData } from './middlewares';

export type BotContext = Context &
  SessionFlavor<ContextSessionData> &
  FluentContextFlavor;
