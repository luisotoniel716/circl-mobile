import { useEffect, useState } from 'react';
import { View, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withRepeat, withDelay, withSequence, Easing,
} from 'react-native-reanimated';
import { Text, colors } from '../design-system';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

// ─── Public types ───────────────────────────────────────────
//
// Each orbit member shows the avatar of someone joining the new group
// (the host first, then the invited friends). The "Game on!" reveal
// runs only after the group has actually been created in Supabase —
// the `ready` prop gates the orbit phase.

export interface OrbitMember {
  id:         string;
  name:       string | null;
  avatarUrl?: string | null;
}

interface Props {
  visible:        boolean;
  ready:          boolean;        // true once the network call resolved successfully
  host:           OrbitMember;    // current user
  friends:        OrbitMember[];  // selected invitees
  icon:           string;         // group emoji (shown at center)
  accent:         string;         // group accent (rings + center bg)
  /**
   * Fires when the user taps the explicit "Ir al grupo" button.
   * Caller should navigate to the newly-created group's detail screen.
   */
  onGoToGroup:    () => void;
  /**
   * Fires when the user taps anywhere on the overlay's empty space.
   * Caller should navigate to the groups list — the implicit "I'll
   * look at it later" exit.
   */
  onTapAnywhere:  () => void;
}

// ─── Constants ──────────────────────────────────────────────
//
// Sized so the full orbit + label fits comfortably on small screens
// (≥360 dp width). Avatars sit on a circle of `ORBIT_R` from the
// center target.

const SCREEN_W   = Dimensions.get('window').width;
const ORBIT_R    = Math.min(SCREEN_W * 0.32, 130);   // orbit radius
const TARGET     = 64;                                // central icon size
const AVATAR     = 44;                                // orbit avatar size
const RIPPLE_MAX = 200;                               // ripple ring final size

// ─── Component ──────────────────────────────────────────────

