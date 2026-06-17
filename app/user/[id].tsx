import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeInDown, FadeOutUp, Easing,
} from 'react-native-reanimated';
import {
  ScreenContainer, TopBar, Section, CButton, Avatar, GroupIcon, TeamCrest, Icon, Text, colors,
} from '../../src/components';
import { useAuth } from '../../src/lib/auth';
import { useAccent } from '../../src/lib/tweaks';
import {
  useUserProfile, useUserStats, useGroupsInCommon,
  useFriendshipStatus, useFriendshipWith,
  useSendFriendRequest, useAcceptFriendRequest, useRemoveFriendship,
} from '../../src/lib/queries';
import { LIGAMX } from '../../src/data';
import type { TeamCode } from '../../src/types';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

/**
 * Public profile of any other user. Opened from group members, leaderboard,
 * and the friends list. Shows the bits the user can configure on their
 * own profile (bio + favorite team) plus aggregated public stats and the
 * list of groups in common, plus a friendship action button.
 */
export default function UserProfile() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: me } = useAuth();
  const { accentColor } = useAccent();

  const { data: profile, isLoading: profileLoading } = useUserProfile(userId);
  const { data: stats,   isLoading: statsLoading   } = useUserStats(userId);
  const { data: shared = [] }                         = useGroupsInCommon(userId);
  const { data: friendStatus }                        = useFriendshipStatus(userId);
  const { data: friendship  }                         = useFriendshipWith(userId);

  const sendReq    = useSendFriendRequest();
  const acceptReq  = useAcceptFriendRequest();
  const removeReq  = useRemoveFriendship();

  // ── Latch the "loading" placeholder ──────────────────────────────
  //
  // A mutation typically resolves a tick BEFORE the invalidated
  // `friendship-status` refetch lands. Without this latch we'd briefly
  // revert to the OLD button text in between (e.g. "Enviando…" → "Agregar
  // amigo" → "Cancelar solicitud") which reads as a flash. We hold a local
  // `pendingAction` state from the moment the user taps until the
  // underlying status actually changes value, then release it — so the
  // morph runs directly from "Enviando…" → "Cancelar solicitud".
  //
  // NOTE: These hooks MUST live above the early returns below, otherwise
  // the hook count changes between renders (loading → loaded) and React
  // throws "Rendered more hooks than during the previous render."
  const [pendingAction, setPendingAction] = useState<
    'send' | 'accept' | 'cancel' | 'reject' | 'unfriend' | null
  >(null);
  const prevStatusRef = useRef(friendStatus);
  useEffect(() => {
    if (pendingAction && friendStatus !== prevStatusRef.current) {
      setPendingAction(null);
    }
    prevStatusRef.current = friendStatus;
  }, [friendStatus, pendingAction]);

  const isMe = me?.id === userId;

  // If this is the current user, bounce to their own profile tab. This
  // shouldn't normally happen because the wiring suppresses the "me" row,
  // but it's a defensive fallback.
  if (isMe) {
    router.replace('/(tabs)/profile');
    return null;
  }

  if (profileLoading || !profile) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Perfil" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {profileLoading ? (
            <ActivityIndicator color={colors.paper2} />
          ) : (
            <Text style={{ color: colors.paper2 }}>Usuario no encontrado.</Text>
          )}
        </View>
      </ScreenContainer>
    );
  }

  // Friendship-status-dependent CTA. We surface the relationship as a single
  // primary button so the user always knows what action is available. For
  // accept/remove we need the friendship row id — useFriendshipWith fetches it.
  const friendshipId = friendship?.id;

  // Helpers so each handler latches + runs + auto-clears on error.
  const onMutationError = (action: typeof pendingAction) => (e: unknown) => {
    setPendingAction(null);
    Alert.alert('Error', (e as Error).message);
    // re-mention `action` to satisfy TS narrowing (and for future logging)
    void action;
  };

  let friendButton: React.ReactNode = null;
  let stateKey: string = friendStatus ?? 'none';

  if (pendingAction) {
    // ── Loading placeholder. Keyed separately so it morphs IN over the
    //    previous state and stays mounted until the new server status
    //    lands; then morphs OUT to the new real button.
    stateKey = `pending-${pendingAction}`;
    const labelMap: Record<NonNullable<typeof pendingAction>, string> = {
      send:     'Enviando…',
      accept:   'Aceptando…',
      cancel:   'Cancelando…',
      reject:   'Rechazando…',
      unfriend: 'Quitando…',
    };
    const isPrimary = pendingAction === 'send' || pendingAction === 'accept';
    friendButton = (
      <CButton variant={isPrimary ? 'primary' : 'ghostDark'} size="md" disabled>
        {labelMap[pendingAction]}
      </CButton>
    );
  } else {
    switch (friendStatus) {
      case 'accepted':
        friendButton = (
          <CButton
            variant="ghostDark"
            size="md"
            disabled={!friendshipId}
            lead={<Icon name="check" size={14} color={colors.green} />}
            onPress={() => {
              if (!friendshipId) return;
              Alert.alert(
                profile.name ?? 'Eliminar amistad',
                '¿Seguro que quieres eliminar esta amistad?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                      setPendingAction('unfriend');
                      removeReq.mutate(friendshipId, { onError: onMutationError('unfriend') });
                    },
                  },
                ],
              );
            }}
          >
            Amigos
          </CButton>
        );
        break;
      case 'pending_outgoing':
        friendButton = (
          <CButton
            variant="ghostDark"
            size="md"
            disabled={!friendshipId}
            onPress={() => {
              if (!friendshipId) return;
              setPendingAction('cancel');
              removeReq.mutate(friendshipId, { onError: onMutationError('cancel') });
            }}
          >
            Cancelar solicitud
          </CButton>
        );
        break;
      case 'pending_incoming':
        friendButton = (
          <>
            <CButton
              variant="ghostDark"
              size="md"
              disabled={!friendshipId}
              onPress={() => {
                if (!friendshipId) return;
                setPendingAction('reject');
                removeReq.mutate(friendshipId, { onError: onMutationError('reject') });
              }}
            >
              Rechazar
            </CButton>
            <CButton
              variant="primary"
              size="md"
              disabled={!friendshipId}
              lead={<Icon name="check" size={14} color={colors.paper} />}
              onPress={() => {
                if (!friendshipId) return;
                setPendingAction('accept');
                acceptReq.mutate(friendshipId, { onError: onMutationError('accept') });
              }}
            >
              Aceptar
            </CButton>
          </>
        );
        break;
      case 'blocked':
        friendButton = (
          <CButton variant="ghostDark" size="md" disabled>
            Bloqueado
          </CButton>
        );
        break;
      case 'none':
      default:
        friendButton = (
          <CButton
            variant="primary"
            size="md"
            lead={<Icon name="addUser" size={14} color={colors.paper} />}
            onPress={() => {
              setPendingAction('send');
              sendReq.mutate(profile.id, { onError: onMutationError('send') });
            }}
          >
            Agregar amigo
          </CButton>
        );
    }
  }

  const favTeam = profile.favorite_team;
  const favLocal = favTeam ? LIGAMX[favTeam.code as TeamCode] : null;

  return (
    <ScreenContainer theme="dark">
      <TopBar title="" onBack />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18 }}>
          <View style={{ marginBottom: 14 }}>
            <Avatar
              initials={initialsOf(profile.name)}
              size={92}
              bg={accentColor}
              imageUrl={profile.avatar_url}
            />
          </View>

          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.paper }}>
            {profile.name ?? '—'}
          </Text>
          {profile.username ? (
            <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 2 }}>
              @{profile.username}
            </Text>
          ) : null}

          {/* Favorite team chip with a leading label so the relationship is
              obvious — without the prefix, the bare crest+name looked like
              metadata without context. */}
          {favTeam ? (
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: colors.mist,
                  letterSpacing: 0.8,
                  marginBottom: 6,
                }}
              >
                EQUIPO QUE APOYA
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 6,
                  paddingLeft: 8,
                  paddingRight: 14,
                  borderRadius: 9999,
                  backgroundColor: (favLocal?.primary ?? colors.s700) + '33',
                  borderWidth: 1,
                  borderColor: (favLocal?.primary ?? colors.s700) + '66',
                }}
              >
                {favLocal ? <TeamCrest team={favLocal} size={22} /> : null}
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper }}>
                  {favTeam.name}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Bio */}
          {profile.bio ? (
            <Text
              style={{
                fontSize: 13,
                color: colors.paper2,
                textAlign: 'center',
                marginTop: 12,
                paddingHorizontal: 20,
                lineHeight: 18,
              }}
            >
              {profile.bio}
            </Text>
          ) : null}

          {/* Morph wrapper — each friendship state mounts/unmounts under
              a `key`, so Reanimated runs the OLD button out (fade + slide
              up) and the NEW one in (slide up from below) every time
              `friendStatus` changes. The outer container keeps a fixed
              minHeight so the surrounding layout doesn't jump while both
              the entering + exiting buttons coexist mid-transition. */}
          <View
            style={{
              marginTop: 14,
              minHeight: 42,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View
              key={friendStatus ?? 'none'}
              entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}
              exiting={FadeOutUp.duration(180).easing(Easing.in(Easing.cubic))}
              style={{ flexDirection: 'row', gap: 8 }}
            >
              {friendButton}
            </Animated.View>
          </View>
        </View>

        {/* ── Stats card ───────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <LinearGradient
            colors={[accentColor, '#0024BD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 18, overflow: 'hidden' }}
          >
            {statsLoading ? (
              <ActivityIndicator color={colors.paper} style={{ paddingVertical: 20 }} />
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>
                      TEMPORADA
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
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.paper, opacity: 0.75 }}>
                      ACCURACY
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}>
                      {stats?.accuracy ?? 0}%
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.paper, opacity: 0.75 }}>
                      PICKS
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}>
                      {stats?.correctPicks ?? 0}
                      <Text style={{ fontSize: 14, opacity: 0.75 }}>/{stats?.totalPicks ?? 0}</Text>
                    </Text>
                  </View>
                </View>
              </>
            )}
          </LinearGradient>
        </View>

        {/* ── Shared groups ─────────────────────────────────────── */}
        {shared.length > 0 ? (
          <Section title={`GRUPOS EN COMÚN · ${shared.length}`}>
            <View style={{ gap: 8 }}>
              {shared.map((g) => (
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
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.paper }}>
                    {g.name}
                  </Text>
                  <Icon name="chev" size={16} color={colors.mist} />
                </Pressable>
              ))}
            </View>
          </Section>
        ) : null}

      </ScrollView>
    </ScreenContainer>
  );
}
