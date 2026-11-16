import { lazy, Suspense, useId, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useAccount } from '../hooks/useAccount';
import { useAvatar } from '../hooks/useAvatar';
import { useNickname } from '../hooks/useNickname';
import { THEME_CHOICE_ENABLED, useTheme } from '../theme/ThemeProvider';
import { PALETTES } from '../theme/palettes';
import type { Commute } from '../types';
import AppearancePicker from './AppearancePicker';
import Avatar from './Avatar';
import AvatarPicker from './AvatarPicker';
import DeveloperFeedback from './DeveloperFeedback';
import InstallApp from './InstallApp';
import LanguageSwitch from './LanguageSwitch';
import NicknameField from './NicknameField';
import ReleaseNotes from './ReleaseNotes';
import ShareApp from './ShareApp';
import { GuideContent } from './ShuttleGuide';
import ThemePicker from './ThemePicker';
import Button from './ui/Button';
import Dialog from './ui/Dialog';
import Row from './ui/Row';
import { BookOpen, ChevronLeft, LockKeyhole, Palette, ShieldCheck, UserRound } from './ui/icons';

const AccountPanel = lazy(() => import('./AccountPanel'));
type Sheet = 'avatar' | 'theme' | 'privacy' | 'guide' | null;

/** Everything about the rider and the app: profile, account, display and app settings. */
export default function MePage({
  profile,
  accountOpen,
  onAccountOpen,
  onEditTrip,
  onGuest,
}: {
  profile: Commute;
  accountOpen: boolean;
  onAccountOpen: (open: boolean) => void;
  onEditTrip: () => void;
  onGuest: () => void;
}) {
  const { t } = useLanguage();
  const { user } = useAccount();
  const { avatar } = useAvatar();
  const { nickname } = useNickname();
  const { palette } = useTheme();
  const [sheet, setSheet] = useState<Sheet>(null);
  const titleId = useId();
  const close = () => setSheet(null);

  if (accountOpen)
    return (
      <section className="page-content">
        <Button className="back-button" onClick={() => onAccountOpen(false)}>
          <ChevronLeft size={18} aria-hidden="true" />
          {t('Me')}
        </Button>
        <h1>{t('Account')}</h1>
        <Suspense fallback={<p className="hint">{t('Loading your account…')}</p>}>
          <AccountPanel profile={profile} onSaved={onEditTrip} onGuest={onGuest} />
        </Suspense>
      </section>
    );

  const themeName = PALETTES.find((p) => p.id === palette)?.name || '';
  return (
    <section className="page-content me">
      <h1>{t('Me')}</h1>
      <div className="profile-card">
        <Avatar id={avatar} size={56} />
        <span className="row-text">
          <strong>{nickname || t('Guest')}</strong>
          <small>{user ? user.email : t('Saved on this device.')}</small>
        </span>
      </div>
      {user ? (
        <div className="group">
          <Row
            icon={<UserRound size={18} />}
            label={t('Account')}
            detail={t('Your saved commute syncs with this account.')}
            onClick={() => onAccountOpen(true)}
          />
        </div>
      ) : (
        <Button className="button-primary" onClick={() => onAccountOpen(true)}>
          {t('Sign in to sync your trip')}
        </Button>
      )}

      <h2 className="group-title">{t('Profile')}</h2>
      <div className="group">
        <NicknameField />
        <Row
          icon={<Avatar id={avatar} size={26} />}
          label={t('Your avatar')}
          aria-haspopup="dialog"
          onClick={() => setSheet('avatar')}
        />
      </div>

      <h2 className="group-title">{t('Display')}</h2>
      <div className="group">
        <AppearancePicker />
        {THEME_CHOICE_ENABLED && (
          <Row
            icon={<Palette size={18} />}
            label={t('Theme')}
            value={t(themeName)}
            aria-haspopup="dialog"
            onClick={() => setSheet('theme')}
          />
        )}
        <div className="field">
          <span>{t('Language')}</span>
          <LanguageSwitch />
        </div>
      </div>

      <h2 className="group-title">{t('App')}</h2>
      <div className="group">
        <InstallApp />
        <ShareApp />
        <ReleaseNotes />
        <DeveloperFeedback />
        <Row
          icon={<BookOpen size={18} />}
          label={t('Shuttle guide')}
          aria-haspopup="dialog"
          onClick={() => setSheet('guide')}
        />
        <Row
          icon={<ShieldCheck size={18} />}
          label={t('Privacy')}
          aria-haspopup="dialog"
          onClick={() => setSheet('privacy')}
        />
      </div>
      <p className="credit">
        <a href="https://normanlinn.github.io/portfolio" target="_blank" rel="noopener noreferrer">
          {t('Created by {name}', { name: 'Norman Linn' })}
        </a>
      </p>

      <Dialog
        open={sheet === 'avatar'}
        onClose={close}
        titleId={`${titleId}-avatar`}
        title={t('Your avatar')}
        closeLabel={t('Close')}
      >
        <AvatarPicker />
      </Dialog>
      <Dialog
        open={sheet === 'theme'}
        onClose={close}
        titleId={`${titleId}-theme`}
        title={t('Theme')}
        closeLabel={t('Close')}
      >
        <ThemePicker />
      </Dialog>
      <Dialog
        open={sheet === 'guide'}
        onClose={close}
        titleId={`${titleId}-guide`}
        title={t('Shuttle guide')}
        closeLabel={t('Close')}
        className="guide-sheet"
      >
        <GuideContent heading={false} />
      </Dialog>
      <Dialog
        open={sheet === 'privacy'}
        onClose={close}
        titleId={`${titleId}-privacy`}
        title={t('Privacy')}
        closeLabel={t('Close')}
        className="privacy-sheet"
      >
        <p>
          <LockKeyhole size={16} aria-hidden="true" />{' '}
          {t(
            'We use hashed network identifiers to limit abusive requests. You can delete your account from Account.',
          )}
        </p>
        <p>
          {t(
            'Anonymous crowd reports (bus ID, crowd level and time), stop observations (route, stop, activity, crowd level and time), and optional developer feedback are stored in Supabase. Crowd reports are shown for 15 minutes; feedback is private to the developer. Guest commute, theme and language settings stay in your browser. If you create an account, Supabase stores your email, password hash and saved commute. Location is used on your device to find nearby stops and is not saved to your account. Map providers receive requests for the area you view. Signing out does not remove settings stored on this device.',
          )}
        </p>
        {import.meta.env.VITE_CF_WEB_ANALYTICS_TOKEN && (
          <p>
            {t(
              'This app uses Cloudflare Web Analytics to measure visits without analytics cookies.',
            )}
          </p>
        )}
        <p className="legal-links">
          <a href="/legal/privacy.html">{t('Privacy policy')}</a>
          <a href="/legal/terms.html">{t('Terms of use')}</a>
        </p>
      </Dialog>
    </section>
  );
}
