// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import Dialog from '../src/components/ui/Dialog';
let animations;
beforeEach(() => {
  animations = [];
  window.matchMedia = vi.fn(() => ({ matches: false }));
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  Element.prototype.animate = vi.fn(() => {
    let resolve;
    const animation = {
      finished: new Promise((r) => {
        resolve = r;
      }),
      cancel: vi.fn(),
      finish: () => resolve(),
    };
    animations.push(animation);
    return animation;
  });
});
afterEach(() => {
  cleanup();
  delete Element.prototype.animate;
});
const view = (open) => (
  <Dialog open={open} onClose={() => {}} titleId="title">
    <h2 id="title">Menu</h2>
  </Dialog>
);
it('keeps the dialog in the top layer until its closing animation finishes', async () => {
  const app = render(view(true));
  app.rerender(view(false));
  expect(screen.getByRole('dialog').open).toBe(true);
  await act(async () => {
    animations.at(-1).finish();
  });
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('does not let an old closing animation hide a reopened menu', async () => {
  const app = render(view(true));
  app.rerender(view(false));
  const closing = animations.at(-1);
  app.rerender(view(true));
  await act(async () => {
    closing.finish();
  });
  expect(screen.getByRole('dialog').open).toBe(true);
  expect(closing.cancel).toHaveBeenCalled();
});
it('closes immediately when reduced motion is enabled', () => {
  window.matchMedia = vi.fn(() => ({ matches: true }));
  const app = render(view(true));
  app.rerender(view(false));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(Element.prototype.animate).not.toHaveBeenCalled();
});
