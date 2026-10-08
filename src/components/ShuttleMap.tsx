import { lazy, Suspense } from 'react';
import MapLoading from './MapLoading';
const FreeMap = lazy(() => import('./FreeMap'));
export default function ShuttleMap(props: import('../types').MapProps) {
  return (
    <div className="map-view-wrapper">
      <Suspense fallback={<MapLoading />}>
        <FreeMap {...props} />
      </Suspense>
    </div>
  );
}
