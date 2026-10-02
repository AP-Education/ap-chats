import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { CALL_SURFACE_ACCENT, CALL_SURFACE_DEEP, CALL_SURFACE_HIGHLIGHT } from '../callTheme';

/**
 * Exact native redraw of web/'s CALL_SURFACE_GRADIENT: a radial glow from top
 * center (#09c6cc -> #0f645b at 55% -> #082e2a at 100%) under a flat dark
 * scrim. expo-linear-gradient can't do radial at all, so this uses
 * react-native-svg directly instead of approximating with a linear one.
 */
export function CallSurfaceBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="callSurface" cx="50%" cy="0%" r="100%">
          <Stop offset="0%" stopColor={CALL_SURFACE_HIGHLIGHT} />
          <Stop offset="55%" stopColor={CALL_SURFACE_ACCENT} />
          <Stop offset="100%" stopColor={CALL_SURFACE_DEEP} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#callSurface)" />
      <Rect x={0} y={0} width="100%" height="100%" fill="rgba(4, 14, 13, 0.72)" />
    </Svg>
  );
}
