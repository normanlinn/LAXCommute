// Builds the in-app "What's new" history from git, so every pushed update shows up
// without maintaining a changelog by hand. Exposed as `virtual:release-history`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ID = 'virtual:release-history';
const HIDDEN = /^(docs|chore|test|ci|build|style)(\(.*\))?!?:/i;

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/** Turns a commit subject into a rider-facing line with a category. */
export function describe(subject) {
  const match = subject.match(/^(\w+)(?:\(([^)]*)\))?!?:\s*(.+)$/);
  const type = match?.[1].toLowerCase();
  const scope = match?.[2]?.toLowerCase();
  let text = (match ? match[3] : subject).trim();
  text = text.charAt(0).toUpperCase() + text.slice(1);
  const kind =
    scope === 'deps' || /\b(security|harden|audit)\b/i.test(text)
      ? 'security'
      : type === 'fix' || /^fix\b/i.test(text)
        ? 'fix'
        : type === 'feat' || /^(add|show|offer|support)\b/i.test(text)
          ? 'new'
          : /^(restyle|refresh|unify|use|match|redesign)\b/i.test(text) || scope === 'ui'
            ? 'design'
            : 'improved';
  return { kind, text };
}

/**
 * The released version: package.json's version plus the commits since it was last set.
 * Each feature raises the minor number; each other user-facing change raises the patch.
 */
export function nextVersion(base, subjectsSince) {
  let [major, minor, patch] = base.split('.').map((n) => Number(n) || 0);
  for (const subject of subjectsSince) {
    if (HIDDEN.test(subject)) continue;
    if (/^feat(\(.*\))?!?:/i.test(subject)) {
      minor += 1;
      patch = 0;
    } else patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

export function releaseHistory(log, version, builtAt = new Date().toISOString()) {
  const entries = log
    .split('\n')
    .map((line) => line.split('\u001f'))
    .filter(([hash, date, subject]) => hash && date && subject && !HIDDEN.test(subject))
    .map(([hash, date, subject]) => ({ hash, date, ...describe(subject) }));
  const days = [];
  for (const entry of entries) {
    const day = days.at(-1);
    if (day?.date === entry.date) day.items.push({ kind: entry.kind, text: entry.text });
    else days.push({ date: entry.date, items: [{ kind: entry.kind, text: entry.text }] });
  }
  return {
    version,
    commit: entries[0]?.hash || '',
    builtAt,
    totalUpdates: entries.length,
    firstRelease: entries.at(-1)?.date || '',
    days,
  };
}

export function releaseHistoryPlugin() {
  return {
    name: 'release-history',
    resolveId: (id) => (id === ID ? `\0${ID}` : null),
    load(id) {
      if (id !== `\0${ID}`) return null;
      const { version: base } = JSON.parse(readFileSync('package.json', 'utf8'));
      const log = git(['log', '--date=short', '--pretty=%h%x1f%ad%x1f%s']);
      // Commits since the one that last set package.json's version.
      const since = git([
        'log',
        '-1',
        '--format=%H',
        '-G',
        '"version":',
        '--',
        'package.json',
      ]).trim();
      const subjects = since
        ? git(['log', '--reverse', '--format=%s', `${since}..HEAD`])
            .split('\n')
            .filter(Boolean)
        : [];
      return `export default ${JSON.stringify(releaseHistory(log, nextVersion(base, subjects)))};`;
    },
  };
}
