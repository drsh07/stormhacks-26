import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/lib/theme';

/**
 * A quiet skyline for the bottom of a section: Burnaby Mountain's long ridge
 * with the flat, stepped roofline of the campus sitting on top of it.
 * Decorative only, so it is hidden from screen readers.
 */
export function Mountain({ height = 120 }: { height?: number }) {
  return (
    <View style={{ width: '100%', height }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 1200 160" preserveAspectRatio="none">
        {/* far ridge */}
        <Path d="M0 160 L0 104 L140 70 L300 96 L470 44 L640 82 L820 36 L1000 78 L1200 52 L1200 160 Z" fill={colors.muted} />
        {/* near ridge with the campus roofline: flat terraces, like the concrete on the hill */}
        <Path
          d="M0 160 L0 128 L180 108 L360 118 L470 92 L470 80 L560 80 L560 70 L700 70 L700 80 L780 80 L780 96 L960 112 L1200 100 L1200 160 Z"
          fill={colors.ink}
          opacity={0.1}
        />
      </Svg>
    </View>
  );
}
