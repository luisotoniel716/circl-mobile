import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer, TopBar, CButton, TeamCrest, Icon, Text, colors } from '../../src/components';
import { MATCHES, LIGAMX } from '../../src/data';
import type { TeamCode } from '../../src/types';

export default function MakePick() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const m = MATCHES.find((x) => x.id === id) ?? MATCHES[0];
  const h = LIGAMX[m.home];
  const a = LIGAMX[m.away];
  const [selected, setSelected] = useState<TeamCode | 'DRAW'>(m.myPick ?? m.home);

  const options = [
    { team: h, side: 'HOME', key: m.home },
    { team: a, side: 'AWAY', key: m.away },
  ];

  const confirmLabel = selected === 'DRAW' ? 'Draw' : LIGAMX[selected].name;

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Your pick" onBack right={<Text onPress={() => router.back()} style={{ color: colors.paper2, fontSize: 12, fontWeight: '700' }}>Skip</Text>} />

      <View style={{ paddingHorizontal: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '800' }}>JORNADA 14 · {m.stadium.toUpperCase()}</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 4, color: colors.paper }}>
          Who&apos;s winning <Text style={{ color: colors.gold }}>tonight</Text>?
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Icon name="lock" size={12} color={colors.paper2} />
          <Text style={{ fontSize: 12, color: colors.paper2 }}>Locks at 21:00 · 6h 14m</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, gap: 14 }} showsVerticalScrollIndicator={false}>
        {options.map((opt) => {
          const isSel = selected === opt.key;
          const border = opt.team.secondary === '#FFFFFF' ? opt.team.primary : opt.team.secondary;
          return (
            <Pressable key={opt.key} onPress={() => setSelected(opt.key)}>
              <View
                style={{
                  borderRadius: 22,
                  overflow: 'hidden',
                  backgroundColor: isSel ? opt.team.primary : colors.s800,
                  borderWidth: 2,
                  borderColor: isSel ? border : 'rgba(255,255,255,0.04)',
                  padding: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  transform: [{ scale: isSel ? 1.02 : 1 }],
                }}
              >
                <TeamCrest team={opt.team} size={64} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', opacity: 0.85, color: isSel ? opt.team.text : colors.paper }}>{opt.side}</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: isSel ? opt.team.text : colors.paper }}>{opt.team.name}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', opacity: 0.85, marginTop: 2, color: isSel ? opt.team.text : colors.paper }}>Form: W W L W D</Text>
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
                  {isSel ? <Icon name="check" size={20} color={opt.team.primary} stroke={3} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}

        <Pressable onPress={() => setSelected('DRAW')}>
          <View
            style={{
              backgroundColor: selected === 'DRAW' ? 'rgba(255,185,56,0.12)' : 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: selected === 'DRAW' ? colors.gold : 'rgba(255,255,255,0.16)',
              borderStyle: 'dashed',
              borderRadius: 14,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ color: colors.paper2, fontSize: 13, fontWeight: '700' }}>
              Or pick a <Text style={{ color: colors.paper, fontWeight: '800' }}>draw</Text>
            </Text>
            <View style={{ backgroundColor: 'rgba(255,185,56,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.gold }}>+15 PTS</Text>
            </View>
          </View>
        </Pressable>

        <Text style={{ fontSize: 11, color: colors.mist, textAlign: 'center', lineHeight: 17, marginTop: 4 }}>
          You can change your pick anytime before kickoff.{'\n'}
          Correct pick: <Text style={{ color: colors.gold, fontWeight: '800' }}>+10 pts</Text> · Exact score:{' '}
          <Text style={{ color: colors.gold, fontWeight: '800' }}>+25</Text>
        </Text>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 }}>
        <CButton variant="primary" size="lg" full lead={<Icon name="check" size={20} color={colors.paper} />} onPress={() => router.push({ pathname: '/pick/[id]/confirmed', params: { id: m.id } })}>
          Confirm pick: {confirmLabel}
        </CButton>
      </View>
    </ScreenContainer>
  );
}
