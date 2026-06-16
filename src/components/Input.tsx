import { View, TextInput, TextInputProps, Pressable } from 'react-native';
import { ReactNode, useState } from 'react';
import { Text, colors } from '../design-system';
import { Icon } from './Icon';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  lead?: ReactNode;
  trail?: ReactNode;
  valid?: 'ok' | 'err';
  help?: string;
  /** Render an eye toggle that shows/hides the password. When set, `secureTextEntry` is managed internally. */
  passwordToggle?: boolean;
}

export function Input({ label, lead, trail, valid, help, passwordToggle, secureTextEntry, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  const isSecure = passwordToggle ? !visible : secureTextEntry;

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
          secureTextEntry={isSecure}
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
        {passwordToggle ? (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
            <Icon name={visible ? 'eyeOff' : 'eye'} size={18} color={colors.mist} />
          </Pressable>
        ) : trail}
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
