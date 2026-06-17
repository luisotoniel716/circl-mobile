import { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, Section, Avatar, Pill, Icon, Text, colors,
} from '../../../src/components';
import { useAuth } from '../../../src/lib/auth';
import { useGroup, useGroupMembers, type GroupMember } from '../../../src/lib/queries';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function GroupMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: group } = useGroup(id);
  const { data: members = [], isLoading } = useGroupMembers(id);
  const [, setQ] = useState(''); // search reserved for later

  const { admins, regular } = useMemo(() => {
    return {
      admins:  members.filter((m) => m.role === 'admin'),
      regular: members.filter((m) => m.role === 'member'),
    };
  }, [members]);

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Members" onBack />

      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s800, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Icon name="search" size={18} color={colors.mist} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.mist }}>Search members</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {admins.length > 0 ? (
            <Section title={`ADMINS (${admins.length})`}>
              {admins.map((m) => (
                <MemberRow
                  key={m.user_id}
                  m={m}
                  me={m.user_id === user?.id}
                  groupAccent={group?.accent ?? colors.s700}
                  onPress={() => {
                    // Tapping yourself does nothing — your own row lives in
                    // the Profile tab. Other members open the public profile.
                    if (m.user_id === user?.id) return;
                    router.push({ pathname: '/user/[id]', params: { id: m.user_id } });
                  }}
                />
              ))}
            </Section>
          ) : null}
          <Section title={`MEMBERS (${regular.length})`}>
            {regular.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.paper2, paddingVertical: 12 }}>
                Aún no hay más miembros. ¡Comparte el código de invitación!
              </Text>
            ) : (
              regular.map((m) => (
                <MemberRow
                  key={m.user_id}
                  m={m}
                  me={m.user_id === user?.id}
                  groupAccent={group?.accent ?? colors.s700}
                  onPress={() => {
                    // Tapping yourself does nothing — your own row lives in
                    // the Profile tab. Other members open the public profile.
                    if (m.user_id === user?.id) return;
                    router.push({ pathname: '/user/[id]', params: { id: m.user_id } });
                  }}
                />
              ))
            )}
          </Section>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function MemberRow({
  m, me, groupAccent, onPress,
}: { m: GroupMember; me: boolean; groupAccent: string; onPress?: () => void }) {
  const tint = m.role === 'admin' ? colors.gold : colors.mist;
  return (
    <Pressable
      onPress={onPress}
      disabled={me}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.04)',
        opacity: pressed && !me ? 0.7 : 1,
      })}
    >
      <Avatar initials={initialsOf(m.profile?.name)} size={40} bg={groupAccent} imageUrl={m.profile?.avatar_url} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>
            {me ? 'You' : (m.profile?.name ?? '—')}
          </Text>
          {me ? <Pill tone="ghost" size="sm">YOU</Pill> : null}
        </View>
        <Text style={{ fontSize: 11.5, color: colors.mist }}>@{m.profile?.username ?? '—'}</Text>
      </View>
      <View style={{ backgroundColor: tint + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: tint, textTransform: 'uppercase' }}>{m.role}</Text>
      </View>
      {!me ? <Icon name="chev" size={14} color={colors.mist} /> : null}
    </Pressable>
  );
}
