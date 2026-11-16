// Every button in the app goes through this wrapper so they share one base style (.btn).
// Variants are plain classes: button-primary, button-light, text-button, icon-btn, row.
export default function Button({
  className = '',
  type = 'button',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={`btn ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
