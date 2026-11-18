import {
  AirplaneTilt,
  Buildings,
  Bus,
  Car,
  Coffee,
  FilmSlate,
  Mountains,
  MusicNotes,
  Star,
  SunHorizon,
  TreePalm,
  Waves,
} from '@phosphor-icons/react';
import { avatarFor, type AvatarID } from '../domain/avatars';

const ICONS: Record<AvatarID, typeof Bus> = {
  plane: AirplaneTilt,
  palm: TreePalm,
  sunset: SunHorizon,
  star: Star,
  waves: Waves,
  film: FilmSlate,
  car: Car,
  bus: Bus,
  skyline: Buildings,
  music: MusicNotes,
  coffee: Coffee,
  mountains: Mountains,
};

/** A round avatar: a filled icon on one of the theme's three shades (see .avatar-circle). */
export default function Avatar({ id, size = 36 }: { id: AvatarID; size?: number }) {
  const avatar = avatarFor(id);
  const Icon = ICONS[avatar.id];
  return (
    <span
      className={`avatar-circle tone-${avatar.tone}`}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.52)} weight="fill" />
    </span>
  );
}
