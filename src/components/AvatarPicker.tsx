import { useId } from 'react';
import { AVATARS } from '../domain/avatars';
import { useAvatar } from '../hooks/useAvatar';
import { useAccount } from '../hooks/useAccount';
import { useLanguage } from '../i18n/LanguageProvider';
import { haptic } from '../domain/haptics';
import Avatar from './Avatar';

/** A grid of avatars to choose from, as a single-choice radio group. */
export default function AvatarPicker() {
  const { t } = useLanguage();
  const { user } = useAccount();
  const { avatar, setAvatar } = useAvatar();
  const name = useId();
  return (
    <fieldset className="avatar-picker">
      <legend>{t('Your avatar')}</legend>
      <div className="avatar-grid">
        {AVATARS.map((option) => (
          <label key={option.id} title={t(option.label)}>
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={avatar === option.id}
              onChange={() => {
                haptic('select');
                void setAvatar(option.id);
              }}
              aria-label={t(option.label)}
            />
            <Avatar id={option.id} size={48} />
          </label>
        ))}
      </div>
      <p className="avatar-note">
        {user ? t('Saved to your account.') : t('Saved on this device.')}
      </p>
    </fieldset>
  );
}
