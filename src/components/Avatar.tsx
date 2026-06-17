import { useEffect, useState } from 'react';
import { View, ViewStyle, ImageStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing,
} from 'react-native-reanimated';
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

  // Photo: takes precedence over gradient / solid background. The
  // placeholder (initials over solid bg) sits beneath the image so the
  // shape is never empty while loading — the image fades in over it once
  // decoded, and a shimmer overlay slides across to signal "loading".
  if (imageUrl) {
    return (
      <View style={[ring ? { borderRadius: (size + 8) / 2 } : null, ringStyle, style]}>
        <View style={[inner, { backgroundColor: solid }]}>
          {/* Placeholder behind the image */}
          <Text style={{ color: colors.paper, fontWeight: '800', fontSize: Math.round(size * 0.36) }}>
            {ini}
          </Text>
          <ShimmerAvatar size={size} imageUrl={imageUrl} solid={solid} />
        </View>
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

// ─── Shimmer + fade-in image overlay ─────────────────────────
//
// Renders ON TOP of the placeholder (initials + solid bg) inside the
// Avatar. While the remote image is decoding, a faint gradient stripe
// slides horizontally across the circle (the classic "skeleton shimmer"
// effect). Once `onLoad` fires we fade the image in and stop the shimmer
// loop. If loading fails or never completes, the placeholder stays
// visible underneath so the UI never breaks.

interface ShimmerAvatarProps {
  size:     number;
  imageUrl: string;
  solid:    string;
}

function ShimmerAvatar({ size, imageUrl, solid }: ShimmerAvatarProps) {
  const [loaded, setLoaded] = useState(false);

  // Shimmer translation: drives a stripe from -size → size repeatedly.
  // We stop touching the value once the image is loaded so the loop ends
  // cleanly on the next iteration.
  const shimmerX = useSharedValue(-size);
  useEffect(() => {
    if (loaded) return;
    shimmerX.value = -size;
    shimmerX.value = withRepeat(
      withTiming(size, { duration: 1100, easing: Easing.linear }),
      -1,    // forever (until unmount or `loaded` flips, after which we just stop reading it)
      false, // don't reverse — restart from the start side
    );
  }, [loaded, size, shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  // Image fade-in once decoded.
  const imgOpacity = useSharedValue(0);
  useEffect(() => {
    if (loaded) {
      imgOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    }
  }, [loaded, imgOpacity]);
  const imgAnimStyle = useAnimatedStyle(() => ({ opacity: imgOpacity.value }));

  const imgStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <>
      {/* Decoded image fades in over the placeholder. */}
      <Animated.Image
        source={{ uri: imageUrl }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}   // stop the shimmer on error too
        style={[
          { position: 'absolute', top: 0, left: 0 },
          imgStyle,
          imgAnimStyle,
        ]}
      />

      {/* Shimmer stripe — only rendered while loading so we don't keep
          a (cheap but pointless) Animated layer alive after decode. */}
      {!loaded ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width: size,
              height: size,
              // Clip to the circular shape so the stripe doesn't bleed
              // past the avatar edge.
              borderRadius: size / 2,
              overflow: 'hidden',
            },
          ]}
        >
          <Animated.View
            style={[
              { width: size, height: size },
              shimmerStyle,
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.18)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: size, height: size }}
            />
          </Animated.View>
        </Animated.View>
      ) : null}
    </>
  );
}
