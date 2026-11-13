// The app's icon set (Phosphor, bold outline), exported under the names the components use.
import type { ComponentType, CSSProperties } from 'react';
import {
  ArrowLineDown,
  ArrowRight as PhArrowRight,
  ArrowSquareOut,
  ArrowsClockwise,
  ArrowsDownUp,
  ArrowUpRight as PhArrowUpRight,
  Bell as PhBell,
  BellRinging,
  BookmarkSimple,
  Bug as PhBug,
  Bus,
  CaretDown,
  ChatCenteredText,
  Check as PhCheck,
  CircleNotch,
  Clock,
  Copy as PhCopy,
  Crosshair,
  DeviceMobile,
  DownloadSimple,
  EnvelopeSimple,
  Export,
  Footprints as PhFootprints,
  House,
  List,
  LockKey,
  MapPin as PhMapPin,
  MapPinArea,
  MapTrifold,
  Megaphone as PhMegaphone,
  Monitor as PhMonitor,
  Moon as PhMoon,
  NavigationArrow,
  PaintBrush,
  PaperPlaneRight,
  Path,
  PlusCircle,
  ShareNetwork,
  ShieldCheck as PhShieldCheck,
  SignOut,
  SlidersHorizontal as PhSlidersHorizontal,
  Sun as PhSun,
  User,
  Users as PhUsers,
  WifiSlash,
  Wrench as PhWrench,
  X as PhX,
  type IconProps as PhosphorProps,
} from '@phosphor-icons/react';

export interface IconProps {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  style?: CSSProperties;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
}
export type IconComponent = ComponentType<IconProps>;

// LAXCommute uses Phosphor's bold outline everywhere; strokeWidth is accepted for
// call-site compatibility but no longer changes the weight.
function weight(_strokeWidth?: number | string): PhosphorProps['weight'] {
  return 'bold';
}
function icon(Phosphor: ComponentType<PhosphorProps>): IconComponent {
  function Icon({ strokeWidth, ...props }: IconProps) {
    return <Phosphor weight={weight(strokeWidth)} {...props} />;
  }
  Icon.displayName = Phosphor.displayName;
  return Icon;
}

export const ArrowDownToLine = icon(ArrowLineDown);
export const ArrowDownUp = icon(ArrowsDownUp);
export const ArrowRight = icon(PhArrowRight);
export const ArrowUpRight = icon(PhArrowUpRight);
export const Bell = icon(PhBell);
export const BellRing = icon(BellRinging);
export const Bookmark = icon(BookmarkSimple);
export const Bug = icon(PhBug);
export const BusFront = icon(Bus);
export const Check = icon(PhCheck);
export const ChevronDown = icon(CaretDown);
export const CirclePlus = icon(PlusCircle);
export const Clock3 = icon(Clock);
export const Copy = icon(PhCopy);
export const Download = icon(DownloadSimple);
export const ExternalLink = icon(ArrowSquareOut);
export const Footprints = icon(PhFootprints);
export const Home = icon(House);
export const LoaderCircle = icon(CircleNotch);
export const LocateFixed = icon(Crosshair);
export const LockKeyhole = icon(LockKey);
export const LogOut = icon(SignOut);
export const Mail = icon(EnvelopeSimple);
export const Map = icon(MapTrifold);
export const MapPin = icon(PhMapPin);
export const MapPinned = icon(MapPinArea);
export const Megaphone = icon(PhMegaphone);
export const Menu = icon(List);
export const MessageSquare = icon(ChatCenteredText);
export const Monitor = icon(PhMonitor);
export const Moon = icon(PhMoon);
export const Navigation = icon(NavigationArrow);
export const Paintbrush = icon(PaintBrush);
export const RefreshCw = icon(ArrowsClockwise);
export const Route = icon(Path);
export const Send = icon(PaperPlaneRight);
export const Share = icon(Export);
export const Share2 = icon(ShareNetwork);
export const ShieldCheck = icon(PhShieldCheck);
export const SlidersHorizontal = icon(PhSlidersHorizontal);
export const Smartphone = icon(DeviceMobile);
export const Sun = icon(PhSun);
export const UserRound = icon(User);
export const Users = icon(PhUsers);
export const WifiOff = icon(WifiSlash);
export const Wrench = icon(PhWrench);
export const X = icon(PhX);
