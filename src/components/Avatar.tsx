import { View, Image, ViewStyle, ImageStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, colors } from '../design-system';
import type { User } from '../types';

interface AvatarProps {
  user?: User;
  initials?: string;
  size?: number;
  ring?: boolean;
  bg?: string;
  gradient?: [string, string];
  /** Remote image URL — when present, renders the photo instead of initials. */
  imageUrl?: string | null;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({
  user, initials, size = 40, ring = false, bg, gradient, imageUrl, style,
}: AvatarProps) {
  const ini = user?.initials ?? initials ?? '?';
  const grad = gradient ?? user?.gradient;
  const solid = bg ?? user?.color ?? colors.s700;

  const ringStyle: ViewStyle = ring
    ? { borderWidth: 2, borderColor: colors.paper, padding: 2, backgroundColor: colors.s900 }
    : {};

  const inner: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  // Photo: takes precedence over gradient / solid background.
  if (imageUrl) {
    const imgStyle: ImageStyle = {
      width: size,
      height: size,
      borderRadius: size / 2,
    };
    return (
      <View style={[ring ? { borderRadius: (size + 8) / 2 } : null, ringStyle, style]}>
        <Image source={{ uri: imageUrl }} style={imgStyle} />
      </View>
    );
  }

  const label = (
    <Text style={{ color: colors.paper, fontWeight: '800', fontSize: Math.round(size * 0.36) }}>
      {ini}
    </Text>
  );

  return (
    <View style={[ring ? { borderRadius: (size + 8) / 2 } : null, ringStyle, style]}>
      {grad ? (
        <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={inner}>
          {label}
        </LinearGradient>
      ) : (
        <View style={[inner, { backgroundColor: solid }]}>{label}</View>
      )}
    </View>
  );
}

export default Avatar;
