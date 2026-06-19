import { useState, useMemo, useEffect } from 'react';
import {
  View, ScrollView, Pressable, Image, Alert, ActivityIndicator,
  Platform, Dimensions, TextInput, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ScreenContainer, TopBar, CButton, Input, Icon, Text, colors,
  Avatar, CreateGroupSuccess, StepProgress,
} from '../../src/components';
import type { OrbitMember, IconName } from '../../src/components';
import { useAuth } from '../../src/lib/auth';
import { useAccent } from '../../src/lib/tweaks';
import {
  useLeagues, useCreateGroup, useUpdateGroup,
  useFriends, useSendGroupInvitesBulk,
} from '../../src/lib/queries';
import { pickImageFromLibrary, uploadImage } from '../../src/lib/storage';
import type { PickedImage } from '../../src/lib/storage';

const ICONS    = ['🎯','⚽','🏆','🔥','👑','⭐','💎','⚡','🎲','🚀'];
const ACCENTS  = ['#4F6BFF','#FF5C8A','#22C58E','#F4A300','#A057FF','#FF6A3D','#0BA5E9','#E11D48'];
const SCREEN_W = Dimensions.get('window').width;
const STEPS    = ['name', 'style', 'friends', 'config', 'review'] as const;
type StepKey   = typeof STEPS[number];

// ─── Helpers ───────────────────────────────────────────────

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// ─── Screen ────────────────────────────────────────────────

/**
 * Multi-step "Start your Circl" wizard. Replaces the previous single-page
 * form. Steps slide horizontally on a shared track (spatial continuity),
 * the stepper at the top fills as you advance, and the bottom CTA copy
 * changes per step. After "Crear grupo" succeeds, a fullscreen orbit
 * animation reveals the new group with a "Game on!" finale before we
 * navigate to its detail screen.
 */
