import { View, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, Section, CButton, TeamCrest, Icon, Text, colors,
} from '../../src/components';
import { LIGAMX } from '../../src/data';
import type { TeamCode } from '../../src/types';
import {
  useMatch, useMyGroups, useMyPicksForMatch,
} from '../../src/lib/queries';

export default function MatchDetail() {
  const { id: matchId, groupId } = useLocalSearchParams<{ id: string; groupId?: string }>();
  const router = useRouter();

  const { data: match, isLoading } = useMatch(matchId);
  const { data: groups = [] }      = useMyGroups();
  const { data: myPicks = {} }     = useMyPicksForMatch(matchId);

  // Group context (if entered from inside a group)
  const contextGroup = groupId ? groups.find((g) => g.id === groupId) : null;

  if (isLoading) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Partido" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }

  if (!match) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Partido" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.paper2 }}>Partido no encontrado.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const homeCode = match.home as TeamCode;
  const awayCode = match.away as TeamCode;
  const h = LIGAMX[homeCode];
  const a = LIGAMX[awayCode];

  // Picks are per-group. When entered from a group context, only that
  // group's pick counts for the "already picked" status; otherwise we look
  // at the union across all the user's groups.
  const pickedPredictions = Object.values(myPicks);
  const pickedGroupsCount = pickedPredictions.length;
  const totalGroupsCount  = groups.length;
  const contextPick       = groupId ? myPicks[groupId] ?? null : null;

  const alreadyPickedInContext = !!contextPick;
  const alreadyPickedAnywhere  = pickedGroupsCount > 0;
  // Partial coverage: user picked in some groups but not all (only meaningful
  // outside group context).
  const isPartialCoverage = !groupId
    && totalGroupsCount > 1
    && pickedGroupsCount > 0
    && pickedGroupsCount < totalGroupsCount;

  // Banner label depends on context:
  //   • In a group context → show that group's pick (or nothing).
  //   • Outside context → show the first existing pick.
  const labelPred = groupId ? contextPick : (pickedPredictions[0] ?? null);
  const myPredLabel = labelPred === 'home' ? h.name
                    : labelPred === 'away' ? a.name
                    : labelPred === 'draw' ? 'Empate'
                    : null;
  const showBanner = groupId ? alreadyPickedInContext : alreadyPickedAnywhere;

  const isFinished = match.status === 'finished';
  const isLive     = match.status === 'live';

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Partido" onBack />

      {/* Match hero */}
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <View style={{ borderRadius: 20, overflow: 'hidden' }}>
          <LinearGradient
            colors={[h.primary, h.primary, '#FAFAFA', '#FAFAFA', a.primary, a.primary]}
            locations={[0, 0.45, 0.45, 0.51, 0.51, 1]}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={{ paddingVertical: 24, paddingHorizontal: 18 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: colors.paper, fontSize: 10, fontWeight: '800' }}>
                {match.round.toUpperCase()}
              </Text>
              <Text style={{ color: colors.paper, fontSize: 10, fontWeight: '800' }}>
                {match.kickoff.toUpperCase()}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <TeamCrest team={h} size={58} />
                <Text style={{ color: h.text, fontWeight: '900', fontSize: 18, marginTop: 6 }}>{h.name}</Text>
                <Text style={{ color: h.text, fontSize: 10, fontWeight: '700', opacity: 0.9 }}>LOCAL</Text>
              </View>

              {/* Score or kick-off */}
              <View style={{
                backgroundColor: 'rgba(0,0,0,0.65)',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 14,
                alignItems: 'center',
              }}>
                {isFinished || isLive ? (
                  <>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: isLive ? colors.red : colors.gold }}>
                      {isLive ? '● LIVE' : 'FINAL'}
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: colors.paper }}>
                      {match.score ? `${match.score[0]} - ${match.score[1]}` : '- -'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.gold }}>KICK OFF</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: colors.paper }}>
                      {match.kickoff.split('·')[1]?.trim() ?? '—'}
                    </Text>
                  </>
                )}
              </View>

              <View style={{ flex: 1, alignItems: 'center' }}>
                <TeamCrest team={a} size={58} />
                <Text style={{ color: a.text, fontWeight: '900', fontSize: 18, marginTop: 6 }}>{a.name}</Text>
                <Text style={{ color: a.text, fontSize: 10, fontWeight: '700', opacity: 0.9 }}>VISITANTE</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* My current pick summary — only when there's a pick relevant to this
            view (in the context group, or in any group when no context). */}
        {showBanner && myPredLabel && (
          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <View style={{
              backgroundColor: (isPartialCoverage ? colors.gold : colors.green) + '18',
              borderWidth: 1,
              borderColor: (isPartialCoverage ? colors.gold : colors.green) + '44',
              borderRadius: 14,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <Icon
                name="check"
                size={18}
                color={isPartialCoverage ? colors.gold : colors.green}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.paper, fontWeight: '700', fontSize: 13 }}>
                  Tu pick: <Text style={{ color: isPartialCoverage ? colors.gold : colors.green }}>{myPredLabel}</Text>
                </Text>
                {isPartialCoverage ? (
                  <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                    Solo en {pickedGroupsCount}/{totalGroupsCount} grupos
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 11, color: colors.mist }}>
                {isPartialCoverage ? 'Completar ›' : 'Cambiar abajo ›'}
              </Text>
            </View>
          </View>
        )}

        {/* Groups section */}
        {groups.length > 0 && (
          <Section title="TUS CIRCLS">
            <View style={{ backgroundColor: colors.s800, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 6 }}>
              {groups.map((g) => {
                const pred = myPicks[g.id];
                const predLabel = pred === 'home' ? h.name : pred === 'away' ? a.name : pred === 'draw' ? 'Empate' : null;
                return (
                  <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: g.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14 }}>{g.icon}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.paper }}>{g.name}</Text>
                    {predLabel ? (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.green }}>{predLabel} ✓</Text>
                    ) : (
                      <Text style={{ fontSize: 11, color: colors.mist }}>Sin pick</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </Section>
        )}
      </ScrollView>

      {/* CTA */}
      {!isFinished && (
        <View style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.04)',
        }}>
          <CButton
            variant="primary"
            size="lg"
            full
            lead={<Icon name="target" size={20} color={colors.paper} />}
            onPress={() =>
              router.push({
                pathname: '/pick/[id]',
                params: groupId
                  ? { id: matchId, groupId }
                  : { id: matchId },
              })
            }
          >
            {contextGroup
              ? alreadyPickedInContext
                ? `Cambiar pick · ${contextGroup.name}`
                : `Hacer pick · ${contextGroup.name}`
              : isPartialCoverage
              ? `Completar pick · ${pickedGroupsCount}/${totalGroupsCount}`
              : alreadyPickedAnywhere
              ? 'Cambiar pick'
              : 'Hacer pick'}
          </CButton>
        </View>
      )}
    </ScreenContainer>
  );
}
