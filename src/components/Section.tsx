import { View, ViewStyle, StyleProp } from 'react-native';
import { ReactNode } from 'react';
import { Text, colors } from '../design-system';

interface SectionProps {
  title?: string;
  action?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Section({ title, action, children, style }: SectionProps) {
  return (
    <View style={[{ paddingHorizontal: 20, paddingVertical: 8 }, style]}>
      {title ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper2, letterSpacing: 0.2 }}>
            {title}
          </Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export default Section;
