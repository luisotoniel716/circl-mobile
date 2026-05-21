import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer, TopBar, CButton, TeamCrest, Icon, Text, colors } from '../../../src/components';
import { MATCHES, LIGAMX, GROUPS } from '../../../src/data';

export default function PickConfirmed() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const m = MATCHES.find((x) => x.id === id) ?? MATCHES[0];
  const h = LIGAMX[m.home];

  const scale = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 9, stiffness: 120 });
    pulse.value = withRepeat(withTiming(1.12, { duration: 1100 }), -1, true);
  }, [scale, pulse]);

  const crestStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: 2 - pulse.value }));

  return (
    <ScreenContainer theme="dark">
      <TopBar title="" onBack right={<Text onPress={() => router.dismissAll?.() ?? router.replace('/(tabs)/home')} style={{ color: colors.paper2, fontSize: 13, fontWeight: '700' }}>Done</Text>} />

      <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center' }}>
        <View style={{ marginTop: 24, width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: h.primary + '33' }, haloStyle]} />
          <Animated.View style={crestStyle}>
            <TeamCrest team={h} size={140} />
            <View style={{ position: 'absolute', bottom: -4, right: -4, width: 46, height: 46, borderRadius: 23, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.s900 }}>
              <Icon name="check" size={24} color={colors.paper} stroke={3} />
            </View>
          </Animated.View>
        </View>

        <View style={{ marginTop: 28, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '800' }}>PICK LOCKED IN</Text>
          <Text style={{ fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 8, color: colors.paper }}>{h.name} for the win</Text>
          <Text style={{ fontSize: 13, color: colors.paper2, textAlign: 'center', lineHeight: 19, marginTop: 6 }}>
            You picked <Text style={{ color: colors.paper, fontWeight: '700' }}>{LIGAMX[m.home].name}</Text> over{' '}
            <Text style={{ color: colors.paper, fontWeight: '700' }}>{LIGAMX[m.away].name}</Text>. Kickoff in 6h 14m.
          </Text>
        </View>

        <View style={{ marginTop: 24, padding: 14, borderRadius: 14, backgroundColor: colors.s800, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', width: '100%' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, marginBottom: 8 }}>COUNTS IN</Text>
          {GROUPS.slice(0, 2).map((g) => (
            <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: g.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14 }}>{g.icon}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.paper }}>{g.name}</Text>
              <Text style={{ fontSize: 11, color: colors.mist }}>You&apos;re #{g.myRank}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 'auto', flexDirection: 'row', gap: 10, paddingTop: 20, paddingBottom: 16, alignSelf: 'stretch' }}>
          <View style={{ flex: 1 }}>
            <CButton variant="ghostDark" size="lg" full onPress={() => router.back()}>Change pick</CButton>
          </View>
          <View style={{ flex: 1 }}>
            <CButton variant="primary" size="lg" full onPress={() => router.push({ pathname: '/group/[id]/leaderboard', params: { id: 'g1' } })}>Leaderboard</CButton>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
