import { translate } from '../../common/locale.js';
import { useLeafCare } from './state';

export function useLocale() {
  const { lang } = useLeafCare();
  return <T,>(text: T): T => translate(lang, text);
}
