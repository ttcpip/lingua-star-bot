import { html } from 'telegram-format/dist/source';
import { isWebUri } from 'valid-url';
import { INVISIBLE_SYMB } from '../../../constants';

/** appends url to the message if the url is valid */
export function appendUrl(str: string, url: string | null) {
  return url && url.length > 0 && isWebUri(url)
    ? `${str} ${html.url(INVISIBLE_SYMB, url)}`
    : str;
}
