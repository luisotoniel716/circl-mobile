import { View, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ScreenContainer, TopBar, Icon, Text, colors,
} from '../../src/components';
import { useTweaks, ACCENT_PALETTE, type Accent } from '../../src/lib/tweaks';

const OPTIONS = Object.entries(ACCENT_PALETTE) as Array<[Accent, typeof ACCENT_PALETTE[Accent]]>;

/**
 * Lets the user pick the app's accent color. Persists via AsyncStorage
 * inside the TweakProvider, so the choice survives app restarts and
 * propagates to every screen that calls useAccent().
 */
export default function AccentSettings() {
  const { accent, setAccent } = useTweaks();
  const currentColor = ACCENT_PALETTE[accent].color;

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Color de acento" onBack />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Live preview card so the user sees what their selection looks
            like applied to a typical surface (gradient + accent ink). */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
          <LinearGradient
            colors={[currentColor, '#0024BD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 20,
              overflow: 'hidden',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>
              VISTA PREVIA
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: colors.paper, marginTop: 4 }}>
              {ACCENT_PALETTE[accent].label}
            </Text>
            <Text style={{ fontSize: 12, color: colors.paper, opacity: 0.85, marginTop: 4 }}>
              Así se ve tu acento en el resto de la app.
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
              <View
                style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 9999,
                  backgroundColor: colors.paper,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: currentColor }}>
                  Botón primario
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 9999,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper }}>
                  Secundario
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <Text style={{ paddingHorizontal: 20, fontSize: 12, fontWeight: '800', color: colors.paper2, marginBottom: 10 }}>
          ELIGE UN COLOR
        </Text>

        {/* 4-column grid where each cell is swatch + label as one unit.
            Using a clean 25% width per cell with internal padding avoids the
            flexWrap-with-gap quirk that was hiding some swatches before. */}
        <View style={{ paddingHorizontal: 14, flexDirection: 'row', flexWrap: 'wrap' }}>
          {OPTIONS.map(([key, val]) => {
            const isSelected = key === accent;
            return (
              <Pressable
                key={key}
                onPress={() => setAccent(key)}
                style={({ pressed }) => ({
                  width: '25%',
                  padding: 6,
                  alignItems: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{
                    width: '100%',
                    aspectRatio: 1,
                    borderRadius: 16,
                    backgroundColor: val.color,
                    borderWidth: isSelected ? 3 : 0,
                    borderColor: colors.paper,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected ? (
                    <View
                      style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: colors.paper,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Icon name="check" size={16} color={val.color} stroke={3} />
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: isSelected ? colors.paper : colors.mist,
                    textAlign: 'center',
                    marginTop: 6,
                  }}
                >
                  {val.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
