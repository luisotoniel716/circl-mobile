import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, Icon, TeamCrest, Text, colors,
} from '../../../src/components';
import { useAdminTeams, useIsAdmin } from '../../../src/lib/queries';
import { LIGAMX } from '../../../src/data';
import type { TeamCode } from '../../../src/types';

export default function AdminPlayersTeamList() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { data: teams = [], isLoading } = useAdminTeams();

  if (!isAdmin) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Plantillas" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={32} color={colors.mist} />
          <Text style={{ color: colors.paper2, marginTop: 8 }}>Acceso restringido.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Plantillas" onBack />

      <Text style={{ fontSize: 12, color: colors.paper2, paddingHorizontal: 20, paddingBottom: 10, lineHeight: 18 }}>
        Selecciona un equipo para gestionar sus jugadores (nombre, número y posición).
      </Text>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {teams.map((t) => {
            const known = LIGAMX[t.code as TeamCode];
            return (
              <Pressable
                key={t.id}
                onPress={() => router.push({ pathname: '/admin/players/[teamId]', params: { teamId: t.id } })}
                style={{
                  backgroundColor: colors.s800,
                  borderRadius: 14,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.04)',
                }}
              >
                {known ? (
                  <TeamCrest team={t.code as TeamCode} size={38} />
                ) : (
                  <View style={{
                    width: 38, height: 38, borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: colors.paper, fontWeight: '900', fontSize: 12 }}>{t.code}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.paper, fontSize: 14, fontWeight: '800' }}>{t.name}</Text>
                  <Text style={{ color: colors.mist, fontSize: 11 }}>{t.short_name}</Text>
                </View>
                <Icon name="forward" size={18} color={colors.mist} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
