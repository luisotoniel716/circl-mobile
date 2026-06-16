import { useState, useEffect } from 'react';
import {
  View, ScrollView, Pressable, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import {
  ScreenContainer, TopBar, CButton, Input, Icon, Text, colors, DateTimeField,
} from '../../../src/components';
import {
  useAdminTeams, useCreateMatch, useIsAdmin, useLeagues,
} from '../../../src/lib/queries';

export default function AdminNewMatch() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { data: teams = [] } = useAdminTeams();
  const { data: leagues = [] } = useLeagues();
  const createMatch = useCreateMatch();

  const [leagueId,   setLeagueId]   = useState<string | null>(null);
  const [seasonId,   setSeasonId]   = useState<string | null>(null);
  const [homeTeamId, setHomeTeamId] = useState<string | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<string | null>(null);
  const [kickoffIso, setKickoffIso] = useState<string>(() => {
    // Default to "today at 21:00" so the picker starts somewhere reasonable.
    const d = new Date();
    d.setHours(21, 0, 0, 0);
    return d.toISOString();
  });
  const [matchday,   setMatchday]   = useState('14');

  const [teamPicker, setTeamPicker] = useState<'home' | 'away' | null>(null);

  // Default to first league
  useEffect(() => {
    if (!leagueId && leagues.length > 0) setLeagueId(leagues[0].id);
  }, [leagueId, leagues]);

  // Load active season for selected league
  useEffect(() => {
    if (!leagueId) return;
    (async () => {
      const { data } = await supabase
        .from('seasons')
        .select('id')
        .eq('league_id', leagueId)
        .eq('active', true)
        .limit(1)
        .maybeSingle();
      if (data) setSeasonId(data.id);
    })();
  }, [leagueId]);

  if (!isAdmin) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Nuevo partido" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={32} color={colors.mist} />
          <Text style={{ color: colors.paper2, marginTop: 8 }}>Acceso restringido.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const home = teams.find((t) => t.id === homeTeamId);
  const away = teams.find((t) => t.id === awayTeamId);

  async function handleCreate() {
    if (!leagueId || !seasonId) {
      Alert.alert('Sin liga', 'No se encontró una temporada activa para esta liga.');
      return;
    }
    if (!homeTeamId || !awayTeamId) {
      Alert.alert('Faltan equipos', 'Selecciona local y visitante.');
      return;
    }
    if (homeTeamId === awayTeamId) {
      Alert.alert('Equipos iguales', 'Local y visitante deben ser distintos.');
      return;
    }
    const md = parseInt(matchday);
    if (isNaN(md) || md < 1) {
      Alert.alert('Jornada inválida', 'Debe ser un número positivo.');
      return;
    }
    try {
      const id = await createMatch.mutateAsync({
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        kickoff_at:   kickoffIso,
        matchday:     md,
        league_id:    leagueId,
        season_id:    seasonId,
      });
      router.replace({ pathname: '/admin/match/[id]', params: { id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear.';
      Alert.alert('Error', msg);
    }
  }

  // Team picker
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
                  backgroundColor: colors.s800,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  opacity: taken ? 0.35 : 1,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.04)',
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
                  <Text style={{ color: colors.paper, fontSize: 14, fontWeight: '800' }}>{t.name}</Text>
                  <Text style={{ color: colors.mist, fontSize: 11 }}>
                    {t.short_name} {taken ? '· ocupado' : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (leagues.length === 0) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Nuevo partido" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme="dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <TopBar title="Nuevo partido" onBack />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* League */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>
              Liga
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {leagues.map((l) => {
                const active = leagueId === l.id;
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => setLeagueId(l.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 9999,
                      backgroundColor: active ? colors.gold : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: active ? colors.ink : colors.paper2,
                    }}>{l.name}</Text>
                  </Pressable>
                );
              })}
            </View>
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
              <Text style={{ fontSize: 14, fontWeight: '900', color: home ? colors.paper : colors.mist }}>
                {home?.short_name ?? 'Elegir…'}
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
              <Text style={{ fontSize: 14, fontWeight: '900', color: away ? colors.paper : colors.mist }}>
                {away?.short_name ?? 'Elegir…'}
              </Text>
            </Pressable>
          </View>

          {/* Kickoff */}
          <DateTimeField
            label="Fecha y hora del partido"
            value={kickoffIso}
            onChange={setKickoffIso}
          />

          {/* Matchday */}
          <Input
            label="Jornada"
            value={matchday}
            onChangeText={setMatchday}
            keyboardType="number-pad"
            placeholder="14"
            lead={<Icon name="trophy" size={16} color={colors.mist} />}
          />

          <View style={{ marginTop: 8 }}>
            <CButton
              variant="primary"
              size="lg"
              full
              onPress={handleCreate}
              disabled={createMatch.isPending}
              lead={<Icon name="add" size={20} color={colors.paper} />}
            >
              {createMatch.isPending ? 'Creando…' : 'Crear partido'}
            </CButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
