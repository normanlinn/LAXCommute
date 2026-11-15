import { motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '../i18n/LanguageProvider';
import { Clock3 } from './ui/icons';

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
};

/** The selected lot's next departure, as a solid Transit-style card. */
export default function NextShuttleHero({
  routeShort,
  lotLabel,
  stopName,
  destination,
  minutes,
  arriving,
  scheduled,
  liveDown,
}: Props) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const known = arriving || minutes !== null;
  const [value, unit] = arriving
    ? [t('Now'), '']
    : minutes !== null
      ? [String(minutes), t('min')]
      : liveDown
        ? ['7–15', t('min')]
        : ['…', ''];
  const status = known
    ? scheduled
      ? t('Scheduled')
      : t('Live')
    : liveDown
      ? t('Live times paused · typical service')
      : t('Waiting for the tracker');
  return (
    <section className="next-hero" aria-live="polite" aria-label={t('Your next shuttle')}>
      <div className="next-hero-row">
        <span className="next-hero-route" aria-hidden="true">
          {routeShort}
        </span>
        <span className="next-hero-where">
          <strong>{lotLabel}</strong>
          <span>
            {t('to {place}', { place: destination })}
            {stopName ? ` · ${stopName}` : ''}
          </span>
        </span>
        <motion.span
          key={value}
          className="next-hero-time"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <strong>{value}</strong>
          {unit && <small>{unit}</small>}
        </motion.span>
      </div>
      <div className="next-hero-status">
        {liveDown && !known ? <Clock3 size={13} aria-hidden="true" /> : <i aria-hidden="true" />}
        {status}
      </div>
    </section>
  );
}
