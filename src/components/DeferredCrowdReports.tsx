import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import type { Vehicle } from '../types';

const CrowdReports = lazy(() => import('./CrowdReports'));

/** Community reports are optional and typically below the initial viewport.
 * Wait until this section is close to being seen before loading its code/data.
 */
export default function DeferredCrowdReports({
  routeId,
  vehicles,
}: {
  routeId: number;
  vehicles: Vehicle[];
}) {
  const { t } = useLanguage();
  const element = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    if (nearViewport || !element.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNearViewport(true);
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [nearViewport]);

  return (
    <div ref={element} className="crowd-deferred">
      {nearViewport ? (
        <Suspense
          fallback={
            <p role="status" className="crowd-deferred-placeholder">
              {t('Loading crowd reports…')}
            </p>
          }
        >
          <CrowdReports routeId={routeId} vehicles={vehicles} />
        </Suspense>
      ) : (
        <div className="crowd-deferred-placeholder" aria-hidden="true" />
      )}
    </div>
  );
}
