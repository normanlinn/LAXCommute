import { motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '../i18n/LanguageProvider';
import { ChevronRight, Clock3 } from './ui/icons';

type Props = {
  routeShort: string;
  lotLabel: string;
  stopName?: string;
  destination: string;
  /** Minutes to the next bus, or null when no live or scheduled time is known. */
  minutes: number | null;
  arriving: boolean;
  scheduled: boolean;
  liveDown: boolean;
  /** Typical gap between buses, shown while live times are paused. */
  typical: string;
  /** Opens the explanation of why live times are paused. */
  onExplain: () => void;
  /** Made-up buses: say so instead of Live. */
  sample?: boolean;
};

/** The selected lot's next departure: the one solid accent card on the screen. */
export default function NextShuttleHero({
  routeShort,
  lotLabel,
  stopName,
  destination,
  minutes,
  arriving,
  scheduled,
  liveDown,
  typical,
  onExplain,
  sample = false,
}: Props) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const known = arriving || minutes !== null;
  const [value, unit] = arriving
    ? [t('Now'), '']
    : minutes !== null
      ? [String(minutes), t('min')]
      : liveDown
        ? [typical, t('min')]
        : ['…', ''];

  const clockTime = arriving
    ? t('Due now')
    : minutes !== null
      ? new Date(Date.now() + minutes * 60_000).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })
      : null;

  return (
    <section className="departure" aria-live="polite" aria-label={t('Your next shuttle')}>
      <div className="departure-main">
        <span className="route-badge" aria-hidden="true">
          {routeShort}
        </span>
        <span className="departure-where">
          <strong>{t('{lot} shuttle', { lot: lotLabel })}</strong>
          <small>
            {t('to {place}', { place: destination })}
            {stopName ? ` · ${stopName}` : ''}
          </small>
        </span>
        <motion.span
          key={value}
          className="departure-time"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <strong>{value}</strong>
          {unit && <small>{unit}</small>}
        </motion.span>
      </div>
      {liveDown && !known ? (
        <button type="button" className="btn departure-status" onClick={onExplain}>
          <Clock3 size={15} aria-hidden="true" />
          <span>{t('Typical service · live times paused')}</span>
          <span className="departure-why">
            {t('Why')}
            <ChevronRight size={14} aria-hidden="true" />
          </span>
        </button>
      ) : (
        <p className="departure-status">
          <i
            className={known && !scheduled && !sample ? 'live-dot' : 'live-dot is-off'}
            aria-hidden="true"
          />
          <span>
            {sample
              ? t('Sample data · not a real bus')
              : known
                ? scheduled
                  ? t('Scheduled')
                  : t('Live')
                : t('Waiting for the tracker')}
          </span>
          {known && !sample && !scheduled && (
            <a href="https://shuttles.flylax.com/employeeparking" target="_blank" rel="noreferrer">
              FlyLAX
            </a>
          )}
          {clockTime && known && (
            <span className="departure-clock-tag">· {arriving ? clockTime : `~${clockTime}`}</span>
          )}
        </p>
      )}
    </section>
  );
}
