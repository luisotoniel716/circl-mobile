import { useState } from 'react';
import { View, ScrollView, Pressable, Modal, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, colors } from '../design-system';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { CButton } from './CButton';
import { ScreenContainer } from './ScreenContainer';
import { TopBar } from './TopBar';
import {
  useSearchUsers,
  useSendFriendRequest,
  useFriendshipStatus,
  useFriends,
  useFriendRequests,
  useAcceptFriendRequest,
  useRemoveFriendship,
  type ProfileMini,
  type FriendRow,
  type FriendRequestRow,
} from '../lib/queries';
import { useAuth } from '../lib/auth';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Unified friends modal:
 *  - With an empty search field → shows the user's current friends and
 *    pending requests. Each friend has a delete button on the right.
 *  - With a typed query → switches to "search to add" mode.
 *
 * Entry points: the home header bell-row button and the /friends screen.
 */
export function AddFriendModal({ visible, onClose }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const isSearching = q.trim().length >= 2;

  const { data: results = [], isLoading: searching } = useSearchUsers(q);
  const { data: friends = [],  isLoading: friendsLoading }  = useFriends();
  const { data: requests = [], isLoading: requestsLoading } = useFriendRequests();

  const incoming = requests.filter((r) => r.direction === 'incoming');
  const outgoing = requests.filter((r) => r.direction === 'outgoing');

  // Close the sheet then navigate. With presentationStyle="pageSheet" on iOS,
  // pushing while the sheet is mounted hides the new screen behind it — close
  // first so the public profile takes over the full screen.
  function openProfile(userId: string) {
    onClose();
    // Small defer so the modal dismiss animation can start before the push.
    setTimeout(() => {
      router.push({ pathname: '/user/[id]', params: { id: userId } });
    }, 80);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScreenContainer theme="dark" edges={['top']}>
        <TopBar
          title={isSearching ? 'Buscar' : 'Amigos'}
          right={
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={{ color: colors.paper2, fontSize: 14, fontWeight: '700' }}>Listo</Text>
            </Pressable>
          }
        />

        {/* Search bar (always visible) */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: colors.s800,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Icon name="search" size={18} color={colors.mist} />
            <TextInput
              value={q}
              onChangeText={setQ}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Buscar por @username o nombre"
              placeholderTextColor={colors.mist}
              style={{ flex: 1, color: colors.paper, fontSize: 14, padding: 0 }}
            />
            {q.length > 0 ? (
              <Pressable onPress={() => setQ('')} hitSlop={8}>
                <Icon name="close" size={16} color={colors.mist} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {isSearching ? (
          // ─── Search mode ─────────────────────────────────────
          searching ? (
            <ActivityIndicator color={colors.paper2} style={{ marginTop: 16 }} />
          ) : results.length === 0 ? (
            <Text style={{ paddingHorizontal: 20, color: colors.paper2, fontSize: 13 }}>
              Sin resultados para “{q.trim()}”.
            </Text>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              {results.map((u) => (
                <SearchResultRow key={u.id} user={u} onOpen={() => openProfile(u.id)} />
              ))}
            </ScrollView>
          )
        ) : (
          // ─── Friends list mode ───────────────────────────────
          friendsLoading || requestsLoading ? (
            <ActivityIndicator color={colors.paper2} style={{ marginTop: 16 }} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              {incoming.length > 0 ? (
                <>
                  <Text style={sectionLabel}>SOLICITUDES · {incoming.length}</Text>
                  {incoming.map((r) => (
                    <IncomingRequestRow key={r.friendship_id} req={r} onOpen={() => openProfile(r.user.id)} />
                  ))}
                </>
              ) : null}

              {outgoing.length > 0 ? (
                <>
                  <Text style={sectionLabel}>ENVIADAS · {outgoing.length}</Text>
                  {outgoing.map((r) => (
                    <OutgoingRequestRow key={r.friendship_id} req={r} onOpen={() => openProfile(r.user.id)} />
                  ))}
                </>
              ) : null}

              <Text style={sectionLabel}>AMIGOS · {friends.length}</Text>
              {friends.length === 0 ? (
                <View style={{ paddingHorizontal: 20, paddingVertical: 18 }}>
                  <Text style={{ fontSize: 13, color: colors.paper2 }}>
                    Aún no tienes amigos. Busca a alguien por @username arriba para mandarle solicitud.
                  </Text>
                </View>
              ) : (
                friends.map((f) => <FriendRowItem key={f.friendship_id} f={f} onOpen={() => openProfile(f.user.id)} />)
              )}
            </ScrollView>
          )
        )}
      </ScreenContainer>
    </Modal>
  );
}

// ─── Rows ────────────────────────────────────────────────────

function SearchResultRow({ user, onOpen }: { user: ProfileMini; onOpen: () => void }) {
  const { user: me } = useAuth();
  const { data: status, isLoading } = useFriendshipStatus(user.id);
  const send = useSendFriendRequest();

  if (me?.id === user.id) return null;

  let trail: React.ReactNode = null;
  switch (status) {
    case 'accepted':
      trail = <Text style={{ fontSize: 12, fontWeight: '800', color: colors.green }}>AMIGOS</Text>;
      break;
    case 'pending_outgoing':
      trail = <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mist }}>Pendiente</Text>;
      break;
    case 'pending_incoming':
      trail = <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold }}>Te quiere agregar</Text>;
      break;
    case 'blocked':
      trail = <Text style={{ fontSize: 12, fontWeight: '700', color: colors.red }}>Bloqueado</Text>;
      break;
    default:
      trail = (
        <CButton
          variant="primary"
          size="sm"
          disabled={isLoading || send.isPending}
          onPress={() => {
            send.mutate(user.id, {
              onError: (e) => Alert.alert('Error', (e as Error).message),
            });
          }}
        >
          {send.isPending ? '…' : 'Agregar'}
        </CButton>
      );
  }

  return (
    <View style={rowStyle}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Avatar initials={initialsOf(user.name)} size={40} bg={colors.s700} imageUrl={user.avatar_url} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>{user.name}</Text>
          <Text style={{ fontSize: 12, color: colors.mist }}>@{user.username}</Text>
        </View>
      </Pressable>
      {trail}
    </View>
  );
}

