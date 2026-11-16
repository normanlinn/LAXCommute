import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ChevronRight } from './icons';
import Button from './Button';

type RowProps = {
  icon?: ReactNode;
  label: ReactNode;
  detail?: ReactNode;
  value?: ReactNode;
  chevron?: boolean;
};

/** The inside of a grouped-list row: icon tile, label with optional detail, value, chevron. */
export function RowContent({ icon, label, detail, value, chevron = true }: RowProps) {
  return (
    <>
      {icon && (
        <span className="row-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="row-text">
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      {value !== undefined && <span className="row-value">{value}</span>}
      {chevron && <ChevronRight size={16} className="row-chevron" aria-hidden="true" />}
    </>
  );
}

/** A tappable grouped-list row, like a row in iPhone Settings. */
export default function Row({
  icon,
  label,
  detail,
  value,
  chevron,
  className = '',
  ...props
}: RowProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'>) {
  return (
    <Button className={`row ${className}`} {...props}>
      <RowContent icon={icon} label={label} detail={detail} value={value} chevron={chevron} />
    </Button>
  );
}
