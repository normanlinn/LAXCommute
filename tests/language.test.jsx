// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LanguageSwitch from '../src/components/LanguageSwitch';
import ShuttleGuide from '../src/components/ShuttleGuide';
import { LANGUAGE_STORAGE_KEY, LanguageProvider, useLanguage } from '../src/i18n/LanguageProvider';

function ArrivalLabel() {
  const { t } = useLanguage();
  return <p>{t('Leave in {minutes} min', { minutes: 12 })}</p>;
}
function openSwitch() {
  return render(
    <LanguageProvider>
      <LanguageSwitch />
      <ArrivalLabel />
    </LanguageProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = 'en';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.getElementById('shuttle-guide')?.remove();
  document.documentElement.lang = 'en';
});

describe('language preference', () => {
  it('starts in English, switches arrival text, and remembers the choice after reopening', () => {
    const first = openSwitch();
    expect(screen.getByText('Leave in 12 min')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'မြန်မာ' }));
    expect(screen.queryByText('Leave in 12 min')).toBeNull();
    expect(screen.getByText(/12/).textContent).toContain('မိနစ်');
    expect(document.documentElement.lang).toBe('my');
    expect(document.title).toContain('ဝန်ထမ်း');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('my');
    first.unmount();
    openSwitch();
    expect(screen.getByRole('button', { name: 'မြန်မာ' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByText('Leave in 12 min')).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('uses English when a stored preference is invalid', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'unsupported');
    openSwitch();
    expect(screen.getByText('Leave in 12 min')).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
  });

  it('still switches languages when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    openSwitch();
    fireEvent.click(screen.getByRole('button', { name: 'မြန်မာ' }));
    expect(document.documentElement.lang).toBe('my');
    expect(screen.queryByText('Leave in 12 min')).toBeNull();
  });

  it('translates the boarding guide and keeps its accessible section name and source link', () => {
    const target = document.createElement('section');
    target.id = 'shuttle-guide';
    target.setAttribute('aria-labelledby', 'shuttle-guide-title');
    document.body.append(target);
    render(
      <LanguageProvider>
        <LanguageSwitch />
        <ShuttleGuide target={target} />
      </LanguageProvider>,
    );
    expect(screen.getByRole('region').getAttribute('aria-labelledby')).toBe('shuttle-guide-title');
    expect(screen.getByRole('region').textContent).toContain('boarding guide');
    fireEvent.click(screen.getByRole('button', { name: 'မြန်မာ' }));
    expect(screen.getByRole('region').textContent).toContain('စီးနည်းလမ်းညွှန်');
    expect(screen.queryByText('How do I save my trip?')).toBeNull();
    expect(target.querySelector('a[target="_blank"]').href).toBe(
      'https://shuttles.flylax.com/employeeparking',
    );
  });
});
