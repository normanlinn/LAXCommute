import { lazy, Suspense } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
const FreeMap = lazy(() => import('./FreeMap'));
export default function ShuttleMap(props: import('../types').MapProps) {
  const { t } = useLanguage();
  return (
    <div className="map-view-wrapper">
      <Suspense fallback={<div className="map-surface map-loading">{t('Opening map…')}</div>}>
        <FreeMap {...props} />
      </Suspense>
    </div>
  );
}
