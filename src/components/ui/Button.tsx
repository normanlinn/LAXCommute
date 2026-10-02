// DaisyUI supplies appearance, focus, hover, disabled, and sizing styles.
// Keep one small wrapper so buttons stay consistent throughout the app.
export default function Button({
  className = '',
  type = 'button',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tone = className.includes('button-primary')
    ? 'btn-primary'
    : className.includes('button-light')
      ? 'btn-soft'
      : className.includes('text-button')
        ? 'btn-link btn-sm'
        : 'btn-ghost';
  return (
    <button type={type} className={`btn ${tone} ${className}`} {...props}>
      {children}
    </button>
  );
}
