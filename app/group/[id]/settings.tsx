import { useState, useEffect, useMemo } from 'react';
import {
  View, ScrollView, Pressable, Image, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, Section, CButton, Avatar, Input, Icon, Text, colors,
  InviteFriendsModal,
} from '../../../src/components';
import { useAuth } from '../../../src/lib/auth';
import {
  useGroup, useGroupMembers, useUpdateGroup, useDeleteGroup,
  useLeaveGroup, useUpdateMemberRole,
} from '../../../src/lib/queries';
import { pickImageFromLibrary, uploadImage } from '../../../src/lib/storage';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function GroupSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members = [], isLoading: membersLoading } = useGroupMembers(id);
  const updateGroup     = useUpdateGroup();
  const deleteGroup     = useDeleteGroup();
  const leaveGroup      = useLeaveGroup();
  const updateRole      = useUpdateMemberRole();

  // ─── Derived state ──────────────────────────────────────────
  const myMembership = members.find((m) => m.user_id === user?.id);
  const isAdmin      = myMembership?.role === 'admin';
  const otherAdmins  = members.filter((m) => m.role === 'admin' && m.user_id !== user?.id);
  const otherMembers = members.filter((m) => m.user_id !== user?.id);
  const isSoleMember = members.length === 1 && myMembership;
  const isSoleAdmin  = isAdmin && otherAdmins.length === 0 && otherMembers.length > 0;

  // ─── Editable group fields (admin only) ─────────────────────
  const [name, setName] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (group) setName(group.name);
  }, [group]);

  const dirty = group ? name.trim() !== group.name : false;
  const canSaveName = isAdmin && dirty && name.trim().length >= 3 && !updateGroup.isPending;

  async function handleSaveName() {
    if (!group || !canSaveName) return;
    try {
      await updateGroup.mutateAsync({ group_id: group.id, name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos actualizar el nombre.';
      Alert.alert('Error', msg);
    }
  }

  async function handlePickCover() {
    if (!group || !isAdmin) return;
    setCoverUploading(true);
    try {
      const img = await pickImageFromLibrary({ aspect: [16, 9] });
      if (!img) return;
      const ext = img.mimeType === 'image/png' ? 'png'
                : img.mimeType === 'image/webp' ? 'webp' : 'jpg';
      const path = `${group.id}/cover-${Date.now()}.${ext}`;
      const url  = await uploadImage('group-covers', path, img);
      await updateGroup.mutateAsync({ group_id: group.id, image_url: url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos subir la foto.';
      Alert.alert('Error', msg);
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleRemoveCover() {
    if (!group || !isAdmin || !group.image_url) return;
    Alert.alert(
      'Quitar foto',
      '¿Quieres quitar la foto del grupo? El grupo volverá a usar el ícono y color.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateGroup.mutateAsync({ group_id: group.id, image_url: null });
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'No pudimos quitar la foto.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }

  // ─── Leave / delete logic ───────────────────────────────────
  function handleLeavePress() {
    if (!group) return;

    // Sole member → leaving deletes the group
    if (isSoleMember) {
      Alert.alert(
        'Eliminar grupo',
        `Eres el último miembro de "${group.name}". Al salir el grupo se eliminará permanentemente.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar grupo',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteGroup.mutateAsync(group.id);
                router.replace('/(tabs)/groups');
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'No pudimos eliminar el grupo.';
                Alert.alert('Error', msg);
              }
            },
          },
        ],
      );
      return;
    }

    // Sole admin with other members → must transfer first
    if (isSoleAdmin) {
      Alert.alert(
        'Asigna un nuevo admin',
        'Eres el único administrador. Antes de salir, asigna a alguien más como admin.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Elegir admin', onPress: () => setTransferOpen(true) },
        ],
      );
      return;
    }

    // Normal leave
    Alert.alert(
      'Salir del grupo',
      `¿Seguro que quieres salir de "${group.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup.mutateAsync(group.id);
              router.replace('/(tabs)/groups');
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'No pudimos sacarte del grupo.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }

  // Transfer admin to a chosen member, then leave.
  async function handleTransferAndLeave(newAdminUserId: string) {
    if (!group) return;
    try {
      await updateRole.mutateAsync({ group_id: group.id, user_id: newAdminUserId, role: 'admin' });
      // Demote self so we don't end up with two unless they explicitly want it
      await updateRole.mutateAsync({ group_id: group.id, user_id: user!.id, role: 'member' });
      await leaveGroup.mutateAsync(group.id);
      setTransferOpen(false);
      router.replace('/(tabs)/groups');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos transferir el admin.';
      Alert.alert('Error', msg);
    }
  }

  // Toggle another member's admin role (admin only).
  async function handleToggleRole(targetUserId: string, currentRole: 'admin' | 'member') {
    if (!group || !isAdmin || targetUserId === user?.id) return;
    const next = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await updateRole.mutateAsync({ group_id: group.id, user_id: targetUserId, role: next });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos cambiar el rol.';
      Alert.alert('Error', msg);
    }
  }

  if (groupLoading || !group) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Configuración" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Configuración" onBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* ── Cover photo ─────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Pressable
              onPress={isAdmin ? handlePickCover : undefined}
              disabled={!isAdmin || coverUploading}
              style={{
                width: '100%',
                height: 160,
                borderRadius: 20,
                backgroundColor: group.image_url ? colors.s900 : group.accent + '33',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {group.image_url ? (
                <Image
                  source={{ uri: group.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ fontSize: 56 }}>{group.icon}</Text>
              )}
              {isAdmin ? (
                <View style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 9999,
                }}>
                  {coverUploading ? (
                    <ActivityIndicator size="small" color={colors.paper} />
                  ) : (
                    <Icon name="camera" size={13} color={colors.paper} />
                  )}
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper }}>
                    {coverUploading ? 'Subiendo…' : (group.image_url ? 'Cambiar' : 'Agregar foto')}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            {isAdmin && group.image_url ? (
              <Pressable onPress={handleRemoveCover} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: colors.red, fontWeight: '700' }}>Quitar foto</Text>
              </Pressable>
            ) : null}
          </View>

          {/* ── Name ───────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 12 }}>
            <Input
              label="Nombre del grupo"
              value={name}
              onChangeText={setName}
              editable={isAdmin}
              help={isAdmin
                ? (name.trim().length < 3 && name.length > 0 ? 'Mínimo 3 caracteres' : undefined)
                : 'Solo los admins pueden cambiar el nombre'}
            />
            {isAdmin && dirty ? (
              <CButton
                variant="primary"
                size="md"
                onPress={handleSaveName}
                disabled={!canSaveName}
              >
                {updateGroup.isPending ? 'Guardando…' : 'Guardar nombre'}
              </CButton>
            ) : null}
          </View>

          {/* ── Invite friends ─────────────────────────── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            <Pressable
              onPress={() => setInviteOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 14,
                backgroundColor: colors.s800,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: group.accent + '22',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="addUser" size={18} color={group.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>
                  Invitar amigos
                </Text>
                <Text style={{ fontSize: 11, color: colors.mist, marginTop: 2 }}>
                  Manda invitaciones a tus amigos para unirse al grupo
                </Text>
              </View>
              <Icon name="chev" size={16} color={colors.mist} />
            </Pressable>

            {/* Also expose the invite code for easy sharing */}
            <View
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.s800,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.04)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Icon name="qr" size={16} color={colors.paper2} />
              <Text style={{ fontSize: 12, color: colors.paper2, flex: 1 }}>
                Código del grupo
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '900',
                  color: colors.paper,
                  letterSpacing: 1.5,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {group.invite_code}
              </Text>
            </View>
          </View>

          {/* ── Members ────────────────────────────────── */}
          <Section title={`MIEMBROS (${members.length})`}>
            {membersLoading ? (
              <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                <ActivityIndicator color={colors.paper2} />
              </View>
            ) : (
              <View>
                {members.map((m) => {
                  const me   = m.user_id === user?.id;
                  const role = m.role;
                  return (
                    <View
                      key={m.user_id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingVertical: 10,
                      }}
                    >
                      <Avatar
                        initials={initialsOf(m.profile?.name)}
                        size={36}
                        bg={group.accent}
                        imageUrl={m.profile?.avatar_url}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.paper }}>
                          {me ? 'Tú' : (m.profile?.name ?? '—')}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.mist }}>
                          @{m.profile?.username ?? '—'}
                        </Text>
                      </View>

                      {role === 'admin' ? (
                        <View style={{
                          backgroundColor: colors.gold + '22',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 9999,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <Icon name="crown" size={10} color={colors.gold} />
                          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.gold }}>ADMIN</Text>
                        </View>
                      ) : null}

                      {/* Admin can toggle role on others */}
                      {isAdmin && !me ? (
                        <Pressable
                          onPress={() => handleToggleRole(m.user_id, role)}
                          hitSlop={8}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 9999,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                          }}
                        >
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.paper2 }}>
                            {role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </Section>

          {/* ── Danger zone ────────────────────────────── */}
          <Section title="ZONA PELIGROSA">
            <View style={{ gap: 8 }}>
              <Pressable
                onPress={handleLeavePress}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: colors.red + '15',
                  borderWidth: 1,
                  borderColor: colors.red + '44',
                }}
              >
                <Icon name="logout" size={16} color={colors.red} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.red }}>
                    {isSoleMember ? 'Eliminar grupo' : 'Salir del grupo'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.red + 'bb', marginTop: 2 }}>
                    {isSoleMember
                      ? 'Eres el último miembro. El grupo se eliminará.'
                      : isSoleAdmin
                      ? 'Eres el único admin. Tendrás que asignar otro antes.'
                      : 'Dejarás de participar en este Circl.'}
                  </Text>
                </View>
                <Icon name="forward" size={14} color={colors.red} />
              </Pressable>
            </View>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Transfer admin modal ──────────────────────── */}
      <TransferAdminModal
        visible={transferOpen}
        onClose={() => setTransferOpen(false)}
        candidates={otherMembers}
        groupAccent={group.accent}
        onConfirm={handleTransferAndLeave}
        loading={updateRole.isPending || leaveGroup.isPending}
      />

      {/* ── Invite friends modal ──────────────────────── */}
      <InviteFriendsModal
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        groupId={group.id}
        groupAccent={group.accent}
      />
    </ScreenContainer>
  );
}

