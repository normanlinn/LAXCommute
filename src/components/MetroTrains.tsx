import { useMemo, useState } from 'react';
import { ChevronDown, TrainFront } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import { metroBoard, metroStations } from '../domain/metro';
import { useMetroTrains } from '../hooks/useMetroTrains';
import Button from './ui/Button';

/**
 * Live C and K Line positions at the LAX Metro stations, for riders continuing
 * by train. Positions only: LA Metro's public stream has no arrival times.
 */
export default function MetroTrains() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [stationID, setStationID] = useState(metroStations[0].id);
  const { trains, status, lastMessage } = useMetroTrains(open);
  const board = useMemo(
    () => metroBoard(trains, stationID).filter((row) => row.boards),
    [trains, stationID],
  );
  const age = lastMessage ? Math.max(0, Math.round((Date.now() - lastMessage) / 1000)) : null;
  return (
    <details
      className="metro-trains"
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary>
        <span className="metro-icon" aria-hidden="true">
          <TrainFront size={18} />
        </span>
        <span className="metro-summary">
          <strong>{t('Metro trains at LAX')}</strong>
          <span>{t('C and K Line, live positions')}</span>
        </span>
        <ChevronDown size={18} aria-hidden="true" className="metro-chevron" />
      </summary>
      <div className="metro-body">
        <div className="metro-stations" role="group" aria-label={t('Metro station')}>
          {metroStations.map((station) => (
            <Button
              key={station.id}
              aria-pressed={station.id === stationID}
              onClick={() => setStationID(station.id)}
            >
              {station.name}
            </Button>
          ))}
        </div>
        {status === 'unavailable' && !trains.length ? (
          <p className="metro-message" role="status">
            {t('Metro live positions are unavailable right now.')}{' '}
            <a href="https://www.metro.net/riding/nextrip/" target="_blank" rel="noreferrer">
              {t('Check Metro NexTrip')}
            </a>
          </p>
        ) : status === 'connecting' && !trains.length ? (
          <p className="metro-message" role="status">
            {t('Connecting to LA Metro…')}
          </p>
        ) : (
          <ul className="metro-board">
            {board.map((row) => {
              const next = row.approaching[0];
              return (
                <li key={`${row.lineID}-${row.direction}`}>
                  <span
                    className="metro-line"
                    style={{ background: row.color, color: row.textColor }}
                  >
                    {row.lineName.replace(' Line', '')}
                  </span>
                  <div className="metro-row">
                    <strong>{t('To {place}', { place: row.headsign })}</strong>
                    <span>
                      {!next
                        ? t('No train on the way right now')
                        : next.atPlatform
                          ? t('At the platform now')
                          : next.stopsAway === 0
                            ? t('Arriving next · just left {station}', { station: next.nowAt })
                            : next.stopped
                              ? t(
                                  next.stopsAway === 1
                                    ? '1 stop away · at {station}'
                                    : '{count} stops away · at {station}',
                                  {
                                    count: next.stopsAway,
                                    station: next.nowAt,
                                  },
                                )
                              : t(
                                  next.stopsAway === 1
                                    ? '1 stop away · just left {station}'
                                    : '{count} stops away · just left {station}',
                                  {
                                    count: next.stopsAway,
                                    station: next.nowAt,
                                  },
                                )}
                    </span>
                  </div>
                  {next && (
                    <span
                      className={`metro-distance${next.atPlatform || next.stopsAway === 0 ? ' is-close' : ''}`}
                    >
                      {next.atPlatform
                        ? t('Now')
                        : next.stopsAway === 0
                          ? t('Next')
                          : next.stopsAway}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="metro-source">
          {status === 'live' && age !== null
            ? t('Live from LA Metro · updated {seconds}s ago', { seconds: age })
            : t('Live from LA Metro')}
          {' · '}
          {t('Positions only, not arrival times')}
        </p>
      </div>
    </details>
  );
}
