import { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  ScreenContainer, TopBar, CButton, Icon, Text, colors,
} from '../../src/components';
import { useAdminMatches, useIsAdmin } from '../../src/lib/queries';
import type { MatchStatusDB } from '../../src/lib/queries';

const STATUS_LABELS: Record<MatchStatusDB | 'all', { es: string; color: string }> = {
  all:       { es: 'Todos',      color: colors.paper2 },
  scheduled: { es: 'Programados', color: colors.paper2 },
  live:      { es: 'En vivo',    color: colors.red },
  finished:  { es: 'Finalizados', color: colors.green },
  postponed: { es: 'Pospuestos', color: colors.gold },
  cancelled: { es: 'Cancelados', color: colors.mist },
};

function formatKickoff(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function AdminMatchesList() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [filter, setFilter] = useState<MatchStatusDB | 'all'>('all');

  const { data: rawMatches = [], isLoading } = useAdminMatches();

  // Derived status: a scheduled match whose kickoff has passed counts
  // as live until admin explicitly marks it as finished/cancelled.
  const isLiveLike = (m: { status: string; kickoff_at: string }) => {
    if (m.status === 'live') return true;
    if (m.status === 'scheduled' && new Date(m.kickoff_at).getTime() <= Date.now()) return true;
    return false;
  };

  const matches = useMemo(() => {
    if (filter === 'all') return rawMatches;
    if (filter === 'live') return rawMatches.filter(isLiveLike);
    if (filter === 'scheduled') {
      // "Programados" = scheduled AND kickoff in the future
      return rawMatches.filter(
        (m) => m.status === 'scheduled' && new Date(m.kickoff_at).getTime() > Date.now(),
      );
    }
    return rawMatches.filter((m) => m.status === filter);
  }, [rawMatches, filter]);

  const stats = useMemo(() => {
    return {
      total:     rawMatches.length,
      scheduled: rawMatches.filter((m) => m.status === 'scheduled' && new Date(m.kickoff_at).getTime() > Date.now()).length,
      live:      rawMatches.filter(isLiveLike).length,
      finished:  rawMatches.filter((m) => m.status === 'finished').length,
    };
  }, [rawMatches]);

  if (!isAdmin) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Admin" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Icon name="lock" size={48} color={colors.mist} />
          <Text style={{ color: colors.paper, fontSize: 16, fontWeight: '800', marginTop: 12 }}>
            Acceso restringido
          </Text>
          <Text style={{ color: colors.paper2, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
            Esta sección solo está disponible para administradores.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const filters: (MatchStatusDB | 'all')[] = ['all', 'live', 'scheduled', 'finished'];

  return (
    <ScreenContainer theme="dark">
      <TopBar
        title="Admin · Partidos"
        onBack
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pressable
              onPress={() => router.push('/admin/players' as Href)}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Icon name="people" size={18} color={colors.paper2} />
              <Text numberOfLines={1} style={{ color: colors.paper2, fontSize: 12, fontWeight: '800' }}>
                PLANTILLAS
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/admin/match/new')}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Icon name="add" size={18} color={colors.gold} />
              <Text
                numberOfLines={1}
                style={{ color: colors.gold, fontSize: 12, fontWeight: '800' }}
              >
                NUEVO
              </Text>
            </Pressable>
          </View>
        }
      />

      {/* Quick stats */}
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, flexDirection: 'row', gap: 8 }}>
        <StatTile label="TOTAL"      value={stats.total}     color={colors.paper} />
        <StatTile label="EN VIVO"    value={stats.live}      color={colors.red} />
        <StatTile label="PRÓXIMOS"   value={stats.scheduled} color={colors.gold} />
        <StatTile label="FINAL"      value={stats.finished}  color={colors.green} />
      </View>

      {/* Filters — flex row, equal widths */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 10 }}>
        {filters.map((f) => {
          const active = filter === f;
          const label = STATUS_LABELS[f].es;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 9999,
                backgroundColor: active ? colors.paper : 'rgba(255,255,255,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 11.5,
                  fontWeight: '800',
                  color: active ? colors.ink : colors.paper2,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      ) : matches.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: colors.paper2, textAlign: 'center' }}>
            No hay partidos con este filtro.
          </Text>
          <View style={{ marginTop: 16 }}>
            <CButton variant="primary" size="md" onPress={() => router.push('/admin/match/new')}>
              Crear partido
            </CButton>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {matches.map((m) => {
            const displayStatus: MatchStatusDB = isLiveLike(m) && m.status !== 'finished'
              ? 'live'
              : m.status;
            return (
            <Pressable
              key={m.id}
              onPress={() => router.push({ pathname: '/admin/match/[id]', params: { id: m.id } })}
              style={{
                backgroundColor: colors.s800,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.04)',
              }}
            >
              {/* Top row: status + matchday */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 9999,
                  backgroundColor: STATUS_LABELS[displayStatus].color + '22',
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: STATUS_LABELS[displayStatus].color }}>
                    {STATUS_LABELS[displayStatus].es.toUpperCase()}{m.status === 'scheduled' && displayStatus === 'live' ? ' (auto)' : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.mist, fontWeight: '800' }}>
                  J{m.matchday} · {m.picks_count} picks
                </Text>
              </View>

              {/* Teams + score */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>
                    {m.home.short_name}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.mist }}>{m.home.code}</Text>
                </View>

                <View style={{
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  minWidth: 60,
                  alignItems: 'center',
                }}>
                  {m.home_score != null && m.away_score != null ? (
                    <Text style={{ fontSize: 18, fontWeight: '900', color: colors.paper }}>
                      {m.home_score} - {m.away_score}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist }}>
                      VS
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>
                    {m.away.short_name}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.mist }}>{m.away.code}</Text>
                </View>
              </View>

              {/* Kickoff */}
              <Text style={{ fontSize: 11, color: colors.mist, marginTop: 8, textAlign: 'center', fontWeight: '600' }}>
                {formatKickoff(m.kickoff_at)}
              </Text>
            </Pressable>
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.s800,
      borderRadius: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.04)',
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: 9, fontWeight: '800', color: colors.mist, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
