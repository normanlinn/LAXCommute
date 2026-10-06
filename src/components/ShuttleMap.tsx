import { lazy, Suspense, useState } from 'react';
import { Map, Route } from 'lucide-react';
import { config } from '../config';
import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';

const FreeMap = lazy(() => import('./FreeMap'));
const AppleMap = lazy(() => import('./AppleMap'));
const RouteView = lazy(() => import('./RouteView'));

export default function ShuttleMap(props: import('../types').MapProps) {
  const { t } = useLanguage();
  const [view, setView] = useState<'route' | 'street'>('route');
  const MapComponent =
    view === 'route' ? RouteView : config.mapProvider === 'apple' ? AppleMap : FreeMap;
  return (
    <div className="map-view-wrapper">
      <div className="map-view-switch" role="group" aria-label={t('Map view')}>
        <Button aria-pressed={view === 'route'} onClick={() => setView('route')}>
          <Route size={16} />
          {t('Route view')}
        </Button>
        <Button aria-pressed={view === 'street'} onClick={() => setView('street')}>
          <Map size={16} />
          {t('Street map')}
        </Button>
      </div>
      <Suspense fallback={<div className="map-surface map-loading">{t('Opening map…')}</div>}>
        <MapComponent {...props} />
      </Suspense>
    </div>
  );
}
