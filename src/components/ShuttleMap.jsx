import { lazy } from 'react';
import { config } from '../config';

const FreeMap = lazy(() => import('./FreeMap'));
const AppleMap = lazy(() => import('./AppleMap'));

export default function ShuttleMap(props) {
  const MapComponent = config.mapProvider === 'apple' ? AppleMap : FreeMap;
  return <MapComponent {...props} />;
}
