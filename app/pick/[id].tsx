import { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import {
  ScreenContainer, TopBar, CButton, TeamCrest, Icon, Text, colors,
} from '../../src/components';
import { LIGAMX } from '../../src/data';
import type { TeamCode } from '../../src/types';
import {
  useMatch, useMyGroups, useMyPicksForMatch, useSubmitPick,
} from '../../src/lib/queries';
import type { Prediction } from '../../src/lib/queries';

function predictionToTeamCode(pred: Prediction | null, homeCode: TeamCode, awayCode: TeamCode): TeamCode | 'DRAW' | null {
  if (pred === 'home') return homeCode;
  if (pred === 'away') return awayCode;
  if (pred === 'draw') return 'DRAW';
  return null;
}

function teamCodeToPrediction(sel: TeamCode | 'DRAW', homeCode: TeamCode): Prediction {
  if (sel === 'DRAW') return 'draw';
  if (sel === homeCode) return 'home';
  return 'away';
}

export default function MakePick() {
  const { id: matchId, groupId: lockedGroupId } = useLocalSearchParams<{ id: string; groupId?: string }>();
  const router = useRouter();

  const { data: match, isLoading: matchLoading } = useMatch(matchId);
  const { data: groups = [], isLoading: groupsLoading } = useMyGroups();
  const { data: existingPicks = {} } = useMyPicksForMatch(matchId);
  const submitPick = useSubmitPick();

  // If groupId is in URL, this pick is locked to that group (entered from a group context).
  // Otherwise the user picks freely from their groups.
  const isLockedToGroup = !!lockedGroupId;

  const homeCode = (match?.home ?? 'AME') as TeamCode;
  const awayCode = (match?.away ?? 'GDL') as TeamCode;
  const h = LIGAMX[homeCode];
  const a = LIGAMX[awayCode];

  // Determine initial selection from existing pick.
  // CRITICAL: picks are per-group. When the screen is locked to one group,
  // we must only read that group's pick. Falling back to another group's
  // pick would falsely show "your pick is X" in a group where the user
  // hasn't actually picked yet.
  const existingForLockedGroup =
    isLockedToGroup ? existingPicks[lockedGroupId!] ?? null : null;
  const firstExisting = isLockedToGroup
    ? existingForLockedGroup
    : Object.values(existingPicks)[0] ?? null;
  const initialSel = predictionToTeamCode(firstExisting, homeCode, awayCode) ?? homeCode;

  const [selected, setSelected] = useState<TeamCode | 'DRAW'>(initialSel);

  // Wraps setSelected to add tactile feedback: a light haptic tick + the
  // PickButton's internal scale punch. Skipped when the user re-taps the
  // already-selected option so the buzz doesn't feel noisy.
  function selectWithFeedback(next: TeamCode | 'DRAW') {
    if (next === selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelected(next);
  }

  // Selected groups (multi-select). Defaults to all groups when no lock; to the locked group when locked.
  const initialSelectedGroups = useMemo(() => {
    if (isLockedToGroup) return new Set([lockedGroupId!]);
    return new Set(groups.map((g) => g.id));
  }, [isLockedToGroup, lockedGroupId, groups]);

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(initialSelectedGroups);

  // Re-sync selected groups when the underlying groups list arrives (only if not locked).
  useMemo(() => {
    if (!isLockedToGroup && groups.length > 0 && selectedGroups.size === 0) {
      setSelectedGroups(new Set(groups.map((g) => g.id)));
    }
  }, [groups, isLockedToGroup, selectedGroups.size]);

  function toggleGroup(gid: string) {
    if (isLockedToGroup) return; // can't change when locked
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid); else next.add(gid);
      return next;
    });
  }

  // Group context label (when locked)
  const lockedGroup = isLockedToGroup ? groups.find((g) => g.id === lockedGroupId) : null;

  const options = [
    { team: h, side: 'LOCAL', key: homeCode },
    { team: a, side: 'VISITANTE', key: awayCode },
  ];

  const confirmLabel =
    selected === 'DRAW' ? 'Empate' : (LIGAMX[selected as TeamCode]?.name ?? selected);

  // Lock if the match has already started (auto-live derived in toUI) or finished.
  const isLocked = match ? match.status !== 'upcoming' : false;

  async function handleConfirm() {
    if (isLocked) {
      Alert.alert('Pick bloqueado', 'El partido ya empezó. Ya no puedes hacer ni cambiar tu pick.');
      return;
    }
    if (!matchId || groups.length === 0) {
      Alert.alert('Sin grupos', 'Únete o crea un grupo para hacer picks.');
      return;
    }
    const groupIds = Array.from(selectedGroups);
    if (groupIds.length === 0) {
      Alert.alert('Selecciona al menos un grupo', 'Activa al menos un grupo para guardar tu pick.');
      return;
    }
    const prediction = teamCodeToPrediction(selected, homeCode);
    try {
      await submitPick.mutateAsync({ matchId, prediction, groupIds });
      // Success haptic — a satisfying double-tick — fires just as we
      // navigate to the confirmation screen so the user feels the
      // commit landing.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push({
        pathname: '/pick/[id]/confirmed',
        params: { id: matchId, prediction, groupIds: groupIds.join(',') },
      });
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const msg = e instanceof Error ? e.message : 'No pudimos guardar tu pick.';
      Alert.alert('Error', msg);
    }
  }

  if (matchLoading || groupsLoading) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Tu pick" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }

  if (!match) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Tu pick" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.paper2 }}>Partido no encontrado.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar
        title="Tu pick"
        onBack
        right={
          <Text
            onPress={() => router.back()}
            style={{ color: colors.paper2, fontSize: 12, fontWeight: '700' }}
          >
            Saltar
          </Text>
        }
      />

      <View style={{ paddingHorizontal: 24, alignItems: 'center' }}>
        {lockedGroup && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 9999,
              backgroundColor: lockedGroup.accent + '22',
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 12 }}>{lockedGroup.icon}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper }}>
              Pick para {lockedGroup.name}
            </Text>
          </View>
        )}
        <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '800' }}>
          {match.round.toUpperCase()} · {match.kickoff.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 4, color: colors.paper }}>
          ¿Quién <Text style={{ color: colors.gold }}>gana</Text> hoy?
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Icon name="lock" size={12} color={colors.paper2} />
          <Text style={{ fontSize: 12, color: colors.paper2 }}>
            Se cierra al arranque
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {options.map((opt) => (
          <TeamPickButton
            key={opt.key}
            team={opt.team}
            side={opt.side}
            isSel={selected === opt.key}
            onPress={() => selectWithFeedback(opt.key)}
          />
        ))}

        {/* Draw option */}
        <DrawPickButton
          isSel={selected === 'DRAW'}
          onPress={() => selectWithFeedback('DRAW')}
        />

        {/* Groups this pick will count in */}
        {groups.length > 0 && (
          <View style={{ backgroundColor: colors.s800, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, flex: 1 }}>
                {isLockedToGroup ? 'CUENTA EN' : 'ELIGE EN QUÉ CIRCLS CUENTA'}
              </Text>
              {isLockedToGroup ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="lock" size={11} color={colors.mist} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist }}>FIJO</Text>
                </View>
              ) : null}
            </View>

            {groups.map((g) => {
              const existing  = existingPicks[g.id];
              const isOn      = selectedGroups.has(g.id);
              const disabled  = isLockedToGroup && g.id !== lockedGroupId;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => toggleGroup(g.id)}
                  disabled={isLockedToGroup}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 6,
                    opacity: disabled ? 0.4 : 1,
                  }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: g.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14 }}>{g.icon}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.paper }}>
                    {g.name}
                  </Text>
                  {existing ? (
                    <View style={{ backgroundColor: colors.green + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.green }}>✓ pick</Text>
                    </View>
                  ) : null}
                  {/* Checkbox / lock indicator */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      backgroundColor: isOn ? colors.gold : 'transparent',
                      borderWidth: isOn ? 0 : 1.5,
                      borderColor: 'rgba(255,255,255,0.22)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isOn ? <Icon name="check" size={14} color={colors.ink} stroke={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={{ fontSize: 11, color: colors.mist, textAlign: 'center', lineHeight: 17, marginTop: 4 }}>
          Puedes cambiar tu pick antes del arranque.{'\n'}
          Pick correcto: <Text style={{ color: colors.gold, fontWeight: '800' }}>+10 pts</Text>
          {' '}· Empate correcto:{' '}
          <Text style={{ color: colors.gold, fontWeight: '800' }}>+15 pts</Text>
        </Text>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 }}>
        <CButton
          variant="primary"
          size="lg"
          full
          lead={<Icon name={isLocked ? 'lock' : 'check'} size={20} color={colors.paper} />}
          onPress={handleConfirm}
          disabled={submitPick.isPending || groups.length === 0 || isLocked}
        >
          {isLocked
            ? (match?.status === 'live' ? 'El partido ya empezó' : 'Pick cerrado')
            : submitPick.isPending
            ? 'Guardando…'
            : groups.length === 0
            ? 'Únete a un grupo primero'
            : `Confirmar: ${confirmLabel}`}
        </CButton>
      </View>
    </ScreenContainer>
  );
}