export default function Create() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { accentColor } = useAccent();

  // ── Keyboard-aware bottom padding ──
  //
  // The screen content area ends at the tab bar's TOP edge (React
  // Navigation auto-inserts the tab bar height as bottom inset). So
  // every `paddingBottom` we set here is measured from that edge, not
  // from the physical screen bottom.
  //
  // Resting state — 36px clears the floating "+" bubble (which juts
  // ~22px above the tab bar's top edge) with ~14px of breathing room.
  //
  // Keyboard-up state — `Keyboard.endCoordinates.height` is measured
  // from the SCREEN bottom, but our padding base is the tab bar top
  // (insets.bottom + BAR_H above screen bottom). So we subtract that
  // offset to convert: `kbH - tabBarTotal + floor`. Without the
  // subtraction the button sits ~tab-bar-height TOO HIGH above the
  // keyboard, which was the "se eleva mucho" bug.
  const RESTING_PAD     = 36;
  const TAB_BAR_HEIGHT  = 62;
  const TAB_BAR_TOTAL   = insets.bottom + TAB_BAR_HEIGHT; // from screen bottom
  const ctaPad = useSharedValue(RESTING_PAD);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      const kbH = e.endCoordinates?.height ?? 0;
      // Convert from "above screen bottom" → "above tab bar top", then
      // add a 10px floor so the button isn't touching the keyboard.
      // Never go below the resting padding (e.g. tiny keyboards).
      const target = Math.max(RESTING_PAD, kbH - TAB_BAR_TOTAL + 10);
      ctaPad.value = withTiming(target, { duration: 220, easing: Easing.out(Easing.cubic) });
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      ctaPad.value = withTiming(RESTING_PAD, { duration: 220, easing: Easing.out(Easing.cubic) });
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [ctaPad, RESTING_PAD, TAB_BAR_TOTAL]);

  const ctaContainerStyle = useAnimatedStyle(() => ({
    paddingBottom: ctaPad.value,
  }));

  const { data: leagues = [] } = useLeagues();
  const { data: friends = [] } = useFriends();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const sendInvites = useSendGroupInvitesBulk();

  // ── Wizard state ──
  const [stepIdx, setStepIdx] = useState(0);
  const trackX = useSharedValue(0);

  // ── Form state ──
  const [name,         setName]         = useState('');
  const [icon,         setIcon]         = useState('🎯');
  const [accent,       setAccent]       = useState('#4F6BFF');
  const [leagueId,     setLeagueId]     = useState<string | null>(null);
  const [pickedCover,  setPickedCover]  = useState<PickedImage | null>(null);
  const [pickingCover, setPickingCover] = useState(false);
  const [inviteIds,    setInviteIds]    = useState<string[]>([]);
  const [friendQuery,  setFriendQuery]  = useState('');
  // Group config — when true, members can't see each other's picks until
  // the match starts (anti-copy). Defaults to true.
  const [hidePicks,    setHidePicks]    = useState(true);

  // ── Success overlay state ──
  // We show the overlay as soon as the user taps "Crear grupo". The
  // orbit animation gates on `successReady`, which flips to true only
  // once the network call has resolved successfully.
  const [showSuccess,   setShowSuccess]   = useState(false);
  const [successReady,  setSuccessReady]  = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);

  // Default to the first league once loaded.
  useEffect(() => {
    if (leagueId == null && leagues.length > 0) setLeagueId(leagues[0].id);
  }, [leagueId, leagues]);

  // Slide track whenever the step changes.
  useEffect(() => {
    trackX.value = withSpring(-stepIdx * SCREEN_W, {
      damping: 22, stiffness: 180, mass: 0.85,
    });
  }, [stepIdx, trackX]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trackX.value }],
  }));

  // ── Filtered friends list ──
  const filteredFriends = useMemo(() => {
    const q = friendQuery.trim().toLowerCase().replace(/^@/, '');
    if (!q) return friends;
    return friends.filter((f) =>
      (f.user.username ?? '').toLowerCase().includes(q) ||
      (f.user.name     ?? '').toLowerCase().includes(q),
    );
  }, [friends, friendQuery]);

  const selectedFriendUsers = useMemo(
    () => friends.filter((f) => inviteIds.includes(f.user.id)).map((f) => f.user),
    [friends, inviteIds],
  );

  // ── Validation per step ──
  const stepKey: StepKey = STEPS[stepIdx];
  const canAdvance = (() => {
    if (stepKey === 'name')    return name.trim().length >= 3;
    if (stepKey === 'style')   return true;
    if (stepKey === 'friends') return true; // friends is optional
    if (stepKey === 'config')  return true;
    return true;
  })();

  // ── CTA copy per step (dynamic in friends + review) ──
  const ctaLabel = (() => {
    if (createGroup.isPending) return 'Creando…';
    if (stepKey === 'name')    return 'Continuar';
    if (stepKey === 'style')   return 'Continuar';
    if (stepKey === 'friends') {
      if (inviteIds.length === 0) return 'Saltar';
      return `Agregar ${inviteIds.length} ${inviteIds.length === 1 ? 'amigo' : 'amigos'}`;
    }
    if (stepKey === 'config') return 'Continuar';
    return inviteIds.length > 0
      ? `Crear e invitar a ${inviteIds.length}`
      : 'Crear grupo';
  })();

  // ── Step navigation ──
  function goNext() {
    if (!canAdvance) return;
    // Dismiss the keyboard whenever we change steps — the name step has a
    // focused TextInput and leaving it up while the next panel slides in
    // looks broken (keyboard floating over the style/friends screens).
    Keyboard.dismiss();
    Haptics.selectionAsync().catch(() => {});
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((s) => s + 1);
    } else {
      handleCreate();
    }
  }
  function goBack() {
    Keyboard.dismiss();
    Haptics.selectionAsync().catch(() => {});
    if (stepIdx > 0) {
      setStepIdx((s) => s - 1);
    } else {
      router.back();
    }
  }

  // ── Cover photo ──
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

  // ── Friends ──
  function toggleFriend(id: string) {
    Haptics.selectionAsync().catch(() => {});
    setInviteIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  // ── Submit ──
  async function handleCreate() {
    if (name.trim().length < 3 || !leagueId) return;

    // Surface the overlay immediately — the ripples play during the
    // network call so the user gets continuous feedback.
    setSuccessReady(false);
    setCreatedGroupId(null);
    setShowSuccess(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const group = await createGroup.mutateAsync({
        name, icon, accent, league_id: leagueId,
        hide_picks_until_kickoff: hidePicks,
      });

      if (pickedCover) {
        try {
          const ext = pickedCover.mimeType === 'image/png' ? 'png'
                    : pickedCover.mimeType === 'image/webp' ? 'webp' : 'jpg';
          const path = `${group.id}/cover-${Date.now()}.${ext}`;
          const url  = await uploadImage('group-covers', path, pickedCover);
          await updateGroup.mutateAsync({ group_id: group.id, image_url: url });
        } catch (e) {
          // Non-fatal — keep the success flow going.
          // eslint-disable-next-line no-console
          console.warn('Cover upload failed:', e);
        }
      }

      if (inviteIds.length > 0) {
        try {
          await sendInvites.mutateAsync({ group_id: group.id, invitee_ids: inviteIds });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Invite send failed:', e);
        }
      }

      setCreatedGroupId(group.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSuccessReady(true);
    } catch (e: unknown) {
      setShowSuccess(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const msg = e instanceof Error ? e.message : 'Algo salió mal';
      Alert.alert('Error', msg);
    }
  }

  // Reset the wizard so the next visit starts clean. Used by both exit
  // paths (button → group detail, tap-anywhere → groups list).
  function resetWizard() {
    setName('');
    setIcon('🎯');
    setAccent('#4F6BFF');
    setPickedCover(null);
    setInviteIds([]);
    setHidePicks(true);
    setStepIdx(0);
    setShowSuccess(false);
    setSuccessReady(false);
    setCreatedGroupId(null);
    // Slide track back so the next render starts at step 0.
    trackX.value = 0;
  }

  /** Explicit "Ir al grupo" — lands inside the new group's detail screen. */
  function handleGoToGroup() {
    if (!createdGroupId) return;
    const targetId = createdGroupId;
    resetWizard();
    router.replace('/(tabs)/groups');
    router.push({ pathname: '/group/[id]', params: { id: targetId } });
  }

  /** Tap-anywhere — implicit "ya lo veo después", land on the groups list. */
  function handleTapAnywhere() {
    if (!createdGroupId) return;
    resetWizard();
    router.replace('/(tabs)/groups');
  }

  // Host (current user) + invited friends, formatted for the orbit overlay.
  const orbitHost: OrbitMember = {
    id:        profile?.id ?? 'me',
    name:      profile?.name ?? 'You',
    avatarUrl: profile?.avatar_url ?? null,
  };
  const orbitFriends: OrbitMember[] = selectedFriendUsers.map((u) => ({
    id:        u.id,
    name:      u.name ?? null,
    avatarUrl: u.avatar_url ?? null,
  }));

  return (
    <ScreenContainer theme="dark" edges={['top']}>
      {/* No KeyboardAvoidingView here on purpose: KAV was fighting with
          our custom safe-area + tab-bar padding (the CTA ended up too
          high without keyboard and still hidden with keyboard). Instead
          we own the keyboard state via `Keyboard.addListener` and drive
          the CTA's bottom padding directly via a shared value. The panel
          area stays full-height; only the CTA's distance to the bottom
          edge changes. */}
      <View style={{ flex: 1 }}>
        {/* ── Header: nav icons + step progress ────────── */}
        <TopBar
          left={
            stepIdx === 0 ? (
              <Pressable onPress={goBack} hitSlop={8} style={{ padding: 6, marginLeft: -6 }}>
                <Icon name="close" size={20} color={colors.paper2} />
              </Pressable>
            ) : (
              <Pressable onPress={goBack} hitSlop={8} style={{ padding: 6, marginLeft: -6 }}>
                <Icon name="back" size={22} color={colors.paper} />
              </Pressable>
            )
          }
          center={
            <StepProgress steps={STEPS.length} current={stepIdx} />
          }
        />

        {/* ── Horizontal panel track ───────────────────── */}
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Animated.View
            style={[
              { flex: 1, flexDirection: 'row', width: SCREEN_W * STEPS.length },
              trackStyle,
            ]}
          >
            {/* Panel 1: Name ─────────────────────────── */}
            <View style={{ width: SCREEN_W, paddingHorizontal: 24 }}>
              <PanelHeader
                kicker="PASO 1"
                title="¿Cómo se va a llamar?"
                subtitle="Ponle un nombre con el que tus compas lo encuentren rápido."
              />
              <Input
                label="Nombre del Circl"
                placeholder="e.g. Los Compas"
                value={name}
                onChangeText={setName}
                lead={<Icon name="people" size={18} color={colors.mist} />}
                help={name.length > 0 && name.trim().length < 3 ? 'Mínimo 3 caracteres' : undefined}
              />
              {/* Live preview tile — shows what the group card will look like */}
              <View style={{ marginTop: 22 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, marginBottom: 8, letterSpacing: 0.6 }}>
                  VISTA PREVIA
                </Text>
                <GroupPreview
                  name={name}
                  icon={icon}
                  accent={accent}
                  cover={pickedCover?.uri ?? null}
                  league={leagues.find((l) => l.id === leagueId)?.name ?? 'Liga MX'}
                />
              </View>
            </View>

            {/* Panel 2: Style (icon + color + cover) ──── */}
            <View style={{ width: SCREEN_W }}>
              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 22 }}
                showsVerticalScrollIndicator={false}
              >
                <PanelHeader
                  kicker="PASO 2"
                  title="Dale tu estilo"
                  subtitle="Ícono, color y foto opcional. Lo puedes cambiar después."
                />
                <GroupPreview
                  name={name}
                  icon={icon}
                  accent={accent}
                  cover={pickedCover?.uri ?? null}
                  league={leagues.find((l) => l.id === leagueId)?.name ?? 'Liga MX'}
                />
                {/* Cover */}
                <View>
                  <SectionLabel>FOTO DEL GRUPO (OPCIONAL)</SectionLabel>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={handlePickCover}
                      disabled={pickingCover}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
                        paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
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
                          paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
                          backgroundColor: colors.s800, borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.06)',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Icon name="trash" size={16} color={colors.red} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {/* Icon picker */}
                <View>
                  <SectionLabel>ÍCONO</SectionLabel>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {ICONS.map((i) => (
                      <Pressable
                        key={i}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setIcon(i);
                        }}
                        style={{
                          width: 46, height: 46, borderRadius: 12,
                          backgroundColor: icon === i ? accent + '33' : 'rgba(255,255,255,0.05)',
                          borderWidth: icon === i ? 1.5 : 0,
                          borderColor: accent,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>{i}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Accent picker */}
                <View>
                  <SectionLabel>COLOR</SectionLabel>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {ACCENTS.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setAccent(c);
                        }}
                        style={{
                          width: 32, height: 32, borderRadius: 16,
                          backgroundColor: c,
                          borderWidth: accent === c ? 2.5 : 0,
                          borderColor: colors.paper,
                        }}
                      />
                    ))}
                  </View>
                </View>

                {/* League picker — kept here since Liga MX is the only
                    one for now; lives next to the visual identity. */}
                <View>
                  <SectionLabel>LIGA</SectionLabel>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {leagues.map((l) => {
                      const selected = leagueId === l.id;
                      return (
                        <Pressable
                          key={l.id}
                          onPress={() => setLeagueId(l.id)}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9999,
                            backgroundColor: selected ? accentColor : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          <Text style={{
                            fontSize: 12.5, fontWeight: '800',
                            color: selected ? colors.paper : colors.paper2,
                          }}>
                            {l.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Panel 3: Friends ─────────────────────── */}
            <View style={{ width: SCREEN_W }}>
              <View style={{ paddingHorizontal: 24, paddingBottom: 14 }}>
                <PanelHeader
                  kicker="PASO 3"
                  title="Who's in?"
                  subtitle="Invita amigos para que peleen el primer lugar contigo."
                />
                {/* Search */}
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: colors.s800, borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
                  }}
                >
                  <Icon name="search" size={16} color={colors.paper2} />
                  <TextInput
                    value={friendQuery}
                    onChangeText={setFriendQuery}
                    placeholder="Busca a tus amigos"
                    placeholderTextColor={colors.mist}
                    style={{
                      flex: 1, color: colors.paper, fontSize: 14, padding: 0,
                    }}
                  />
                  {friendQuery.length > 0 ? (
                    <Pressable onPress={() => setFriendQuery('')} hitSlop={8}>
                      <Icon name="close" size={14} color={colors.paper2} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {/* Friends list */}
              {friends.length === 0 ? (
                <View style={{ paddingHorizontal: 24, paddingTop: 14, alignItems: 'center', gap: 6 }}>
                  <Icon name="people" size={28} color={colors.mist} />
                  <Text style={{ fontSize: 13, color: colors.paper2, textAlign: 'center', marginTop: 6 }}>
                    Aún no tienes amigos en Circl.{'\n'}Puedes invitar después.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12, gap: 4 }}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredFriends.map((f) => {
                    const checked = inviteIds.includes(f.user.id);
                    return (
                      <Pressable
                        key={f.user.id}
                        onPress={() => toggleFriend(f.user.id)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 12,
                          paddingVertical: 10, paddingHorizontal: 4,
                          borderRadius: 12,
                        }}
                      >
                        <Avatar
                          initials={initialsOf(f.user.name)}
                          size={40}
                          bg={accent}
                          imageUrl={f.user.avatar_url}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>
                            {f.user.name ?? '—'}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.mist }}>
                            @{f.user.username ?? '—'}
                          </Text>
                        </View>
                        <Checkbox checked={checked} accent={accent} />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Panel 4: Config ──────────────────────── */}
            <View style={{ width: SCREEN_W }}>
              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 18 }}
                showsVerticalScrollIndicator={false}
              >
                <PanelHeader
                  kicker="AJUSTES"
                  title="Configura tu Circl"
                  subtitle="Define cómo se comporta el grupo. Puedes cambiarlo después."
                />
                <SettingToggleRow
                  icon="lock"
                  accent={accent}
                  title="Ocultar picks hasta el partido"
                  subtitle="Los miembros no verán los pronósticos de los demás hasta que inicie cada partido. Evita que se copien."
                  value={hidePicks}
                  onChange={setHidePicks}
                />
              </ScrollView>
            </View>

            {/* Panel 5: Review ──────────────────────── */}
            <View style={{ width: SCREEN_W }}>
              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 18 }}
                showsVerticalScrollIndicator={false}
              >
                <PanelHeader
                  kicker="LISTO"
                  title="Confirma tu Circl"
                  subtitle="Revisa los detalles y crea el grupo."
                />
                <GroupPreview
                  name={name}
                  icon={icon}
                  accent={accent}
                  cover={pickedCover?.uri ?? null}
                  league={leagues.find((l) => l.id === leagueId)?.name ?? 'Liga MX'}
                />

                {/* Member preview row */}
                <View
                  style={{
                    backgroundColor: colors.s800, borderRadius: 14,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                    padding: 14, gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, letterSpacing: 0.6 }}>
                    {inviteIds.length === 0
                      ? 'EMPIEZAS SOLO'
                      : `${inviteIds.length + 1} EN EL CIRCL`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: -10 }}>
                    {[orbitHost, ...orbitFriends].slice(0, 6).map((m, i) => (
                      <View
                        key={m.id}
                        style={{
                          marginLeft: i === 0 ? 0 : -10,
                          borderWidth: 2,
                          borderColor: colors.s800,
                          borderRadius: 18,
                        }}
                      >
                        <Avatar
                          initials={initialsOf(m.name)}
                          size={32}
                          bg={accent}
                          imageUrl={m.avatarUrl}
                        />
                      </View>
                    ))}
                    {inviteIds.length + 1 > 6 ? (
                      <View
                        style={{
                          marginLeft: -10,
                          width: 32, height: 32, borderRadius: 16,
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          alignItems: 'center', justifyContent: 'center',
                          borderWidth: 2, borderColor: colors.s800,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '900', color: colors.paper }}>
                          +{inviteIds.length + 1 - 6}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Quick edits — tap a row to jump back to that step */}
                <View style={{ gap: 6 }}>
                  <ReviewRow
                    label="Nombre"
                    value={name || '—'}
                    onPress={() => setStepIdx(0)}
                  />
                  <ReviewRow
                    label="Ícono y color"
                    valueLead={
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 18 }}>{icon}</Text>
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: accent }} />
                      </View>
                    }
                    onPress={() => setStepIdx(1)}
                  />
                  <ReviewRow
                    label="Amigos"
                    value={inviteIds.length === 0
                      ? 'Ninguno (puedes invitar después)'
                      : `${inviteIds.length} ${inviteIds.length === 1 ? 'amigo' : 'amigos'}`}
                    onPress={() => setStepIdx(2)}
                  />
                  <ReviewRow
                    label="Picks ocultos"
                    value={hidePicks ? 'Hasta que inicie el partido' : 'Visibles siempre'}
                    onPress={() => setStepIdx(3)}
                  />
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </View>

        {/* ── Bottom CTA ─────────────────────────────── */}
        {/* `paddingBottom` is driven by the keyboard-tracking shared
            value, so the button glides up to sit just above the
            keyboard when it opens, and back down to clear the tab bar
            + "+" bubble when it closes. */}
        <Animated.View style={[{ paddingHorizontal: 20, paddingTop: 8 }, ctaContainerStyle]}>
          <CButton
            variant="primary"
            size="lg"
            full
            onPress={goNext}
            disabled={!canAdvance || createGroup.isPending}
          >
            {ctaLabel}
          </CButton>
        </Animated.View>
      </View>

      {/* ── Fullscreen success overlay ───────────────── */}
      <CreateGroupSuccess
        visible={showSuccess}
        ready={successReady}
        host={orbitHost}
        friends={orbitFriends}
        icon={icon}
        accent={accent}
        onGoToGroup={handleGoToGroup}
        onTapAnywhere={handleTapAnywhere}
      />
    </ScreenContainer>
  );
}

