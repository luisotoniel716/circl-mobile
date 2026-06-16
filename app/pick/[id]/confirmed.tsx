import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, CButton, TeamCrest, Icon, Text, colors,
} from '../../../src/components';
import { LIGAMX } from '../../../src/data';
import type { TeamCode } from '../../../src/types';
import { useMatch, useMyGroups } from '../../../src/lib/queries';
import type { Prediction } from '../../../src/lib/queries';

const PRED_LABEL: Record<Prediction, string> = {
  home: 'gana de local',
  away: 'gana de visita',
  draw: 'empate',
};

export default function PickConfirmed() {
  const { id: matchId, prediction, groupIds: groupIdsCsv } =
    useLocalSearchParams<{ id: string; prediction: string; groupIds?: string }>();
  const router = useRouter();

  const { data: match } = useMatch(matchId);
  const { data: allGroups = [] } = useMyGroups();

  // Filter to only the groups this pick was saved in (if provided).
  const groupIds = groupIdsCsv ? groupIdsCsv.split(',').filter(Boolean) : null;
  const groups = groupIds
    ? allGroups.filter((g) => groupIds.includes(g.id))
    : allGroups;

  const pred = (prediction ?? 'home') as Prediction;
  const homeCode = (match?.home ?? 'AME') as TeamCode;
  const awayCode = (match?.away ?? 'GDL') as TeamCode;

  // Which team did they pick?
  const pickedCode: TeamCode = pred === 'away' ? awayCode : homeCode;
  const pickedTeam = LIGAMX[pickedCode];
  const isDraw = pred === 'draw';

  const scale = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 9, stiffness: 120 });
    pulse.value = withRepeat(withTiming(1.12, { duration: 1100 }), -1, true);
  }, [scale, pulse]);

  const crestStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle   = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  const haloColor = isDraw ? colors.gold : pickedTeam.primary;
  const badgeColor = isDraw ? colors.gold : colors.green;

  return (
    <ScreenContainer theme="dark">
      {/* No back button: pick is saved. Only "Listo" closes the flow. */}
      <TopBar
        title=""
        right={
          <Text
            onPress={() => router.replace('/(tabs)/home')}
            style={{ color: colors.gold, fontSize: 14, fontWeight: '800' }}
          >
            Listo
          </Text>
        }
      />

      <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center' }}>
        {/* Animated crest / icon */}
        <View style={{ marginTop: 24, width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: haloColor + '33',
              },
              haloStyle,
            ]}
          />
          <Animated.View style={crestStyle}>
            {isDraw ? (
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: colors.s800,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 48 }}>🤝</Text>
              </View>
            ) : (
              <TeamCrest team={pickedTeam} size={120} />
            )}
            <View
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: badgeColor,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 4,
                borderColor: colors.s900,
              }}
            >
              <Icon name="check" size={24} color={colors.paper} stroke={3} />
            </View>
          </Animated.View>
        </View>

        {/* Title */}
        <View style={{ marginTop: 28, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '800' }}>PICK GUARDADO</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 8, color: colors.paper }}>
            {isDraw
              ? 'Apostaste al empate'
              : `${pickedTeam.name} para ganar`}
          </Text>
          {match && (
            <Text style={{ fontSize: 13, color: colors.paper2, textAlign: 'center', lineHeight: 19, marginTop: 6 }}>
              {LIGAMX[homeCode].name}{' '}
              <Text style={{ color: colors.mist }}>vs</Text>{' '}
              {LIGAMX[awayCode].name}
              {' · '}{match.round}
            </Text>
          )}
        </View>

        {/* Groups this pick counts in */}
        {groups.length > 0 && (
          <View
            style={{
              marginTop: 24,
              padding: 14,
              borderRadius: 14,
              backgroundColor: colors.s800,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.04)',
              width: '100%',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, marginBottom: 8 }}>
              CUENTA EN
            </Text>
            {groups.map((g) => (
              <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: g.accent + '22',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{g.icon}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.paper }}>{g.name}</Text>
                <Text style={{ fontSize: 11, color: colors.mist }}>{g.members} miembros</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View
          style={{
            marginTop: 'auto',
            flexDirection: 'row',
            gap: 10,
            paddingTop: 20,
            paddingBottom: 16,
            alignSelf: 'stretch',
          }}
        >
          <View style={{ flex: 1 }}>
            <CButton
              variant="ghostDark"
              size="lg"
              full
              onPress={() =>
                groups[0]
                  ? router.push({ pathname: '/group/[id]/leaderboard', params: { id: groups[0].id } })
                  : router.replace('/(tabs)/home')
              }
            >
              Leaderboard
            </CButton>
          </View>
          <View style={{ flex: 1 }}>
            <CButton
              variant="primary"
              size="lg"
              full
              onPress={() => router.replace('/(tabs)/home')}
            >
              Listo
            </CButton>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
