export interface Point {
  lat: number;
  lon: number;
}
export interface Stop extends Point {
  id: number;
  name: string;
}
export interface Vehicle extends Point {
  id: number;
  name?: string;
  lastUpdated: string;
}
export interface Route {
  id: number;
  lot: string;
  color: string;
  short: string;
  coverage: string;
}
export interface RoutePath {
  id: number;
  coordinates: Point[];
}
export interface Commute {
  lot: string;
  terminal: string;
  terminalStopID: number;
  terminalStopName: string;
  parkingStopID: number;
  parkingStopName: string;
  walkingMinutes: number;
  bufferMinutes: number;
}
export type Direction = 'work' | 'parking';
export interface FocusRequest {
  mode: string;
  serial: number;
}
export interface MapProps {
  routeLoading?: boolean;
  liveData?: LiveData;
  route: Route;
  stops: Stop[];
  paths: RoutePath[];
  vehicles: Vehicle[];
  selectedStop?: Stop;
  userLocation: Point | null;
  onSelectStop: (stop: Stop) => void;
  focusRequest: FocusRequest;
}
export interface RawArrival {
  secondsToArrival: number;
  pattern?: { directionType?: string; direction?: string };
  route?: { id: number };
  schedulePrediction?: boolean;
  vehicle?: Vehicle;
}
export interface Prediction {
  id: string;
  due: number;
  scheduled: boolean;
  vehicleID?: number;
  busName: string;
  vehicleUpdated: number;
}
export interface LiveData {
  routeID: number;
  stopID: number;
  vehicles: Vehicle[];
  vehicleFetchedAt: string | null;
  arrivals: RawArrival[];
  arrivalFetchedAt: string | null;
  warnings: string[];
  predictions: Prediction[];
}
