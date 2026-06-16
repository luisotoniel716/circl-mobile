import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, Input, Avatar, TeamCrest, Icon, Text, colors,
} from '../src/components';
import { useAccent } from '../src/lib/tweaks';
import { useAuth } from '../src/lib/auth';
import { useUpdateProfile, useUsernameAvailable, useTeams } from '../src/lib/queries';
import { pickAndUpload } from '../src/lib/storage';
import { LIGAMX } from '../src/data';
import type { TeamCode } from '../src/types';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function EditProfile() {
  const router = useRouter();
  const { accentColor } = useAccent();
  const { user, profile } = useAuth();

  const { data: teams = [] } = useTeams();
  const updateProfile = useUpdateProfile();

  // ─── Local form state, initialized from profile ─────────────
  const [name,            setName]            = useState('');
  const [username,        setUsername]        = useState('');
  const [bio,             setBio]             = useState('');
  const [favoriteTeamId,  setFavoriteTeamId]  = useState<string | null>(null);
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    setUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
    setFavoriteTeamId(profile.favorite_team_id ?? null);
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  async function handlePickAvatar() {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const url = await pickAndUpload('avatars', user.id, [1, 1]);
      if (!url) return; // user canceled
      // Optimistic local update — also persist via mutation so it shows everywhere
      setAvatarUrl(url);
      await updateProfile.mutateAsync({ avatar_url: url });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No pudimos subir la foto.';
      Alert.alert('Error', msg);
    } finally {
      setAvatarUploading(false);
    }
  }

  // ─── Username live check (only when changed) ────────────────
  const usernameChanged = username.toLowerCase() !== (profile?.username ?? '').toLowerCase();
  const { data: usernameCheck, isFetching: usernameChecking } = useUsernameAvailable(
    usernameChanged ? username : null,
  );

  // ─── Form validation ────────────────────────────────────────
  const nameValid = name.trim().length >= 2;
  const usernameLocallyValid = /^[a-z0-9_.]{3,20}$/.test(username.trim().toLowerCase());
  const usernameOk = !usernameChanged || (usernameCheck?.available && usernameLocallyValid);
  const bioOk = bio.length <= 140;

  const dirty =
    name !== (profile?.name ?? '') ||
    username.toLowerCase() !== (profile?.username ?? '').toLowerCase() ||
    (bio ?? '') !== (profile?.bio ?? '') ||
    favoriteTeamId !== (profile?.favorite_team_id ?? null);

  const canSave = dirty && nameValid && usernameOk && bioOk && !updateProfile.isPending;

  async function handleSave() {
    if (!canSave) return;
    try {
      await updateProfile.mutateAsync({
        name,
        username,
        bio: bio.trim() ? bio : null,
        favorite_team_id: favoriteTeamId,
      });
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No pudimos actualizar tu perfil.';
      Alert.alert('Error', msg);
    }
  }

  if (!user || !profile) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Editar perfil" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }

  // Username helper text / status
  let usernameValid: 'ok' | 'err' | undefined;
  let usernameHelp: string | undefined;
  if (!usernameChanged) {
    usernameValid = undefined;
    usernameHelp  = 'Tus amigos te encuentran por este nombre';
  } else if (!usernameLocallyValid) {
    usernameValid = 'err';
    usernameHelp  = 'Solo letras, números, _ o . (3-20)';
  } else if (usernameChecking) {
    usernameValid = undefined;
    usernameHelp  = 'Verificando…';
  } else if (usernameCheck?.available) {
    usernameValid = 'ok';
    usernameHelp  = '¡Disponible!';
  } else {
    usernameValid = 'err';
    usernameHelp  = usernameCheck?.reason ?? 'No disponible';
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar
        title="Editar perfil"
        onBack
        right={
          <Pressable onPress={handleSave} hitSlop={8} disabled={!canSave}>
            <Text
              style={{
                color: canSave ? colors.gold : colors.mist,
                fontSize: 14,
                fontWeight: '800',
                opacity: updateProfile.isPending ? 0.6 : 1,
              }}
            >
              {updateProfile.isPending ? 'Guardando…' : 'Guardar'}
            </Text>
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Avatar — tap to pick a new photo from gallery */}
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Pressable onPress={handlePickAvatar} disabled={avatarUploading} hitSlop={8}>
              <View>
                <Avatar
                  initials={initialsOf(name || profile.name)}
                  size={96}
                  bg={accentColor}
                  ring
                  imageUrl={avatarUrl}
                />
                {/* Camera badge */}
                <View
                  style={{
                    position: 'absolute',
                    right: -2,
                    bottom: -2,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.gold,
                    borderWidth: 2.5,
                    borderColor: colors.s900,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {avatarUploading ? (
                    <ActivityIndicator size="small" color={colors.ink} />
                  ) : (
                    <Icon name="camera" size={14} color={colors.ink} />
                  )}
                </View>
              </View>
            </Pressable>
            <Text style={{ fontSize: 11, color: colors.mist, marginTop: 10, fontWeight: '600' }}>
              {avatarUploading ? 'Subiendo…' : 'Toca para cambiar foto'}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 14 }}>

            {/* Name */}
            <Input
              label="Nombre completo"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              valid={nameValid ? 'ok' : name.length > 0 ? 'err' : undefined}
              help={!nameValid && name.length > 0 ? 'Mínimo 2 caracteres' : undefined}
            />

            {/* Username */}
            <Input
              label="Usuario"
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              valid={usernameValid}
              help={usernameHelp}
              lead={<Text style={{ color: colors.mist, fontSize: 14, fontWeight: '700' }}>@</Text>}
            />

            {/* Email (read-only) */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 7, paddingLeft: 4 }}>
                Email
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: colors.s800,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.04)',
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 14,
                opacity: 0.6,
              }}>
                <Icon name="lock" size={14} color={colors.mist} />
                <Text style={{ flex: 1, fontSize: 14, color: colors.paper2 }}>{user.email}</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.mist, marginTop: 6, paddingLeft: 4 }}>
                Para cambiar tu email contáctanos
              </Text>
            </View>

            {/* Bio */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 7, paddingLeft: 4 }}>
                Bio
              </Text>
              <View style={{
                backgroundColor: colors.s800,
                borderWidth: 1,
                borderColor: bio.length > 140 ? colors.red : 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: 14,
                minHeight: 80,
              }}>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Cuéntale a tus amigos sobre ti…"
                  placeholderTextColor={colors.mist}
                  multiline
                  style={{
                    fontSize: 14,
                    color: colors.paper,
                    lineHeight: 20,
                    minHeight: 60,
                    textAlignVertical: 'top',
                  }}
                  maxLength={200}     // hard cap to prevent silly long bios
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 11, color: colors.mist }}>Visible en tu perfil público</Text>
                <Text style={{
                  fontSize: 11,
                  color: bio.length > 140 ? colors.red : colors.mist,
                  fontWeight: bio.length > 140 ? '800' : '400',
                }}>
                  {bio.length} / 140
                </Text>
              </View>
            </View>

            {/* Favorite team */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 7, paddingLeft: 4 }}>
                Equipo favorito
              </Text>

              {teams.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.mist, padding: 12 }}>
                  Cargando equipos…
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 4, paddingHorizontal: 1 }}
                >
                  <Pressable
                    onPress={() => setFavoriteTeamId(null)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 9999,
                      backgroundColor: favoriteTeamId === null ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                      borderWidth: 1.5,
                      borderColor: favoriteTeamId === null ? colors.paper : 'transparent',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>—</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.paper }}>Ninguno</Text>
                  </Pressable>

                  {teams.map((t) => {
                    const team = LIGAMX[t.code as TeamCode];
                    if (!team) return null;
                    const active = favoriteTeamId === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => setFavoriteTeamId(t.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingVertical: 8,
                          paddingLeft: 8,
                          paddingRight: 12,
                          borderRadius: 9999,
                          backgroundColor: active ? team.primary + '33' : 'rgba(255,255,255,0.04)',
                          borderWidth: 1.5,
                          borderColor: active ? team.primary : 'transparent',
                        }}
                      >
                        <TeamCrest team={team} size={22} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.paper }}>
                          {team.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <Text style={{ fontSize: 11, color: colors.mist, marginTop: 6, paddingLeft: 4 }}>
                Usado para insignias y estadísticas por equipo
              </Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
