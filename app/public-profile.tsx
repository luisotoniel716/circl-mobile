import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, TopBar, Section, CButton, Avatar, Icon, Text, colors } from '../src/components';
import { USERS, GROUPS } from '../src/data';

const FORM = [
  { r: '✓', c: colors.green }, { r: '✓', c: colors.green }, { r: '✗', c: colors.red },
  { r: '✓', c: colors.green }, { r: '–', c: colors.mist }, { r: '✓', c: colors.green },
  { r: '✓', c: colors.green }, { r: '✗', c: colors.red },
];

export default function PublicProfile() {
  const router = useRouter();
  const u = USERS.u1;
  const stats = [
    { v: u.points, l: 'POINTS', tint: colors.gold },
    { v: `${u.accuracy}%`, l: 'ACCURACY' },
    { v: '#1', l: 'BEST RANK', tint: colors.gold },
  ];
  return (
    <ScreenContainer theme="dark">
      <TopBar title="" onBack right={<Icon name="chevDown" size={20} color={colors.paper} />} />

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 }}>
          <Avatar user={u} size={92} ring />
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.paper, marginTop: 14 }}>{u.name}</Text>
          <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 2 }}>{u.username}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <CButton variant="primary" size="md" lead={<Icon name="addUser" size={16} color={colors.paper} />}>Add friend</CButton>
            <CButton variant="ghostDark" size="md" lead={<Icon name="chat" size={16} color={colors.paper} />}>Message</CButton>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {stats.map((s, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: colors.s800, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: s.tint ?? colors.paper }}>{s.v}</Text>
                <Text style={{ fontSize: 9.5, color: colors.mist, fontWeight: '800', marginTop: 3 }}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>

        <Section title="SHARED GROUPS · 3">
          <View style={{ gap: 8 }}>
            {GROUPS.slice(0, 3).map((g) => (
              <Pressable key={g.id} onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.s800, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: g.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{g.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.paper }}>{g.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.mist }}>{u.name.split(' ')[0]} is #2 · You: #{g.myRank}</Text>
                </View>
                <Icon name="chev" size={16} color={colors.mist} />
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="RECENT FORM">
          <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            {FORM.map((x, i) => (
              <View key={i} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: x.c + '33', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: x.c, fontWeight: '900', fontSize: 13 }}>{x.r}</Text>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}