function IncomingRequestRow({ req, onOpen }: { req: FriendRequestRow; onOpen: () => void }) {
  const accept = useAcceptFriendRequest();
  const remove = useRemoveFriendship();

  return (
    <View style={rowStyle}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Avatar initials={initialsOf(req.user.name)} size={40} bg={colors.blue} imageUrl={req.user.avatar_url} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>{req.user.name}</Text>
          <Text style={{ fontSize: 12, color: colors.mist }}>@{req.user.username}</Text>
        </View>
      </Pressable>
      <CButton
        variant="soft"
        size="sm"
        onPress={() => remove.mutate(req.friendship_id, {
          onError: (e) => Alert.alert('Error', (e as Error).message),
        })}
      >
        Rechazar
      </CButton>
      <CButton
        variant="primary"
        size="sm"
        onPress={() => accept.mutate(req.friendship_id, {
          onError: (e) => Alert.alert('Error', (e as Error).message),
        })}
      >
        Aceptar
      </CButton>
    </View>
  );
}

function OutgoingRequestRow({ req, onOpen }: { req: FriendRequestRow; onOpen: () => void }) {
  const remove = useRemoveFriendship();

  return (
    <View style={rowStyle}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Avatar initials={initialsOf(req.user.name)} size={40} bg={colors.s700} imageUrl={req.user.avatar_url} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>{req.user.name}</Text>
          <Text style={{ fontSize: 12, color: colors.mist }}>@{req.user.username} · enviada</Text>
        </View>
      </Pressable>
      <CButton
        variant="soft"
        size="sm"
        onPress={() => remove.mutate(req.friendship_id, {
          onError: (e) => Alert.alert('Error', (e as Error).message),
        })}
      >
        Cancelar
      </CButton>
    </View>
  );
}

function FriendRowItem({ f, onOpen }: { f: FriendRow; onOpen: () => void }) {
  const remove = useRemoveFriendship();

  function confirmRemove() {
    Alert.alert(
      f.user.name ?? 'Eliminar amigo',
      '¿Seguro que quieres eliminar esta amistad?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => remove.mutate(f.friendship_id, {
            onError: (e) => Alert.alert('Error', (e as Error).message),
          }),
        },
      ],
    );
  }

  return (
    <View style={rowStyle}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Avatar initials={initialsOf(f.user.name)} size={40} bg={colors.s700} imageUrl={f.user.avatar_url} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>{f.user.name}</Text>
          <Text style={{ fontSize: 12, color: colors.mist }}>@{f.user.username}</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={confirmRemove}
        hitSlop={8}
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: colors.red + '15',
          borderWidth: 1, borderColor: colors.red + '33',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="trash" size={15} color={colors.red} />
      </Pressable>
    </View>
  );
}

// ─── Shared styles ───────────────────────────────────────────

const rowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(255,255,255,0.04)',
};

const sectionLabel = {
  fontSize: 10,
  fontWeight: '800' as const,
  color: colors.mist,
  letterSpacing: 1,
  paddingHorizontal: 20,
  paddingTop: 14,
  paddingBottom: 6,
};
