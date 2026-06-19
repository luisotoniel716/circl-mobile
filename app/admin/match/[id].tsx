import { useEffect, useState } from 'react';
import {
  View, ScrollView, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { LIGAMX } from '../../../src/data';
import type { TeamCode } from '../../../src/types';
import {
  ScreenContainer, TopBar, CButton, Input, Icon, Text, colors, DateTimeField,
} from '../../../src/components';
import {
  useAdminMatch, useAdminTeams, useUpdateMatch, useDeleteMatch, useRecalcResults, useIsAdmin,
} from '../../../src/lib/queries';
import type { MatchStatusDB } from '../../../src/lib/queries';

const STATUS_OPTS: { key: MatchStatusDB; label: string; color: string }[] = [
  { key: 'scheduled', label: 'Programado', color: colors.paper2 },
  { key: 'live',      label: 'En vivo',    color: colors.red },
  { key: 'finished',  label: 'Finalizado', color: colors.green },
  { key: 'postponed', label: 'Pospuesto',  color: colors.gold },
  { key: 'cancelled', label: 'Cancelado',  color: colors.mist },
];

export default function AdminEditMatch() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isAdmin = useIsAdmin();

  const { data: match, isLoading } = useAdminMatch(id);
  const { data: teams = [] } = useAdminTeams();
  const updateMatch = useUpdateMatch();
  const deleteMatch = useDeleteMatch();
  const recalc      = useRecalcResults();

  // ─── Form state ─────────────────────────────────
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [kickoffIso, setKickoffIso] = useState<string>(new Date().toISOString());
  const [status,     setStatus]     = useState<MatchStatusDB>('scheduled');
  const [homeScore,  setHomeScore]  = useState('');
  const [awayScore,  setAwayScore]  = useState('');
  const [matchday,   setMatchday]   = useState('');

  const [teamPicker, setTeamPicker] = useState<'home' | 'away' | null>(null);

  // Sync state when match loads
  useEffect(() => {
    if (!match) return;
    setHomeTeamId(match.home_team_id);
    setAwayTeamId(match.away_team_id);
    setKickoffIso(match.kickoff_at);
    setStatus(match.status);
    setHomeScore(match.home_score?.toString() ?? '');
    setAwayScore(match.away_score?.toString() ?? '');
    setMatchday(match.matchday.toString());
  }, [match]);

  if (!isAdmin) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Editar partido" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={32} color={colors.mist} />
          <Text style={{ color: colors.paper2, marginTop: 8 }}>Acceso restringido.</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isLoading || !match) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Editar partido" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }

  const home = teams.find((t) => t.id === homeTeamId);
  const away = teams.find((t) => t.id === awayTeamId);

  async function handleSave() {
    if (!match) return;
    if (homeTeamId === awayTeamId) {
      Alert.alert('Equipos iguales', 'Local y visitante deben ser distintos.');
      return;
    }
    const md = parseInt(matchday);
    if (isNaN(md) || md < 1 || md > 99) {
      Alert.alert('Jornada inválida', 'Debe ser un número entre 1 y 99.');
      return;
    }
    const hs = homeScore === '' ? null : parseInt(homeScore);
    const as = awayScore === '' ? null : parseInt(awayScore);
    if (hs != null && (isNaN(hs) || hs < 0)) {
      Alert.alert('Marcador inválido', 'Local: número positivo o vacío.');
      return;
    }
    if (as != null && (isNaN(as) || as < 0)) {
      Alert.alert('Marcador inválido', 'Visitante: número positivo o vacío.');
      return;
    }
    if (status === 'finished' && (hs == null || as == null)) {
      Alert.alert('Marcador requerido', 'Un partido finalizado necesita marcador.');
      return;
    }

    try {
      await updateMatch.mutateAsync({
        id:           match.id,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        kickoff_at:   kickoffIso,
        status,
        home_score:   hs,
        away_score:   as,
        matchday:     md,
      });
      Alert.alert('Guardado', 'Cambios aplicados. Los resultados se recalcularon automáticamente.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar.';
      Alert.alert('Error', msg);
    }
  }

  async function handleRecalc() {
    if (!match) return;
    try {
      const n = await recalc.mutateAsync(match.id);
      Alert.alert('Recalculado', `${n} pick(s) actualizados.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo recalcular.';
      Alert.alert('Error', msg);
    }
  }

  function confirmDelete() {
    if (!match) return;
    Alert.alert(
      'Borrar partido',
      `¿Eliminar ${home?.short_name ?? '?'} vs ${away?.short_name ?? '?'}? Esto borra también sus picks.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMatch.mutateAsync(match.id);
              router.back();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'No se pudo borrar.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }

  // ─── Team picker overlay ─────────────────────────
  if (teamPicker) {
    return (
      <ScreenContainer theme="dark">
        <TopBar
          title={`Equipo ${teamPicker === 'home' ? 'local' : 'visitante'}`}
          onBack
        />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 6 }}
          showsVerticalScrollIndicator={false}
        >
          {teams.map((t) => {
            const taken =
              (teamPicker === 'home' && t.id === awayTeamId) ||
              (teamPicker === 'away' && t.id === homeTeamId);
            const isCurrent =
              (teamPicker === 'home' && t.id === homeTeamId) ||
              (teamPicker === 'away' && t.id === awayTeamId);
            return (
              <Pressable
                key={t.id}
                disabled={taken}
                onPress={() => {
                  if (teamPicker === 'home') setHomeTeamId(t.id);
                  else                       setAwayTeamId(t.id);
                  setTeamPicker(null);
                }}
                style={{
                  backgroundColor: isCurrent ? colors.gold + '22' : colors.s800,
                  borderWidth: 1,
                  borderColor: isCurrent ? colors.gold : 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  opacity: taken ? 0.35 : 1,
                }}
              >
                <View style={{
                  width: 34, height: 34, borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: colors.paper, fontWeight: '900', fontSize: 12 }}>{t.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.paper, fontSize: 14, fontWeight: '800' }}>
                    {t.name}
                  </Text>
                  <Text style={{ color: colors.mist, fontSize: 11 }}>
                    {t.short_name} {taken ? '· ocupado' : ''}
                  </Text>
                </View>
                {isCurrent ? <Icon name="check" size={16} color={colors.gold} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─── Main form ───────────────────────────────────
  return (
    <ScreenContainer theme="dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <TopBar
          title="Editar partido"
          onBack
          right={
            <Pressable onPress={confirmDelete} hitSlop={8}>
              <Text
                numberOfLines={1}
                style={{ color: colors.red, fontSize: 12, fontWeight: '800' }}
              >
                BORRAR
              </Text>
            </Pressable>
          }
        />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pick count badge */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.s800,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.04)',
          }}>
            <Icon name="target" size={16} color={colors.gold} />
            <Text style={{ color: colors.paper, fontSize: 13, fontWeight: '700', flex: 1 }}>
              {match.picks_count} pick(s) en este partido
            </Text>
            <Pressable
              onPress={handleRecalc}
              disabled={recalc.isPending}
              style={{
                paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: colors.gold + '22',
              }}
            >
              <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800' }}>
                {recalc.isPending ? 'Recalc…' : 'RECALCULAR'}
              </Text>
            </Pressable>
          </View>

          {/* Teams */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => setTeamPicker('home')}
              style={{
                flex: 1,
                backgroundColor: colors.s800,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist, marginBottom: 6 }}>LOCAL</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: colors.paper }}>
                {home?.short_name ?? '—'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.mist, marginTop: 2 }}>
                Tocar para cambiar ›
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTeamPicker('away')}
              style={{
                flex: 1,
                backgroundColor: colors.s800,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist, marginBottom: 6 }}>VISITANTE</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: colors.paper }}>
                {away?.short_name ?? '—'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.mist, marginTop: 2 }}>
                Tocar para cambiar ›
              </Text>
            </Pressable>
          </View>

          {/* Kickoff & matchday */}
          <DateTimeField
            label="Fecha y hora del partido"
            value={kickoffIso}
            onChange={setKickoffIso}
          />

          <Input
            label="Jornada"
            value={matchday}
            onChangeText={setMatchday}
            keyboardType="number-pad"
            placeholder="14"
            lead={<Icon name="trophy" size={16} color={colors.mist} />}
          />

          {/* Status */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>
              Estado
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STATUS_OPTS.map((s) => {
                const active = status === s.key;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => setStatus(s.key)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 9999,
                      backgroundColor: active ? s.color : 'rgba(255,255,255,0.06)',
                      borderWidth: active ? 0 : 1,
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: active ? colors.paper : colors.paper2,
                    }}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Score */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>
              Marcador {status === 'finished' ? '(requerido)' : '(opcional)'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  value={homeScore}
                  onChangeText={setHomeScore}
                  keyboardType="number-pad"
                  placeholder="—"
                />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.mist }}>–</Text>
              <View style={{ flex: 1 }}>
                <Input
                  value={awayScore}
                  onChangeText={setAwayScore}
                  keyboardType="number-pad"
                  placeholder="—"
                />
              </View>
            </View>
            {status === 'finished' && (homeScore === '' || awayScore === '') ? (
              <Text style={{ fontSize: 11, color: colors.gold, marginTop: 6, paddingLeft: 4 }}>
                ⚠ Captura el marcador antes de guardar.
              </Text>
            ) : null}
          </View>

          {/* Lineups */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>
              Alineaciones (4-3-3)
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <LineupButton
                label="LOCAL"
                code={home?.code as TeamCode | undefined}
                name={home?.short_name}
                onPress={() => router.push(`/admin/lineup?matchId=${match.id}&teamId=${homeTeamId}` as Href)}
              />
              <LineupButton
                label="VISITANTE"
                code={away?.code as TeamCode | undefined}
                name={away?.short_name}
                onPress={() => router.push(`/admin/lineup?matchId=${match.id}&teamId=${awayTeamId}` as Href)}
              />
            </View>
          </View>

          {/* Actual scorers (capture once there's a score) */}
          <Pressable
            onPress={() => router.push(`/admin/scorers?matchId=${match.id}` as Href)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: colors.s800,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.04)',
            }}
          >
            <Text style={{ fontSize: 18 }}>⚽</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.paper, fontSize: 13, fontWeight: '800' }}>Goleadores reales</Text>
              <Text style={{ color: colors.mist, fontSize: 11 }}>Captura quién anotó para puntuar predicciones.</Text>
            </View>
            <Icon name="forward" size={18} color={colors.mist} />
          </Pressable>

          {/* Save */}
          <View style={{ marginTop: 8 }}>
            <CButton
              variant="primary"
              size="lg"
              full
              onPress={handleSave}
              disabled={updateMatch.isPending}
              lead={<Icon name="check" size={20} color={colors.paper} />}
            >
              {updateMatch.isPending ? 'Guardando…' : 'Guardar cambios'}
            </CButton>
          </View>

          <Text style={{
            fontSize: 11,
            color: colors.mist,
            textAlign: 'center',
            lineHeight: 17,
            marginTop: 4,
          }}>
            Al guardar cambios en status o marcador,{'\n'}los puntos se recalculan automáticamente.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

// ─── Lineup shortcut button ──────────────────────────────────

interface LineupButtonProps {
  label:   string;
  code?:   TeamCode;
  name?:   string;
  onPress: () => void;
}

function LineupButton({ label, code, name, onPress }: LineupButtonProps) {
  const known = code ? LIGAMX[code] : undefined;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: colors.s800,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: colors.paper }}>
          {name ?? '—'}
        </Text>
        <Icon name="people" size={16} color={colors.mist} />
      </View>
      <Text style={{ fontSize: 11, color: colors.gold, marginTop: 4, fontWeight: '700' }}>
        {known ? 'Editar 11 ›' : 'Editar ›'}
      </Text>
    </Pressable>
  );
}
