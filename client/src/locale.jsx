import { createContext, useContext } from 'react';
import { translate } from '../../common/locale.js';

export const LocaleContext = createContext('en');
export function useLocale() {
  const language = useContext(LocaleContext);
  return text => translate(language, text);
}
