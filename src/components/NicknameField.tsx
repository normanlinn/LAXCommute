import { useEffect, useId, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useAccount } from '../hooks/useAccount';
import { useNickname } from '../hooks/useNickname';
import { NICKNAME_MAX, cleanNickname } from '../domain/nickname';
import { Check } from './ui/icons';

/** "What should we call you?" Saves when the rider pauses, leaves the field or presses Enter. */
export default function NicknameField() {
  const { t } = useLanguage();
  const { user } = useAccount();
  const { nickname, setNickname } = useNickname();
  const [draft, setDraft] = useState(nickname);
  const [saved, setSaved] = useState(false);
  const id = useId();
  useEffect(() => setDraft(nickname), [nickname]);

  function commit(value = draft) {
    if (cleanNickname(value) === nickname) return;
    void setNickname(value).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }
  useEffect(() => {
    if (cleanNickname(draft) === nickname) return;
    const timer = setTimeout(() => commit(draft), 900);
    return () => clearTimeout(timer);
    // Debounce on typing only; commit reads the latest draft.
  }, [draft]);

  return (
    <div className="nickname-field">
      <label htmlFor={id}>{t('What should we call you?')}</label>
      <div className="nickname-input">
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="nickname"
          maxLength={NICKNAME_MAX}
          placeholder={t('Nickname')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
        />
        <span className={`nickname-saved${saved ? ' is-visible' : ''}`} role="status">
          {saved && (
            <>
              <Check size={14} /> {t('Saved')}
            </>
          )}
        </span>
      </div>
      <p className="nickname-note">
        {user
          ? t('Used to greet you. Saved to your account.')
          : t('Used to greet you. Saved on this device.')}
      </p>
    </div>
  );
}
