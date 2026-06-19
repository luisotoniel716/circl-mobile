import { useState } from 'react';
import {
  View, ScrollView, Pressable, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  ScreenContainer, TopBar, CButton, Input, Icon, TeamCrest, Text, colors,
} from '../../../src/components';
import {
  useAdminTeams, useIsAdmin, useTeamPlayers, useUpsertPlayer, useDeletePlayer,
} from '../../../src/lib/queries';
import type { Player, PlayerPosition } from '../../../src/lib/queries';
import { LIGAMX } from '../../../src/data';
import type { TeamCode } from '../../../src/types';

const POSITIONS: { key: PlayerPosition; label: string }[] = [
  { key: 'GK',  label: 'Portero' },
  { key: 'DEF', label: 'Defensa' },
  { key: 'MID', label: 'Medio' },
  { key: 'FW',  label: 'Delantero' },
];

const POSITION_GROUPS: { key: PlayerPosition; label: string }[] = [
  { key: 'GK',  label: 'PORTEROS' },
  { key: 'DEF', label: 'DEFENSAS' },
  { key: 'MID', label: 'MEDIOCAMPISTAS' },
  { key: 'FW',  label: 'DELANTEROS' },
];

export default function AdminTeamRoster() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const isAdmin = useIsAdmin();

  const { data: teams = [] } = useAdminTeams();
  const team = teams.find((t) => t.id === teamId);
  const { data: players = [], isLoading } = useTeamPlayers(teamId);
  const upsertPlayer = useUpsertPlayer();
  const deletePlayer = useDeletePlayer();

  // null = closed, 'new' = adding, Player = editing
  const [editing, setEditing] = useState<Player | 'new' | null>(null);

  if (!isAdmin) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Plantilla" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={32} color={colors.mist} />
          <Text style={{ color: colors.paper2, marginTop: 8 }}>Acceso restringido.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const crestCode = team?.code as TeamCode | undefined;
  const known = crestCode ? LIGAMX[crestCode] : undefined;

  function confirmDelete(p: Player) {
    Alert.alert('Quitar jugador', `¿Quitar a ${p.name} de la plantilla?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          deletePlayer.mutate({ id: p.id, teamId: teamId! });
        },
      },
    ]);
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar
        title={team?.short_name ?? 'Plantilla'}
        onBack
        right={
          <Pressable
            onPress={() => setEditing('new')}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Icon name="add" size={18} color={colors.gold} />
            <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '800' }}>JUGADOR</Text>
          </Pressable>
        }
      />

      {/* Team header */}
      {team ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 }}>
          {known ? (
            <TeamCrest team={crestCode!} size={40} />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.paper, fontWeight: '900', fontSize: 12 }}>{team.code}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.paper, fontSize: 16, fontWeight: '900' }}>{team.name}</Text>
            <Text style={{ color: colors.mist, fontSize: 11 }}>{players.length} jugador(es)</Text>
          </View>
        </View>
      ) : null}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      ) : players.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Icon name="people" size={40} color={colors.mist} />
          <Text style={{ color: colors.paper, fontSize: 15, fontWeight: '800', marginTop: 12 }}>
            Sin jugadores
          </Text>
          <Text style={{ color: colors.paper2, fontSize: 13, marginTop: 4, textAlign: 'center', lineHeight: 19 }}>
            Agrega los jugadores de este equipo para poder armar alineaciones y predicciones de goleadores.
          </Text>
          <View style={{ marginTop: 16 }}>
            <CButton variant="primary" size="md" onPress={() => setEditing('new')} lead={<Icon name="add" size={18} color={colors.paper} />}>
              Agregar jugador
            </CButton>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {POSITION_GROUPS.map((grp) => {
            const list = players.filter((p) => p.position === grp.key);
            if (list.length === 0) return null;
            return (
              <View key={grp.key} style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, paddingLeft: 2 }}>
                  {grp.label}
                </Text>
                {list.map((p) => (
                  <View
                    key={p.id}
                    style={{
                      backgroundColor: colors.s800,
                      borderRadius: 12,
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <View style={{
                      width: 34, height: 34, borderRadius: 8,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: colors.paper, fontWeight: '900', fontSize: 14 }}>
                        {p.number ?? '–'}
                      </Text>
                    </View>
                    <Text style={{ flex: 1, color: colors.paper, fontSize: 14, fontWeight: '700' }}>
                      {p.name}
                    </Text>
                    <Pressable onPress={() => setEditing(p)} hitSlop={8} style={{ padding: 4 }}>
                      <Icon name="edit" size={16} color={colors.paper2} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(p)} hitSlop={8} style={{ padding: 4 }}>
                      <Icon name="trash" size={16} color={colors.red} />
                    </Pressable>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add / edit form */}
      <PlayerFormModal
        key={editing === 'new' ? 'new' : editing?.id ?? 'closed'}
        visible={editing !== null}
        player={editing === 'new' ? null : editing}
        saving={upsertPlayer.isPending}
        onCancel={() => setEditing(null)}
        onSave={async (vals) => {
          try {
            await upsertPlayer.mutateAsync({
              id:       editing && editing !== 'new' ? editing.id : undefined,
              team_id:  teamId!,
              name:     vals.name,
              number:   vals.number,
              position: vals.position,
            });
            setEditing(null);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'No se pudo guardar.';
            Alert.alert('Error', msg);
          }
        }}
      />
    </ScreenContainer>
  );
}

// ─── Player form (modal) ──────────────────────────────────────

interface PlayerFormValues {
  name:     string;
  number:   number | null;
  position: PlayerPosition;
}

interface PlayerFormModalProps {
  visible:  boolean;
  player:   Player | null;
  saving:   boolean;
  onCancel: () => void;
  onSave:   (vals: PlayerFormValues) => void;
}

function PlayerFormModal({ visible, player, saving, onCancel, onSave }: PlayerFormModalProps) {
  const [name, setName]         = useState(player?.name ?? '');
  const [number, setNumber]     = useState(player?.number != null ? String(player.number) : '');
  const [position, setPosition] = useState<PlayerPosition>(player?.position ?? 'MID');

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del jugador.');
      return;
    }
    const num = number.trim() === '' ? null : parseInt(number, 10);
    if (num != null && (isNaN(num) || num < 0 || num > 99)) {
      Alert.alert('Número inválido', 'El dorsal debe estar entre 0 y 99.');
      return;
    }
    onSave({ name: trimmed, number: num, position });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={{ flex: 1 }} onPress={onCancel} />
        <View
          style={{
            backgroundColor: colors.s900,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 32,
            gap: 16,
            borderTopWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.paper, fontSize: 17, fontWeight: '900', flex: 1 }}>
              {player ? 'Editar jugador' : 'Nuevo jugador'}
            </Text>
            <Pressable onPress={onCancel} hitSlop={8}>
              <Icon name="close" size={22} color={colors.paper2} />
            </Pressable>
          </View>

          <Input
            label="Nombre"
            value={name}
            onChangeText={setName}
            placeholder="Ej. Henry Martín"
            autoFocus
          />

          <Input
            label="Dorsal (opcional)"
            value={number}
            onChangeText={setNumber}
            keyboardType="number-pad"
            placeholder="9"
            lead={<Icon name="target" size={16} color={colors.mist} />}
          />

          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>
              Posición
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {POSITIONS.map((p) => {
                const active = position === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => setPosition(p.key)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 9999,
                      backgroundColor: active ? colors.gold : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: active ? colors.ink : colors.paper2 }}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <CButton
            variant="primary"
            size="lg"
            full
            onPress={handleSave}
            disabled={saving}
            lead={<Icon name="check" size={20} color={colors.paper} />}
          >
            {saving ? 'Guardando…' : 'Guardar jugador'}
          </CButton>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
