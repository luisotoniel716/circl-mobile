import { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ScreenContainer, CButton, Avatar, Icon, Text, colors, AnimatedNumber,
} from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';
import { useAuth } from '../../src/lib/auth';
import { useMyGroups, useMyStats } from '../../src/lib/queries';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Profile() {
  const router   = useRouter();
  const { accentColor } = useAccent();
  const { profile } = useAuth();

  const { data: groups = [],                 isLoading: groupsLoading } = useMyGroups();
  const { data: stats,   isLoading: statsLoading  } = useMyStats();

  // Replay AnimatedNumber count-ups every time the tab gains focus.
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusTick((t) => t + 1);
    }, []),
  );

  const initials    = initialsOf(profile?.name);
  const displayName = profile?.name ?? '—';
  const username    = profile?.username ? `@${profile.username}` : '';

  // Best rank across all groups
  const bestRankEntry = groups.length > 0
    ? groups.reduce((best, g) => (g.myRank < best.myRank ? g : best), groups[0])
    : null;

  async function handleShare() {
    try {
      await Share.share({
        message: `¡Sígueme en Circl! Soy ${displayName} ${username ? `(${username}) ` : ''}y voy arriba en Liga MX picks 🏆`,
      });
    } catch {
      // ignore
    }
  }

  const isLoading = groupsLoading || statsLoading;

  return (
    <ScreenContainer theme="dark" edges={['top']}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
          <Icon name="settings" size={20} color={colors.paper} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero ──────────────────────────────────────── */}
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18 }}>
          {/* Avatar — no edit ring/button overlay. The dedicated "Edit profile"
              CButton below handles the same destination, so the overlay was
              redundant. */}
          <View style={{ marginBottom: 14 }}>
            <Avatar
              initials={initials}
              size={92}
              bg={accentColor}
              imageUrl={profile?.avatar_url}
            />
          </View>

          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.paper }}>{displayName}</Text>
          {username ? (
            <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 2 }}>{username}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <CButton
              variant="primary"
              size="md"
              lead={<Icon name="edit" size={14} color={colors.paper} />}
              onPress={() => router.push('/edit-profile')}
            >
              Edit profile
            </CButton>
            <CButton
              variant="ghostDark"
              size="md"
              lead={<Icon name="link" size={14} color={colors.paper} />}
              onPress={handleShare}
            >
              Share
            </CButton>
          </View>
        </View>

        {/* ── Season trophy card ────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <LinearGradient
            colors={[accentColor, '#0024BD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 18, overflow: 'hidden' }}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.paper} style={{ paddingVertical: 20 }} />
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>
                      SEASON · APERTURA 2025
                    </Text>
                    <AnimatedNumber
                      value={stats?.totalPoints ?? 0}
                      duration={1000}
                      formatLocale
                      replayKey={focusTick}
                      style={{ fontSize: 38, fontWeight: '900', color: colors.paper, marginTop: 4 }}
                    />
                    <Text style={{ fontSize: 12, color: colors.paper, opacity: 0.85 }}>
                      puntos totales
                    </Text>
                  </View>
                  <Icon name="trophy" size={54} color="rgba(255,255,255,0.25)" stroke={2.2} />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    gap: 20,
                    marginTop: 14,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.18)',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.paper, opacity: 0.75 }}>ACCURACY</Text>
                    <AnimatedNumber
                      value={stats?.accuracy ?? 0}
                      duration={900}
                      delay={120}
                      suffix="%"
                      replayKey={focusTick}
                      style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}
                    />
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.paper, opacity: 0.75 }}>PICKS</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}>
                      <AnimatedNumber
                        value={stats?.correctPicks ?? 0}
                        duration={900}
                        delay={200}
                        replayKey={focusTick}
                        style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}
                      />
                      <Text style={{ fontSize: 14, opacity: 0.75 }}>
                        /
                        <AnimatedNumber
                          value={stats?.totalPicks ?? 0}
                          duration={900}
                          delay={200}
                          replayKey={focusTick}
                          style={{ fontSize: 14, fontWeight: '900', color: colors.paper, opacity: 0.75 }}
                        />
                      </Text>
                    </Text>
                  </View>
                  {bestRankEntry && (
                    <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.paper, opacity: 0.75 }}>
                        BEST RANK
                      </Text>
                      <AnimatedNumber
                        value={bestRankEntry.myRank}
                        duration={900}
                        delay={280}
                        prefix="#"
                        replayKey={focusTick}
                        style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}
                      />
                      <Text numberOfLines={1} style={{ fontSize: 10, color: colors.paper, opacity: 0.65, maxWidth: 90 }}>
                        {bestRankEntry.name}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </LinearGradient>
        </View>

        {/* ── Detail links ──────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper2, marginBottom: 10 }}>
            DETALLES
          </Text>
          <View style={{
            backgroundColor: colors.s800,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}>
            {[
              {
                icon: 'trend' as const,
                label: 'Estadísticas completas',
                sub: `${stats?.accuracy ?? 0}% accuracy · ${stats?.totalPicks ?? 0} picks totales`,
                to: '/stats',
              },
              {
                icon: 'trophy' as const,
                label: 'Insignias',
                sub: 'Logros desbloqueados y por desbloquear',
                to: '/stats',
              },
              {
                icon: 'people' as const,
                label: `Activo en ${groups.length} ${groups.length === 1 ? 'grupo' : 'grupos'}`,
                sub: bestRankEntry
                  ? `Mejor rank: #${bestRankEntry.myRank} · ${bestRankEntry.name}`
                  : 'Únete a un grupo para competir',
                to: '/(tabs)/groups' as const,
              },
            ].map((r, i, arr) => (
              <Pressable
                key={i}
                onPress={() => router.push(r.to as never)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.04)',
                }}
              >
                <View style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={r.icon} size={16} color={colors.paper2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.paper }}>{r.label}</Text>
                  <Text style={{ fontSize: 11, color: colors.mist }}>{r.sub}</Text>
                </View>
                <Icon name="chev" size={16} color={colors.mist} />
              </Pressable>
            ))}
          </View>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}
