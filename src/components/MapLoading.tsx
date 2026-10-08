import { useLanguage } from '../i18n/LanguageProvider';
export default function MapLoading() {
  const { t } = useLanguage();
  return (
    <div className="map-surface map-loading map-skeleton" role="status">
      <div className="map-skeleton-road road-one" aria-hidden="true" />
      <div className="map-skeleton-road road-two" aria-hidden="true" />
      <div className="map-skeleton-stop skeleton" aria-hidden="true" />
      <div className="map-skeleton-card">
        <span className="skeleton" />
        <span>{t('Opening map…')}</span>
      </div>
    </div>
  );
}
