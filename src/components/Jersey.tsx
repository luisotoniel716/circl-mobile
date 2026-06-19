import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Text, colors } from '../design-system';

interface JerseyProps {
  /** Fill color of the shirt (team primary). */
  primary:    string;
  /** Accent color for collar/sleeves + number (team secondary). */
  secondary:  string;
  /** Squad number rendered on the chest. */
  number?:    number | null;
  /** Player name rendered under the shirt. */
  name?:      string;
  size?:      number;
  /** Highlight ring when selected (e.g. picked as scorer). */
  selected?:  boolean;
  /** Dim the jersey (e.g. unavailable). */
  dim?:       boolean;
}

// Three overlapping silhouettes give us separately-styleable regions:
//   • BODY  — torso + collar V, fills with the body gradient
//   • SLEEVES_L / SLEEVES_R — sleeves split out so we can darken them
//     slightly and add a cuff stripe in the secondary color
//   • HEM_STRIPE — thin bar across the bottom edge in secondary color
//
// All paths are designed in a 100×100 viewBox so a single `size` prop
// scales everything proportionally.
const BODY_PATH    = 'M28,12 L40,12 C44,18 56,18 60,12 L72,12 L72,93 L28,93 Z';
const SLEEVE_L     = 'M28,12 L7,28 L20,43 L28,34 Z';
const SLEEVE_R     = 'M72,12 L93,28 L80,43 L72,34 Z';
const COLLAR_PATH  = 'M40,12 C44,18 56,18 60,12 L57,9 C54,13 46,13 43,9 Z';

/**
 * Premium football jersey: vertical gradient body (primary → primary-dark),
 * darker sleeves with secondary-color cuff stripes, hem accent at the
 * bottom, soft drop-shadow, V-neck collar. Selection visuals (ball badge
 * with appear / disappear animation) are owned by the parent — Jersey
 * itself stays calm and just dims its name in the unselected state.
 */
export function Jersey({
  primary, secondary, number, name, size = 56, selected = false, dim = false,
}: JerseyProps) {
  const numberColor = contrastText(primary, secondary);
  // For dark primaries, slightly lighten sleeves for separation; for light
  // primaries (e.g. Tigres yellow), darken them. This keeps sleeves
  // distinguishable from the body across team palettes.
  const sleeveShade = adjustLightness(primary, isLight(primary) ? -0.08 : 0.06);
  const bodyTop     = adjustLightness(primary, isLight(primary) ? 0.04  : 0.06);
  const bodyBot     = adjustLightness(primary, isLight(primary) ? -0.08 : -0.10);

  return (
    <View style={{ alignItems: 'center', width: size + 14, opacity: dim ? 0.4 : 1 }}>
      <View
        style={{
          width: size + 10,
          height: size + 10,
          alignItems: 'center',
          justifyContent: 'center',
          // No ring / no accent-tint background when selected — the only
          // selection cue is the ball badge (rendered by the parent so its
          // appear / disappear animation is owned there).
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id={`bodyGrad-${primary}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={bodyTop} stopOpacity="1" />
                <Stop offset="1" stopColor={bodyBot} stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {/* Sleeves rendered first so the body overlaps on top */}
            <Path d={SLEEVE_L} fill={sleeveShade} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
            <Path d={SLEEVE_R} fill={sleeveShade} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
            {/* Cuff stripes — a thin secondary-color accent at the sleeve
                openings (sides of the shirt at y≈40). */}
            <Path
              d="M7,28 L13,21 L17,29 L11,36 Z"
              fill={secondary} fillOpacity={0.85}
            />
            <Path
              d="M93,28 L87,21 L83,29 L89,36 Z"
              fill={secondary} fillOpacity={0.85}
            />

            {/* Body with gradient */}
            <Path
              d={BODY_PATH}
              fill={`url(#bodyGrad-${primary})`}
              stroke="rgba(0,0,0,0.25)"
              strokeWidth={1.2}
            />

            {/* Hem stripe — thin accent at the bottom edge of the body */}
            <Rect x={28} y={88} width={44} height={2.2} fill={secondary} fillOpacity={0.9} />

            {/* Collar — V-shape in secondary color, then darker inner shadow */}
            <Path d={COLLAR_PATH} fill={secondary} />
            <Path d={COLLAR_PATH} fill="rgba(0,0,0,0.25)" />

            {/* Subtle top highlight — narrow lighter band across the
                shoulder area to simulate cloth highlight. */}
            <Path
              d="M30,16 L70,16 L68,20 L32,20 Z"
              fill="#FFFFFF"
              fillOpacity={0.05}
            />
          </Svg>

          {/* Number overlay, centered on the chest */}
          {number != null ? (
            <View
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: size * 0.12,
              }}
              pointerEvents="none"
            >
              <Text
                style={{
                  fontSize: size * 0.32,
                  fontWeight: '900',
                  color: numberColor,
                  // Subtle dark outline for legibility on light shirts.
                  textShadowColor: 'rgba(0,0,0,0.35)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {number}
              </Text>
            </View>
          ) : null}
        </View>

        {/* (Ball badge rendered by AnimatedJersey parent — kept out of
            Jersey so its appear / disappear animation can be driven by a
            single shared value without bleeding into this component.) */}
      </View>

      {name ? (
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10.5,
            fontWeight: '700',
            color: selected ? colors.paper : colors.paper2,
            marginTop: 4,
            maxWidth: size + 14,
            textAlign: 'center',
          }}
        >
          {name}
        </Text>
      ) : null}
    </View>
  );
}

// Chooses a legible number color: prefer the team's accent, but if it's too
// close to the shirt color (low contrast), use ink or paper depending on
// shirt luminance.
function contrastText(bg: string, accent: string): string {
  if (luminance(accent) !== luminance(bg) && Math.abs(luminance(accent) - luminance(bg)) > 0.25) {
    return accent;
  }
  return luminance(bg) > 0.55 ? '#0B1020' : '#FFFFFF';
}

function luminance(hex: string): number {
  const c = hex.replace('#', '');
  if (c.length < 6) return 0.5;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLight(hex: string): boolean {
  return luminance(hex) > 0.55;
}

// Shifts an RGB hex color toward white (positive delta) or black (negative
// delta) by a percentage of its current value. Keeps things in [0, 255].
function adjustLightness(hex: string, delta: number): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return hex;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const adj = (v: number) => {
    const target = delta >= 0 ? 255 : 0;
    return Math.round(v + (target - v) * Math.abs(delta));
  };
  const hex2 = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex2(adj(r))}${hex2(adj(g))}${hex2(adj(b))}`;
}

export default Jersey;
