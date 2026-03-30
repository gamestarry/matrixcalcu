import errorsEn from './errors.en.js?v=1.0.1';
import errorsEs from './errors.es.js?v=1.0.1';

function getCurrentLanguage() {
  const path = (window.location?.pathname || '').toLowerCase();
  if (path.startsWith('/es/')) return 'es';
  if (path.startsWith('/en/')) return 'en';

  const lang = (document?.documentElement?.lang || '').toLowerCase();
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('en')) return 'en';

  return 'en';
}

export function resolveErrorMessage(error) {
  if (!error || !error.errorId) {
    return error?.message || '';
  }

  const lang = getCurrentLanguage();
  const dict = lang === 'es' ? errorsEs : errorsEn;
  const entry = dict[error.errorId] || errorsEn[error.errorId];

  if (typeof entry === 'function') {
    return entry(error.params || {});
  }

  return error.message || error.errorId;
}