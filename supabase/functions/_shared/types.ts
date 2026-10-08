export interface Stop {
  id: number;
  name: string;
  lat: number;
  lon: number;
}
export interface Vehicle {
  id: number;
  name?: string;
  lat: number;
  lon: number;
  lastUpdated: string;
}
export interface RawArrival {
  secondsToArrival: number;
  pattern?: { directionType?: string; direction?: string };
  route?: { id: number };
  schedulePrediction?: boolean;
  vehicle?: Vehicle;
}
