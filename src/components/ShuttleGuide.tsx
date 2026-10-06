import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n/LanguageProvider';
import { guides } from '../i18n/guide';

export default function ShuttleGuide({ target }: { target: HTMLElement }) {
  const { language, t } = useLanguage();
  const guide = guides[language];
  return createPortal(
    <details className="shuttle-guide-disclosure">
      <summary>
        {t('Shuttle guide')}
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div lang={language}>
        <h2 id="shuttle-guide-title">{guide.title}</h2>
        <p>{guide.introduction}</p>
        <div className="shuttle-guide-grid">
          {guide.routes.map(({ title, text }) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        {guide.questions.map(({ title, text }) => (
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
        <p className="shuttle-guide-note">{guide.note}</p>
        <a href="#root">{guide.back}</a>
      </div>
    </details>,
    target,
  );
}
