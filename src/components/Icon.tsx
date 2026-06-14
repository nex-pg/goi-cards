// モノクロアイコン（react-native-svg）。prototype/ui.jsx の Icon を移植。
// 色は currentColor 相当（color prop）。塗り/線/太さで差をつける。
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'quiz'
  | 'bookmark'
  | 'clock'
  | 'list'
  | 'more'
  | 'check'
  | 'cross'
  | 'chevR'
  | 'chevL'
  | 'chevDown'
  | 'drag'
  | 'pencil'
  | 'gear'
  | 'plus'
  | 'minus'
  | 'shuffle'
  | 'flip'
  | 'search'
  | 'lock'
  | 'star';

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  filled?: boolean;
  color?: string;
}

export function Icon({ name, size = 22, stroke = 1.7, filled = false, color = '#000' }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'quiz':
      return (
        <Svg {...common}>
          <Rect x="4" y="3" width="13" height="16" rx="2" />
          <Path d="M7.5 21h11a2 2 0 0 0 2-2V7" />
          <Path d="M8 8h6M8 11.5h6M8 15h3" />
        </Svg>
      );
    case 'bookmark':
      return (
        <Svg {...common} fill={filled ? color : 'none'}>
          <Path d="M6 4h12v17l-6-4-6 4z" />
        </Svg>
      );
    case 'clock':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="8.5" />
          <Path d="M12 7.5V12l3 2" />
        </Svg>
      );
    case 'list':
      return (
        <Svg {...common}>
          <Path d="M8 6h12M8 12h12M8 18h12" />
          <Circle cx="4" cy="6" r="0.6" fill={color} />
          <Circle cx="4" cy="12" r="0.6" fill={color} />
          <Circle cx="4" cy="18" r="0.6" fill={color} />
        </Svg>
      );
    case 'more':
      return (
        <Svg {...common}>
          <Circle cx="5" cy="12" r="1.3" fill={color} stroke="none" />
          <Circle cx="12" cy="12" r="1.3" fill={color} stroke="none" />
          <Circle cx="19" cy="12" r="1.3" fill={color} stroke="none" />
        </Svg>
      );
    case 'check':
      return (
        <Svg {...common}>
          <Path d="M5 12.5l4.5 4.5L19 6.5" />
        </Svg>
      );
    case 'cross':
      return (
        <Svg {...common}>
          <Path d="M6 6l12 12M18 6L6 18" />
        </Svg>
      );
    case 'chevR':
      return (
        <Svg {...common}>
          <Path d="M9 5l7 7-7 7" />
        </Svg>
      );
    case 'chevL':
      return (
        <Svg {...common}>
          <Path d="M15 5l-7 7 7 7" />
        </Svg>
      );
    case 'chevDown':
      return (
        <Svg {...common}>
          <Path d="M5 9l7 7 7-7" />
        </Svg>
      );
    case 'drag':
      return (
        <Svg {...common}>
          <Path d="M5 9h14M5 15h14" />
        </Svg>
      );
    case 'pencil':
      return (
        <Svg {...common}>
          <Path d="M14 5.5l4.5 4.5M4 20l1-4 11-11 4 4-11 11-4 1z" />
        </Svg>
      );
    case 'gear':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="3.2" />
          <Path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3" />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...common}>
          <Path d="M12 6v12M6 12h12" />
        </Svg>
      );
    case 'minus':
      return (
        <Svg {...common}>
          <Path d="M6 12h12" />
        </Svg>
      );
    case 'shuffle':
      return (
        <Svg {...common}>
          <Path d="M16 4h4v4M20 4l-7 7M16 20h4v-4M20 20l-5-5M4 4l4.5 4.5M4 20l16-16" />
        </Svg>
      );
    case 'flip':
      return (
        <Svg {...common}>
          <Path d="M4 8a8 8 0 0 1 14-3M20 5v4h-4" />
          <Path d="M20 16a8 8 0 0 1-14 3M4 19v-4h4" />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...common}>
          <Circle cx="11" cy="11" r="6.5" />
          <Path d="M16 16l4 4" />
        </Svg>
      );
    case 'lock':
      return (
        <Svg {...common}>
          <Rect x="5" y="10.5" width="14" height="10" rx="2" />
          <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </Svg>
      );
    case 'star':
      return (
        <Svg {...common} fill={filled ? color : 'none'}>
          <Path d="M12 3.5l2.5 5.3 5.8.8-4.2 4 1 5.7L12 22l-5.1-2.9 1-5.7-4.2-4 5.8-.8z" />
        </Svg>
      );
    default:
      return null;
  }
}
