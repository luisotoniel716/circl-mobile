import { View, ScrollView, Pressable } from 'react-native';
import { ScreenContainer, TopBar, Section, Avatar, Pill, Icon, Text, colors } from '../../../src/components';
import { USERS } from '../../../src/data';
import type { User } from '../../../src/types';

type Role = 'owner' | 'admin' | 'member';

export default function GroupMembers() {
  return (
    <ScreenContainer theme="dark">
      <TopBar title="Members" onBack right={<Icon name="addUser" size={20} color={colors.paper} />} />

      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s800, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Icon name="search" size={18} color={colors.mist} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.mist }}>Search members</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Section title="OWNER">
          <MemberRow u={USERS.me} role="owner" me />
        </Section>
        <Section title="ADMINS (1)">
          <MemberRow u={USERS.u1} role="admin" />
        </Section>
        <Section title="MEMBERS (6)">
          {[USERS.u2, USERS.u3, USERS.u4, USERS.u5, USERS.u6, USERS.u7].map((u) => (
            <MemberRow key={u.id} u={u} role="member" canRemove />
          ))}
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}

function MemberRow({ u, role, me, canRemove }: { u: User; role: Role; me?: boolean; canRemove?: boolean }) {
  const tint = role === 'owner' ? colors.gold : role === 'admin' ? colors.blue : colors.mist;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
      <Avatar user={u} size={40} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>{me ? 'You' : u.name}</Text>
          {me ? <Pill tone="ghost" size="sm">YOU</Pill> : null}
        </View>
        <Text style={{ fontSize: 11.5, color: colors.mist }}>{u.username}</Text>
      </View>
      <View style={{ backgroundColor: tint + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: tint, textTransform: 'uppercase' }}>{role}</Text>
      </View>
      {canRemove ? (
        <Pressable hitSlop={8} style={{ padding: 6 }}>
          <Icon name="close" size={18} color={colors.mist} />
        </Pressable>
      ) : null}
    </View>
  );
}
