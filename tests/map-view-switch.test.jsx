// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ShuttleMap from '../src/components/ShuttleMap';
vi.mock('../src/components/FreeMap', () => ({
  default: () => <div>Street map with SVG route ready</div>,
}));
afterEach(cleanup);
it('shows one combined map without a Route view / Street map switch', async () => {
  render(<ShuttleMap />);
  await screen.findByText('Street map with SVG route ready');
  expect(screen.queryByRole('button', { name: 'Route view' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Street map' })).toBeNull();
});
