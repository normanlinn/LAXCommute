import { useId, useState } from 'react';
import { MessageSquare } from './ui/icons';
import Row from './ui/Row';
import { useLanguage } from '../i18n/LanguageProvider';
import { sendDeveloperFeedback } from '../services/community';
import Button from './ui/Button';
import Dialog from './ui/Dialog';

export default function DeveloperFeedback() {
  const titleId = useId();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus('');
    try {
      await sendDeveloperFeedback(category, message.trim(), email.trim());
      setMessage('');
      setEmail('');
      setStatus(t('Your feedback was sent. Thank you!'));
    } catch (error) {
      setStatus(
        error instanceof Error ? t(error.message) : t('Unable to send feedback. Please try again.'),
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <Row
        icon={<MessageSquare size={18} />}
        label={t('Send feedback to the developer')}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
          setStatus('');
        }}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        title={t('Feedback to developer')}
        closeLabel={t('Close')}
      >
        <div className="feedback-modal">
          <p>{t('Found a bug or have an idea to improve LAXCommute? Let us know.')}</p>
          <form onSubmit={submit}>
            <label>
              {t('Type of feedback')}
              <select
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="suggestion">{t('Suggestion')}</option>
                <option value="bug">{t('Report a bug')}</option>
                <option value="other">{t('Other feedback')}</option>
              </select>
            </label>
            <label>
              {t('Your message')}
              <textarea
                className="textarea"
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('Tell us what happened or what you would improve…')}
              />
            </label>
            <label>
              {t('Email (optional, for a reply)')}
              <input
                className="input"
                type="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <p className="hint">
              {t(
                'Only the developer can read your message. Please do not include passwords or sensitive information.',
              )}
            </p>
            <Button
              className="button-primary"
              type="submit"
              disabled={sending || message.trim().length < 10 || !navigator.onLine}
            >
              {sending ? t('Sending…') : t('Send feedback')}
            </Button>
            {status && (
              <p role="status" className="notice">
                {status}
              </p>
            )}
          </form>
        </div>
      </Dialog>
    </>
  );
}
