import { motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '../i18n/LanguageProvider';
import { BusFront, Clock3 } from './ui/icons';

type Props = {
  routeShort: string;
  lotLabel: string;
  stopName?: string;
  /** Minutes to the next bus, or null when no live or scheduled time is known. */
  minutes: number | null;
  arriving: boolean;
  scheduled: boolean;
  liveDown: boolean;
};

/** The one answer riders look for first: which shuttle, from where, and how soon. */
export default function NextShuttleHero({
  routeShort,
  lotLabel,
  stopName,
  minutes,
  arriving,
  scheduled,
  liveDown,
}: Props) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const answer = arriving
    ? t('Arriving')
    : minutes !== null
      ? t('{minutes} min', { minutes })
      : liveDown
        ? t('Every 7–15 min')
        : t('Checking…');
  const note =
    arriving || minutes !== null
      ? scheduled
        ? t('Scheduled')
        : t('Live')
      : liveDown
        ? t('Typical service')
        : t('Waiting for the tracker');
  return (
    <section className="next-hero" aria-live="polite" aria-label={t('Your next shuttle')}>
      <div className="next-hero-top">
        <span className="next-hero-route" aria-hidden="true">
          {routeShort}
        </span>
        <span className="next-hero-label">{lotLabel}</span>
        <span className={`next-hero-badge${liveDown ? ' is-paused' : ''}`}>
          {liveDown ? <Clock3 size={12} aria-hidden="true" /> : <i aria-hidden="true" />}
          {note}
        </span>
      </div>
      <motion.strong
        key={answer}
        className="next-hero-time"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {answer}
      </motion.strong>
      <span className="next-hero-stop">
        <BusFront size={15} aria-hidden="true" />
        {stopName || t('Choose a boarding stop')}
      </span>
    </section>
  );
}
