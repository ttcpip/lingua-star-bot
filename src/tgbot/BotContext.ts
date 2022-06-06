import { ConversationFlavor } from '@grammyjs/conversations';
import { FluentContextFlavor } from '@grammyjs/fluent';
import { HydrateApiFlavor, HydrateFlavor } from '@grammyjs/hydrate';
import { Api, Context, SessionFlavor } from 'grammy';
import { User } from '../database';

export type ContextSessionData = {
  lastShowedWordId: number;
};

export type BotApi = HydrateApiFlavor<Api>;

export type BotContext = HydrateFlavor<
  Context &
    SessionFlavor<ContextSessionData> &
    FluentContextFlavor & { dbUser: User } & ConversationFlavor
>;
