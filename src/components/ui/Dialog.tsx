import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { X } from './icons';

/**
 * A modal sheet: slides up from the bottom on phones and sits centered on wider screens.
 * Pass `title` and `closeLabel` for the standard heading with a close button.
 */
export default function Dialog({
  open,
  onClose,
  titleId,
  title,
  closeLabel,
  className = '',
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title?: ReactNode;
  closeLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const box = panel.current;
    if (!dialog || !box) return;
    if (open && !dialog.open) dialog.showModal();
    if (!dialog.open) return;
    // Keep the native focus trap and top layer until the exit finishes.
    if (!box.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (!open) dialog.close();
      return;
    }
    let active = true;
    const animation = box.animate(
      open
        ? [
            { transform: 'translateY(24px)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ]
        : [
            { transform: 'none', opacity: 1 },
            { transform: 'translateY(24px)', opacity: 0 },
          ],
      { duration: open ? 220 : 150, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' },
    );
    animation.finished
      .then(() => {
        if (active && !open) dialog.close();
      })
      .catch(() => {});
    return () => {
      active = false;
      animation.cancel();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="app-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panel} className={`dialog-panel ${className}`}>
        <span className="dialog-grip" aria-hidden="true" />
        {title !== undefined && (
          <header className="dialog-head">
            <h2 id={titleId}>{title}</h2>
            {closeLabel && (
              <button
                type="button"
                className="btn icon-btn"
                aria-label={closeLabel}
                onClick={onClose}
              >
                <X size={18} />
              </button>
            )}
          </header>
        )}
        {children}
      </div>
    </dialog>
  );
}
