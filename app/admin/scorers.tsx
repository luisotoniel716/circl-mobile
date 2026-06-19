import { useEffect, useState } from 'react';
import {
  View, ScrollView, Pressable, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  ScreenContainer, TopBar, CButton, Icon, TeamCrest, Text, colors,
} from '../../src/components';
import {
  useAdminMatch, useIsAdmin, useTeamPlayers, useMatchGoals, useSetMatchGoals,
} from '../../src/lib/queries';
import { LIGAMX } from '../../src/data';
import type { TeamCode } from '../../src/types';

interface GoalRow { key: string; teamId: string; playerId: string; }

let goalSeq = 0;
const newKey = () => `g${goalSeq++}`;

export default function AdminScorers() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const isAdmin = useIsAdmin();

  const { data: match, isLoading: matchLoading } = useAdminMatch(matchId);
  const { data: homeRoster = [] } = useTeamPlayers(match?.home_team_id);
  const { data: awayRoster = [] } = useTeamPlayers(match?.away_team_id);
  const { data: existing = [], isLoading: goalsLoading } = useMatchGoals(matchId);
  const setMatchGoals = useSetMatchGoals();

  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [picker, setPicker] = useState<'home' | 'away' | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || goalsLoading) return;
    setGoals(existing.map((g) => ({ key: newKey(), teamId: g.team_id, playerId: g.player_id })));
    setInitialized(true);
  }, [initialized, goalsLoading, existing]);

  if (!isAdmin) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Goleadores" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={32} color={colors.mist} />
          <Text style={{ color: colors.paper2, marginTop: 8 }}>Acceso restringido.</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (matchLoading || !match) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Goleadores" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }

  const homeCode = match.home.code as TeamCode;
  const awayCode = match.away.code as TeamCode;
  const rosterFor = (side: 'home' | 'away') => (side === 'home' ? homeRoster : awayRoster);
  const teamIdFor = (side: 'home' | 'away') => (side === 'home' ? match.home_team_id : match.away_team_id);
  const playerName = (playerId: string) => {
    const p = [...homeRoster, ...awayRoster].find((x) => x.id === playerId);
    return p ? `${p.number != null ? p.number + ' · ' : ''}${p.name}` : '—';
  };

  const homeGoals = goals.filter((g) => g.teamId === match.home_team_id);
  const awayGoals = goals.filter((g) => g.teamId === match.away_team_id);

  function addGoal(side: 'home' | 'away', playerId: string) {
    setGoals((prev) => [...prev, { key: newKey(), teamId: teamIdFor(side), playerId }]);
    setPicker(null);
  }
  function removeGoal(key: string) {
    setGoals((prev) => prev.filter((g) => g.key !== key));
  }

  async function handleSave() {
    try {
      await setMatchGoals.mutateAsync({
        matchId: matchId!,
        goals: goals.map((g) => ({ playerId: g.playerId, teamId: g.teamId })),
      });
      Alert.alert('Guardado', 'Goleadores guardados.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar.';
      Alert.alert('Error', msg);
    }
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Goleadores reales" onBack />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <TeamGoalsCard
          code={homeCode}
          label="LOCAL"
          expected={match.home_score}
          goals={homeGoals.map((g) => ({ key: g.key, name: playerName(g.playerId) }))}
          onAdd={() => setPicker('home')}
          onRemove={removeGoal}
        />
        <TeamGoalsCard
          code={awayCode}
          label="VISITANTE"
          expected={match.away_score}
          goals={awayGoals.map((g) => ({ key: g.key, name: playerName(g.playerId) }))}
          onAdd={() => setPicker('away')}
          onRemove={removeGoal}
        />

        {match.status !== 'finished' ? (
          <Text style={{ fontSize: 11, color: colors.gold, textAlign: 'center', lineHeight: 17 }}>
            ⚠ El partido aún no está finalizado. Puedes capturar goleadores pero los puntos se calcularán al finalizar.
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 }}>
        <CButton
          variant="primary"
          size="lg"
          full
          onPress={handleSave}
          disabled={setMatchGoals.isPending}
          lead={<Icon name="check" size={20} color={colors.paper} />}
        >
          {setMatchGoals.isPending ? 'Guardando…' : 'Guardar goleadores'}
        </CButton>
      </View>

      {/* Player picker */}
      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPicker(null)} />
          <View style={{
            backgroundColor: colors.s900,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingTop: 16, paddingBottom: 28, maxHeight: '70%',
            borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 }}>
              <Text style={{ color: colors.paper, fontSize: 16, fontWeight: '900', flex: 1 }}>
                ¿Quién anotó?
              </Text>
              <Pressable onPress={() => setPicker(null)} hitSlop={8}>
                <Icon name="close" size={22} color={colors.paper2} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 6 }}>
              {picker && rosterFor(picker).length === 0 ? (
                <Text style={{ color: colors.paper2, textAlign: 'center', paddingVertical: 20 }}>
                  Sin jugadores en la plantilla de este equipo.
                </Text>
              ) : null}
              {picker && rosterFor(picker).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => addGoal(picker, p.id)}
                  style={{
                    backgroundColor: colors.s800,
                    borderRadius: 12, padding: 10,
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.paper, fontWeight: '900', fontSize: 13 }}>{p.number ?? '–'}</Text>
                  </View>
                  <Text style={{ flex: 1, color: colors.paper, fontSize: 14, fontWeight: '700' }}>{p.name}</Text>
                  <Text style={{ color: colors.mist, fontSize: 10, fontWeight: '800' }}>{p.position}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

interface TeamGoalsCardProps {
  code:     TeamCode;
  label:    string;
  expected: number | null;
  goals:    { key: string; name: string }[];
  onAdd:    () => void;
  onRemove: (key: string) => void;
}

function TeamGoalsCard({ code, label, expected, goals, onAdd, onRemove }: TeamGoalsCardProps) {
  const known = LIGAMX[code];
  const match = expected == null || expected === goals.length;
  return (
    <View style={{ backgroundColor: colors.s800, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {known ? <TeamCrest team={code} size={34} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist }}>{label}</Text>
          <Text style={{ fontSize: 15, fontWeight: '900', color: colors.paper }}>{known?.name ?? code}</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '800', color: match ? colors.green : colors.gold }}>
          {goals.length}{expected != null ? `/${expected}` : ''} gol(es)
        </Text>
      </View>

      {goals.map((g) => (
        <View key={g.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
          <Text style={{ fontSize: 13 }}>⚽</Text>
          <Text style={{ flex: 1, color: colors.paper, fontSize: 13, fontWeight: '700' }}>{g.name}</Text>
          <Pressable onPress={() => onRemove(g.key)} hitSlop={8}>
            <Icon name="close" size={16} color={colors.red} />
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={onAdd}
        style={{
          marginTop: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: 'rgba(255,255,255,0.18)',
        }}
      >
        <Icon name="add" size={16} color={colors.gold} />
        <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '800' }}>Agregar gol</Text>
      </Pressable>
    </View>
  );
}
