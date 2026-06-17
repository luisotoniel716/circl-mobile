import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import Svg, {
  Circle, Path, Line, Rect, Text as SvgText, G, Polyline,
} from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, Icon, Text, colors, AnimatedNumber,
} from '../src/components';
import { LIGAMX } from '../src/data';
import type { TeamCode } from '../src/types';
import { useAccent } from '../src/lib/tweaks';
import { useMyDeepStats, useMyGroups, computeBadges } from '../src/lib/queries';
import type { Badge, MatchdaySummary, RecentPick } from '../src/lib/queries';

// ─── DonutChart ────────────────────────────────────────────────

// Reanimated-friendly version of the SVG Circle so we can animate its
// `strokeDashoffset` on the native side (no per-frame React renders).
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function DonutChart({
  percent, size = 180, stroke = 18, color = colors.gold,
  trackColor = 'rgba(255,255,255,0.08)',
  duration = 1100, delay = 0, replayKey,
}: {
  percent:     number;        // 0-100
  size?:       number;
  stroke?:     number;
  color?:      string;
  trackColor?: string;
  /** Total duration of the fill animation in ms. */
  duration?:   number;
  /** Delay before the animation starts. */
  delay?:      number;
  /**
   * Bump to force the donut to "redraw" from 0% even when `percent` is
   * unchanged — used for the focus-replay pattern in stats.
   */
  replayKey?:  string | number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.min(100, Math.max(0, percent)) / 100;

  // `progress` 0 → 1 drives the dash offset. Starting at 0 means the arc
  // is fully retracted (no fill); driving to `target` reveals the fraction.
  const progress = useSharedValue(0);

  useEffect(() => {
    // Reset to 0 on mount and every replay so the user always sees the
    // fill grow from the start.
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(target, { duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [target, duration, delay, replayKey, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.value),
  }));

  return (
    <Svg width={size} height={size}>
      <G originX={size / 2} originY={size / 2} rotation={-90}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
        />
      </G>
    </Svg>
  );
}

// ─── BarChart (matchday accuracy) ─────────────────────────────

function BarChart({
  data, height = 120, color = colors.gold,
}: {
  data: { label: string; value: number; max: number }[]; // value & max as % or raw, max used to scale
  height?: number;
  color?: string;
}) {
  const padding = { left: 24, right: 8, top: 6, bottom: 22 };
  const width = Math.max(120, data.length * 36);
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((d) => d.max));
  const barW = (width - padding.left - padding.right) / data.length - 6;

  return (
    <Svg width={width} height={height}>
      {/* baseline */}
      <Line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="rgba(255,255,255,0.10)"
        strokeWidth={1}
      />
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = padding.left + i * ((width - padding.left - padding.right) / data.length) + 3;
        const y = height - padding.bottom - h;
        return (
          <G key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(2, h)}
              rx={3}
              fill={color}
              opacity={0.85}
            />
            <SvgText
              x={x + barW / 2}
              y={height - 6}
              fill={colors.mist}
              fontSize={9}
              fontWeight="800"
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── LineChart (cumulative points) ────────────────────────────

function LineChart({
  data, height = 160, color = colors.gold,
}: {
  data: { x: number; y: number }[];      // y values
  height?: number;
  color?:  string;
}) {
  const padding = { left: 30, right: 12, top: 12, bottom: 22 };
  const width = Math.max(200, data.length * 40);
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxY = Math.max(1, ...data.map((d) => d.y));
  const minY = 0;
  const maxX = Math.max(1, ...data.map((d) => d.x));
  const minX = Math.min(0, ...data.map((d) => d.x));

  const sx = (x: number) =>
    padding.left + ((x - minX) / Math.max(1, maxX - minX)) * innerW;
  const sy = (y: number) =>
    padding.top + (1 - (y - minY) / Math.max(1, maxY - minY)) * innerH;

  const pointsStr = data.map((d) => `${sx(d.x)},${sy(d.y)}`).join(' ');

  // Area path (fill under line)
  const areaPath = data.length > 0
    ? `M ${sx(data[0].x)},${sy(0)} L ${pointsStr.replace(/ /g, ' L ')} L ${sx(data[data.length - 1].x)},${sy(0)} Z`
    : '';

  return (
    <Svg width={width} height={height}>
      {/* Y gridlines */}
      {[0, 0.5, 1].map((p, i) => {
        const y = padding.top + (1 - p) * innerH;
        return (
          <Line
            key={i}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        );
      })}

      {/* Area */}
      {data.length > 1 && (
        <Path d={areaPath} fill={color} opacity={0.12} />
      )}

      {/* Line */}
      {data.length > 1 && (
        <Polyline
          points={pointsStr}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Points + labels */}
      {data.map((d, i) => (
        <G key={i}>
          <Circle cx={sx(d.x)} cy={sy(d.y)} r={3.5} fill={color} />
          <SvgText
            x={sx(d.x)}
            y={height - 6}
            fill={colors.mist}
            fontSize={9}
            fontWeight="800"
            textAnchor="middle"
          >
            J{d.x}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

// ─── StackedBar (prediction breakdown) ─────────────────────────

function StackedBar({ home, draw, away }: { home: number; draw: number; away: number }) {
  const total = Math.max(1, home + draw + away);
  const hp = (home / total) * 100;
  const dp = (draw / total) * 100;
  const ap = (away / total) * 100;
  return (
    <View style={{ width: '100%' }}>
      <View style={{ flexDirection: 'row', height: 22, borderRadius: 8, overflow: 'hidden' }}>
        <View style={{ width: `${hp}%`, backgroundColor: colors.gold }} />
        <View style={{ width: `${dp}%`, backgroundColor: colors.paper2 }} />
        <View style={{ width: `${ap}%`, backgroundColor: colors.blueHi ?? '#5E8CFF' }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '800' }}>
          {Math.round(hp)}% LOCAL
        </Text>
        <Text style={{ fontSize: 11, color: colors.paper2, fontWeight: '800' }}>
          {Math.round(dp)}% EMPATE
        </Text>
        <Text style={{ fontSize: 11, color: colors.blueHi ?? '#5E8CFF', fontWeight: '800' }}>
          {Math.round(ap)}% VISITA
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────

export default function Stats() {
  const router = useRouter();
  const { accentColor } = useAccent();
  const { data: stats, isLoading } = useMyDeepStats();
  const { data: groups = [] } = useMyGroups();

  const bestRank = groups.length > 0
    ? Math.min(...groups.map((g) => g.myRank))
    : null;

  const badges = useMemo<Badge[]>(
    () => (stats ? computeBadges(stats, bestRank) : []),
    [stats, bestRank],
  );

  const [openBadge, setOpenBadge] = useState<Badge | null>(null);
  const [openMatchday, setOpenMatchday] = useState<MatchdaySummary | null>(null);

  // Bumps every time this screen gains focus, so the AnimatedNumber
  // instances replay their count-up from 0 even though they're already
  // mounted (Expo Router keeps the screen in memory between visits).
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusTick((t) => t + 1);
    }, []),
  );

  if (isLoading || !stats) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Estadísticas" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }

  const hasData = stats.totalPicks > 0;

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Estadísticas" onBack />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {!hasData ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Icon name="trophy" size={48} color={colors.mist} />
            <Text style={{ color: colors.paper, fontSize: 16, fontWeight: '800', marginTop: 12 }}>
              Aún no tienes picks
            </Text>
            <Text style={{ color: colors.paper2, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              Haz tu primer pick y empieza a ver tus estadísticas crecer.
            </Text>
          </View>
        ) : (
          <>
            {/* ── 1) HERO — Donut + lateral metrics ────────────── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
                  <DonutChart
                    percent={stats.accuracy}
                    color={accentColor}
                    duration={1100}
                    replayKey={focusTick}
                  />
                  <View style={{ position: 'absolute', alignItems: 'center' }}>
                    <AnimatedNumber
                      value={stats.accuracy}
                      duration={1100}
                      suffix="%"
                      replayKey={focusTick}
                      style={{ fontSize: 36, fontWeight: '900', color: colors.paper }}
                    />
                    <Text style={{ fontSize: 10, color: colors.mist, fontWeight: '800', marginTop: 2 }}>
                      ACCURACY
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 1, gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist }}>PUNTOS</Text>
                    <AnimatedNumber
                      value={stats.totalPoints}
                      duration={1100}
                      delay={120}
                      formatLocale
                      replayKey={focusTick}
                      style={{ fontSize: 20, fontWeight: '900', color: colors.gold }}
                    />
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist }}>ACIERTOS</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}>
                      <AnimatedNumber
                        value={stats.correctPicks}
                        duration={1000}
                        delay={220}
                        replayKey={focusTick}
                        style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}
                      />
                      /
                      <AnimatedNumber
                        value={stats.totalPicks}
                        duration={1000}
                        delay={220}
                        replayKey={focusTick}
                        style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}
                      />
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist }}>RACHA ACTUAL</Text>
                    <Text
                      style={{
                        fontSize: 20, fontWeight: '900',
                        color: stats.currentStreak > 0 ? colors.red : colors.mist,
                      }}
                    >
                      🔥{' '}
                      <AnimatedNumber
                        value={stats.currentStreak}
                        duration={900}
                        delay={320}
                        replayKey={focusTick}
                        style={{
                          fontSize: 20, fontWeight: '900',
                          color: stats.currentStreak > 0 ? colors.red : colors.mist,
                        }}
                      />
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 2) STREAK / RECENT DOTS ─────────────────────── */}
            <SectionCard title="ÚLTIMOS 20 PICKS" subtitle={stats.currentStreak > 0
              ? `🔥 En racha de ${stats.currentStreak} aciertos`
              : stats.streakBroken ? 'Racha rota' : 'Esperando resultados'}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(stats.recent.length === 0
                  ? Array.from({ length: 20 }).map(() => null)
                  : stats.recent.slice().reverse()
                ).map((p, i) => <RecentDot key={i} pick={p as RecentPick | null} />)}
              </View>
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, justifyContent: 'center' }}>
                <DotLegend color={colors.green} label="Correcto" />
                <DotLegend color={colors.red} label="Fallado" />
                <DotLegend color="rgba(255,255,255,0.10)" label="Pendiente" />
              </View>
              <View style={{
                marginTop: 14,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.06)',
                flexDirection: 'row',
                justifyContent: 'space-around',
              }}>
                <SmallStat label="MEJOR RACHA"  value={`🔥 ${stats.bestStreak}`} />
                <SmallStat label="MEJOR JORNADA" value={stats.bestMatchday ? `+${stats.bestMatchday.points}` : '—'} />
              </View>
            </SectionCard>

            {/* ── 3) EVOLUCIÓN — line chart ────────────────────── */}
            {stats.matchdays.length >= 2 && (
              <SectionCard title="EVOLUCIÓN" subtitle="Puntos acumulados por jornada">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={stats.matchdays.map((m) => ({ x: m.matchday, y: m.cumulative }))}
                    color={accentColor}
                  />
                </ScrollView>
              </SectionCard>
            )}

            {/* ── 4) PATRONES ─────────────────────────────────── */}
            <SectionCard title="TUS PATRONES" subtitle="Cómo predices y qué te funciona">
              {/* Stacked bar — predicción */}
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, marginBottom: 8 }}>
                CÓMO PICAS (PARTIDOS FINALIZADOS)
              </Text>
              <StackedBar
                home={stats.predictionBreakdown.home}
                draw={stats.predictionBreakdown.draw}
                away={stats.predictionBreakdown.away}
              />

              {/* Accuracy por jornada */}
              {stats.matchdays.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, marginBottom: 8 }}>
                    ACCURACY POR JORNADA
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={stats.matchdays.map((m) => ({
                        label: `J${m.matchday}`,
                        value: m.picks > 0 ? Math.round((m.correct / m.picks) * 100) : 0,
                        max: 100,
                      }))}
                      color={accentColor}
                    />
                  </ScrollView>
                </View>
              )}

              {/* Top teams */}
              {stats.topTeams.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, marginBottom: 8 }}>
                    EQUIPOS QUE MÁS PICAS
                  </Text>
                  <View style={{ gap: 8 }}>
                    {stats.topTeams.map((t) => {
                      const team = LIGAMX[t.code as TeamCode];
                      const acc = t.picks > 0 ? Math.round((t.correct / t.picks) * 100) : 0;
                      return (
                        <View key={t.code} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{
                            width: 28, height: 28, borderRadius: 8,
                            backgroundColor: team?.primary ?? colors.s700,
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Text style={{
                              color: team?.text ?? colors.paper,
                              fontSize: 11,
                              fontWeight: '900',
                            }}>{t.code}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper }}>
                              {team?.name ?? t.name}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.mist }}>
                              {t.picks} picks · {t.correct} correctos
                            </Text>
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: acc >= 60 ? colors.green : acc >= 40 ? colors.gold : colors.red }}>
                            {acc}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </SectionCard>

            {/* ── 5) INSIGNIAS ─────────────────────────────────── */}
            <SectionCard
              title="INSIGNIAS"
              subtitle={`${badges.filter((b) => b.unlocked).length} de ${badges.length} desbloqueadas`}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {badges.map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => setOpenBadge(b)}
                    style={{
                      width: '31.5%',
                      aspectRatio: 1,
                      borderRadius: 14,
                      backgroundColor: b.unlocked ? colors.gold + '18' : 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: b.unlocked ? colors.gold + '55' : 'rgba(255,255,255,0.06)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 8,
                    }}
                  >
                    <Text style={{ fontSize: 32, opacity: b.unlocked ? 1 : 0.35 }}>{b.emoji}</Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: b.unlocked ? colors.paper : colors.mist,
                        marginTop: 4,
                      }}
                    >
                      {b.name}
                    </Text>
                    {!b.unlocked && (
                      <View style={{ position: 'absolute', top: 6, right: 6 }}>
                        <Icon name="lock" size={10} color={colors.mist} />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </SectionCard>

            {/* ── 6) RÉCORDS ─────────────────────────────────── */}
            <SectionCard title="RÉCORDS">
              <View style={{ gap: 6 }}>
                <RecordRow
                  icon="trophy"
                  label="Mejor jornada"
                  value={stats.bestMatchday ? `+${stats.bestMatchday.points} pts · J${stats.bestMatchday.matchday}` : '—'}
                  onPress={stats.bestMatchday ? () => setOpenMatchday(stats.bestMatchday!) : undefined}
                />
                <RecordRow
                  icon="trend"
                  label="Mejor rank alcanzado"
                  value={bestRank ? `#${bestRank}` : 'Sin grupos'}
                />
                <RecordRow
                  icon="fire"
                  label="Racha más larga"
                  value={`🔥 ${stats.bestStreak}`}
                />
                <RecordRow
                  icon="check"
                  label="Jornadas perfectas"
                  valueNode={
                    <AnimatedNumber
                      value={stats.perfectMatchdays}
                      duration={900}
                      delay={420}
                      replayKey={focusTick}
                      style={{ fontSize: 13, fontWeight: '900', color: colors.paper }}
                    />
                  }
                />
                <RecordRow
                  icon="flag"
                  label="Total picks"
                  valueNode={
                    <AnimatedNumber
                      value={stats.totalPicks}
                      duration={1000}
                      delay={500}
                      formatLocale
                      replayKey={focusTick}
                      style={{ fontSize: 13, fontWeight: '900', color: colors.paper }}
                    />
                  }
                />
              </View>
            </SectionCard>
          </>
        )}
      </ScrollView>

      {/* Badge detail modal */}
      <Modal visible={!!openBadge} transparent animationType="fade" onRequestClose={() => setOpenBadge(null)}>
        <Pressable
          onPress={() => setOpenBadge(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 32 }}
        >
          <View
            style={{
              backgroundColor: colors.s900,
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
              maxWidth: 340,
              width: '100%',
              borderWidth: 1,
              borderColor: openBadge?.unlocked ? colors.gold : 'rgba(255,255,255,0.08)',
            }}
          >
            {openBadge && (
              <>
                <LinearGradient
                  colors={openBadge.unlocked ? [colors.gold, '#A87A00'] : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)']}
                  style={{
                    width: 96, height: 96, borderRadius: 48,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 48, opacity: openBadge.unlocked ? 1 : 0.45 }}>{openBadge.emoji}</Text>
                </LinearGradient>
                <Text style={{ fontSize: 19, fontWeight: '900', color: colors.paper, marginTop: 16 }}>
                  {openBadge.name}
                </Text>
                <Text style={{ fontSize: 13, color: colors.paper2, textAlign: 'center', marginTop: 6 }}>
                  {openBadge.description}
                </Text>

                {/* Progress bar */}
                <View style={{
                  width: '100%',
                  height: 10,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 5,
                  marginTop: 18,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    width: `${Math.round(openBadge.progress * 100)}%`,
                    height: '100%',
                    backgroundColor: openBadge.unlocked ? colors.gold : accentColor,
                  }} />
                </View>
                <Text style={{ fontSize: 11, color: colors.mist, marginTop: 8, fontWeight: '800' }}>
                  {openBadge.progressLabel}
                </Text>

                {openBadge.unlocked && (
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.gold, marginTop: 12 }}>
                    ¡DESBLOQUEADA!
                  </Text>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Matchday detail modal */}
      <Modal visible={!!openMatchday} transparent animationType="fade" onRequestClose={() => setOpenMatchday(null)}>
        <Pressable
          onPress={() => setOpenMatchday(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 32 }}
        >
          <View style={{
            backgroundColor: colors.s900,
            borderRadius: 16,
            padding: 20,
            width: '100%',
            maxWidth: 320,
          }}>
            {openMatchday && (
              <>
                <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '800' }}>JORNADA {openMatchday.matchday}</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: colors.paper, marginTop: 4 }}>
                  +{openMatchday.points} pts
                </Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                  <SmallStat label="ACIERTOS" value={`${openMatchday.correct}/${openMatchday.picks}`} />
                  <SmallStat label="ACCURACY" value={`${Math.round((openMatchday.correct / Math.max(1, openMatchday.picks)) * 100)}%`} />
                  <SmallStat label="ACUMUL." value={`${openMatchday.cumulative}`} />
                </View>
                {openMatchday.perfect && (
                  <Text style={{ marginTop: 14, fontSize: 13, fontWeight: '800', color: colors.gold }}>
                    💯 ¡Jornada perfecta!
                  </Text>
                )}
                <Pressable onPress={() => setOpenMatchday(null)} style={{ marginTop: 16, alignSelf: 'center' }}>
                  <Text style={{ color: accentColor, fontWeight: '800', fontSize: 14 }}>Cerrar</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Silence unused router warning if no actions need it */}
      {router && null}
    </ScreenContainer>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function SectionCard({
  title, subtitle, children,
}: {
  title:    string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.paper2 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontSize: 11, color: colors.mist, marginTop: 2 }}>{subtitle}</Text>
      ) : null}
      <View style={{
        backgroundColor: colors.s800,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
        marginTop: 10,
      }}>
        {children}
      </View>
    </View>
  );
}

function SideStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View>
      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: '900', color }}>{value}</Text>
    </View>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '900', color: colors.paper }}>{value}</Text>
      <Text style={{ fontSize: 9, fontWeight: '800', color: colors.mist, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function DotLegend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 10, color: colors.mist, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function RecentDot({ pick }: { pick: RecentPick | null }) {
  const size = 16;
  const color = !pick
    ? 'rgba(255,255,255,0.10)'
    : pick.correct === null
    ? 'rgba(255,255,255,0.18)'
    : pick.correct
    ? colors.green
    : colors.red;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

function RecordRow({
  icon, label, value, valueNode, onPress,
}: {
  icon:       React.ComponentProps<typeof Icon>['name'];
  label:      string;
  /** Use either `value` (plain text) OR `valueNode` (e.g. <AnimatedNumber />). */
  value?:     string;
  valueNode?: React.ReactNode;
  onPress?:   () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
      }}
    >
      <View style={{
        width: 30, height: 30, borderRadius: 9,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={14} color={colors.paper2} />
      </View>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.paper }}>{label}</Text>
      {valueNode ?? (
        <Text style={{ fontSize: 13, fontWeight: '900', color: colors.paper }}>{value}</Text>
      )}
      {onPress && <Icon name="chev" size={14} color={colors.mist} />}
    </Pressable>
  );
}
