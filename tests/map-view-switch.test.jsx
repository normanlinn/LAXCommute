// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ShuttleMap from '../src/components/ShuttleMap';
const streetLoaded = vi.hoisted(() => vi.fn());
vi.mock('../src/components/RouteView', () => ({ default: () => <div>SVG route ready</div> }));
vi.mock('../src/components/FreeMap', () => {
  streetLoaded();
  return { default: () => <div>Street map ready</div> };
});
afterEach(cleanup);
it('starts with SVG and loads the street engine only after switching', async () => {
  render(<ShuttleMap />);
  await screen.findByText('SVG route ready');
  expect(streetLoaded).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Route view' }).getAttribute('aria-pressed')).toBe(
    'true',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Street map' }));
  await screen.findByText('Street map ready');
  expect(streetLoaded).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Route view' }));
  await screen.findByText('SVG route ready');
  expect(screen.queryByText('Street map ready')).toBeNull();
});