// ─── Transfer admin modal ───────────────────────────────────

function TransferAdminModal({
  visible, onClose, candidates, groupAccent, onConfirm, loading,
}: {
  visible:      boolean;
  onClose:      () => void;
  candidates:   { user_id: string; profile: { name: string | null; username: string | null; avatar_url: string | null } | null }[];
  groupAccent:  string;
  onConfirm:    (userId: string) => void;
  loading:      boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const selectedName = useMemo(
    () => candidates.find((c) => c.user_id === picked)?.profile?.name ?? '',
    [candidates, picked],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: colors.s900,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: 20, paddingBottom: 30, maxHeight: '80%',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: colors.paper, fontSize: 16, fontWeight: '800', flex: 1 }}>
              Asignar nuevo admin
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={20} color={colors.paper2} />
            </Pressable>
          </View>

          <Text style={{ fontSize: 12, color: colors.mist, marginBottom: 16 }}>
            Esta persona será el nuevo administrador. Después saldrás del grupo.
          </Text>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {candidates.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.paper2, textAlign: 'center', paddingVertical: 12 }}>
                No hay otros miembros en este grupo.
              </Text>
            ) : (
              candidates.map((m) => {
                const active = picked === m.user_id;
                return (
                  <Pressable
                    key={m.user_id}
                    onPress={() => setPicked(m.user_id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      borderRadius: 12,
                      marginBottom: 4,
                      backgroundColor: active ? colors.gold + '22' : 'transparent',
                      borderWidth: 1,
                      borderColor: active ? colors.gold : 'transparent',
                    }}
                  >
                    <Avatar
                      initials={initialsOf(m.profile?.name)}
                      size={34}
                      bg={groupAccent}
                      imageUrl={m.profile?.avatar_url}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.paper }}>
                        {m.profile?.name ?? '—'}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.mist }}>
                        @{m.profile?.username ?? '—'}
                      </Text>
                    </View>
                    {active ? <Icon name="check" size={16} color={colors.gold} stroke={3} /> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <CButton variant="ghostDark" size="md" full onPress={onClose}>
                Cancelar
              </CButton>
            </View>
            <View style={{ flex: 1 }}>
              <CButton
                variant="primary"
                size="md"
                full
                disabled={!picked || loading}
                onPress={() => picked && onConfirm(picked)}
              >
                {loading ? 'Saliendo…' : (selectedName ? `Asignar y salir` : 'Continuar')}
              </CButton>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
