import { useLanguage } from '../i18n/LanguageProvider';
import { errorMessage } from '../domain/errors';
import Button from './ui/Button';
import { useMemo, useState } from 'react';
import { Car, Check, UserRound } from './ui/icons';
import Row from './ui/Row';
import { boardingStops, ROUTES, TERMINALS, routeForLot, terminalKey } from '../domain/commute';
import { useRoute } from '../hooks/useShuttle';
import { useAccount } from '../hooks/useAccount';

export default function SavedCommute({
  profile,
  remember = true,
  save,
  saveState,
  onGoHome,
  onAccount,
}: {
  profile: import('../types').Commute;
  remember?: boolean;
  save: (value: import('../types').Commute, remember?: boolean) => Promise<void>;
  saveState: string;
  onGoHome: () => void;
  onAccount: () => void;
}) {
  const { t } = useLanguage();
  const { user } = useAccount();
  const [draft, setDraft] = useState(profile);
  const [rememberHere, setRememberHere] = useState(remember);
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
      await save(
        {
          ...draft,
          terminalStopID: terminal.id,
          terminalStopName: terminal.name,
          parkingStopID: parking.id,
          parkingStopName: parking.name,
        },
        rememberHere,
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  const stopValue = (list: { id: number }[], id: number) =>
    list.some((s) => s.id === id) ? id : list[0]?.id || 0;
  return (
    <section className="page-content my-trip">
      <h1>{t('My trip')}</h1>
      <p className="lead">{t('Set your usual trip once. Explore opens on it every time.')}</p>
      <form onSubmit={submit}>
        <div className="group">
          <label className="field">
            <span>{t('Usual terminal')}</span>
            <select value={draft.terminal} onChange={(e) => edit('terminal', e.target.value)}>
              {TERMINALS.map((name) => (
                <option key={name} value={name} lang="en">
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('Parking lot')}</span>
            <select value={draft.lot} onChange={(e) => edit('lot', e.target.value)}>
              {ROUTES.map((r) => (
                <option key={r.id} value={r.lot} lang="en">
                  {r.lot}
                </option>
              ))}
            </select>
          </label>
        </div>
        <h2 className="group-title">{t('Boarding stops')}</h2>
        <div className="group">
          <label className="field">
            <span>{t('Board here to go to work')}</span>
            <select
              value={stopValue(parkingStops, draft.parkingStopID)}
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
          <label className="field">
            <span>{t('Board here to return to parking')}</span>
            <select
              value={stopValue(terminalStops, draft.terminalStopID)}
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
        </div>
        <h2 className="group-title">{t('Time to reach the bus')}</h2>
        <div className="group">
          <label className="field">
            <span>{t('Walking time (minutes)')}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={45}
              value={draft.walkingMinutes}
              onChange={(e) => edit('walkingMinutes', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>{t('Extra buffer (minutes)')}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              value={draft.bufferMinutes}
              onChange={(e) => edit('bufferMinutes', Number(e.target.value))}
            />
          </label>
        </div>
        <p className="group-note">{t('Give yourself time for the walk and elevator.')}</p>
        <div className="group">
          <label className="field">
            <span>
              {t('Remember my commute on this browser')}
              <small>
                {rememberHere
                  ? t('Restore my lot, terminal and stops when I return.')
                  : t('Unchecked: keep settings for this browser session only.')}
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={rememberHere}
              onChange={(event) => setRememberHere(event.target.checked)}
            />
          </label>
        </div>
        {user && (
          <p className="group-note">{t('Your signed-in account also syncs your commute.')}</p>
        )}
        {query.isError && (
          <p className="notice is-warning">
            {t('Boarding stops could not load.')}{' '}
            <Button className="text-button" onClick={() => query.refetch()}>
              {t('Retry')}
            </Button>
          </p>
        )}
        <Button type="submit" className="button-primary" disabled={busy || query.isPending}>
          <Check size={18} aria-hidden="true" />
          {busy ? t('Saving…') : t('Save my commute')}
        </Button>
      </form>
      {error && (
        <p className="notice is-warning" role="alert">
          {t(error)}
        </p>
      )}
      {saveState && (
        <p className="notice is-success" role="status">
          {t(saveState)}
        </p>
      )}
      <div className="group">
        <Row icon={<Car size={18} />} label={t('See my ride back to parking')} onClick={onGoHome} />
        {!user && (
          <Row
            icon={<UserRound size={18} />}
            label={t('Sign in to sync your commute.')}
            detail={t('No account is needed to remember your commute.')}
            onClick={onAccount}
          />
        )}
      </div>
    </section>
  );
}
