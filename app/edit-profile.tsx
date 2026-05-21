import { View, ScrollView } from 'react-native';
import { ScreenContainer, TopBar, Input, Avatar, TeamCrest, Icon, Text, colors } from '../src/components';
import { useAccent } from '../src/lib/tweaks';
import { USERS, LIGAMX } from '../src/data';
import type { TeamCode } from '../src/types';

const FAV_TEAMS: TeamCode[] = ['AME', 'GDL', 'CAZ', 'PUM', 'MTY', 'TIG', 'TOL'];

export default function EditProfile() {
  const { accentColor, accentInk } = useAccent();
  return (
    <ScreenContainer theme="dark">
      <TopBar title="Edit profile" onBack right={<Text style={{ color: colors.gold, fontSize: 14, fontWeight: '800' }}>Save</Text>} />

      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <View>
          <Avatar user={USERS.me} size={96} />
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: accentColor, borderWidth: 3, borderColor: colors.s900, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="edit" size={15} color={accentInk} />
          </View>
        </View>
        <Text style={{ fontSize: 11, color: colors.mist, marginTop: 8, fontWeight: '600' }}>Tap to change avatar</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Input label="Full name" defaultValue="Diego Reyes" />
        <Input label="Username" defaultValue="@dreyes" autoCapitalize="none" valid="ok" help="Available · friends find you with this" />
        <Input label="Email" defaultValue="diego@example.com" autoCapitalize="none" keyboardType="email-address" valid="ok" />

        <View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 7, paddingLeft: 4 }}>Bio</Text>
          <View style={{ backgroundColor: colors.s800, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, minHeight: 80 }}>
            <Text style={{ fontSize: 14, color: colors.paper, lineHeight: 20 }}>América hasta morir. 🦅 Pick first, regret later.</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 11, color: colors.mist }}>Visible on your public profile</Text>
            <Text style={{ fontSize: 11, color: colors.mist }}>52 / 140</Text>
          </View>
        </View>

        <View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 7, paddingLeft: 4 }}>Favorite team</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {FAV_TEAMS.map((c, i) => (
              <View
                key={c}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 8,
                  paddingLeft: 8,
                  paddingRight: 12,
                  borderRadius: 9999,
                  backgroundColor: i === 0 ? LIGAMX[c].primary + '33' : 'rgba(255,255,255,0.04)',
                  borderWidth: 1.5,
                  borderColor: i === 0 ? LIGAMX[c].primary : 'transparent',
                }}
              >
                <TeamCrest team={c} size={22} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.paper }}>{LIGAMX[c].name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
