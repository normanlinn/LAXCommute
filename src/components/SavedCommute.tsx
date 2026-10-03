import { useLanguage } from '../i18n/LanguageProvider';
import { errorMessage } from '../domain/errors';
import Button from './ui/Button';
import { useMemo, useState } from 'react';
import { Bookmark, ArrowRight, Check, Footprints } from 'lucide-react';
import { boardingStops, ROUTES, TERMINALS, routeForLot, terminalKey } from '../domain/commute';
import { useRoute } from '../hooks/useShuttle';
import { useAccount } from '../hooks/useAccount';

export default function SavedCommute({
  profile,
  save,
  saveState,
  onGoHome,
  onAccount,
}: {
  profile: import('../types').Commute;
  save: (value: import('../types').Commute) => Promise<void>;
  saveState: string;
  onGoHome: () => void;
  onAccount: () => void;
}) {
  const { t } = useLanguage();
  const { user } = useAccount();
  const [draft, setDraft] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const route = routeForLot(draft.lot);
  const query = useRoute(route.id);
  const stops = query.data?.stops || [];
  const terminalStops = useMemo(
    () =>
      boardingStops(stops, 'parking', draft.lot).filter(
        (s) => terminalKey(s.name) === terminalKey(draft.terminal),
      ),
    [stops, draft.lot, draft.terminal],
  );
  const parkingStops = useMemo(() => boardingStops(stops, 'work', draft.lot), [stops, draft.lot]);
  function edit<K extends keyof import('../types').Commute>(
    key: K,
    value: import('../types').Commute[K],
  ) {
    setDraft((d) => ({
      ...d,
      [key]: value,
      ...(key === 'lot' ? { terminalStopID: 0, parkingStopID: 0 } : {}),
      ...(key === 'terminal' ? { terminalStopID: 0 } : {}),
    }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const terminal = terminalStops.find((s) => s.id === draft.terminalStopID) || terminalStops[0];
    const parking = parkingStops.find((s) => s.id === draft.parkingStopID) || parkingStops[0];
    if (!terminal || !parking) {
      setError('Choose a terminal served by this route and wait for its boarding stops to load.');
      return;
    }
    setBusy(true);
    try {
      await save({
        ...draft,
        terminalStopID: terminal.id,
        terminalStopName: terminal.name,
        parkingStopID: parking.id,
        parkingStopName: parking.name,
      });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card bg-base-100 page-card saved-card">
      <div className="feature-icon">
        <Bookmark size={27} />
      </div>
      <span className="eyebrow">{t('YOUR EVERYDAY ROUTE')}</span>
      <h1>{t('A commute that remembers.')}</h1>
      <p>{t('Save your usual stops. Changing today’s boarding stop won’t overwrite them.')}</p>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            {' '}
            {t('Usual terminal')}{' '}
            <select
              className="select w-full"
              value={draft.terminal}
              onChange={(e) => edit('terminal', e.target.value)}
            >
              {TERMINALS.map((t) => (
                <option key={t} value={t} lang="en">
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {' '}
            {t('Parking lot')}{' '}
            <select
              className="select w-full"
              value={draft.lot}
              onChange={(e) => edit('lot', e.target.value)}
            >
              {ROUTES.map((r) => (
                <option key={r.id} value={r.lot} lang="en">
                  {r.lot}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          {' '}
          {t('Board here to return to parking')}{' '}
          <select
            className="select w-full"
            value={
              terminalStops.some((s) => s.id === draft.terminalStopID)
                ? draft.terminalStopID
                : terminalStops[0]?.id || 0
            }
            onChange={(e) => edit('terminalStopID', Number(e.target.value))}
          >
            <option value={0} disabled>
              {query.isPending
                ? t('Loading boarding stops…')
                : terminalStops.length
                  ? t('Choose terminal stop')
                  : t('This terminal is not served by this lot')}
            </option>
            {terminalStops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {' '}
          {t('Board here to go to work')}{' '}
          <select
            className="select w-full"
            value={
              parkingStops.some((s) => s.id === draft.parkingStopID)
                ? draft.parkingStopID
                : parkingStops[0]?.id || 0
            }
            onChange={(e) => edit('parkingStopID', Number(e.target.value))}
          >
            <option value={0} disabled>
              {query.isPending ? t('Loading parking stops…') : t('Choose parking stop')}
            </option>
            {parkingStops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="walk-settings">
          <Footprints size={20} />
          <div>
            <strong>{t('Time to reach the bus')}</strong>
            <span>{t('Include the walk from your office and elevator time.')}</span>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            {' '}
            {t('Walking time (minutes)')}{' '}
            <input
              className="input w-full"
              type="number"
              min={1}
              max={45}
              value={draft.walkingMinutes}
              onChange={(e) => edit('walkingMinutes', Number(e.target.value))}
            />
          </label>
          <label className="field">
            {' '}
            {t('Extra buffer (minutes)')}{' '}
            <input
              className="input w-full"
              type="number"
              min={0}
              max={10}
              value={draft.bufferMinutes}
              onChange={(e) => edit('bufferMinutes', Number(e.target.value))}
            />
          </label>
        </div>
        {query.isError && (
          <p className="alert alert-soft alert-warning notice">
            {' '}
            {t('Boarding stops could not load.')}{' '}
            <Button type="button" onClick={() => query.refetch()}>
              {' '}
              {t('Retry')}{' '}
            </Button>
          </p>
        )}
        <Button
          type="submit"
          className="button button-primary full-width"
          disabled={busy || query.isPending}
        >
          {busy ? t('Saving…') : t('Save my commute')}
          <Check size={18} />
        </Button>
      </form>
      {error && (
        <p className="alert alert-soft alert-warning notice" role="alert">
          {t(error)}
        </p>
      )}
      {saveState && (
        <p className="alert alert-soft alert-success success-message" role="status">
          {t(saveState)}
        </p>
      )}
      <Button className="button button-light full-width" onClick={onGoHome}>
        {' '}
        {t('See my ride back to parking')} <ArrowRight size={18} />
      </Button>
      {!user && (
        <p className="guest-note">
          {' '}
          {t('Saved on this device.')}{' '}
          <Button className="text-button" onClick={onAccount}>
            {' '}
            {t('Sign in to sync your commute.')}{' '}
          </Button>
        </p>
      )}
    </section>
  );
}
