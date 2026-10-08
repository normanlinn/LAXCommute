// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Arrivals from '../src/components/Arrivals';

const start = new Date('2026-10-06T12:00:00Z');
const stop = { id: 1, name: 'South Lot Stop #1' };
const props = {
  stop,
  direction: 'work',
  profile: { walkingMinutes: 5, bufferMinutes: 2 },
  onRefresh: vi.fn(),
  error: null,
  loading: false,
  fetching: false,
};
const freshData = () => ({
  arrivalFetchedAt: new Date().toISOString(),
  predictions: [{ id: 'bus-1', due: Date.now() + 120_000, scheduled: true }],
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('does not schedule countdown work while waiting for data or after an error', () => {
  const { rerender } = render(<Arrivals {...props} />);
  expect(vi.getTimerCount()).toBe(0);
  rerender(<Arrivals {...props} data={freshData()} error={new Error('Unavailable')} />);
  expect(vi.getTimerCount()).toBe(1);
});

it('expires predictions, stops the timer, and resumes on a fresh snapshot', () => {
  const { rerender } = render(<Arrivals {...props} data={freshData()} />);
  expect(vi.getTimerCount()).toBe(2);
  act(() => vi.advanceTimersByTime(90_000));
  expect(screen.getByText('These times have expired. Checking for a fresh update.')).toBeTruthy();
  expect(vi.getTimerCount()).toBe(1);
  rerender(<Arrivals {...props} data={freshData()} />);
  expect(screen.getByText('Next shuttle')).toBeTruthy();
  expect(vi.getTimerCount()).toBe(2);
});

it('pauses in the background and checks expiry immediately when visible again', () => {
  render(<Arrivals {...props} data={freshData()} />);
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  fireEvent(document, new Event('visibilitychange'));
  expect(vi.getTimerCount()).toBe(0);
  act(() => vi.advanceTimersByTime(100_000));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByText('These times have expired. Checking for a fresh update.')).toBeTruthy();
  expect(vi.getTimerCount()).toBe(1);
});

it('never shows cached predictions as live even when their timestamp is recent', () => {
  render(<Arrivals {...props} data={{ ...freshData(), cached: true }} />);
  expect(screen.getByText('Next shuttle')).toBeTruthy();
  expect(screen.getByText('Last reported')).toBeTruthy();
  expect(screen.queryByText('Live')).toBeNull();
  expect(screen.getByText('min at last update')).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
  act(() => vi.advanceTimersByTime(120_000));
  expect(screen.getByText(/Last updated 2 min ago/)).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
});

it('labels scheduled predictions accurately and reports sub-minute update age', () => {
  render(<Arrivals {...props} data={freshData()} />);
  expect(screen.getByText('Scheduled')).toBeTruthy();
  expect(screen.queryByText('Live')).toBeNull();
  act(() => vi.advanceTimersByTime(30_000));
  expect(screen.getByText(/Updated 30s ago/)).toBeTruthy();
});
