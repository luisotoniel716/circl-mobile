import { Pressable, View } from 'react-native';
import { Text, colors } from '../design-system';
import { useAccent } from '../lib/tweaks';
import { LIGAMX } from '../data';
import { Icon } from './Icon';
import { TeamCrest } from './TeamCrest';
import { MatchStatusBadge } from './MatchStatusBadge';
import type { Match } from '../types';

interface MatchRowProps {
  m: Match;
  onPress?: () => void;
  showPick?: boolean;
}

export function MatchRow({ m, onPress, showPick = true }: MatchRowProps) {
  const { accentColor } = useAccent();
  const h = LIGAMX[m.home];
  const a = LIGAMX[m.away];
  const minute = m.kickoff.includes('Live') ? m.kickoff.replace('Live · ', '') : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.s800,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 10,
        opacity: pressed && onPress ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <MatchStatusBadge status={m.status} minute={minute} />
        <Text style={{ fontSize: 11, color: colors.mist, fontWeight: '700' }}>{m.kickoff}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <TeamCrest team={h} size={36} />
          <View>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.paper }}>{h.name}</Text>
            <Text style={{ fontSize: 10.5, color: colors.mist, fontWeight: '700' }}>HOME</Text>
          </View>
        </View>

        {m.score ? (
          <Text
            style={{
              fontSize: 22,
              fontWeight: '900',
              color: m.status === 'live' ? colors.gold : colors.paper,
              paddingHorizontal: 14,
            }}
          >
            {m.score[0]} <Text style={{ color: colors.mist }}>:</Text> {m.score[1]}
          </Text>
        ) : (
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper2, paddingHorizontal: 14 }}>
            VS
          </Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.paper }}>{a.name}</Text>
            <Text style={{ fontSize: 10.5, color: colors.mist, fontWeight: '700' }}>AWAY</Text>
          </View>
          <TeamCrest team={a} size={36} />
        </View>
      </View>

      {showPick ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.05)',
            paddingTop: 10,
            marginTop: 2,
          }}
        >
          {m.status === 'upcoming' && (m.myPickGroupsPicked ?? 0) > 0 ? (() => {
            const picked = m.myPickGroupsPicked ?? 0;
            const total  = m.myPickGroupsTotal  ?? 0;
            // "Partial" when the user belongs to >1 groups but hasn't picked
            // in all of them yet. Surface this so they don't think they're
            // covered everywhere.
            const isPartial = total > 1 && picked > 0 && picked < total;
            // Picks are per-group: the prediction can differ between groups.
            // Show "varía por grupo" in that case instead of a single team.
            // When it doesn't vary, show the team name (or "Empate" for draw,
            // where myPick is null because a draw has no team).
            const pickText = m.myPickVaries
              ? 'varía por grupo'
              : m.myPick ? LIGAMX[m.myPick].name : 'Empate';
            return (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Icon
                    name="check"
                    size={14}
                    color={isPartial || m.myPickVaries ? colors.gold : colors.green}
                    stroke={2.6}
                  />
                  <Text style={{ fontSize: 12, color: colors.paper2 }} numberOfLines={1}>
                    Tu pick: <Text style={{ color: colors.paper, fontWeight: '800' }}>{pickText}</Text>
                    {isPartial ? (
                      <Text style={{ color: colors.gold, fontWeight: '800' }}>
                        {' '}· {picked}/{total} grupos
                      </Text>
                    ) : null}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.gold }}>
                  {isPartial ? 'Completar ›' : 'Cambiar ›'}
                </Text>
              </>
            );
          })() : null}

          {m.status === 'upcoming' && (m.myPickGroupsPicked ?? 0) === 0 ? (
            <>
              <Text style={{ fontSize: 12, color: colors.gold, fontWeight: '700' }}>⚡ Haz tu pick antes del inicio</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: accentColor }}>Hacer pick ›</Text>
            </>
          ) : null}

          {m.status === 'live' && (m.myPickGroupsPicked ?? 0) > 0 ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="lock" size={13} color={colors.mist} />
                <Text style={{ fontSize: 12, color: colors.paper2 }}>
                  Pick bloqueado: <Text style={{ color: colors.paper, fontWeight: '800' }}>
                    {m.myPickVaries ? 'varía por grupo' : m.myPick ? LIGAMX[m.myPick].name : 'Empate'}
                  </Text>
                </Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.red }}>● EN VIVO</Text>
            </>
          ) : null}

          {m.status === 'finished' ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name={m.correct ? 'check' : 'close'} size={14} color={m.correct ? colors.green : colors.red} stroke={2.6} />
                <Text style={{ fontSize: 12, color: m.correct ? colors.green : colors.red, fontWeight: '800' }}>
                  {m.correct ? 'Acertaste' : 'Falló'}
                </Text>
                {m.myPickVaries
                  ? <Text style={{ fontSize: 12, color: colors.paper2 }}> · varía por grupo</Text>
                  : m.myPick ? <Text style={{ fontSize: 12, color: colors.paper2 }}> · {LIGAMX[m.myPick].name}</Text> : null}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: m.correct ? colors.gold : colors.mist }}>
                {m.pts === '0' ? '+0' : m.pts} pts
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default MatchRow;
