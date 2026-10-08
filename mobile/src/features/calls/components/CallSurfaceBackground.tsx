import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { CALL_PALETTE } from '../callTheme';

// The same glows as web's CALL_AURORA, as SVG radial gradients over the ink base.
const GLOWS = [
  {
    id: 'teal',
    cx: '20%',
    cy: '14%',
    rx: '70%',
    ry: '45%',
    color: CALL_PALETTE.teal,
    opacity: 0.55,
  },
  {
    id: 'cyan',
    cx: '84%',
    cy: '22%',
    rx: '50%',
    ry: '30%',
    color: CALL_PALETTE.cyan,
    opacity: 0.2,
  },
  {
    id: 'indigo',
    cx: '78%',
    cy: '92%',
    rx: '80%',
    ry: '50%',
    color: CALL_PALETTE.indigo,
    opacity: 0.34,
  },
  {
    id: 'deep',
    cx: '8%',
    cy: '88%',
    rx: '60%',
    ry: '40%',
    color: CALL_PALETTE.teal,
    opacity: 0.22,
  },
] as const;

export function CallSurfaceBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        {GLOWS.map((glow) => (
          <RadialGradient
            key={glow.id}
            id={glow.id}
            cx={glow.cx}
            cy={glow.cy}
            rx={glow.rx}
            ry={glow.ry}
            fx={glow.cx}
            fy={glow.cy}
          >
            <Stop offset="0" stopColor={glow.color} stopOpacity={glow.opacity} />
            <Stop offset="1" stopColor={glow.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={CALL_PALETTE.ink} />
      {GLOWS.map((glow) => (
        <Rect key={glow.id} x={0} y={0} width="100%" height="100%" fill={`url(#${glow.id})`} />
      ))}
    </Svg>
  );
}
