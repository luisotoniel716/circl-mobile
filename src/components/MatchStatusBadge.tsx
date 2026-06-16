import { View } from 'react-native';
import { Text, colors } from '../design-system';
import type { MatchStatus } from '../types';

interface Props {
  status: MatchStatus;
  minute?: string;
}

export function MatchStatusBadge({ status, minute }: Props) {
  if (status === 'live') {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 9999,
          backgroundColor: colors.red,
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.paper }} />
        <Text style={{ color: colors.paper, fontSize: 10, fontWeight: '800' }}>LIVE{minute ? ` ${minute}` : ''}</Text>
      </View>
    );
  }
  if (status === 'finished') {
    return (
      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.10)' }}>
        <Text style={{ color: colors.paper2, fontSize: 10, fontWeight: '800' }}>FINAL</Text>
      </View>
    );
  }
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800' }}>UPCOMING</Text>
    </View>
  );
}

export default MatchStatusBadge;