export function CreateGroupSuccess({
  visible, ready, host, friends, icon, accent, onGoToGroup, onTapAnywhere,
}: Props) {
  const members = [host, ...friends];

  // Phase machine:
  // - 'ripple': sonar rings pulse, target + label visible
  // - 'orbit':  avatars fly outward and snap onto the orbit ring
  // - 'cheer':  "Game on!" reveal text
  type Phase = 'ripple' | 'orbit' | 'cheer';
  const [phase, setPhase] = useState<Phase>('ripple');

  // Reset whenever overlay reopens.
  useEffect(() => {
    if (visible) setPhase('ripple');
  }, [visible]);

  // Once the server confirms, give the ripples a short floor (so the
  // overlay isn't a flash) and then advance to the orbit phase.
  useEffect(() => {
    if (!visible) return;
    if (ready && phase === 'ripple') {
      const t = setTimeout(() => setPhase('orbit'), 700);
      return () => clearTimeout(t);
    }
  }, [visible, ready, phase]);

  // Orbit phase: after the last avatar has snapped + a small breath,
  // reveal "Game on!". We DON'T schedule the auto-dismiss here — that
  // lives in its own effect tied to the 'cheer' phase. Previously both
  // timers lived in this effect; when the first timer ran setPhase('cheer'),
  // the effect re-ran and the cleanup cancelled the still-pending
  // onDone() timer, trapping the user on the "Game on!" screen.
  useEffect(() => {
    if (phase !== 'orbit') return;
    const lastAvatarDelay = (members.length - 1) * 130; // sequential spawn
    const settleMs        = 520;                         // spring settle budget
    const cheerAt         = lastAvatarDelay + settleMs;

    const t = setTimeout(() => setPhase('cheer'), cheerAt);
    return () => clearTimeout(t);
    // members.length is intentionally stable per show
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Cheer phase: previously auto-dismissed after 1.6s. We removed the
  // timer so users can dwell on the reveal — the "Ir al grupo" button
  // and the tap-anywhere surface below are now the only ways to leave.
  // The user explicitly asked for this so the moment doesn't disappear
  // before they've had a chance to enjoy it.

  if (!visible) return null;

  // Tappable area becomes active once we hit the cheer phase — letting
  // users tap anywhere to go straight to the new group. During the
  // ripple/orbit phases we keep it inert so accidental taps don't skip
  // the reveal animation.
  const canDismiss = phase === 'cheer';

  return (
    <Pressable
      onPress={canDismiss ? onTapAnywhere : undefined}
      // Tapping the outer surface (anywhere outside the button) is the
      // implicit "ver la lista de grupos" exit. The inner button has
      // its own handler that navigates to the new group instead.
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(5,6,12,0.97)',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* ── Orbit stage ────────────────────────────────────── */}
      {/* Square container centered on the screen. Everything inside
          positions itself relative to this center via translateX/Y. */}
      <View
        style={{
          width: ORBIT_R * 2 + AVATAR + 16,
          height: ORBIT_R * 2 + AVATAR + 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Sonar rings — keep pulsing during ripple AND while avatars
            settle, then ease out. Reads as "the network is listening". */}
        <SonarRing accent={accent} delay={0}    fading={phase === 'cheer'} />
        <SonarRing accent={accent} delay={550}  fading={phase === 'cheer'} />
        <SonarRing accent={accent} delay={1100} fading={phase === 'cheer'} />

        {/* Dashed orbit guide — fades in when avatars start moving so
            the trajectory reads as a deliberate ring rather than chaos. */}
        <OrbitGuide visible={phase !== 'ripple'} radius={ORBIT_R} />

        {/* Center target — the group's icon as the anchor. Pops in with a
            small spring at mount. */}
        <CenterTarget icon={icon} accent={accent} />

        {/* Orbit avatars — only mounted when entering the orbit phase so
            their entering animation lines up with the phase change. */}
        {phase !== 'ripple' && members.map((m, i) => {
          const angle = (i / members.length) * Math.PI * 2 - Math.PI / 2; // start at top
          return (
            <OrbitAvatar
              key={m.id}
              index={i}
              member={m}
              accent={accent}
              targetX={Math.cos(angle) * ORBIT_R}
              targetY={Math.sin(angle) * ORBIT_R}
            />
          );
        })}
      </View>

      {/* ── Reveal text ────────────────────────────────────── */}
      <View style={{ position: 'absolute', bottom: '18%', alignItems: 'center' }}>
        <RevealLabel
          show={phase === 'cheer'}
          accent={accent}
          memberCount={members.length}
        />
      </View>

      {/* ── Explicit "go to group" CTA + tap-anywhere hint ──── */}
      {/* Sits below the reveal label and only shows during the cheer
          phase. Even though the overlay also auto-dismisses after 1.6s
          and the entire surface is tappable, an explicit button makes
          the next action obvious for users who'd otherwise feel stuck. */}
      <View style={{ position: 'absolute', bottom: '6%', alignItems: 'center' }}>
        <GoToGroupCTA show={phase === 'cheer'} accent={accent} onPress={onGoToGroup} />
      </View>
    </Pressable>
  );
}

// ─── Sonar ring ─────────────────────────────────────────────

function SonarRing({ accent, delay, fading }: { accent: string; delay: number; fading: boolean }) {
  const scale = useSharedValue(0);
  const op    = useSharedValue(0);

  useEffect(() => {
    // Repeats forever — runtime stops when component unmounts (overlay close).
    scale.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }), -1, false),
    );
    op.value = withDelay(
      delay,
      withRepeat(withTiming(0, { duration: 1800, easing: Easing.out(Easing.cubic) }), -1, false),
    );
    // Kick the opacity up so the first frame isn't blank.
    op.value = withTiming(0.55, { duration: 50 });
  }, [delay, scale, op]);

  // When the cheer phase starts we fade the rings out so the orbit reads
  // clean while "Game on!" is on screen.
  useEffect(() => {
    if (fading) {
      op.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    }
  }, [fading, op]);

  const style = useAnimatedStyle(() => ({
    position:   'absolute',
    width:      RIPPLE_MAX,
    height:     RIPPLE_MAX,
    borderRadius: RIPPLE_MAX / 2,
    borderWidth: 1.5,
    borderColor: accent,
    opacity:     op.value * 0.55,
    transform:   [{ scale: 0.3 + scale.value * 1.1 }],
  }));

  return <Animated.View style={style} pointerEvents="none" />;
}

// ─── Dashed orbit guide ────────────────────────────────────

function OrbitGuide({ visible, radius }: { visible: boolean; radius: number }) {
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withTiming(visible ? 0.22 : 0, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [visible, op]);
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width:  radius * 2,
    height: radius * 2,
    borderRadius: radius,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.paper,
    opacity: op.value,
  }));
  return <Animated.View pointerEvents="none" style={style} />;
}

// ─── Center target ─────────────────────────────────────────

function CenterTarget({ icon, accent }: { icon: string; accent: string }) {
  const scale = useSharedValue(0.4);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180, mass: 0.7 });
  }, [scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      style={[
        {
          width: TARGET,
          height: TARGET,
          borderRadius: TARGET / 2,
          backgroundColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
          // Glow under the target sells the "premium" feel.
          shadowColor: accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 24,
          elevation: 12,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 30 }}>{icon}</Text>
    </Animated.View>
  );
}

