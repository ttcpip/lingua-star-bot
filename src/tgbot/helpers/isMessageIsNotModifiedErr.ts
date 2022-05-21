import { BotError, GrammyError } from 'grammy';
import { BotContext } from '../BotContext';

export function isMessageIsNotModifiedErr(botErr: BotError<BotContext>) {
  const grammyErr = <GrammyError>botErr?.error;
  if (!(botErr && grammyErr && grammyErr.description)) return false;

  const t = grammyErr.description.toLowerCase();
  if (
    t.includes('message is not modified'.toLowerCase()) &&
    t.includes('Bad Request'.toLowerCase())
  )
    return true;

  return false;
}
