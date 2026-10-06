import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { formatClockAmPm } from '../../utils/formatters';

export type DeliveryChoice = 'Today' | 'Tomorrow' | 'Date';

type Props = {
  choice: DeliveryChoice;
  onChoiceChange: (choice: DeliveryChoice) => void;
  customDate: string;
  onCustomDateChange: (value: string) => void;
  time: string;
  onTimeChange: (value: string) => void;
  hideDate?: boolean;
};

export const toDeliveryYmd = (offsetDays: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const deliveryDateFor = (choice: DeliveryChoice, customDate: string) => {
  if (choice === 'Today') return toDeliveryYmd(0);
  if (choice === 'Tomorrow') return toDeliveryYmd(1);
  return customDate;
};

const minutesOf = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

export const isFutureDeliverySlot = (date: string, time: string) => {
  const today = toDeliveryYmd(0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false;
  if (date < today) return false;
  if (date > today) return true;
  const now = new Date();
  return minutesOf(time) > now.getHours() * 60 + now.getMinutes();
};

const clockParts = (value: string) => {
  const [hourRaw, minuteRaw] = (value || '09:00').slice(0, 5).split(':');
  const hour24 = Number(hourRaw);
  const minute = Number(minuteRaw);
  return {
    hour12: hour24 % 12 || 12,
    minute: Number.isNaN(minute) ? 0 : minute,
    suffix: (hour24 >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
  };
};

const toClockValue = (hour12: number, minute: number, suffix: 'AM' | 'PM') => {
  const safeHour = Math.min(12, Math.max(1, hour12));
  const safeMinute = Math.min(59, Math.max(0, minute));
  let hour24 = safeHour % 12;
  if (suffix === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`;
};

const monthLabel = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

export const DeliverySlotFields = ({
  choice,
  onChoiceChange,
  customDate,
  onCustomDateChange,
  time,
  onTimeChange,
  hideDate = false,
}: Props) => {
  const today = toDeliveryYmd(0);
  const scheduledDate = deliveryDateFor(choice, customDate);
  const [hourDraft, setHourDraft] = useState('10');
  const [minuteDraft, setMinuteDraft] = useState('00');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const initial = customDate && /^\d{4}-\d{2}-\d{2}$/.test(customDate) ? customDate : today;
  const [cursorYear, setCursorYear] = useState(Number(initial.slice(0, 4)));
  const [cursorMonth, setCursorMonth] = useState(Number(initial.slice(5, 7)) - 1);

  const earliestToday = useMemo(() => {
    const now = new Date(Date.now() + 60 * 1000);
    if (now.getDate() !== new Date().getDate()) return '';
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (hideDate || !scheduledDate || isFutureDeliverySlot(scheduledDate, time)) return;
    const slots = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
    const next = slots.find((slot) => isFutureDeliverySlot(scheduledDate, slot));
    if (next) onTimeChange(next);
  }, [hideDate, scheduledDate, time, onTimeChange]);

  useEffect(() => {
    const parts = clockParts(time);
    setHourDraft(String(parts.hour12));
    setMinuteDraft(String(parts.minute).padStart(2, '0'));
  }, [time]);

  const applyClock = (hour12: number, minute: number, suffix: 'AM' | 'PM') => {
    const value = toClockValue(hour12, minute, suffix);
    if (!hideDate && scheduledDate && !isFutureDeliverySlot(scheduledDate, value)) return false;
    onTimeChange(value);
    return true;
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(cursorYear, cursorMonth + delta, 1);
    setCursorYear(next.getFullYear());
    setCursorMonth(next.getMonth());
  };

  const days = useMemo(() => {
    const firstWeekday = new Date(cursorYear, cursorMonth, 1).getDay();
    const count = new Date(cursorYear, cursorMonth + 1, 0).getDate();
    const cells: Array<string | null> = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= count; day += 1) {
      const value = `${cursorYear}-${String(cursorMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push(value);
    }
    return cells;
  }, [cursorYear, cursorMonth]);

  const displayDate = customDate && /^\d{4}-\d{2}-\d{2}$/.test(customDate)
    ? customDate.split('-').reverse().join('/')
    : 'Select date';

  return (
    <View>
      {!hideDate && (
      <View>
      <View style={styles.choiceRow}>
        {(['Today', 'Tomorrow', 'Date'] as DeliveryChoice[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.choice, choice === item && styles.choiceActive]}
            onPress={() => onChoiceChange(item)}
          >
            <Text style={[styles.choiceText, choice === item && styles.choiceTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {choice === 'Date' && (
        <View style={styles.dateField}>
          <Text style={styles.dateValue}>{displayDate}</Text>
          <Text style={styles.dateIcon}>📅</Text>
          {Platform.OS === 'web' ? (
            React.createElement('input', {
              type: 'date',
              min: today,
              value: customDate,
              onChange: (event: any) => {
                const value = event.target.value;
                if (value && value < today) return;
                onCustomDateChange(value);
              },
              style: {
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                boxSizing: 'border-box',
              },
            })
          ) : (
            <TouchableOpacity style={styles.dateHit} onPress={() => setCalendarOpen(true)} />
          )}
        </View>
      )}
      </View>
      )}
      <Text style={styles.hint}>Time</Text>
      {!hideDate && scheduledDate === today && !earliestToday ? (
        <Text style={styles.hint}>No time left today. Choose Tomorrow or another date.</Text>
      ) : (
        <View style={styles.clockBox}>
          <View style={styles.clockField}>
            <Text style={styles.clockLabel}>Hour</Text>
            <TextInput
              value={hourDraft}
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 2);
                setHourDraft(digits);
                const hour = Number(digits);
                const ready = digits.length === 2 || (digits.length === 1 && hour >= 2);
                if (ready && hour >= 1 && hour <= 12) {
                  applyClock(hour, clockParts(time).minute, clockParts(time).suffix);
                }
              }}
              onBlur={() => {
                const hour = Number(hourDraft);
                const parts = clockParts(time);
                if (!hour || hour < 1 || hour > 12 || !applyClock(hour, parts.minute, parts.suffix)) {
                  setHourDraft(String(parts.hour12));
                }
              }}
              style={styles.clockInput}
            />
          </View>
          <Text style={styles.clockColon}>:</Text>
          <View style={styles.clockField}>
            <Text style={styles.clockLabel}>Min</Text>
            <TextInput
              value={minuteDraft}
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 2);
                setMinuteDraft(digits);
                if (digits.length === 2) {
                  const parts = clockParts(time);
                  applyClock(parts.hour12, Number(digits), parts.suffix);
                }
              }}
              onBlur={() => {
                const minute = Number(minuteDraft);
                const parts = clockParts(time);
                if (minuteDraft === '' || minute > 59 || !applyClock(parts.hour12, minute || 0, parts.suffix)) {
                  setMinuteDraft(String(parts.minute).padStart(2, '0'));
                }
              }}
              style={styles.clockInput}
            />
          </View>
          <View style={styles.ampmRow}>
            {(['AM', 'PM'] as const).map((suffix) => {
              const active = clockParts(time).suffix === suffix;
              return (
                <TouchableOpacity
                  key={suffix}
                  style={[styles.ampmButton, active && styles.choiceActive]}
                  onPress={() => {
                    const parts = clockParts(time);
                    const hour = Number(hourDraft) || parts.hour12;
                    const minute = minuteDraft === '' ? parts.minute : Number(minuteDraft);
                    if (!applyClock(hour, minute, suffix)) {
                      setHourDraft(String(parts.hour12));
                      setMinuteDraft(String(parts.minute).padStart(2, '0'));
                    }
                  }}
                >
                  <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{suffix}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      <Text style={styles.hint}>
        {scheduledDate && isFutureDeliverySlot(scheduledDate, time)
          ? `Delivery on ${scheduledDate.split('-').reverse().join('/')} at ${formatClockAmPm(time)}.`
          : 'Pick a future date and a future time.'}
      </Text>
      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.monthRow}>
              <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.monthButton}>
                <Text style={styles.monthButtonText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{monthLabel(cursorYear, cursorMonth)}</Text>
              <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.monthButton}>
                <Text style={styles.monthButtonText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
                <Text key={`${label}-${index}`} style={styles.weekLabel}>{label}</Text>
              ))}
            </View>
            <View style={styles.dayGrid}>
              {days.map((value, index) => {
                if (!value) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const disabled = value < today;
                const selected = value === customDate;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.dayCell, selected && styles.daySelected]}
                    disabled={disabled}
                    onPress={() => {
                      onCustomDateChange(value);
                      setCalendarOpen(false);
                    }}
                  >
                    <Text style={[styles.dayText, disabled && styles.dayDisabled, selected && styles.daySelectedText]}>
                      {Number(value.slice(8))}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setCalendarOpen(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.white },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.textPrimary },
  choiceTextActive: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  dateField: {
    marginTop: spacing.sm,
    width: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  dateValue: { color: colors.textPrimary, fontSize: typography.fontSize.base },
  dateIcon: { fontSize: 18, marginLeft: spacing.sm },
  dateHit: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  hint: { color: colors.textSecondary, marginTop: spacing.sm },
  clockBox: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', width: '100%', minWidth: 0, gap: spacing.xs },
  clockField: { width: 72, minWidth: 0 },
  clockLabel: { fontSize: typography.fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  clockInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  clockColon: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginHorizontal: spacing.sm, marginBottom: 10 },
  ampmRow: { flexDirection: 'row', marginLeft: spacing.sm, marginBottom: 2 },
  ampmButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.white, marginLeft: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.white, borderRadius: 12, padding: spacing.md },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  monthButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthButtonText: { fontSize: 24, color: colors.primary },
  monthLabel: { fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  weekRow: { flexDirection: 'row' },
  weekLabel: { width: '14.28%', textAlign: 'center', color: colors.textSecondary, marginBottom: spacing.xs },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', height: 36, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: colors.textPrimary },
  dayDisabled: { color: colors.gray400 },
  daySelected: { backgroundColor: colors.primary, borderRadius: 18 },
  daySelectedText: { color: colors.white, fontWeight: typography.fontWeight.bold },
  closeText: { textAlign: 'center', color: colors.primary, fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm },
});