// ─── Subcomponents ─────────────────────────────────────────

function PanelHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return (
    <View style={{ paddingTop: 4, paddingBottom: 22 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper2, letterSpacing: 1 }}>
        {kicker}
      </Text>
      <Text style={{ fontSize: 26, fontWeight: '900', color: colors.paper, marginTop: 6, lineHeight: 32 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 6, lineHeight: 18 }}>
        {subtitle}
      </Text>
    </View>
  );
}

// A premium settings row with an icon, title/subtitle and an animated
// switch. The whole row is tappable. The switch thumb glides with a spring
// and the track cross-fades to the accent colour when on.
function SettingToggleRow({
  icon, accent, title, subtitle, value, onChange,
}: {
  icon: IconName;
  accent: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    t.value = withTiming(value ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [value, t]);

  const TRACK_W = 48;
  const THUMB   = 22;
  const PAD     = 3;
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * (TRACK_W - THUMB - PAD * 2) }],
  }));
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      t.value, [0, 1],
      ['rgba(255,255,255,0.10)', accent],
    ),
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onChange(!value);
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.s800,
        borderWidth: 1,
        borderColor: value ? accent + '40' : 'rgba(255,255,255,0.06)',
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          width: 40, height: 40, borderRadius: 12,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: value ? accent + '22' : 'rgba(255,255,255,0.05)',
        }}
      >
        <Icon name={icon} size={18} color={value ? accent : colors.paper2} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: colors.paper2, marginTop: 3, lineHeight: 16 }}>
          {subtitle}
        </Text>
      </View>

      {/* Switch */}
      <Animated.View
        style={[
          { width: TRACK_W, height: THUMB + PAD * 2, borderRadius: 9999, justifyContent: 'center', paddingHorizontal: PAD },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: THUMB, height: THUMB, borderRadius: THUMB / 2,
              backgroundColor: '#fff',
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{
      fontSize: 11, fontWeight: '800', color: colors.mist,
      letterSpacing: 0.6, marginBottom: 8, paddingLeft: 4,
    }}>
      {children}
    </Text>
  );
}

