import { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, CButton, Input, Icon, Text, colors,
  FriendPickerModal, Avatar, AvatarStack,
} from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';
import {
  useLeagues, useCreateGroup, useUpdateGroup,
  useFriends, useSendGroupInvitesBulk,
} from '../../src/lib/queries';
import { pickImageFromLibrary, uploadImage } from '../../src/lib/storage';
import type { PickedImage } from '../../src/lib/storage';

const ICONS  = ['🎯','⚽','🏆','🔥','👑','⭐','💎','⚡','🎲','🚀'];
const ACCENTS = ['#4F6BFF','#FF5C8A','#22C58E','#F4A300','#A057FF','#FF6A3D','#0BA5E9','#E11D48'];

export default function Create() {
  const router = useRouter();
  const { accentColor } = useAccent();

  const { data: leagues = [], isLoading: leaguesLoading } = useLeagues();
  const { data: friends = [] } = useFriends();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const sendInvites = useSendGroupInvitesBulk();

  const [name,     setName]     = useState('');
  const [icon,     setIcon]     = useState('🎯');
  const [accent,   setAccent]   = useState('#4F6BFF');
  const [leagueId, setLeagueId] = useState<string | null>(null);
  // Optional cover photo picked from gallery — uploaded after the group exists,
  // because storage RLS keys the path by group_id.
  const [pickedCover, setPickedCover] = useState<PickedImage | null>(null);
  const [pickingCover, setPickingCover] = useState(false);
  // Friend invite IDs queued for after the group is created.
  const [inviteIds, setInviteIds] = useState<string[]>([]);
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);

  const selectedFriends = useMemo(
    () => friends.filter((f) => inviteIds.includes(f.user.id)),
    [friends, inviteIds],
  );

  async function handlePickCover() {
    setPickingCover(true);
    try {
      const img = await pickImageFromLibrary({ aspect: [16, 9] });
      if (img) setPickedCover(img);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos abrir la galería.';
      Alert.alert('Error', msg);
    } finally {
      setPickingCover(false);
    }
  }

  // Default to first league once they load.
  if (leagueId == null && leagues.length > 0) {
    setLeagueId(leagues[0].id);
  }

  async function handleCreate() {
    if (name.trim().length < 3) {
      Alert.alert('Nombre muy corto', 'El nombre del grupo debe tener al menos 3 caracteres.');
      return;
    }
    if (!leagueId) {
      Alert.alert('Falta liga', 'Selecciona una liga.');
      return;
    }
    try {
      const group = await createGroup.mutateAsync({ name, icon, accent, league_id: leagueId });

      // If a cover photo was picked, upload it now (group_id is the RLS gate).
      if (pickedCover) {
        try {
          const ext = pickedCover.mimeType === 'image/png' ? 'png'
                    : pickedCover.mimeType === 'image/webp' ? 'webp' : 'jpg';
          const path = `${group.id}/cover-${Date.now()}.${ext}`;
          const url  = await uploadImage('group-covers', path, pickedCover);
          await updateGroup.mutateAsync({ group_id: group.id, image_url: url });
        } catch (e) {
          // Non-fatal — group was created. Tell the user but proceed.
          const msg = e instanceof Error ? e.message : 'No pudimos subir la foto.';
          Alert.alert('Foto pendiente', `${msg}\nPuedes cambiarla en Configuración del grupo.`);
        }
      }

      // Send pending friend invites (non-fatal if any fail).
      if (inviteIds.length > 0) {
        try {
          await sendInvites.mutateAsync({ group_id: group.id, invitee_ids: inviteIds });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'No pudimos enviar las invitaciones.';
          Alert.alert('Invitaciones pendientes', `${msg}\nPuedes intentar de nuevo desde Configuración del grupo.`);
        }
      }

      // Reset form so the next "Create" tab visit starts blank.
      setName('');
      setPickedCover(null);
      setInviteIds([]);
      // Land on the groups list (back goes to the home/tabs) then open detail.
      router.replace('/(tabs)/groups');
      router.push({ pathname: '/group/[id]', params: { id: group.id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Algo salió mal';
      Alert.alert('Error', msg);
    }
  }

  return (
    <ScreenContainer theme="dark" edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.paper }}>Start your Circl</Text>
          <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 6 }}>
            Invite friends, pick a league, predict together.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 18 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Preview tile — with optional cover photo as background */}
          <View
            style={{
              borderRadius: 18,
              backgroundColor: colors.s800,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.04)',
              overflow: 'hidden',
            }}
          >
            {pickedCover ? (
              <Image
                source={{ uri: pickedCover.uri }}
                style={{ width: '100%', height: 90 }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              position: 'relative',
            }}>
              <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, backgroundColor: accent }} />
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  backgroundColor: accent + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24 }}>{icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.paper }}>
                  {name.trim() || 'Tu grupo'}
                </Text>
                <Text style={{ fontSize: 11.5, color: colors.mist, fontWeight: '600' }}>
                  1 miembro · {leagues.find((l) => l.id === leagueId)?.name ?? 'Liga MX'}
                </Text>
              </View>
            </View>
          </View>

          {/* Cover photo picker */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>
              Foto del grupo (opcional)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={handlePickCover}
                disabled={pickingCover}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: colors.s800,
                  borderWidth: 1,
                  borderColor: pickedCover ? accent : 'rgba(255,255,255,0.06)',
                }}
              >
                {pickingCover ? (
                  <ActivityIndicator size="small" color={colors.paper2} />
                ) : (
                  <Icon name={pickedCover ? 'image' : 'camera'} size={16} color={colors.paper2} />
                )}
                <Text style={{ fontSize: 13, color: colors.paper, fontWeight: '700', flex: 1 }}>
                  {pickedCover ? 'Cambiar foto' : 'Elegir foto'}
                </Text>
              </Pressable>
              {pickedCover ? (
                <Pressable
                  onPress={() => setPickedCover(null)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 14,
                    backgroundColor: colors.s800,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="trash" size={16} color={colors.red} />
                </Pressable>
              ) : null}
            </View>
            <Text style={{ fontSize: 11, color: colors.mist, marginTop: 6, paddingLeft: 4 }}>
              Si no eliges foto, usaremos el ícono y color que selecciones abajo.
            </Text>
          </View>

          <Input
            label="Group name"
            placeholder="e.g. Los Compas"
            value={name}
            onChangeText={setName}
            lead={<Icon name="people" size={18} color={colors.mist} />}
          />

          {/* Icon picker */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>
              Ícono
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ICONS.map((i) => (
                <Pressable
                  key={i}
                  onPress={() => setIcon(i)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: icon === i ? accent + '33' : 'rgba(255,255,255,0.05)',
                    borderWidth: icon === i ? 1.5 : 0,
                    borderColor: accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{i}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Accent picker */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>
              Color
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {ACCENTS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setAccent(c)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: c,
                    borderWidth: accent === c ? 2 : 0,
                    borderColor: colors.paper,
                  }}
                />
              ))}
            </View>
          </View>

          {/* Invite friends */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>
              Invitar amigos (opcional)
            </Text>
            <Pressable
              onPress={() => setFriendPickerOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 14,
                backgroundColor: colors.s800,
                borderWidth: 1,
                borderColor: inviteIds.length > 0 ? accent : 'rgba(255,255,255,0.06)',
              }}
            >
              <View
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  backgroundColor: accent + '22',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name="addUser" size={18} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>
                  {inviteIds.length === 0
                    ? 'Elegir amigos para invitar'
                    : `${inviteIds.length} ${inviteIds.length === 1 ? 'amigo' : 'amigos'} seleccionados`}
                </Text>
                <Text style={{ fontSize: 11, color: colors.mist, marginTop: 2 }}>
                  {friends.length === 0
                    ? 'Agrega amigos primero desde la pestaña Home'
                    : 'Se enviarán al crear el grupo'}
                </Text>
              </View>
              {selectedFriends.length > 0 ? (
                <AvatarStack
                  items={selectedFriends.slice(0, 4).map((f) => ({
                    initials: (f.user.name ?? '?').split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase(),
                  }))}
                  size={22}
                  max={4}
                />
              ) : (
                <Icon name="chev" size={14} color={colors.mist} />
              )}
            </Pressable>
          </View>

          {/* League picker */}
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>
              Liga
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {leaguesLoading ? (
                <Text style={{ color: colors.paper2, fontSize: 12 }}>Cargando...</Text>
              ) : (
                leagues.map((l) => {
                  const selected = leagueId === l.id;
                  return (
                    <Pressable
                      key={l.id}
                      onPress={() => setLeagueId(l.id)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 9999,
                        backgroundColor: selected ? accentColor : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: selected ? colors.paper : colors.paper2 }}>
                        {l.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <CButton
            variant="primary"
            size="lg"
            full
            onPress={handleCreate}
            disabled={createGroup.isPending}
          >
            {createGroup.isPending
              ? 'Creando…'
              : inviteIds.length > 0
                ? `Crear e invitar a ${inviteIds.length}`
                : 'Crear grupo'}
          </CButton>
        </View>
      </KeyboardAvoidingView>

      <FriendPickerModal
        visible={friendPickerOpen}
        onClose={() => setFriendPickerOpen(false)}
        selected={inviteIds}
        onConfirm={(ids) => setInviteIds(ids)}
        accent={accent}
        title="Invitar amigos"
      />
    </ScreenContainer>
  );
}
