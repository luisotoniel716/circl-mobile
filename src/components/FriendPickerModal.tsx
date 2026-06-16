import { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, Pressable, Modal, ActivityIndicator, TextInput } from 'react-native';
import { Text, colors } from '../design-system';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { CButton } from './CButton';
import { ScreenContainer } from './ScreenContainer';
import { TopBar } from './TopBar';
import { useFriends } from '../lib/queries';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Currently selected ids (controlled). */
  selected: string[];
  /** Called when user confirms; passes the new selection. */
  onConfirm: (ids: string[]) => void;
  /** Tint color for avatar fallback bg. */
  accent?: string;
  /** Title at top of the modal. */
  title?: string;
}

/**
 * Multi-select picker over the user's accepted friends.
 *
 * Different from `InviteFriendsModal` in that:
 *  - It doesn't need an existing group_id (used during group creation).
 *  - It's controlled — caller holds the selection and decides what to do
 *    with the ids on confirm (e.g. send bulk invites after creating).
 */
export function FriendPickerModal({
  visible,
  onClose,
  selected,
  onConfirm,
  accent,
  title = 'Invitar amigos',
}: Props) {
  const { data: friends = [], isLoading } = useFriends();
  const [picked, setPicked] = useState<Set<string>>(new Set(selected));
  const [q, setQ] = useState('');

  // Sync local set whenever the modal re-opens with new external selection.
  useEffect(() => {
    if (visible) setPicked(new Set(selected));
  }, [visible, selected]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, '');
    if (!needle) return friends;
    return friends.filter((f) =>
      (f.user.username ?? '').toLowerCase().includes(needle) ||
      (f.user.name     ?? '').toLowerCase().includes(needle),
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

  function handleDone() {
    onConfirm(Array.from(picked));
    setQ('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScreenContainer theme="dark" edges={['top']}>
        <TopBar
          title={title}
          right={
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={{ color: colors.paper2, fontSize: 14, fontWeight: '700' }}>Cancelar</Text>
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
              <Icon name="addUser" size={28} color={colors.paper2} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.paper, textAlign: 'center' }}>
              Aún no tienes amigos
            </Text>
            <Text style={{ fontSize: 13, color: colors.paper2, textAlign: 'center', marginTop: 6 }}>
              Agrega amigos desde el botón de la pantalla principal para invitarlos a tus grupos.
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <Text style={{ paddingHorizontal: 20, color: colors.paper2, fontSize: 13 }}>
            Sin resultados con esa búsqueda.
          </Text>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            {filtered.map((f) => {
              const checked = picked.has(f.user.id);
              return (
                <Pressable
                  key={f.friendship_id}
                  onPress={() => toggle(f.user.id)}
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
                    initials={initialsOf(f.user.name)}
                    size={40}
                    bg={accent ?? colors.s700}
                    imageUrl={f.user.avatar_url}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>{f.user.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.mist }}>@{f.user.username}</Text>
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
              onPress={handleDone}
            >
              {picked.size === 0
                ? 'Listo'
                : `Listo · ${picked.size} ${picked.size === 1 ? 'amigo' : 'amigos'}`}
            </CButton>
          </View>
        ) : null}
      </ScreenContainer>
    </Modal>
  );
}
