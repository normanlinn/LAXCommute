import { flushSync } from 'react-dom';

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

/**
 * Applies a state change with a short crossfade between the old and new screen,
 * where the browser supports view transitions. React renders the change inside the
 * transition (flushSync), so the "after" snapshot is the real new state.
 * Reduced motion, older browsers and repeated taps fall back to an instant change.
 */
let running = false;
export function smoothly(change: () => void) {
  const doc = document as ViewTransitionDocument;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || running || !doc.startViewTransition) {
    change();
    return;
  }
  running = true;
  const transition = doc.startViewTransition(() => flushSync(change));
  void transition.finished.finally(() => {
    running = false;
  });
}
