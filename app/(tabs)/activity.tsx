import { View, ScrollView } from 'react-native';
import { ReactNode } from 'react';
import { ScreenContainer, TopBar, CButton, Pill, Icon, IconName, Text, colors } from '../../src/components';

const TABS = [
  { l: 'All', n: 7 },
  { l: 'Requests', n: 2 },
  { l: 'Picks', n: 3 },
];

export default function Activity() {
  return (
    <ScreenContainer theme="dark" edges={['top']}>
      <TopBar
        title="Activity"
        big
        right={<Text style={{ color: colors.paper2, fontSize: 13, fontWeight: '700' }}>Mark all</Text>}
      />

      {/* Segmented tabs */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.s800, borderRadius: 9999, padding: 3, gap: 2 }}>
          {TABS.map((tab, i) => (
            <View
              key={tab.l}
              style={{
                flex: 1,
                paddingVertical: 7,
                borderRadius: 9999,
                backgroundColor: i === 0 ? colors.paper : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: i === 0 ? colors.ink : colors.paper2 }}>{tab.l}</Text>
              <View style={{ backgroundColor: i === 0 ? colors.red : 'rgba(255,255,255,0.10)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 99 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: colors.paper }}>{tab.n}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={sectionLabel}>NEW</Text>
        <NotifRow
          tint={colors.blue}
          icon="addUser"
          unread
          title={<Text style={titleText}><Text style={bold}>Sofía Ramírez</Text> wants to be friends</Text>}
          sub="@sofiarmz · 2m"
          actions={[{ l: 'Decline', v: 'soft' }, { l: 'Accept', v: 'primary' }]}
        />
        <NotifRow
          tint={colors.gold}
          icon="people"
          unread
          title={<Text style={titleText}><Text style={bold}>Andrés</Text> invited you to <Text style={bold}>Pumas Hasta La Muerte</Text></Text>}
          sub="11 members · 18m"
          actions={[{ l: 'Decline', v: 'soft' }, { l: 'Join', v: 'primary' }]}
        />
        <NotifRow
          tint={colors.green}
          icon="check"
          unread
          title={<Text style={titleText}>Your pick on <Text style={bold}>Pachuca vs Santos</Text> was correct</Text>}
          sub="+12 pts · 1h"
          trail={<Pill tone="gold" size="sm">+12</Pill>}
        />

        <Text style={sectionLabel}>EARLIER</Text>
        <NotifRow tint={colors.gold} icon="arrowUp" title={<Text style={titleText}>You moved up to <Text style={bold}>#3</Text> in La Quiniela (+2)</Text>} sub="1h" />
        <NotifRow
          tint={colors.red}
          icon="bell"
          title={<Text style={titleText}><Text style={bold}>América vs Chivas</Text> kicks off in 30 min</Text>}
          sub="Make your pick · 2h"
          trail={<CButton variant="soft" size="sm">Pick</CButton>}
        />
        <NotifRow tint={colors.green} icon="addUser" title={<Text style={titleText}><Text style={bold}>Luis Cárdenas</Text> accepted your request</Text>} sub="@luisc · 4h" />
        <NotifRow tint={colors.mist} icon="close" title={<Text style={titleText}>Your pick on <Text style={bold}>Necaxa vs Atlas</Text> missed</Text>} sub="+0 pts · 1d" />
      </ScrollView>
    </ScreenContainer>
  );
}

function NotifRow({
  tint, icon, title, sub, unread, actions, trail,
}: {
  tint: string;
  icon: IconName;
  title: ReactNode;
  sub: string;
  unread?: boolean;
  actions?: { l: string; v: 'soft' | 'primary' }[];
  trail?: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.04)',
        backgroundColor: unread ? 'rgba(0,45,232,0.06)' : 'transparent',
      }}
    >
      <View>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: tint + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={tint} />
        </View>
        {unread ? <View style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        {title}
        <Text style={{ fontSize: 11, color: colors.mist, marginTop: 2 }}>{sub}</Text>
        {actions ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {actions.map((a) => (
              <CButton key={a.l} variant={a.v} size="sm">{a.l}</CButton>
            ))}
          </View>
        ) : null}
      </View>
      {trail ? <View style={{ marginTop: 2 }}>{trail}</View> : null}
    </View>
  );
}

const sectionLabel = { fontSize: 10, fontWeight: '800' as const, color: colors.mist, letterSpacing: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 };
const titleText = { fontSize: 13, color: colors.paper, lineHeight: 18 };
const bold = { fontWeight: '800' as const, color: colors.paper };
