import { useId, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import type { Stop } from '../types';
import { MapPin, Search, X } from './ui/icons';

const MAX_RESULTS = 6;

/** Search box over the map: type part of a stop or terminal name and pick it. */
export default function StopSearch({
  stops,
  selected,
  onChoose,
}: {
  stops: Stop[];
  selected?: Stop | null;
  onChoose: (stop: Stop) => void;
}) {
  const { t } = useLanguage();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return stops
      .filter((stop) => words.every((word) => stop.name.toLowerCase().includes(word)))
      .slice(0, MAX_RESULTS);
  }, [stops, query]);
  const showList = open && results.length > 0;

  function choose(stop: Stop) {
    onChoose(stop);
    setQuery('');
    setOpen(false);
    input.current?.blur();
  }

  return (
    <div className="stop-search">
      <label className="stop-search-box">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">{t('Search stops or terminals')}</span>
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={selected ? selected.name : t('Search stops or terminals')}
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter' && showList) {
              event.preventDefault();
              choose(results[active]);
            } else if (event.key === 'Escape') {
              setQuery('');
              setOpen(false);
            }
          }}
        />
        {query && (
          <button
            type="button"
            className="stop-search-clear"
            aria-label={t('Clear search')}
            onClick={() => {
              setQuery('');
              input.current?.focus();
            }}
          >
            <X size={15} />
          </button>
        )}
      </label>
      {showList && (
        <ul className="stop-search-list" id={listId} role="listbox">
          {results.map((stop, index) => (
            <li
              key={stop.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'is-active' : ''}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(stop);
              }}
              onMouseEnter={() => setActive(index)}
            >
              <MapPin size={15} aria-hidden="true" />
              <span>{stop.name}</span>
              {stop.id === selected?.id && <small>{t('Current')}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
