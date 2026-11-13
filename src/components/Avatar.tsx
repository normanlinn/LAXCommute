import {
  AirplaneTilt,
  Bus,
  Coffee,
  Compass,
  Headphones,
  Moon,
  Mountains,
  Suitcase,
  Sun,
  Ticket,
  TreePalm,
  Waves,
} from '@phosphor-icons/react';
import { avatarFor, type AvatarID } from '../domain/avatars';

const ICONS: Record<AvatarID, typeof Bus> = {
  plane: AirplaneTilt,
  bus: Bus,
  palm: TreePalm,
  sun: Sun,
  moon: Moon,
  coffee: Coffee,
  suitcase: Suitcase,
  headphones: Headphones,
  ticket: Ticket,
  waves: Waves,
  mountains: Mountains,
  compass: Compass,
};

/** A round avatar: a filled icon on the avatar's system color. */
export default function Avatar({ id, size = 36 }: { id: AvatarID; size?: number }) {
  const { color } = avatarFor(id);
  const Icon = ICONS[id];
  return (
    <span
      className="avatar-circle"
      aria-hidden="true"
      style={{ width: size, height: size, background: color }}
    >
      <Icon size={Math.round(size * 0.52)} weight="fill" color="#fff" />
    </span>
  );
}
