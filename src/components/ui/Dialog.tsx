import { useLayoutEffect, useRef } from 'react';

export default function Dialog({
  open,
  onClose,
  titleId,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const box = panel.current;
    if (!dialog || !box) return;
    if (open && !dialog.open) dialog.showModal();
    if (!dialog.open) return;
    // Keep the native focus trap/top layer until the exit finishes. Avoid
    // competing CSS scale, opacity and discrete top-layer transitions on Safari.
    if (!box.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (!open) dialog.close();
      return;
    }
    let active = true;
    const animation = box.animate(
      open
        ? [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'none' },
          ]
        : [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: 'translateY(8px)' },
          ],
      { duration: open ? 180 : 140, easing: 'ease-out', fill: 'both' },
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
      <div ref={panel} className="modal-box install-dialog app-dialog-panel">
        {children}
      </div>
    </dialog>
  );
}
