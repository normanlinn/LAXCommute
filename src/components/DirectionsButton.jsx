import { useId, useState } from 'react';
import { ExternalLink, Navigation, X } from 'lucide-react';
import { directionsLinks } from '../domain/commute';
import Button from './ui/Button';
import Dialog from './ui/Dialog';

export default function DirectionsButton({ stop }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return (
    <>
      <Button className="directions-link" onClick={() => setOpen(true)}>
        <Navigation size={15} /> Directions to this stop
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} titleId={titleId}>
        <Button
          className="modal-close"
          aria-label="Close directions"
          onClick={() => setOpen(false)}
        >
          <X size={19} />
        </Button>
        <span className="eyebrow">WALK TO YOUR SHUTTLE</span>
        <h2 id={titleId}>Open directions</h2>
        <p>{stop.name}</p>
        <div className="directions-options">
          {directionsLinks(stop).map(({ label, href }) => (
            <a key={label} href={href} className="btn btn-soft button button-light">
              {label} <ExternalLink size={16} />
            </a>
          ))}
        </div>
      </Dialog>
    </>
  );
}