// ─── Orbit avatar ──────────────────────────────────────────
//
// Each invitee spawns at the center (scale 0), then springs outward to
// its angular position on the orbit. A tiny "lock" badge taps in once
// the avatar has settled — reinforces the "added to the circle" feeling.

function OrbitAvatar({
  index, member, accent, targetX, targetY,
}: {
  index:   number;
  member:  OrbitMember;
  accent:  string;
  targetX: number;
  targetY: number;
}) {
  const tx    = useSharedValue(0);
  const ty    = useSharedValue(0);
  const scale = useSharedValue(0);
  const badge = useSharedValue(0);

  useEffect(() => {
    const delay = index * 130;

    // Fly out + scale up with a small overshoot (reads as a satisfying snap).
    tx.value = withDelay(delay, withSpring(targetX, { damping: 16, stiffness: 130, mass: 0.9 }));
    ty.value = withDelay(delay, withSpring(targetY, { damping: 16, stiffness: 130, mass: 0.9 }));
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 360, easing: Easing.out(Easing.back(1.4)) }),
      ),
    );

    // Lock badge taps in after the avatar has landed.
    badge.value = withDelay(delay + 380, withSpring(1, { damping: 11, stiffness: 240, mass: 0.5 }));
  }, [index, targetX, targetY, tx, ty, scale, badge]);

  const wrapStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badge.value }],
    opacity: badge.value,
  }));

  return (
    <Animated.View style={wrapStyle}>
      <View
        style={{
          // White ring so avatars read as distinct from the dark backdrop.
          borderWidth: 2,
          borderColor: colors.paper,
          borderRadius: AVATAR / 2 + 2,
        }}
      >
        <Avatar
          initials={initialsOf(member.name)}
          size={AVATAR}
          bg={accent}
          imageUrl={member.avatarUrl}
        />
      </View>
      <Animated.View
        style={[
          {
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: accent,
            borderWidth: 2,
            borderColor: '#05060C',
            alignItems: 'center',
            justifyContent: 'center',
          },
          badgeStyle,
        ]}
      >
        <Icon name="check" size={8} color={colors.paper} stroke={3.5} />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Reveal text "Game on!" ────────────────────────────────

function RevealLabel({ show, accent, memberCount }: { show: boolean; accent: string; memberCount: number }) {
  const op = useSharedValue(0);
  const ty = useSharedValue(14);
  useEffect(() => {
    if (show) {
      op.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
      ty.value = withSpring(0, { damping: 14, stiffness: 180, mass: 0.6 });
    }
  }, [show, op, ty]);
  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));
  return (
    <Animated.View style={[{ alignItems: 'center' }, style]}>
      <Text style={{ fontSize: 32, fontWeight: '900', color: colors.paper, letterSpacing: 0.3 }}>
        Game on!
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: accent, marginTop: 6, letterSpacing: 0.4 }}>
        {memberCount === 1
          ? 'TU CIRCL ESTÁ LISTO'
          : `${memberCount} EN EL CÍRCULO`}
      </Text>
    </Animated.View>
  );
}

// ─── "Ir al grupo" CTA + tap-anywhere hint ─────────────────

function GoToGroupCTA({ show, accent, onPress }: { show: boolean; accent: string; onPress: () => void }) {
  const op = useSharedValue(0);
  const ty = useSharedValue(10);
  useEffect(() => {
    if (show) {
      // Delay the button slightly after the headline so the eye lands
      // on "Game on!" first, then on the action.
      op.value = withDelay(180, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
      ty.value = withDelay(180, withSpring(0, { damping: 14, stiffness: 180, mass: 0.6 }));
    }
  }, [show, op, ty]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={[{ alignItems: 'center', gap: 10 }, wrapStyle]}>
      <Pressable
        onPress={onPress}
        // Tappable via parent Pressable too — this is the explicit, styled
        // entry point. `pointerEvents` defaults to 'auto'; we stop event
        // propagation by handling here so the parent's onPress fires too
        // (both call the same callback, no harm if both fire).
        style={({ pressed }) => ({
          paddingHorizontal: 22,
          paddingVertical: 12,
          borderRadius: 9999,
          backgroundColor: accent,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          opacity: pressed ? 0.85 : 1,
          shadowColor: accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 16,
          elevation: 8,
        })}
      >
        <Text style={{ fontSize: 14, fontWeight: '900', color: colors.paper, letterSpacing: 0.3 }}>
          Ir al grupo
        </Text>
        <Icon name="forward" size={14} color={colors.paper} stroke={3} />
      </Pressable>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.paper, opacity: 0.55, letterSpacing: 0.4 }}>
        TOCA AFUERA PARA VER TODOS
      </Text>
    </Animated.View>
  );
}

// ─── helpers ────────────────────────────────────────────────

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default CreateGroupSuccess;
