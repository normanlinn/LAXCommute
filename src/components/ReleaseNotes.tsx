import { useId, useState } from 'react';
import { Bug, Paintbrush, ShieldCheck, CirclePlus, Sparkle, Wrench } from './ui/icons';
import Dialog from './ui/Dialog';
import Row from './ui/Row';
import history from 'virtual:release-history';
import { useLanguage } from '../i18n/LanguageProvider';

const KINDS = {
  new: { label: 'New', Icon: CirclePlus },
  improved: { label: 'Improved', Icon: Wrench },
  design: { label: 'Design', Icon: Paintbrush },
  fix: { label: 'Fix', Icon: Bug },
  security: { label: 'Security', Icon: ShieldCheck },
} as const;
const PAGE = 4;

/** Version and update timeline, generated from the app's git history at build time. */
export default function ReleaseNotes() {
  const { t, language } = useLanguage();
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const locale = language === 'my' ? 'my-MM' : language === 'es' ? 'es-US' : 'en-US';
  const date = (iso: string, year = true) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      ...(year ? { year: 'numeric' } : {}),
    });
  const latest = history.days[0];
  return (
    <>
      <Row
        icon={<Sparkle size={18} />}
        label={t("What's new")}
        value={`v${history.version}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        title={t("What's new")}
        closeLabel={t('Close')}
        className="release-notes"
      >
        <p className="hint">
          {t('{count} updates since {date}', {
            count: history.totalUpdates,
            date: history.firstRelease ? date(history.firstRelease) : '',
          })}
        </p>
        <dl className="release-stats">
          <div>
            <dt>{t('Updates')}</dt>
            <dd>{history.totalUpdates}</dd>
          </div>
          <div>
            <dt>{t('Release days')}</dt>
            <dd>{history.days.length}</dd>
          </div>
          <div>
            <dt>{t('Last update')}</dt>
            <dd>{latest ? date(latest.date, false) : '—'}</dd>
          </div>
        </dl>
        <ol className="release-timeline">
          {history.days.slice(0, shown).map((day, index) => (
            <li key={day.date}>
              <h4>
                {date(day.date)}
                {index === 0 && <span className="release-latest">{t('Latest')}</span>}
              </h4>
              <ul>
                {day.items.map((item, n) => {
                  const { label, Icon } = KINDS[item.kind] || KINDS.improved;
                  return (
                    <li key={n} className={`release-item kind-${item.kind}`}>
                      <span className="release-kind">
                        <Icon size={13} aria-hidden="true" /> {t(label)}
                      </span>
                      <span lang="en">{item.text}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
        {shown < history.days.length && (
          <button
            type="button"
            className="release-more"
            onClick={() => setShown(history.days.length)}
          >
            {t('Show all {count} release days', { count: history.days.length })}
          </button>
        )}
        {history.commit && (
          <p className="release-build">{t('Build {commit}', { commit: history.commit })}</p>
        )}
      </Dialog>
    </>
  );
}
