import { View, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { ReactNode } from 'react';
import { useRouter, Href } from 'expo-router';
import { ScreenContainer, TopBar, Section, CButton, Icon, IconName, Text, colors } from '../src/components';
import { useAuth } from '../src/lib/auth';
import { useAccent, ACCENT_PALETTE } from '../src/lib/tweaks';

type Item = {
  icon:    IconName;
  label:   string;
  sub:     string;
  /** When omitted the row is rendered disabled — used for non-functional
   *  placeholders we want to keep visible for a future iteration. */
  onPress?: () => void;
  trail?:  ReactNode;
};

export default function Settings() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { accent } = useAccent();

  async function handleSignOut() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  }

  function go(path: string) {
    return () => router.push(path as Href);
  }

  // Wired items get an onPress that navigates somewhere real. Placeholders
  // are kept in the list (per product call) so users know the area exists,
  // but they render disabled with a "Próximamente" trail.
  const PREFERENCES: Item[] = [
    {
      icon: 'bell',
      label: 'Notificaciones',
      sub: 'Elige qué recibes como push',
      onPress: go('/settings/notifications'),
    },
    {
      icon: 'sparkle',
      label: 'Color de acento',
      sub: ACCENT_PALETTE[accent].label,
      onPress: go('/settings/accent'),
      trail: (
        <View
          style={{
            width: 18, height: 18, borderRadius: 9,
            backgroundColor: ACCENT_PALETTE[accent].color,
            borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
          }}
        />
      ),
    },
    // Placeholders — kept visible per product call so users know these
    // features exist on the roadmap.
    { icon: 'eye',  label: 'Privacidad', sub: 'Quién puede encontrarte' },
    { icon: 'flag', label: 'Idioma',     sub: 'Español' },
  ];

  const ACCOUNT: Item[] = [
    {
      icon: 'user',
      label: 'Información de cuenta',
      sub: 'Email y contraseña',
      onPress: go('/settings/account'),
    },
    {
      icon: 'trash',
      label: 'Eliminar cuenta',
      sub: 'Acción permanente',
      onPress: go('/settings/delete-account'),
    },
  ];

  const SUPPORT: Item[] = [
    {
      icon: 'mail',
      label: 'Contáctanos',
      sub: 'soporte@circl.app',
      onPress: () => {
        // Plain mailto — OS handles the rest.
        Linking.openURL('mailto:soporte@circl.app?subject=Soporte%20Circl')
          .catch(() => Alert.alert('Error', 'No pudimos abrir tu app de correo.'));
      },
    },
    // Placeholders.
    { icon: 'chat', label: 'Centro de ayuda',      sub: '¿Cómo funciona el scoring?' },
    { icon: 'book', label: 'Términos y privacidad', sub: 'v2.4 · Sept 2026' },
  ];

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Settings" onBack />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {profile?.is_admin ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
            <Pressable
              onPress={() => router.push('/admin')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                backgroundColor: colors.gold + '18',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.gold + '55',
              }}
            >
              <View
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: colors.gold,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name="settings" size={18} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.paper }}>
                  Panel de admin
                </Text>
                <Text style={{ fontSize: 11, color: colors.paper2 }}>
                  Editar partidos, marcadores y resultados
                </Text>
              </View>
              <Icon name="chev" size={18} color={colors.gold} />
            </Pressable>
          </View>
        ) : null}

        <Section title="PREFERENCIAS"><SettingsList items={PREFERENCES} /></Section>
        <Section title="CUENTA"><SettingsList items={ACCOUNT} /></Section>
        <Section title="SOPORTE"><SettingsList items={SUPPORT} /></Section>

        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
          <CButton
            variant="ghostDark"
            size="md"
            full
            lead={<Icon name="logout" size={16} color={colors.paper} />}
            onPress={handleSignOut}
          >
            Cerrar sesión
          </CButton>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: colors.mist,
              marginTop: 6,
              fontWeight: '600',
            }}
          >
            CIRCL v2.4.1 · Made with 🤍 in México
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingsList({ items }: { items: Item[] }) {
  return (
    <View
      style={{
        backgroundColor: colors.s800,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}
    >
      {items.map((r, i) => {
        const disabled = !r.onPress;
        return (
          <Pressable
            key={i}
            onPress={r.onPress}
            disabled={disabled}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderBottomWidth: i < items.length - 1 ? 1 : 0,
              borderBottomColor: 'rgba(255,255,255,0.04)',
              opacity: pressed && !disabled ? 0.7 : disabled ? 0.55 : 1,
            })}
          >
            <View
              style={{
                width: 30, height: 30, borderRadius: 9,
                backgroundColor: 'rgba(255,255,255,0.04)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name={r.icon} size={15} color={colors.paper2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.paper }}>{r.label}</Text>
              <Text style={{ fontSize: 11, color: colors.mist }}>{r.sub}</Text>
            </View>
            {r.trail ?? (
              disabled
                ? <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist }}>PRÓXIMAMENTE</Text>
                : <Icon name="chev" size={16} color={colors.mist} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