function GroupPreview({
  name, icon, accent, cover, league,
}: {
  name: string; icon: string; accent: string; cover: string | null; league: string;
}) {
  return (
    <View
      style={{
        borderRadius: 18, backgroundColor: colors.s800,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={{ width: '100%', height: 90 }} resizeMode="cover" />
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, position: 'relative' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, backgroundColor: accent }} />
        <View
          style={{
            width: 50, height: 50, borderRadius: 14,
            backgroundColor: accent + '22',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.paper }}>
            {name.trim() || 'Tu Circl'}
          </Text>
          <Text style={{ fontSize: 11.5, color: colors.mist, fontWeight: '600' }}>
            1 miembro · {league}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Checkbox({ checked, accent }: { checked: boolean; accent: string }) {
  // Small spring + tick animation when toggling.
  const s = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    s.value = withSpring(checked ? 1 : 0, { damping: 12, stiffness: 260, mass: 0.5 });
  }, [checked, s]);
  const tickStyle = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: s.value,
  }));
  return (
    <View
      style={{
        width: 24, height: 24, borderRadius: 7,
        backgroundColor: checked ? accent : 'transparent',
        borderWidth: checked ? 0 : 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Animated.View style={tickStyle}>
        <Icon name="check" size={14} color={colors.paper} stroke={3.5} />
      </Animated.View>
    </View>
  );
}

function ReviewRow({
  label, value, valueLead, onPress,
}: {
  label: string;
  value?: string;
  valueLead?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.s800,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, letterSpacing: 0.6 }}>
          {label.toUpperCase()}
        </Text>
        {valueLead ?? (
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper, marginTop: 3 }}>
            {value}
          </Text>
        )}
      </View>
      <Icon name="edit" size={14} color={colors.paper2} />
    </Pressable>
  );
}
