import { motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';
import { Bookmark, Map, UserRound } from './ui/icons';

export type Tab = 'map' | 'trip' | 'me';
const TABS = [
  { id: 'map', label: 'Explore', Icon: Map },
  { id: 'trip', label: 'My trip', Icon: Bookmark },
  { id: 'me', label: 'Me', Icon: UserRound },
] as const;

/** The three tabs: a bottom bar on phones, pills at the top of the panel on desktop. */
export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion() === true;
  return (
    <nav className="tabbar" aria-label={t('Main navigation')}>
      {TABS.map(({ id, label, Icon }) => (
        <Button
          key={id}
          className={tab === id ? 'active' : ''}
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          {tab === id && (
            <motion.span
              layoutId="tab-pill"
              className="tab-pill"
              aria-hidden="true"
              transition={
                reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }
              }
            />
          )}
          <Icon size={22} aria-hidden="true" />
          <span>{t(label)}</span>
        </Button>
      ))}
    </nav>
  );
}
