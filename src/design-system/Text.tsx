import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { colors, fontByWeight } from './tokens';

// Drop-in <Text> that resolves the right Plus Jakarta Sans family from
// the style's fontWeight, so screens can keep writing `fontWeight: '800'`.
export function Text({ style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style) || {};
  const family = fontByWeight(flat.fontWeight as string | number | undefined);
  return (
    <RNText
      {...rest}
      style={[{ color: colors.paper }, style, { fontFamily: family, fontWeight: undefined }]}
    />
  );
}

export default Text;
