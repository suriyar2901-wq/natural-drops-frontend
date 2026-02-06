import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

export type DateRangeValue = { startDate: Date | null; endDate: Date | null };

type Props = {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, months: number) => new Date(d.getFullYear(), d.getMonth() + months, 1);
const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isBefore = (a: Date, b: Date) => startOfDay(a).getTime() < startOfDay(b).getTime();
const isAfter = (a: Date, b: Date) => startOfDay(a).getTime() > startOfDay(b).getTime();

const monthTitle = (d: Date) =>
  d.toLocaleString('en-US', { month: 'long', year: 'numeric' });

const normalizeRange = (range: DateRangeValue): DateRangeValue => {
  if (!range.startDate) return { startDate: null, endDate: null };
  if (!range.endDate) return { startDate: startOfDay(range.startDate), endDate: null };
  const s = startOfDay(range.startDate);
  const e = startOfDay(range.endDate);
  if (isAfter(s, e)) return { startDate: e, endDate: s };
  return { startDate: s, endDate: e };
};

export const DateRangePicker: React.FC<Props> = ({ value, onChange }) => {
  const normalized = useMemo(() => normalizeRange(value), [value]);
  const [baseMonth, setBaseMonth] = useState<Date>(startOfMonth(normalized.startDate ?? new Date()));

  const onDayPress = (day: Date) => {
    const d = startOfDay(day);
    const { startDate, endDate } = normalized;
    if (!startDate || (startDate && endDate)) {
      onChange({ startDate: d, endDate: null });
      return;
    }
    if (isBefore(d, startDate)) {
      onChange({ startDate: d, endDate: startDate });
      return;
    }
    onChange({ startDate, endDate: d });
  };

  const isInRange = (day: Date) => {
    const { startDate, endDate } = normalized;
    if (!startDate || !endDate) return false;
    const t = startOfDay(day).getTime();
    return t >= startOfDay(startDate).getTime() && t <= startOfDay(endDate).getTime();
  };

  const isStart = (day: Date) => normalized.startDate && isSameDay(day, normalized.startDate);
  const isEnd = (day: Date) => normalized.endDate && isSameDay(day, normalized.endDate);

  const renderMonth = (monthDate: Date) => {
    const first = startOfMonth(monthDate);
    const firstWeekday = first.getDay(); // 0..6
    const dim = daysInMonth(monthDate);
    const cells: Array<{ key: string; date: Date | null }> = [];

    // leading blanks
    for (let i = 0; i < firstWeekday; i++) cells.push({ key: `b-${i}`, date: null });
    // days
    for (let d = 1; d <= dim; d++) {
      cells.push({ key: `d-${d}`, date: new Date(first.getFullYear(), first.getMonth(), d) });
    }
    // trailing to full weeks (up to 6 rows)
    while (cells.length % 7 !== 0) cells.push({ key: `t-${cells.length}`, date: null });
    while (cells.length < 42) cells.push({ key: `x-${cells.length}`, date: null });

    return (
      <View style={styles.month} key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}>
        <Text style={styles.monthTitle}>{monthTitle(monthDate)}</Text>

        <View style={styles.weekHeader}>
          {DAY_LABELS.map((lbl) => (
            <Text key={lbl} style={styles.weekHeaderText}>
              {lbl}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((c) => {
            if (!c.date) return <View key={c.key} style={styles.dayCell} />;
            const inRange = isInRange(c.date);
            const start = isStart(c.date);
            const end = isEnd(c.date);
            const selected = start || end;
            return (
              <TouchableOpacity
                key={c.key}
                style={[
                  styles.dayCell,
                  inRange && styles.dayCellInRange,
                  selected && styles.dayCellSelected,
                  start && styles.dayCellStart,
                  end && styles.dayCellEnd,
                ]}
                onPress={() => onDayPress(c.date as Date)}
              >
                <Text
                  style={[
                    styles.dayText,
                    inRange && styles.dayTextInRange,
                    selected && styles.dayTextSelected,
                  ]}
                >
                  {c.date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View>
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setBaseMonth(addMonths(baseMonth, -1))}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Pick a range</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => setBaseMonth(addMonths(baseMonth, 1))}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthRow}>
        {renderMonth(baseMonth)}
        {renderMonth(addMonths(baseMonth, 1))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 18,
  },
  navTitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  monthRow: {
    flexDirection: 'row',
    gap: spacing.md,
    // fallback for RN web
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  month: {
    flex: 1,
    minWidth: 280,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
  },
  monthTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  weekHeaderText: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 10,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 1,
  },
  dayText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  dayCellInRange: {
    backgroundColor: 'rgba(74, 108, 247, 0.12)',
  },
  dayTextInRange: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  dayCellStart: {
    backgroundColor: colors.primary,
  },
  dayCellEnd: {
    backgroundColor: colors.primary,
  },
});


