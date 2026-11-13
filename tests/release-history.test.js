import { describe as group, expect, it } from 'vitest';
import { describe, nextVersion, releaseHistory } from '../scripts/release-history.mjs';

const line = (hash, date, subject) => [hash, date, subject].join('\u001f');

group('release history', () => {
  it('turns commit subjects into rider-facing lines', () => {
    expect(describe('feat(ui): live countdown and alerts')).toEqual({
      kind: 'new',
      text: 'Live countdown and alerts',
    });
    expect(describe('fix(mobile): restore inline form').kind).toBe('fix');
    expect(describe('fix(deps): clear audit findings').kind).toBe('security');
    expect(describe('Restyle dark appearance').kind).toBe('design');
    expect(describe('Fix Spanish labels overflowing').kind).toBe('fix');
  });

  it('groups by day, newest first, and hides docs-only commits from the count', () => {
    const log = [
      line('c3', '2026-11-04', 'fix(ui): one clear status'),
      line('c2', '2026-11-04', 'docs: update README'),
      line('b1', '2026-10-31', 'feat: closed-app bus alerts'),
      line('a1', '2026-09-30', 'Initial shuttle tracker'),
    ].join('\n');
    const history = releaseHistory(log, '3.0.0', '2026-11-04T00:00:00Z');
    expect(history.totalUpdates).toBe(3);
    expect(history.commit).toBe('c3');
    expect(history.firstRelease).toBe('2026-09-30');
    expect(history.days.map((d) => d.date)).toEqual(['2026-11-04', '2026-10-31', '2026-09-30']);
    expect(history.days[0].items).toEqual([{ kind: 'fix', text: 'One clear status' }]);
  });

  it('still builds without git history', () => {
    expect(releaseHistory('', '3.0.0').totalUpdates).toBe(0);
  });

  it('raises the version automatically from the commits since it was set', () => {
    expect(nextVersion('4.0.0', [])).toBe('4.0.0');
    expect(nextVersion('4.0.0', ['fix: tidy map labels'])).toBe('4.0.1');
    expect(nextVersion('4.0.0', ['fix: one', 'feat: themes', 'fix(ui): two', 'docs: readme'])).toBe(
      '4.1.1',
    );
  });
});
