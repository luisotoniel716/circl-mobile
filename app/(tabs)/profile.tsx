import { View, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, CButton, Avatar, GroupIcon, Icon, Text, colors,
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
          <View style={{ marginBottom: 14 }}>
            <Avatar
              initials={initials}
              size={92}
              bg={accentColor}
              ring
              imageUrl={profile?.avatar_url}
            />
            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: colors.paper,
                borderWidth: 2, borderColor: colors.s900,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="edit" size={14} color={colors.ink} />
            </Pressable>
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
                    <Text style={{ fontSize: 38, fontWeight: '900', color: colors.paper, marginTop: 4 }}>
                      {stats?.totalPoints ?? 0}
                    </Text>
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
                    <Text style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}>
                      {stats?.accuracy ?? 0}%
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.paper, opacity: 0.75 }}>PICKS</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}>
                      {stats?.correctPicks ?? 0}
                      <Text style={{ fontSize: 14, opacity: 0.75 }}>/{stats?.totalPicks ?? 0}</Text>
                    </Text>
                  </View>
                  {bestRankEntry && (
                    <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.paper, opacity: 0.75 }}>
                        BEST RANK
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}>
                        #{bestRankEntry.myRank}
                      </Text>
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

        {/* ── Active groups ─────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper2, flex: 1 }}>
              MIS CIRCLS
            </Text>
            <Text
              onPress={() => router.push('/(tabs)/groups')}
              style={{ fontSize: 11, fontWeight: '700', color: colors.paper2 }}
            >
              Ver todos ›
            </Text>
          </View>

          {groupsLoading ? (
            <ActivityIndicator color={colors.paper2} />
          ) : groups.length === 0 ? (
            <Pressable
              onPress={() => router.push('/(tabs)/groups')}
              style={{
                padding: 16,
                borderRadius: 14,
                backgroundColor: colors.s800,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                borderStyle: 'dashed',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.paper2, fontSize: 13 }}>
                Aún no tienes grupos — crea uno ›
              </Text>
            </Pressable>
          ) : (
            <View style={{ gap: 8 }}>
              {groups.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: colors.s800,
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.04)',
                    borderLeftWidth: 3,
                    borderLeftColor: g.accent,
                  }}
                >
                  <GroupIcon imageUrl={g.image_url} emoji={g.icon} accent={g.accent} size={36} radius={10} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>{g.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.mist }}>
                      #{g.myRank} de {g.members} miembros
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: colors.gold }}>{g.myPts}</Text>
                    <Text style={{ fontSize: 10, color: colors.mist, fontWeight: '700' }}>pts</Text>
                  </View>
                  <Icon name="chev" size={14} color={colors.mist} />
                </Pressable>
              ))}
            </View>
          )}
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
                label: 'Full statistics',
                sub: `${stats?.accuracy ?? 0}% accuracy · ${stats?.totalPicks ?? 0} picks totales`,
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
              {
                icon: 'flag' as const,
                label: `Liga MX · ${stats?.totalPicks ?? 0} picks`,
                sub: `${stats?.correctPicks ?? 0} correctos · ${stats?.accuracy ?? 0}% de acierto`,
                to: '/stats',
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
