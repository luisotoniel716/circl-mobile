import { useState } from 'react';
import { View, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text, colors } from '../design-system';
import { Icon } from './Icon';
import { CButton } from './CButton';

interface DateTimeFieldProps {
  /** ISO string. */
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * Native datetime field.
 * iOS: opens a modal with a wheel picker.
 * Android: opens system date dialog, then time dialog.
 */
export function DateTimeField({ value, onChange, label, minimumDate, maximumDate }: DateTimeFieldProps) {
  const current = value ? new Date(value) : new Date();

  // iOS: a single modal with combined picker
  // Android: two-step (date then time) using imperative show
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(current);
  const [androidMode, setAndroidMode] = useState<'date' | 'time' | null>(null);
  const [androidDate, setAndroidDate] = useState<Date>(current);

  function openPicker() {
    if (Platform.OS === 'ios') {
      setIosDraft(current);
      setIosOpen(true);
    } else {
      setAndroidDate(current);
      setAndroidMode('date');
    }
  }

  // ─── Android handlers ─────────────────────────────────────────
  function onAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    if (event.type === 'dismissed' || !selected) {
      setAndroidMode(null);
      return;
    }
    if (androidMode === 'date') {
      // Keep selected date, move to time picker preserving the time part
      const next = new Date(selected);
      next.setHours(androidDate.getHours(), androidDate.getMinutes(), 0, 0);
      setAndroidDate(next);
      setAndroidMode('time');
    } else if (androidMode === 'time') {
      const next = new Date(androidDate);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(next.toISOString());
      setAndroidMode(null);
    }
  }

  // ─── iOS handlers ─────────────────────────────────────────────
  function onIosChange(_e: DateTimePickerEvent, selected?: Date) {
    if (selected) setIosDraft(selected);
  }

  function iosConfirm() {
    onChange(iosDraft.toISOString());
    setIosOpen(false);
  }

  // ─── Display ──────────────────────────────────────────────────
  const formatted = value
    ? new Date(value).toLocaleString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : 'Selecciona fecha y hora';

  return (
    <View>
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 7, paddingLeft: 4 }}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={openPicker}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.s800,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 13,
        }}
      >
        <Icon name="bell" size={16} color={colors.mist} />
        <Text style={{ flex: 1, color: value ? colors.paper : colors.mist, fontSize: 14, fontWeight: '700' }}>
          {formatted}
        </Text>
        <Icon name="chev" size={16} color={colors.mist} />
      </Pressable>

      {/* iOS modal with wheel picker */}
      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.s900, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 30 }}>
              <Text style={{ color: colors.paper, fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
                {label ?? 'Fecha y hora'}
              </Text>
              <DateTimePicker
                value={iosDraft}
                mode="datetime"
                display="spinner"
                onChange={onIosChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                themeVariant="dark"
                textColor={colors.paper}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <CButton variant="ghostDark" size="md" full onPress={() => setIosOpen(false)}>
                    Cancelar
                  </CButton>
                </View>
                <View style={{ flex: 1 }}>
                  <CButton variant="primary" size="md" full onPress={iosConfirm}>
                    Confirmar
                  </CButton>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Android: imperative dialogs, two steps */}
      {Platform.OS === 'android' && androidMode != null && (
        <DateTimePicker
          value={androidDate}
          mode={androidMode}
          display="default"
          is24Hour={true}
          onChange={onAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}
