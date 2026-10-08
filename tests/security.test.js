// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { safeAttribution } from '../src/domain/attribution';
import { readFileSync } from 'node:fs';
import { handleAPI } from '../worker/index';

it('keeps attribution credit while removing executable HTML and unsafe links', () => {
  const result = safeAttribution(
    '<img src=x onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)" onclick="alert(4)">Bad link</a><a href="https://www.openstreetmap.org/copyright" onmouseover="alert(5)">© OpenStreetMap</a>',
  );
  const div = document.createElement('div');
  div.innerHTML = result;
  expect(div.textContent).toBe('Bad link© OpenStreetMap');
  expect(div.querySelectorAll('a')).toHaveLength(1);
  expect(div.querySelector('a').getAttribute('href')).toBe(
    'https://www.openstreetmap.org/copyright',
  );
  expect(result).not.toMatch(/onerror|onclick|onmouseover|javascript:|<script|<img/);
});

it('does not allow encoded script URLs or SVG handlers', () => {
  const result = safeAttribution(
    '<a href="java&#x73;cript:alert(1)">credit</a><svg onload="alert(2)"></svg>',
  );
  expect(result).toBe('credit');
});

it('applies API protections to success and failure responses', async () => {
  for (const request of [
    new Request('https://app.test/api/health'),
    new Request('https://app.test/api/live/999'),
  ]) {
    const response = await handleAPI(request);
    expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(response.headers.get('cache-control')).toBe('no-store');
  }
});

it('restricts executable scripts and frames while allowing map rendering', () => {
  const headers = readFileSync('public/_headers', 'utf8');
  const policy = headers.split('\n').find((line) => line.includes('Content-Security-Policy:'));
  const scripts = policy.split(';').find((part) => part.includes('script-src '));
  expect(scripts).toContain("'self'");
  expect(scripts).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
  expect(policy).toContain("script-src-attr 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("worker-src 'self' blob:");
});
