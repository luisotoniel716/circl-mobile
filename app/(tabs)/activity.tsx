import { useMemo, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, CButton, Pill, Avatar, GroupIcon, Icon, IconName, Text, colors,
} from '../../src/components';
import {
  useNotifications,
  useMarkAllRead,
  useMarkAsRead,
  useAcceptFriendRequest,
  useRemoveFriendship,
  useAcceptGroupInvite,
  useDeclineGroupInvite,
  type NotificationRow,
  type NotificationKind,
} from '../../src/lib/queries';

type Tab = 'all' | 'requests' | 'picks';

const REQUEST_KINDS: NotificationKind[] = ['friend_request', 'group_invite'];
const PICK_KINDS: NotificationKind[] = ['pick_correct', 'pick_missed', 'match_kickoff_soon', 'replaced_in_pick'];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d`;
  return `${Math.floor(d / 7)}sem`;
}

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function Activity() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');

  const { data: notifs = [], isLoading, refetch } = useNotifications();
  const markAll = useMarkAllRead();

  const counts = useMemo(() => {
    const c = { all: 0, requests: 0, picks: 0 };
    for (const n of notifs) {
      if (n.read_at) continue;
      c.all += 1;
      if (REQUEST_KINDS.includes(n.kind)) c.requests += 1;
      if (PICK_KINDS.includes(n.kind))    c.picks    += 1;
    }
    return c;
  }, [notifs]);

  const filtered = useMemo(() => {
    if (tab === 'requests') return notifs.filter((n) => REQUEST_KINDS.includes(n.kind));
    if (tab === 'picks')    return notifs.filter((n) => PICK_KINDS.includes(n.kind));
    return notifs;
  }, [notifs, tab]);

  // Split into NEW (unread) / EARLIER (read)
  const { fresh, earlier } = useMemo(() => {
    const fresh:   NotificationRow[] = [];
    const earlier: NotificationRow[] = [];
    for (const n of filtered) {
      if (n.read_at) earlier.push(n);
      else           fresh.push(n);
    }
    return { fresh, earlier };
  }, [filtered]);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'all',      label: 'All',      count: counts.all },
    { key: 'requests', label: 'Requests', count: counts.requests },
    { key: 'picks',    label: 'Picks',    count: counts.picks },
  ];

  return (
    <ScreenContainer theme="dark" edges={['top']}>
      <TopBar
        title="Activity"
        big
        right={
          counts.all > 0 ? (
            <Pressable onPress={() => markAll.mutate()} hitSlop={8}>
              <Text style={{ color: colors.paper2, fontSize: 13, fontWeight: '700' }}>Mark all</Text>
            </Pressable>
          ) : null
        }
      />

      {/* Segmented tabs */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.s800, borderRadius: 9999, padding: 3, gap: 2 }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 9999,
                  backgroundColor: active ? colors.paper : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: active ? colors.ink : colors.paper2 }}>{t.label}</Text>
                {t.count > 0 ? (
                  <View style={{ backgroundColor: active ? colors.red : 'rgba(255,255,255,0.10)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 99 }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: colors.paper }}>{t.count}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.s800, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Icon name="bell" size={28} color={colors.paper2} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.paper, textAlign: 'center' }}>
            Nada por aquí
          </Text>
          <Text style={{ fontSize: 13, color: colors.paper2, textAlign: 'center', marginTop: 6 }}>
            Cuando tengas actividad nueva, aparecerá aquí.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={() => refetch()}
        >
          {fresh.length > 0 ? (
            <>
              <Text style={sectionLabel}>NUEVOS</Text>
              {fresh.map((n) => (
                <NotifRow key={n.id} n={n} router={router} />
              ))}
            </>
          ) : null}

          {earlier.length > 0 ? (
            <>
              <Text style={sectionLabel}>ANTERIORES</Text>
              {earlier.map((n) => (
                <NotifRow key={n.id} n={n} router={router} />
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

// ─── Single notification row ─────────────────────────────────

type NotifMeta = { icon: IconName; tint: string };

function metaFor(kind: NotificationKind): NotifMeta {
  switch (kind) {
    case 'friend_request':        return { icon: 'addUser', tint: colors.blue  };
    case 'friend_accepted':       return { icon: 'check',   tint: colors.green };
    case 'group_invite':          return { icon: 'people',  tint: colors.gold  };
    case 'group_invite_accepted': return { icon: 'check',   tint: colors.green };
    case 'group_member_joined':   return { icon: 'people',  tint: colors.blue  };
    case 'group_member_left':     return { icon: 'logout',  tint: colors.mist  };
    case 'group_admin_assigned':  return { icon: 'crown',   tint: colors.gold  };
    case 'pick_correct':          return { icon: 'check',   tint: colors.green };
    case 'pick_missed':           return { icon: 'close',   tint: colors.mist  };
    case 'match_kickoff_soon':    return { icon: 'bell',    tint: colors.red   };
    case 'rank_up':               return { icon: 'arrowUp', tint: colors.gold  };
    case 'rank_down':             return { icon: 'arrowUp', tint: colors.mist  };
    case 'streak':                return { icon: 'fire',    tint: colors.red   };
    case 'replaced_in_pick':      return { icon: 'people',  tint: colors.red   };
  }
}

function NotifRow({
  n,
  router,
}: {
  n: NotificationRow;
  router: ReturnType<typeof useRouter>;
}) {
  const markAsRead = useMarkAsRead();
  const acceptFriend  = useAcceptFriendRequest();
  const removeFriend  = useRemoveFriendship();
  const acceptInvite  = useAcceptGroupInvite();
  const declineInvite = useDeclineGroupInvite();

  const meta = metaFor(n.kind);
  const unread = !n.read_at;
  const time = relativeTime(n.created_at);

  // Build title + sub from kind
  const { title, sub, onPress, actions, trail } = renderNotification(n);

  function handlePress() {
    if (unread) markAsRead.mutate(n.id);
    onPress?.(router);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.04)',
        backgroundColor: unread ? 'rgba(0,45,232,0.06)' : 'transparent',
      }}
    >
      {/* Icon or avatar */}
      <View>
        {n.actor ? (
          <Avatar
            initials={initialsOf(n.actor.name)}
            size={40}
            imageUrl={n.actor.avatar_url}
            bg={meta.tint}
          />
        ) : n.group ? (
          <GroupIcon
            imageUrl={n.group.image_url}
            emoji={n.group.icon}
            accent={n.group.accent}
            size={40}
            radius={12}
          />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: meta.tint + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={meta.icon} size={20} color={meta.tint} />
          </View>
        )}
        {/* Small overlay badge for the action icon */}
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: meta.tint,
            borderWidth: 2,
            borderColor: colors.s900,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={meta.icon} size={10} color={colors.paper} stroke={2.5} />
        </View>
        {unread ? (
          <View style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue, borderWidth: 1, borderColor: colors.s900 }} />
        ) : null}
      </View>

      {/* Title + sub + actions */}
      <View style={{ flex: 1 }}>
        {title}
        <Text style={{ fontSize: 11, color: colors.mist, marginTop: 2 }}>{sub} · {time}</Text>

        {/* Action buttons only while the notification is still unread.
            Once acted on we mark it read so it moves to "anteriores" and
            shows a status label instead. */}
        {actions && !n.read_at ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {n.kind === 'friend_request' ? (
              <>
                <CButton
                  variant="soft"
                  size="sm"
                  onPress={() => {
                    const fid = (n.data as { friendship_id?: string }).friendship_id;
                    if (fid) {
                      removeFriend.mutate(fid, {
                        onSuccess: () => markAsRead.mutate(n.id),
                        onError:   (e) => Alert.alert('Error', (e as Error).message),
                      });
                    }
                  }}
                >
                  Rechazar
                </CButton>
                <CButton
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    const fid = (n.data as { friendship_id?: string }).friendship_id;
                    if (fid) {
                      acceptFriend.mutate(fid, {
                        onSuccess: () => markAsRead.mutate(n.id),
                        onError:   (e) => Alert.alert('Error', (e as Error).message),
                      });
                    }
                  }}
                >
                  Aceptar
                </CButton>
              </>
            ) : null}
            {n.kind === 'group_invite' ? (
              <>
                <CButton
                  variant="soft"
                  size="sm"
                  onPress={() => {
                    const iid = (n.data as { invite_id?: string }).invite_id;
                    if (iid) {
                      declineInvite.mutate(iid, {
                        onSuccess: () => markAsRead.mutate(n.id),
                        onError:   (e) => Alert.alert('Error', (e as Error).message),
                      });
                    }
                  }}
                >
                  Rechazar
                </CButton>
                <CButton
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    const iid = (n.data as { invite_id?: string }).invite_id;
                    if (iid) {
                      acceptInvite.mutate(iid, {
                        onSuccess: (groupId) => {
                          markAsRead.mutate(n.id);
                          router.push({ pathname: '/group/[id]', params: { id: groupId } });
                        },
                        onError: (e) => Alert.alert('Error', (e as Error).message),
                      });
                    }
                  }}
                >
                  Unirme
                </CButton>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Once acted on, show a small status label so the user knows the
            request is no longer pending. */}
        {actions && n.read_at ? (
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper2, marginTop: 6 }}>
            {n.kind === 'friend_request' ? 'Respondiste' : 'Respondiste'} · {relativeTime(n.read_at)}
          </Text>
        ) : null}
      </View>

      {trail ? <View style={{ marginTop: 2 }}>{trail}</View> : null}
    </Pressable>
  );
}

// ─── Notification text + actions per kind ────────────────────

function renderNotification(n: NotificationRow): {
  title:    React.ReactNode;
  sub:      string;
  onPress?: (router: ReturnType<typeof useRouter>) => void;
  actions?: boolean;
  trail?:   React.ReactNode;
} {
  const actorName = n.actor?.name?.split(' ')[0] ?? 'Alguien';
  const actorHandle = n.actor?.username ? `@${n.actor.username}` : '';
  const groupName = n.group?.name ?? 'el grupo';
  const data = n.data as Record<string, unknown>;

  switch (n.kind) {
    case 'friend_request':
      return {
        title: (
          <Text style={titleText}>
            <Text style={bold}>{n.actor?.name ?? 'Alguien'}</Text> te envió una solicitud de amistad
          </Text>
        ),
        sub:     actorHandle,
        actions: true,
      };
    case 'friend_accepted':
      return {
        title: (
          <Text style={titleText}>
            <Text style={bold}>{n.actor?.name ?? actorName}</Text> aceptó tu solicitud
          </Text>
        ),
        sub: actorHandle,
        onPress: () => { /* could go to public profile */ },
      };
    case 'group_invite':
      return {
        title: (
          <Text style={titleText}>
            <Text style={bold}>{actorName}</Text> te invitó a <Text style={bold}>{groupName}</Text>
          </Text>
        ),
        sub: actorHandle,
        actions: true,
      };
    case 'group_invite_accepted':
      return {
        title: (
          <Text style={titleText}>
            <Text style={bold}>{n.actor?.name ?? actorName}</Text> se unió a <Text style={bold}>{groupName}</Text>
          </Text>
        ),
        sub: 'invitación aceptada',
        onPress: (router) => n.group_id && router.push({ pathname: '/group/[id]', params: { id: n.group_id } }),
      };
    case 'group_member_joined':
      return {
        title: (
          <Text style={titleText}>
            <Text style={bold}>{n.actor?.name ?? actorName}</Text> se unió a <Text style={bold}>{groupName}</Text>
          </Text>
        ),
        sub: 'nuevo miembro',
        onPress: (router) => n.group_id && router.push({ pathname: '/group/[id]/members', params: { id: n.group_id } }),
      };
    case 'group_member_left':
      return {
        title: (
          <Text style={titleText}>
            <Text style={bold}>{n.actor?.name ?? actorName}</Text> salió de <Text style={bold}>{groupName}</Text>
          </Text>
        ),
        sub: 'el grupo perdió un miembro',
        onPress: (router) => n.group_id && router.push({ pathname: '/group/[id]/members', params: { id: n.group_id } }),
      };
    case 'group_admin_assigned':
      return {
        title: (
          <Text style={titleText}>
            <Text style={bold}>{n.actor?.name ?? actorName}</Text> te asignó como admin de <Text style={bold}>{groupName}</Text>
          </Text>
        ),
        sub: 'ahora administras el grupo',
        onPress: (router) => n.group_id && router.push({ pathname: '/group/[id]', params: { id: n.group_id } }),
      };
    case 'pick_correct': {
      const pts = Number(data.points ?? 0);
      const home = String(data.home_team ?? 'Home');
      const away = String(data.away_team ?? 'Away');
      return {
        title: (
          <Text style={titleText}>
            ¡Le atinaste a <Text style={bold}>{home} vs {away}</Text>!
          </Text>
        ),
        sub:   `+${pts} pts`,
        trail: <Pill tone="gold" size="sm">+{pts}</Pill>,
        onPress: (router) => n.match_id && router.push({ pathname: '/match/[id]', params: { id: n.match_id } }),
      };
    }
    case 'pick_missed': {
      const home = String(data.home_team ?? 'Home');
      const away = String(data.away_team ?? 'Away');
      return {
        title: (
          <Text style={titleText}>
            Tu pick en <Text style={bold}>{home} vs {away}</Text> falló
          </Text>
        ),
        sub: '+0 pts',
        onPress: (router) => n.match_id && router.push({ pathname: '/match/[id]', params: { id: n.match_id } }),
      };
    }
    case 'match_kickoff_soon': {
      const home = String(data.home_team ?? 'Home');
      const away = String(data.away_team ?? 'Away');
      return {
        title: (
          <Text style={titleText}>
            <Text style={bold}>{home} vs {away}</Text> arranca pronto
          </Text>
        ),
        sub: 'haz tu pick antes del kickoff',
        trail: (
          <CButton variant="soft" size="sm">Pick</CButton>
        ),
        onPress: (router) => n.match_id && router.push({ pathname: '/pick/[id]', params: { id: n.match_id } }),
      };
    }
    case 'rank_up': {
      const newRank = Number(data.new_rank ?? 0);
      return {
        title: (
          <Text style={titleText}>
            Subiste a <Text style={bold}>#{newRank}</Text> en {groupName}
          </Text>
        ),
        sub: '¡vas para arriba!',
        onPress: (router) => n.group_id && router.push({ pathname: '/group/[id]/leaderboard', params: { id: n.group_id } }),
      };
    }
    case 'rank_down': {
      const newRank = Number(data.new_rank ?? 0);
      return {
        title: (
          <Text style={titleText}>
            Bajaste a <Text style={bold}>#{newRank}</Text> en {groupName}
          </Text>
        ),
        sub: 'recupera tu lugar',
        onPress: (router) => n.group_id && router.push({ pathname: '/group/[id]/leaderboard', params: { id: n.group_id } }),
      };
    }
    case 'streak': {
      const streak = Number(data.streak ?? 0);
      return {
        title: (
          <Text style={titleText}>
            ¡Llevas <Text style={bold}>{streak} aciertos</Text> seguidos!
          </Text>
        ),
        sub: 'no la rompas',
        trail: <Pill tone="gold" size="sm">🔥 {streak}</Pill>,
      };
    }
    case 'replaced_in_pick':
      return {
        title: (
          <Text style={titleText}>
            <Text style={bold}>{actorName}</Text> tomó tu lugar
          </Text>
        ),
        sub: 'alguien hizo el pick que estabas pensando',
      };
  }
}

const sectionLabel = {
  fontSize: 10,
  fontWeight: '800' as const,
  color: colors.mist,
  letterSpacing: 1,
  paddingHorizontal: 20,
  paddingTop: 8,
  paddingBottom: 6,
};
const titleText = { fontSize: 13, color: colors.paper, lineHeight: 18 };
const bold = { fontWeight: '800' as const, color: colors.paper };
