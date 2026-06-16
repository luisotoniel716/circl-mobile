import Svg, { Path, Circle, Rect, Polygon, Ellipse } from 'react-native-svg';
import { colors } from '../design-system';

export type IconName =
  | 'search' | 'home' | 'people' | 'bell' | 'profile' | 'back' | 'forward'
  | 'close' | 'check' | 'add' | 'addUser' | 'filter' | 'chat' | 'eye' | 'eyeOff'
  | 'trend' | 'arrowUp' | 'chev' | 'chevDown' | 'lock' | 'mail' | 'user' | 'at'
  | 'flag' | 'trophy' | 'star' | 'settings' | 'edit' | 'logout' | 'fire' | 'qr'
  | 'link' | 'sparkle' | 'target' | 'wifi' | 'book' | 'camera' | 'image' | 'trash' | 'crown';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
  fill?: string;
}

export function Icon({ name, size = 22, color = colors.paper, stroke = 2, fill = 'none' }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill,
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'search':
      return <Svg {...common}><Circle cx={11} cy={11} r={7} /><Path d="m21 21-4.3-4.3" /></Svg>;
    case 'home':
      return <Svg {...common}><Path d="m3 11 9-7 9 7v9a2 2 0 0 1-2 2h-3v-7H10v7H7a2 2 0 0 1-2-2z" /></Svg>;
    case 'people':
      return <Svg {...common}><Circle cx={9} cy={8} r={3.5} /><Circle cx={17} cy={9.5} r={2.5} /><Path d="M3 20a6 6 0 0 1 12 0" /><Path d="M14.5 20a4 4 0 0 1 7 0" /></Svg>;
    case 'bell':
      return <Svg {...common}><Path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 8H4c0-2 2-3 2-8z" /><Path d="M10 21a2 2 0 0 0 4 0" /></Svg>;
    case 'profile':
      return <Svg {...common}><Circle cx={12} cy={8} r={4} /><Path d="M4 21a8 8 0 0 1 16 0" /></Svg>;
    case 'back':
      return <Svg {...common} strokeWidth={stroke + 0.4}><Path d="m15 18-6-6 6-6" /></Svg>;
    case 'forward':
      return <Svg {...common} strokeWidth={stroke + 0.4}><Path d="m9 18 6-6-6-6" /></Svg>;
    case 'close':
      return <Svg {...common} strokeWidth={stroke + 0.4}><Path d="M6 6 18 18" /><Path d="M18 6 6 18" /></Svg>;
    case 'check':
      return <Svg {...common} strokeWidth={stroke + 0.4}><Path d="m5 12 5 5 9-11" /></Svg>;
    case 'add':
      return <Svg {...common} strokeWidth={stroke + 0.4}><Path d="M12 5v14" /><Path d="M5 12h14" /></Svg>;
    case 'addUser':
      return <Svg {...common}><Circle cx={10} cy={8} r={4} /><Path d="M2 21a8 8 0 0 1 16 0" /><Path d="M19 8v6" /><Path d="M22 11h-6" /></Svg>;
    case 'filter':
      return <Svg {...common}><Path d="M4 6h16" /><Path d="M7 12h10" /><Path d="M10 18h4" /></Svg>;
    case 'chat':
      return <Svg {...common}><Path d="M4 5h16v11H8l-4 4z" /></Svg>;
    case 'eye':
      return <Svg {...common}><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><Circle cx={12} cy={12} r={3} /></Svg>;
    case 'eyeOff':
      return <Svg {...common}><Path d="M2 2l20 20" /><Path d="M6.7 6.7C4.3 8.4 2 12 2 12s3.5 7 10 7c2 0 3.8-.7 5.3-1.6" /><Path d="M9.5 4.4C10.3 4.1 11.1 4 12 4c6.5 0 10 7 10 7-.7 1.3-1.8 3-3.5 4.4" /></Svg>;
    case 'trend':
      return <Svg {...common}><Path d="M3 17 9 11l4 4 8-8" /><Path d="M14 7h7v7" /></Svg>;
    case 'arrowUp':
      return <Svg {...common}><Path d="M12 19V5" /><Path d="m5 12 7-7 7 7" /></Svg>;
    case 'chev':
      return <Svg {...common}><Path d="m9 6 6 6-6 6" /></Svg>;
    case 'chevDown':
      return <Svg {...common}><Path d="m6 9 6 6 6-6" /></Svg>;
    case 'lock':
      return <Svg {...common}><Rect x={5} y={11} width={14} height={10} rx={2} /><Path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>;
    case 'mail':
      return <Svg {...common}><Rect x={3} y={5} width={18} height={14} rx={2} /><Path d="m3 7 9 7 9-7" /></Svg>;
    case 'user':
      return <Svg {...common}><Circle cx={12} cy={8} r={4} /><Path d="M4 21a8 8 0 0 1 16 0" /></Svg>;
    case 'at':
      return <Svg {...common}><Circle cx={12} cy={12} r={4} /><Path d="M16 12v1.5a3.5 3.5 0 0 0 7 0V12a11 11 0 1 0-4.5 8.9" /></Svg>;
    case 'flag':
      return <Svg {...common}><Path d="M5 22V4" /><Path d="M5 4h13l-2 5 2 5H5" /></Svg>;
    case 'trophy':
      return <Svg {...common}><Path d="M8 21h8" /><Path d="M12 17v4" /><Path d="M7 3h10v6a5 5 0 0 1-10 0z" /><Path d="M3 5h4v3a3 3 0 0 1-4 0z" /><Path d="M21 5h-4v3a3 3 0 0 0 4 0z" /></Svg>;
    case 'star':
      return <Svg {...common} fill={color}><Polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9" /></Svg>;
    case 'settings':
      return <Svg {...common}><Circle cx={12} cy={12} r={3} /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>;
    case 'edit':
      return <Svg {...common}><Path d="M11 4h-7v16h16v-7" /><Path d="m18.5 2.5 3 3-10 10H8.5v-3z" /></Svg>;
    case 'logout':
      return <Svg {...common}><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Path d="m16 17 5-5-5-5" /><Path d="M21 12H9" /></Svg>;
    case 'fire':
      return <Svg {...common}><Path d="M12 22a7 7 0 0 0 5-12c-2-2-3-4-3-7-2 2-7 4-7 9 0 4 3 6 3 6s-1-3 1-5c1 3 3 4 1 9z" /></Svg>;
    case 'qr':
      return <Svg {...common}><Rect x={3} y={3} width={7} height={7} rx={1} /><Rect x={14} y={3} width={7} height={7} rx={1} /><Rect x={3} y={14} width={7} height={7} rx={1} /><Rect x={14} y={14} width={3} height={3} /><Rect x={18} y={18} width={3} height={3} /></Svg>;
    case 'link':
      return <Svg {...common}><Path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><Path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></Svg>;
    case 'sparkle':
      return <Svg {...common}><Path d="M12 3v4" /><Path d="M12 17v4" /><Path d="M3 12h4" /><Path d="M17 12h4" /><Path d="m6 6 2 2" /><Path d="m16 16 2 2" /><Path d="m6 18 2-2" /><Path d="m16 8 2-2" /></Svg>;
    case 'target':
      return (
        <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
          <Circle cx={40} cy={40} r={28} stroke={color} strokeWidth={stroke * 1.6} />
          <Circle cx={40} cy={40} r={14} stroke={color} strokeWidth={stroke * 1.6} />
          <Circle cx={40} cy={40} r={5} fill={color} />
        </Svg>
      );
    case 'wifi':
      return <Svg {...common}><Path d="M5 12a10 10 0 0 1 14 0" /><Path d="M8.5 15.5a5 5 0 0 1 7 0" /><Circle cx={12} cy={19} r={1} fill={color} /></Svg>;
    case 'book':
      return <Svg {...common}><Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></Svg>;
    case 'camera':
      return <Svg {...common}><Path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" /><Circle cx={12} cy={13} r={4} /></Svg>;
    case 'image':
      return <Svg {...common}><Rect x={3} y={4} width={18} height={16} rx={2} /><Circle cx={9} cy={10} r={2} /><Path d="m21 16-5-5-7 8" /></Svg>;
    case 'trash':
      return <Svg {...common}><Path d="M4 7h16" /><Path d="M10 11v6" /><Path d="M14 11v6" /><Path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /><Path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /></Svg>;
    case 'crown':
      return <Svg {...common}><Path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" /></Svg>;
    default:
      return null;
  }
}

export default Icon;
