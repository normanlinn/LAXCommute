import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

// Phone sheet heights: a peek at the departure card, half the screen, or full.
export const DETENTS = ['peek', 'half', 'full'] as const;
const DRAG_START = 6;
const SNAP = 40;
const LONG_SWIPE = 220;

/**
 * The phone sheet's three heights. Drag the grip to move between them (long swipes jump two),
 * tap it to step through them, or use the arrow keys. While dragging, the sheet follows the
 * finger through the --drag custom property, so React does not re-render on every move.
 */
export function useSheetDetents(initial = 1) {
  const sheetRef = useRef<HTMLElement>(null);
  const [detent, setDetent] = useState(initial);
  const drag = useRef<{ pointer: number; startY: number; lastY: number } | null>(null);
  const ignoreClick = useRef(false);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    ignoreClick.current = false;
    drag.current = { pointer: event.pointerId, startY: event.clientY, lastY: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const gesture = drag.current;
    const sheet = sheetRef.current;
    if (!gesture || gesture.pointer !== event.pointerId || !sheet) return;
    gesture.lastY = event.clientY;
    const distance = gesture.lastY - gesture.startY;
    if (Math.abs(distance) < DRAG_START && !sheet.classList.contains('is-dragging')) return;
    sheet.classList.add('is-dragging');
    sheet.style.setProperty('--drag', `${distance}px`);
  }
  function finish(event: PointerEvent<HTMLButtonElement>, cancelled: boolean) {
    const gesture = drag.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    drag.current = null;
    const sheet = sheetRef.current;
    sheet?.classList.remove('is-dragging');
    sheet?.style.removeProperty('--drag');
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const distance = gesture.lastY - gesture.startY;
    ignoreClick.current = Math.abs(distance) >= DRAG_START;
    if (cancelled || Math.abs(distance) < SNAP) return;
    const steps = Math.abs(distance) > LONG_SWIPE ? 2 : 1;
    setDetent((current) => Math.max(0, Math.min(2, current + (distance < 0 ? steps : -steps))));
  }

  const gripProps = {
    'aria-expanded': detent > 0,
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finish(event, false),
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => finish(event, true),
    // The click that ends a drag does not also step the sheet.
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.detail !== 0 && ignoreClick.current) {
        ignoreClick.current = false;
        return;
      }
      setDetent((current) => (current + 1) % 3);
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowUp') setDetent((current) => Math.min(2, current + 1));
      else if (event.key === 'ArrowDown') setDetent((current) => Math.max(0, current - 1));
      else return;
      event.preventDefault();
    },
  };

  return {
    sheetRef,
    detent: DETENTS[detent],
    expanded: detent === 2,
    /** Raises the sheet to at least half height, e.g. after choosing a stop. */
    reveal: () => setDetent((current) => Math.max(current, 1)),
    gripProps,
  };
}
