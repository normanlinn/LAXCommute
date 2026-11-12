// Builds src/data/metro-lines.json: station order for the Metro lines that serve LAX,
// from LA Metro's public GTFS rail feed. Re-run when Metro changes service:
//   node scripts/metro-lines.mjs
import { writeFileSync } from 'node:fs';

const FEED = 'https://gitlab.com/LACMTA/gtfs_rail/-/raw/master';
const LINES = ['803', '807']; // C Line, K Line
export const LAX_STATIONS = ['80702', '80701']; // LAX/Metro Transit Center, Aviation/Century

function parseCSV(text) {
  const [head, ...rows] = text.trim().split(/\r?\n/);
  const keys = head.split(',');
  return rows.map((row) => {
    const values = [];
    let value = '';
    let quoted = false;
    for (const char of row) {
      if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) {
        values.push(value);
        value = '';
      } else value += char;
    }
    values.push(value);
    return Object.fromEntries(keys.map((key, i) => [key, values[i] ?? '']));
  });
}
async function table(name) {
  const response = await fetch(`${FEED}/${name}.txt`);
  if (!response.ok) throw new Error(`${name}.txt: ${response.status}`);
  return parseCSV(await response.text());
}
const shortName = (name) =>
  name
    .replace(/\s*-\s*Metro [A-Z]-Line$/, '')
    .replace(/ Station\b/, '')
    .replace(/ [A-Z]-Line$/, '')
    .replace(/\s*-\s*/g, '/')
    .replace(/\s*\/\s*/g, '/');

const [routes, stops, trips, stopTimes] = await Promise.all(
  ['routes', 'stops', 'trips', 'stop_times'].map(table),
);
const stopByID = new Map(stops.map((s) => [s.stop_id, s]));
const timesByTrip = new Map();
for (const row of stopTimes) {
  if (!timesByTrip.has(row.trip_id)) timesByTrip.set(row.trip_id, []);
  timesByTrip.get(row.trip_id).push(row);
}
const lines = LINES.map((routeID) => {
  const route = routes.find((r) => r.route_id === routeID);
  const directions = [0, 1].map((direction) => {
    // The longest trip in each direction covers every station on the line.
    const longest = trips
      .filter((t) => t.route_id === routeID && Number(t.direction_id) === direction)
      .map((t) => timesByTrip.get(t.trip_id) || [])
      .sort((a, b) => b.length - a.length)[0];
    const ordered = [...longest].sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
    const last = stopByID.get(ordered.at(-1).stop_id);
    return {
      direction,
      headsign: shortName(last.stop_name),
      stations: ordered.map((row) => {
        const stop = stopByID.get(row.stop_id);
        return { id: row.stop_id, name: shortName(stop.stop_name) };
      }),
    };
  });
  return {
    id: routeID,
    name: route.route_long_name.replace(/^Metro /, ''),
    color: `#${route.route_color}`,
    textColor: `#${route.route_text_color}`,
    directions,
  };
});
const stations = LAX_STATIONS.map((id) => ({
  id,
  name: shortName(stopByID.get(id).stop_name),
  lat: Number(stopByID.get(id).stop_lat),
  lon: Number(stopByID.get(id).stop_lon),
}));
writeFileSync(
  'src/data/metro-lines.json',
  JSON.stringify({ source: 'LA Metro GTFS rail', stations, lines }, null, 2) + '\n',
);
console.log(
  lines
    .map(
      (l) =>
        `${l.name}: ${l.directions.map((d) => `${d.headsign} (${d.stations.length})`).join(' / ')}`,
    )
    .join('\n'),
);
