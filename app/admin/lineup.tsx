import { useEffect, useMemo, useState } from 'react';
import {
  View, ScrollView, Pressable, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  ScreenContainer, TopBar, CButton, Icon, Jersey, Text, colors,
} from '../../src/components';
import {
  useAdminTeams, useIsAdmin, useTeamPlayers, useMatchLineup,
  useSaveLineup, useLastTeamLineup, FORMATION_433,
} from '../../src/lib/queries';
import type { Player, PlayerPosition } from '../../src/lib/queries';
import { LIGAMX } from '../../src/data';
import type { TeamCode } from '../../src/types';

// Pitch rows top→bottom: GK, DEF, MID, FW (mirrors the reference layout).
const ROWS: { label: string; slots: number[] }[] = [
  { label: 'GK',  slots: [1] },
  { label: 'DEF', slots: [2, 3, 4, 5] },
  { label: 'MID', slots: [6, 7, 8] },
  { label: 'FW',  slots: [9, 10, 11] },
];

const SLOT_POSITION: Record<number, PlayerPosition> = Object.fromEntries(
  FORMATION_433.map((f) => [f.slot, f.position]),
) as Record<number, PlayerPosition>;

export default function AdminLineupEditor() {
  const { matchId, teamId } = useLocalSearchParams<{ matchId: string; teamId: string }>();
  const isAdmin = useIsAdmin();

  const { data: teams = [] } = useAdminTeams();
  const team = teams.find((t) => t.id === teamId);
  const { data: roster = [], isLoading: rosterLoading } = useTeamPlayers(teamId);
  const { data: lineup, isLoading: lineupLoading } = useMatchLineup(matchId);
  const { data: lastLineup } = useLastTeamLineup(teamId, matchId);
  const saveLineup = useSaveLineup();

  // slot → playerId (or undefined)
  const [assign, setAssign] = useState<Record<number, string | undefined>>({});
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize from the existing saved lineup once data arrives.
  useEffect(() => {
    if (initialized || lineupLoading) return;
    const entries = lineup?.byTeam[teamId!] ?? [];
    if (entries.length > 0) {
      const next: Record<number, string> = {};
      for (const e of entries) next[e.slot] = e.player.id;
      setAssign(next);
    }
    setInitialized(true);
  }, [initialized, lineupLoading, lineup, teamId]);

  const crestCode = team?.code as TeamCode | undefined;
  const known = crestCode ? LIGAMX[crestCode] : undefined;
  const primary   = known?.primary   ?? '#2A3344';
  const secondary = known?.secondary ?? '#FFFFFF';

  const playerById = useMemo(() => {
    const m: Record<string, Player> = {};
    for (const p of roster) m[p.id] = p;
    return m;
  }, [roster]);

  const filledCount = Object.values(assign).filter(Boolean).length;

  function assignPlayer(slot: number, playerId: string) {
    setAssign((prev) => {
      const next = { ...prev };
      // Remove this player from any other slot (no duplicates).
      for (const k of Object.keys(next)) {
        if (next[Number(k)] === playerId) next[Number(k)] = undefined;
      }
      next[slot] = playerId;
      return next;
    });
    setPickerSlot(null);
  }

  function clearSlot(slot: number) {
    setAssign((prev) => ({ ...prev, [slot]: undefined }));
    setPickerSlot(null);
  }

  function loadPrevious() {
    if (!lastLineup || lastLineup.length === 0) {
      Alert.alert('Sin alineación previa', 'Este equipo no tiene una alineación anterior guardada.');
      return;
    }
    const next: Record<number, string> = {};
    for (const { slot, playerId } of lastLineup) {
      // Only keep players that still exist in the active roster.
      if (playerById[playerId]) next[slot] = playerId;
    }
    setAssign(next);
  }

  async function handleSave() {
    const slots = Object.entries(assign)
      .filter(([, pid]) => !!pid)
      .map(([slot, pid]) => ({ slot: Number(slot), playerId: pid as string }));
    try {
      await saveLineup.mutateAsync({ matchId: matchId!, teamId: teamId!, slots });
      Alert.alert('Guardado', 'Alineación guardada.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar.';
      Alert.alert('Error', msg);
    }
  }

  if (!isAdmin) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Alineación" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={32} color={colors.mist} />
          <Text style={{ color: colors.paper2, marginTop: 8 }}>Acceso restringido.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar
        title={team?.short_name ?? 'Alineación'}
        onBack
        right={
          <Pressable onPress={loadPrevious} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="back" size={15} color={colors.gold} />
            <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800' }}>ANTERIOR</Text>
          </Pressable>
        }
      />

      {rosterLoading || lineupLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      ) : roster.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Icon name="people" size={40} color={colors.mist} />
          <Text style={{ color: colors.paper, fontSize: 15, fontWeight: '800', marginTop: 12, textAlign: 'center' }}>
            Sin jugadores en la plantilla
          </Text>
          <Text style={{ color: colors.paper2, fontSize: 13, marginTop: 4, textAlign: 'center', lineHeight: 19 }}>
            Agrega jugadores a este equipo desde Admin · Plantillas para poder armar la alineación.
          </Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 }}>
            <Text style={{ fontSize: 12, color: colors.paper2, fontWeight: '700' }}>
              Formación 4-3-3
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: filledCount === 11 ? colors.green : colors.gold }}>
              {filledCount}/11
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Pitch */}
            <View
              style={{
                backgroundColor: '#0E5C3A',
                borderRadius: 20,
                paddingVertical: 22,
                paddingHorizontal: 8,
                gap: 18,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
                overflow: 'hidden',
              }}
            >
              {/* Center line accent */}
              <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              <View style={{ position: 'absolute', top: '50%', left: '50%', width: 70, height: 70, marginLeft: -35, marginTop: -35, borderRadius: 35, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />

              {ROWS.map((row) => (
                <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start' }}>
                  {row.slots.map((slot) => {
                    const pid = assign[slot];
                    const player = pid ? playerById[pid] : undefined;
                    return (
                      <Pressable key={slot} onPress={() => setPickerSlot(slot)} style={{ alignItems: 'center' }}>
                        {player ? (
                          <Jersey
                            primary={primary}
                            secondary={secondary}
                            number={player.number}
                            name={player.name}
                            size={48}
                          />
                        ) : (
                          <View style={{ alignItems: 'center', width: 60 }}>
                            <View
                              style={{
                                width: 48, height: 48, borderRadius: 24,
                                borderWidth: 1.5, borderStyle: 'dashed',
                                borderColor: 'rgba(255,255,255,0.5)',
                                alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <Icon name="add" size={20} color="rgba(255,255,255,0.7)" />
                            </View>
                            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: '700' }}>
                              {SLOT_POSITION[slot]}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <Text style={{ fontSize: 11, color: colors.mist, textAlign: 'center', marginTop: 12, lineHeight: 17 }}>
              Toca una posición para asignar un jugador.{'\n'}
              Usa “ANTERIOR” para cargar la última alineación de este equipo.
            </Text>
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 }}>
            <CButton
              variant="primary"
              size="lg"
              full
              onPress={handleSave}
              disabled={saveLineup.isPending}
              lead={<Icon name="check" size={20} color={colors.paper} />}
            >
              {saveLineup.isPending ? 'Guardando…' : 'Guardar alineación'}
            </CButton>
          </View>
        </>
      )}

      {/* Player picker */}
      <Modal visible={pickerSlot !== null} transparent animationType="slide" onRequestClose={() => setPickerSlot(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPickerSlot(null)} />
          <View
            style={{
              backgroundColor: colors.s900,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 16,
              paddingBottom: 28,
              maxHeight: '70%',
              borderTopWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 }}>
              <Text style={{ color: colors.paper, fontSize: 16, fontWeight: '900', flex: 1 }}>
                {pickerSlot != null ? `Posición ${SLOT_POSITION[pickerSlot]}` : ''}
              </Text>
              {pickerSlot != null && assign[pickerSlot] ? (
                <Pressable onPress={() => clearSlot(pickerSlot)} hitSlop={8} style={{ marginRight: 14 }}>
                  <Text style={{ color: colors.red, fontSize: 12, fontWeight: '800' }}>QUITAR</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setPickerSlot(null)} hitSlop={8}>
                <Icon name="close" size={22} color={colors.paper2} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 6 }}>
              {roster.map((p) => {
                const usedSlot = Object.entries(assign).find(([, pid]) => pid === p.id)?.[0];
                const isHere = pickerSlot != null && assign[pickerSlot] === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => pickerSlot != null && assignPlayer(pickerSlot, p.id)}
                    style={{
                      backgroundColor: isHere ? colors.gold + '22' : colors.s800,
                      borderRadius: 12,
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 1,
                      borderColor: isHere ? colors.gold : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: colors.paper, fontWeight: '900', fontSize: 13 }}>{p.number ?? '–'}</Text>
                    </View>
                    <Text style={{ flex: 1, color: colors.paper, fontSize: 14, fontWeight: '700' }}>{p.name}</Text>
                    <Text style={{ color: colors.mist, fontSize: 10, fontWeight: '800' }}>{p.position}</Text>
                    {usedSlot && !isHere ? (
                      <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800' }}>EN CANCHA</Text>
                    ) : null}
                    {isHere ? <Icon name="check" size={16} color={colors.gold} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
