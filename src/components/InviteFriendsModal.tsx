import { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, Modal, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Text, colors } from '../design-system';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { CButton } from './CButton';
import { ScreenContainer } from './ScreenContainer';
import { TopBar } from './TopBar';
import { useInvitableFriends, useSendGroupInvitesBulk } from '../lib/queries';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

interface Props {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupAccent?: string;
}

/**
 * Sheet modal that lists the user's friends that are NOT already in the
 * group and don't have a pending invite. Users can multi-select and send
 * invitations in one batch.
 */
export function InviteFriendsModal({ visible, onClose, groupId, groupAccent }: Props) {
  const { data: friends = [], isLoading } = useInvitableFriends(groupId);
  const sendInvites = useSendGroupInvitesBulk();

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, '');
    if (!needle) return friends;
    return friends.filter((f) =>
      (f.username ?? '').toLowerCase().includes(needle) ||
      (f.name     ?? '').toLowerCase().includes(needle),
    );
  }, [friends, q]);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (picked.size === 0) return;
    try {
      const count = await sendInvites.mutateAsync({
        group_id:    groupId,
        invitee_ids: Array.from(picked),
      });
      Alert.alert(
        'Invitaciones enviadas',
        `Mandaste ${count} ${count === 1 ? 'invitación' : 'invitaciones'}.`,
      );
      setPicked(new Set());
      setQ('');
      onClose();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScreenContainer theme="dark" edges={['top']}>
        <TopBar
          title="Invitar amigos"
          right={
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={{ color: colors.paper2, fontSize: 14, fontWeight: '700' }}>Cerrar</Text>
            </Pressable>
          }
        />

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
              placeholder="Buscar amigos"
              placeholderTextColor={colors.mist}
              style={{ flex: 1, color: colors.paper, fontSize: 14, padding: 0 }}
            />
          </View>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.paper2} />
          </View>
        ) : friends.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
            <View
              style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: colors.s800,
                alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}
            >
              <Icon name="people" size={28} color={colors.paper2} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.paper, textAlign: 'center' }}>
              No hay amigos por invitar
            </Text>
            <Text style={{ fontSize: 13, color: colors.paper2, textAlign: 'center', marginTop: 6 }}>
              Tus amigos ya son miembros de este grupo o no tienes amigos aún.
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <Text style={{ paddingHorizontal: 20, color: colors.paper2, fontSize: 13 }}>
            Sin resultados con esa búsqueda.
          </Text>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            {filtered.map((f) => {
              const checked = picked.has(f.id);
              return (
                <Pressable
                  key={f.id}
                  onPress={() => toggle(f.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.04)',
                    backgroundColor: checked ? 'rgba(0,45,232,0.08)' : 'transparent',
                  }}
                >
                  <Avatar
                    initials={initialsOf(f.name)}
                    size={40}
                    bg={groupAccent ?? colors.s700}
                    imageUrl={f.avatar_url}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>{f.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.mist }}>@{f.username}</Text>
                  </View>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: checked ? colors.blue : 'rgba(255,255,255,0.18)',
                      backgroundColor: checked ? colors.blue : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {checked ? <Icon name="check" size={14} color={colors.paper} stroke={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Bottom action bar */}
        {friends.length > 0 ? (
          <View
            style={{
              position: 'absolute',
              left: 0, right: 0, bottom: 0,
              padding: 16,
              paddingBottom: 28,
              backgroundColor: colors.s900,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <CButton
              variant="primary"
              size="lg"
              full
              disabled={picked.size === 0 || sendInvites.isPending}
              onPress={handleSend}
            >
              {sendInvites.isPending
                ? 'Enviando…'
                : picked.size === 0
                  ? 'Selecciona al menos uno'
                  : `Invitar ${picked.size}`}
            </CButton>
          </View>
        ) : null}
      </ScreenContainer>
    </Modal>
  );
}
