import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import {
  ScreenContainer, TopBar, Icon, IconName, Text, colors,
} from '../../src/components';
import {
  useMyNotificationPrefs, useUpdateNotificationPrefs,
  type NotificationCategory, type NotificationPrefs,
} from '../../src/lib/queries';

interface Category {
  key:   NotificationCategory;
  icon:  IconName;
  label: string;
  sub:   string;
}

// Shown in the same order as the user thinks about them — most personal
// first. The descriptions explain what concrete events each category
// covers so the user isn't guessing.
const CATEGORIES: Category[] = [
  {
    key: 'friends',
    icon: 'addUser',
    label: 'Amigos',
    sub: 'Solicitudes y aceptaciones',
  },
  {
    key: 'groups',
    icon: 'people',
    label: 'Grupos',
    sub: 'Invitaciones, miembros nuevos, admin',
  },
  {
    key: 'picks',
    icon: 'check',
    label: 'Resultados de picks',
    sub: 'Cuando aciertas o fallas un pick',
  },
  {
    key: 'kickoff',
    icon: 'bell',
    label: 'Partidos por iniciar',
    sub: '30 min antes del kickoff',
  },
  {
    key: 'ranks',
    icon: 'trend',
    label: 'Ranks y rachas',
    sub: 'Subes/bajas de rank, milestones de racha',
  },
];

/**
 * Per-category notification toggles. The DB column is JSONB and treats
 * "missing key" as enabled, so we explicitly write `false` to mute and
 * remove the key (or set true) to re-enable. The list of in-app
 * notifications is unaffected — only OS pushes get suppressed.
 */
export default function NotificationsSettings() {
  const { data: prefs = {}, isLoading } = useMyNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  // Local mirror so toggles feel immediate; we re-sync when the server
  // returns the next snapshot.
  const [local, setLocal] = useState<NotificationPrefs>({});
  useEffect(() => {
    setLocal(prefs);
  }, [prefs]);

  function isOn(key: NotificationCategory): boolean {
    // Default: on. Only muted when explicitly false.
    return local[key] !== false;
  }

  function toggle(key: NotificationCategory) {
    const next: NotificationPrefs = { ...local };
    if (isOn(key)) {
      next[key] = false;
    } else {
      delete next[key];
    }
    setLocal(next);
    update.mutate(next, {
      onError: (e) => {
        // Roll back local optimistic change on failure.
        setLocal(local);
        Alert.alert('Error', (e as Error).message);
      },
    });
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Notificaciones" onBack />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
          <Text style={{ fontSize: 13, color: colors.paper2, lineHeight: 18 }}>
            Elige qué quieres recibir como notificación push. Las que apagues
            seguirán apareciendo en la pestaña de Activity, solo no sonarán
            ni te aparecerán en pantalla.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.paper2} style={{ marginTop: 16 }} />
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                backgroundColor: colors.s800,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.04)',
                overflow: 'hidden',
              }}
            >
              {CATEGORIES.map((c, i) => {
                const on = isOn(c.key);
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => toggle(c.key)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      borderBottomWidth: i < CATEGORIES.length - 1 ? 1 : 0,
                      borderBottomColor: 'rgba(255,255,255,0.04)',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 32, height: 32, borderRadius: 10,
                        backgroundColor: on ? colors.gold + '22' : 'rgba(255,255,255,0.04)',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Icon name={c.icon} size={15} color={on ? colors.gold : colors.paper2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.paper }}>
                        {c.label}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.mist }}>{c.sub}</Text>
                    </View>
                    {/* Toggle pill — a tiny manual switch since RN's Switch
                        component renders inconsistently across platforms with
                        accent colors. */}
                    <View
                      style={{
                        width: 42, height: 24, borderRadius: 12,
                        backgroundColor: on ? colors.gold : 'rgba(255,255,255,0.10)',
                        padding: 2,
                        alignItems: on ? 'flex-end' : 'flex-start',
                        justifyContent: 'center',
                      }}
                    >
                      <View
                        style={{
                          width: 20, height: 20, borderRadius: 10,
                          backgroundColor: colors.paper,
                        }}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ fontSize: 11, color: colors.mist, marginTop: 10, paddingHorizontal: 4 }}>
              {update.isPending ? 'Guardando…' : ' '}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
