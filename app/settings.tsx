import { View, ScrollView, Pressable } from 'react-native';
import { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer, TopBar, Section, CButton, Avatar, Pill, Icon, IconName, Text, colors } from '../src/components';
import { USERS } from '../src/data';

type Item = { icon: IconName; l: string; sub: string; trail?: ReactNode };

const PREFERENCES: Item[] = [
  { icon: 'bell', l: 'Notifications', sub: 'Match start, results, invites' },
  { icon: 'eye', l: 'Privacy', sub: 'Who can find me by @username' },
  { icon: 'sparkle', l: 'Appearance', sub: 'Dark · Always on', trail: <Pill tone="ghost" size="sm">DARK</Pill> },
  { icon: 'flag', l: 'Language', sub: 'English', trail: <Text style={{ fontSize: 12, color: colors.mist }}>EN ›</Text> },
];
const ACCOUNT: Item[] = [
  { icon: 'user', l: 'Account info', sub: 'Email, password, phone' },
  { icon: 'lock', l: 'Security', sub: '2FA off · Active sessions' },
  { icon: 'trend', l: 'Export your data', sub: 'Picks history (CSV)' },
];
const SUPPORT: Item[] = [
  { icon: 'chat', l: 'Help center', sub: 'How does scoring work?' },
  { icon: 'mail', l: 'Contact us', sub: 'hello@circl.app' },
  { icon: 'book', l: 'Terms & privacy', sub: 'v2.4 · Updated Sept 2026' },
];

export default function Settings() {
  const router = useRouter();
  return (
    <ScreenContainer theme="dark">
      <TopBar title="Settings" onBack />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.s800, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            <Avatar user={USERS.me} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.paper }}>{USERS.me.name}</Text>
              <Text style={{ fontSize: 12, color: colors.mist }}>{USERS.me.username} · diego@example.com</Text>
            </View>
            <Icon name="chev" size={18} color={colors.mist} />
          </View>
        </View>

        <Section title="PREFERENCES"><SettingsList items={PREFERENCES} /></Section>
        <Section title="ACCOUNT"><SettingsList items={ACCOUNT} /></Section>
        <Section title="SUPPORT"><SettingsList items={SUPPORT} /></Section>

        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
          <CButton variant="ghostDark" size="md" full lead={<Icon name="logout" size={16} color={colors.paper} />} onPress={() => router.replace('/(auth)/welcome')}>
            Log out
          </CButton>
          <Pressable style={{ padding: 12, alignItems: 'center' }}>
            <Text style={{ color: colors.red, fontSize: 13, fontWeight: '800' }}>Delete account</Text>
          </Pressable>
          <Text style={{ textAlign: 'center', fontSize: 10, color: colors.mist, marginTop: 6, fontWeight: '600' }}>
            CIRCL v2.4.1 · Made with 🤍 in México
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingsList({ items }: { items: Item[] }) {
  return (
    <View style={{ backgroundColor: colors.s800, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
      {items.map((r, i) => (
        <Pressable key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={r.icon} size={15} color={colors.paper2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.paper }}>{r.l}</Text>
            <Text style={{ fontSize: 11, color: colors.mist }}>{r.sub}</Text>
          </View>
          {r.trail ?? <Icon name="chev" size={16} color={colors.mist} />}
        </Pressable>
      ))}
    </View>
  );
}
