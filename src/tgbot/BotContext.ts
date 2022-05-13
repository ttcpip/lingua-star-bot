import { FluentContextFlavor } from '@grammyjs/fluent';
import { Context, SessionFlavor } from 'grammy';
import { User } from '../database';

export type ContextSessionData = Record<string, unknown>;

export type BotContext = Context &
  SessionFlavor<ContextSessionData> &
  FluentContextFlavor & { dbUser: User };
