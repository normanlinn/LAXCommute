// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ALERT_LEAD_MS, canSetAlert, useBusAlert } from '../src/hooks/useBusAlert';

const NOW = Date.parse('2026-10-31T08:00:00Z');
const live = (minutes, vehicleID = 541) => ({
  id: `p-${vehicleID}-${minutes}`,
  due: NOW + minutes * 60_000,
  scheduled: false,
  vehicleID,
  busName: String(vehicleID),
  vehicleUpdated: NOW,
});
const message = ({ busName }) => ({ title: 'Almost here', body: `Bus ${busName}` });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  navigator.vibrate = vi.fn(() => true);
});
afterEach(() => {
  vi.useRealTimers();
  delete navigator.vibrate;
});

describe('bus-close alert', () => {
  it('is only offered for live buses with enough lead time', () => {
    expect(canSetAlert(live(6), NOW)).toBe(true);
    expect(canSetAlert(live(2), NOW)).toBe(false);
    expect(canSetAlert({ ...live(6), scheduled: true }, NOW)).toBe(false);
  });

  it('fires once, two minutes before the live prediction, then clears', async () => {
    const predictions = [live(6)];
    const { result } = renderHook(() => useBusAlert({ stopID: 1, predictions, message }));
    await act(() => result.current.toggle(predictions[0]));
    expect(result.current.alert?.vehicleID).toBe(541);

    act(() => vi.advanceTimersByTime(6 * 60_000 - ALERT_LEAD_MS - 1_000));
    expect(result.current.fired).toBeNull();

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.fired?.busName).toBe('541');
    expect(result.current.alert).toBeNull();
    expect(navigator.vibrate).toHaveBeenCalledTimes(2);
  });

  it('follows a revised prediction for the same bus', async () => {
    let predictions = [live(6)];
    const { result, rerender } = renderHook(() => useBusAlert({ stopID: 1, predictions, message }));
    await act(() => result.current.toggle(predictions[0]));
    predictions = [live(9)];
    rerender();
    act(() => vi.advanceTimersByTime(5 * 60_000));
    expect(result.current.fired).toBeNull();
    act(() => vi.advanceTimersByTime(2 * 60_000));
    expect(result.current.fired).not.toBeNull();
  });

  it('cancels when tapped again or when the stop changes', async () => {
    const predictions = [live(6)];
    let stopID = 1;
    const { result, rerender } = renderHook(() => useBusAlert({ stopID, predictions, message }));
    await act(() => result.current.toggle(predictions[0]));
    await act(() => result.current.toggle(predictions[0]));
    expect(result.current.alert).toBeNull();

    await act(() => result.current.toggle(predictions[0]));
    stopID = 2;
    rerender();
    expect(result.current.alert).toBeNull();
    act(() => vi.advanceTimersByTime(10 * 60_000));
    expect(result.current.fired).toBeNull();
  });
});
