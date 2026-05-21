import { View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScreenContainer, CButton, Icon, Text, colors } from '../../src/components';

const CLUSTER: { i: string; x: number; y: number; bg: string; grad?: [string, string] }[] = [
  { i: 'DR', x: 14, y: 24, bg: '#FFB938', grad: ['#FFB938', '#E89A12'] },
  { i: 'ML', x: 128, y: 18, bg: '#5C7BFF', grad: ['#5C7BFF', '#002DE8'] },
  { i: 'SR', x: 6, y: 104, bg: '#D43530' },
  { i: 'AG', x: 132, y: 108, bg: '#0E7A3A' },
  { i: 'LC', x: 76, y: 140, bg: '#1C1E37' },
];

export default function Welcome() {
  const router = useRouter();
  return (
    <ScreenContainer theme="light">
      <View style={{ flex: 1, padding: 20, paddingBottom: 20 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.paper,
            borderRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 40,
            paddingBottom: 28,
            alignItems: 'center',
          }}
        >
          {/* Avatar cluster */}
          <View style={{ width: 180, height: 180, marginTop: 8 }}>
            <Svg width={180} height={170} style={{ position: 'absolute' }}>
              <Ellipse cx={90} cy={85} rx={74} ry={62} fill="none" stroke="rgba(10,11,31,0.10)" strokeWidth={1.2} strokeDasharray="3 5" />
            </Svg>
            {CLUSTER.map((m) => (
              <View key={m.i} style={{ position: 'absolute', left: m.x, top: m.y }}>
                {m.grad ? (
                  <LinearGradient colors={m.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={avatarCircle}>
                    <Text style={avatarText}>{m.i}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[avatarCircle, { backgroundColor: m.bg }]}>
                    <Text style={avatarText}>{m.i}</Text>
                  </View>
                )}
              </View>
            ))}
            <View
              style={{
                position: 'absolute',
                left: 90 - 27,
                top: 85 - 27,
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="target" size={32} color={colors.paper} />
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ alignSelf: 'stretch' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.blue, marginBottom: 10, letterSpacing: 1.4 }}>
              CIRCL · LIGA MX
            </Text>
            <Text style={{ fontSize: 32, lineHeight: 34, fontWeight: '800', color: colors.ink }}>
              Predict matches. Compete with friends.
            </Text>
            <Text style={{ fontSize: 14, color: colors.ink2, lineHeight: 21, marginTop: 14 }}>
              No money. Just bragging rights, points, and the only Liga MX leaderboard that matters — your friends&apos;.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6, marginTop: 22, alignSelf: 'flex-start' }}>
            <View style={{ width: 24, height: 4, backgroundColor: colors.blue, borderRadius: 99 }} />
            <View style={{ width: 8, height: 4, backgroundColor: 'rgba(10,11,31,0.15)', borderRadius: 99 }} />
            <View style={{ width: 8, height: 4, backgroundColor: 'rgba(10,11,31,0.15)', borderRadius: 99 }} />
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.s900,
            marginTop: 14,
            padding: 14,
            borderRadius: 24,
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <CButton variant="ghostDark" size="lg" full onPress={() => router.push('/(auth)/login')}>
              Log in
            </CButton>
          </View>
          <View style={{ flex: 1 }}>
            <CButton variant="primary" size="lg" full onPress={() => router.push('/(auth)/register')}>
              Create account
            </CButton>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const avatarCircle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
const avatarText = { color: colors.paper, fontWeight: '800' as const, fontSize: 14 };