// ─── Pick buttons with tactile feedback ──────────────────────
//
// Each button reacts to BOTH the press (instant tap-down scale 0.95) and
// to becoming selected (a brief overshoot punch). The two layers compose
// so a tap reads as: finger-down compress → release → selection punch.
//
// Animation breakdown:
//   • `pressScale` is driven by Pressable's onPressIn/onPressOut so the
//     button "depresses" only while the finger is on it.
//   • `selectScale` runs a sequence (1 → 1.06 → 1) once when isSel flips
//     from false → true, layering an "energy release" punch on top of the
//     press-out spring.

interface TeamPickButtonProps {
  team:    typeof LIGAMX[TeamCode];
  side:    string;
  isSel:   boolean;
  onPress: () => void;
}

function TeamPickButton({ team, side, isSel, onPress }: TeamPickButtonProps) {
  const pressScale  = useSharedValue(1);
  const selectScale = useSharedValue(1);

  // Run the selection "punch" each time isSel goes true.
  useEffect(() => {
    if (isSel) {
      selectScale.value = withSequence(
        withTiming(1.06, { duration: 130, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 10, stiffness: 220, mass: 0.6 }),
      );
    }
  }, [isSel, selectScale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * selectScale.value * (isSel ? 1.02 : 1) }],
  }));

  const border = team.secondary === '#FFFFFF' ? team.primary : team.secondary;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = withTiming(0.95, { duration: 90, easing: Easing.out(Easing.quad) });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 14, stiffness: 260, mass: 0.6 });
      }}
    >
      <Animated.View
        style={[
          {
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: isSel ? team.primary : colors.s800,
            borderWidth: 2,
            borderColor: isSel ? border : 'rgba(255,255,255,0.04)',
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          },
          animStyle,
        ]}
      >
        <TeamCrest team={team} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', opacity: 0.85, color: isSel ? team.text : colors.paper }}>
            {side}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: isSel ? team.text : colors.paper }}>
            {team.name}
          </Text>
        </View>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isSel ? colors.paper : 'transparent',
            borderWidth: isSel ? 0 : 2,
            borderColor: 'rgba(255,255,255,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSel ? (
            <Icon name="check" size={20} color={team.primary} stroke={3} />
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

interface DrawPickButtonProps {
  isSel:   boolean;
  onPress: () => void;
}

function DrawPickButton({ isSel, onPress }: DrawPickButtonProps) {
  const pressScale  = useSharedValue(1);
  const selectScale = useSharedValue(1);

  useEffect(() => {
    if (isSel) {
      selectScale.value = withSequence(
        withTiming(1.06, { duration: 130, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 10, stiffness: 220, mass: 0.6 }),
      );
    }
  }, [isSel, selectScale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * selectScale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = withTiming(0.95, { duration: 90, easing: Easing.out(Easing.quad) });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 14, stiffness: 260, mass: 0.6 });
      }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: isSel ? 'rgba(255,185,56,0.12)' : 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: isSel ? colors.gold : 'rgba(255,255,255,0.16)',
            borderStyle: 'dashed',
            borderRadius: 14,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          },
          animStyle,
        ]}
      >
        <Text style={{ color: colors.paper2, fontSize: 13, fontWeight: '700' }}>
          O pick de <Text style={{ color: colors.paper, fontWeight: '800' }}>empate</Text>
        </Text>
        <View style={{ backgroundColor: 'rgba(255,185,56,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.gold }}>+15 PTS</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
