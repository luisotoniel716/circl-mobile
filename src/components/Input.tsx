import { View, TextInput, TextInputProps } from 'react-native';
import { ReactNode, useState } from 'react';
import { Text, colors } from '../design-system';
import { Icon } from './Icon';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  lead?: ReactNode;
  trail?: ReactNode;
  valid?: 'ok' | 'err';
  help?: string;
}

export function Input({ label, lead, trail, valid, help, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 7, paddingLeft: 4 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.s800,
          borderWidth: 1,
          borderColor: focused ? colors.blueHi : 'rgba(255,255,255,0.06)',
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        {lead ? <View>{lead}</View> : null}
        <TextInput
          {...rest}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.mist}
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: '600',
            color: colors.paper,
            fontFamily: 'PlusJakartaSans_600SemiBold',
            padding: 0,
          }}
        />
        {valid === 'ok' ? <Icon name="check" size={18} color={colors.green} /> : null}
        {valid === 'err' ? <Icon name="close" size={18} color={colors.red} /> : null}
        {trail}
      </View>
      {help ? (
        <Text style={{ fontSize: 11, color: valid === 'err' ? colors.red : colors.mist, marginTop: 6, paddingLeft: 4 }}>
          {help}
        </Text>
      ) : null}
    </View>
  );
}

export default Input;
