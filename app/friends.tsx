import { useMemo, useState } from 'react';
import {
  View, ScrollView, Pressable, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, Section, CButton, Avatar, Icon, Text, colors,
  AddFriendModal,
} from '../src/components';
import {
  useFriends,
  useFriendRequests,
  useAcceptFriendRequest,
  useRemoveFriendship,
} from '../src/lib/queries';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function FriendsList() {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState('');

  const { data: friends  = [], isLoading: friendsLoading  } = useFriends();
  const { data: requests = [], isLoading: requestsLoading } = useFriendRequests();

  const incoming = useMemo(() => requests.filter((r) => r.direction === 'incoming'), [requests]);
  const outgoing = useMemo(() => requests.filter((r) => r.direction === 'outgoing'), [requests]);

  const filteredFriends = useMemo(() => {
    if (!q.trim()) return friends;
    const needle = q.trim().toLowerCase().replace(/^@/, '');
    return friends.filter((f) =>
      (f.user.username ?? '').toLowerCase().includes(needle) ||
      (f.user.name     ?? '').toLowerCase().includes(needle),
    );
  }, [friends, q]);

  const acceptReq = useAcceptFriendRequest();
  const removeReq = useRemoveFriendship();

  return (
    <ScreenContainer theme="dark">
      <TopBar
        title="Friends"
        big
        right={
          <Pressable onPress={() => setAddOpen(true)} hitSlop={8}>
            <Icon name="addUser" size={20} color={colors.paper} />
          </Pressable>
        }
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
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
            placeholder={`Buscar entre ${friends.length} amigos`}
            placeholderTextColor={colors.mist}
            style={{ flex: 1, color: colors.paper, fontSize: 14, padding: 0 }}
          />
        </View>
      </View>

      {friendsLoading || requestsLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          {incoming.length > 0 ? (
            <Section title={`SOLICITUDES · ${incoming.length}`}>
              <View style={{ gap: 8 }}>
                {incoming.map((r) => (
                  <View
                    key={r.friendship_id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      backgroundColor: colors.s800,
                      paddingVertical: 10, paddingHorizontal: 14,
                      borderRadius: 14,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <Avatar initials={initialsOf(r.user.name)} size={38} bg={colors.blue} imageUrl={r.user.avatar_url} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper }}>{r.user.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.mist }}>@{r.user.username} · te envió solicitud</Text>
                    </View>
                    <CButton
                      variant="soft" size="sm"
                      onPress={() => removeReq.mutate(r.friendship_id)}
                    >
                      Rechazar
                    </CButton>
                    <CButton
                      variant="primary" size="sm"
                      onPress={() => acceptReq.mutate(r.friendship_id)}
                    >
                      Aceptar
                    </CButton>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {outgoing.length > 0 ? (
            <Section title={`PENDIENTES DE TU PARTE · ${outgoing.length}`}>
              <View style={{ gap: 8 }}>
                {outgoing.map((r) => (
                  <View
                    key={r.friendship_id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      backgroundColor: colors.s800,
                      paddingVertical: 10, paddingHorizontal: 14,
                      borderRadius: 14,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <Avatar initials={initialsOf(r.user.name)} size={38} bg={colors.s700} imageUrl={r.user.avatar_url} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper }}>{r.user.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.mist }}>@{r.user.username} · solicitud enviada</Text>
                    </View>
                    <CButton
                      variant="soft" size="sm"
                      onPress={() => removeReq.mutate(r.friendship_id)}
                    >
                      Cancelar
                    </CButton>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          <Section title={`AMIGOS · ${friends.length}`}>
            {filteredFriends.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.paper2, paddingVertical: 14 }}>
                {friends.length === 0
                  ? 'Aún no tienes amigos. Toca + para agregar al primero.'
                  : 'Sin resultados con esa búsqueda.'}
              </Text>
            ) : (
              <View>
                {filteredFriends.map((f, i) => (
                  <Pressable
                    key={f.friendship_id}
                    onPress={() => router.push({ pathname: '/user/[id]', params: { id: f.user.id } })}
                    onLongPress={() => {
                      Alert.alert(
                        f.user.name,
                        '¿Eliminar amistad?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Eliminar', style: 'destructive', onPress: () => removeReq.mutate(f.friendship_id) },
                        ],
                      );
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 10,
                      borderBottomWidth: i < filteredFriends.length - 1 ? 1 : 0,
                      borderBottomColor: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <Avatar initials={initialsOf(f.user.name)} size={40} bg={colors.s700} imageUrl={f.user.avatar_url} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.paper }}>{f.user.name}</Text>
                      <Text style={{ fontSize: 11.5, color: colors.mist }}>@{f.user.username}</Text>
                    </View>
                    <Icon name="chev" size={18} color={colors.mist} />
                  </Pressable>
                ))}
              </View>
            )}
          </Section>
        </ScrollView>
      )}

      <AddFriendModal visible={addOpen} onClose={() => setAddOpen(false)} />
    </ScreenContainer>
  );
}
