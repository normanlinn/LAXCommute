import { ChevronDown } from './ui/icons';
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n/LanguageProvider';
import { guides } from '../i18n/guide';

/** The boarding guide's text in the current language. */
export function GuideContent({ heading = true }: { heading?: boolean }) {
  const { language } = useLanguage();
  const guide = guides[language];
  return (
    <div className="guide-content" lang={language}>
      {heading && <h2 id="shuttle-guide-title">{guide.title}</h2>}
      <p>{guide.introduction}</p>
      {[...guide.routes, ...guide.questions].map(({ title, text }) => (
        <article key={title}>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
      <p>
        <a
          href="https://shuttles.flylax.com/employeeparking"
          target="_blank"
          rel="noopener noreferrer"
        >
          {guide.sourceLink}
        </a>
      </p>
      <p className="hint">{guide.note}</p>
    </div>
  );
}

/** Keeps the crawlable guide in the page outside the app; riders read it from Me. */
export default function ShuttleGuide({ target }: { target: HTMLElement }) {
  const { t } = useLanguage();
  return createPortal(
    <details className="shuttle-guide-disclosure">
      <summary>
        {t('Shuttle guide')}
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <GuideContent />
    </details>,
    target,
  );
}
