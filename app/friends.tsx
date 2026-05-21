import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, TopBar, Section, CButton, Avatar, Icon, Text, colors } from '../src/components';
import { USERS } from '../src/data';

export default function FriendsList() {
  const router = useRouter();
  const all = [USERS.u1, USERS.u2, USERS.u3, USERS.u4, USERS.u5, USERS.u6];
  return (
    <ScreenContainer theme="dark">
      <TopBar title="Friends" big right={<Icon name="addUser" size={20} color={colors.paper} />} />

      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s800, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Icon name="search" size={18} color={colors.mist} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.mist }}>Search 12 friends</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Section title="REQUESTS · 2">
          <View style={{ gap: 8 }}>
            {[USERS.u7, USERS.u8].map((u) => (
              <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.s800, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
                <Avatar user={u} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper }}>{u.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.mist }}>{u.username} · wants to be friends</Text>
                </View>
                <CButton variant="soft" size="sm">Decline</CButton>
                <CButton variant="primary" size="sm">Accept</CButton>
              </View>
            ))}
          </View>
        </Section>

        <Section title="ALL FRIENDS · 12">
          <View>
            {all.map((u, i) => (
              <Pressable key={u.id} onPress={() => router.push('/public-profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: i < all.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                <View>
                  <Avatar user={u} size={40} />
                  {i < 2 ? <View style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.s900 }} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.paper }}>{u.name}</Text>
                  <Text style={{ fontSize: 11.5, color: colors.mist }}>{u.username} · {u.points} pts · {u.accuracy}%</Text>
                </View>
                <Icon name="chev" size={18} color={colors.mist} />
              </Pressable>
            ))}
          </View>
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}
