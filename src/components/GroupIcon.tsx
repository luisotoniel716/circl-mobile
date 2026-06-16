import { View, Image, ViewStyle, StyleProp } from 'react-native';
import { Text, colors } from '../design-system';

interface GroupIconProps {
  /** Cover image_url from the group (when set, this takes precedence). */
  imageUrl?: string | null;
  /** Emoji fallback shown when no imageUrl is present. */
  emoji?: string | null;
  /** Group accent color — used for the soft background of the emoji fallback. */
  accent?: string;
  size?: number;
  /** Corner rounding. Defaults to a soft square (size/3.5). */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Single source of truth for rendering a group's "avatar" in lists, cards,
 * podiums, etc. Shows the cover photo when available, falls back to the emoji
 * inside an accent-tinted square.
 */
export function GroupIcon({
  imageUrl,
  emoji,
  accent  = colors.s700,
  size    = 30,
  radius,
  style,
}: GroupIconProps) {
  const r = radius ?? Math.round(size / 3.5);
  const base: ViewStyle = {
    width: size,
    height: size,
    borderRadius: r,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (imageUrl) {
    return (
      <View style={[base, { backgroundColor: colors.s900 }, style]}>
        <Image source={{ uri: imageUrl }} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[base, { backgroundColor: accent + '22' }, style]}>
      <Text style={{ fontSize: Math.round(size * 0.5) }}>{emoji ?? '🎯'}</Text>
    </View>
  );
}

export default GroupIcon;
