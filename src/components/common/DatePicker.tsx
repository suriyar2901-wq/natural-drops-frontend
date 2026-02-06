import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';

interface DatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  maxDate?: string; // YYYY-MM-DD format
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  maxDate,
  placeholder = 'Select date',
}) => {
  // Get today's date for limits (calculate once at component level)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const minYear = 1900;
  
  // Default to a reasonable past year (2000) if no value, not current year
  const getDefaultYear = (): number => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        // Ensure not future year
        return Math.min(year, currentYear);
      }
    }
    // Default to year 2000 (reasonable past year for DOB)
    return 2000;
  };
  
  const getDefaultMonth = (): number => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = date.getMonth();
        // If year is current year, ensure month doesn't exceed current month
        if (year === currentYear && month > currentMonth) {
          return currentMonth;
        }
        return month;
      }
    }
    // Default to January
    return 0;
  };
  
  const [isOpen, setIsOpen] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(getDefaultYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(getDefaultMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.getDate();
      }
    }
    return null;
  });
  const yearScrollViewRef = useRef<ScrollView>(null);

  // Sync internal state when value changes externally
  useEffect(() => {
    if (value) {
      // Parse YYYY-MM-DD format properly
      const [year, month, day] = value.split('-').map(Number);
      if (year && month && day) {
        const parsedYear = Math.min(year, currentYear); // Ensure not future year
        setSelectedYear(parsedYear);
        setSelectedMonth(month - 1); // Month is 0-indexed
        setSelectedDay(day);
      }
    } else {
      // Default to year 2000, not current year
      setSelectedYear(2000);
      setSelectedMonth(0); // January
      setSelectedDay(null);
    }
  }, [value, currentYear]);

  // Scroll to selected year when year picker opens
  useEffect(() => {
    if (showYearPicker && yearScrollViewRef.current) {
      const currentYearIndex = years.findIndex(y => y === selectedYear);
      const itemHeight = 50; // Approximate height of each year item
      
      if (currentYearIndex >= 0) {
        setTimeout(() => {
          yearScrollViewRef.current?.scrollTo({
            y: currentYearIndex * itemHeight,
            animated: true,
          });
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showYearPicker, selectedYear]);

  // Get max date properly (end of today)
  const getMaxDate = (): Date => {
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(23, 59, 59, 999);
      return max;
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  };

  const maxDateObj = getMaxDate();
  const maxYear = maxDateObj.getFullYear();
  const maxMonth = maxDateObj.getMonth();
  const maxDay = maxDateObj.getDate();
  
  // Generate years array from current year down to 1900 (no future years)
  const generateYears = (): number[] => {
    const years: number[] = [];
    for (let year = currentYear; year >= minYear; year--) {
      years.push(year);
    }
    return years;
  };
  
  const years = generateYears();

  // Format date in YYYY-MM-DD format using local timezone
  const formatDate = (year: number, month: number, day: number): string => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(selectedYear, selectedMonth, day);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Check if date is valid (not in future and not before min year)
    if (selectedDate <= maxDateObj && selectedYear >= minYear && selectedYear <= currentYear) {
      // Additional validation: ensure the date is not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate <= today) {
        const dateStr = formatDate(selectedYear, selectedMonth, day);
        setSelectedDay(day);
        onChange(dateStr);
        setIsOpen(false);
      } else {
        // Show error for future date
        console.warn('Cannot select future date');
      }
    } else {
      // Show error for invalid date
      console.warn('Invalid date selected');
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        if (selectedYear > minYear) {
          setSelectedMonth(11);
          setSelectedYear(selectedYear - 1);
        }
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      // Next month - prevent going to future
      if (selectedMonth === 11) {
        // Can only go to next year if it's not future
        if (selectedYear < currentYear) {
          setSelectedMonth(0);
          setSelectedYear(selectedYear + 1);
        }
        // If already at current year, don't allow going to next year
      } else {
        // Can go to next month only if:
        // 1. Year is less than current year, OR
        // 2. Year is current year AND month is less than current month
        if (selectedYear < currentYear || 
            (selectedYear === currentYear && selectedMonth < currentMonth)) {
          setSelectedMonth(selectedMonth + 1);
        }
      }
    }
    setSelectedDay(null);
  };

  const handleYearSelect = (year: number) => {
    // Validate year selection - only allow past years up to current year
    if (year >= minYear && year <= currentYear) {
      setSelectedYear(year);
      setSelectedDay(null);
      
      // If selected year is current year, ensure month doesn't exceed current month
      if (year === currentYear && selectedMonth > currentMonth) {
        setSelectedMonth(currentMonth);
      }
      
      setShowYearPicker(false);
    }
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const isDateDisabled = (day: number): boolean => {
    const date = new Date(selectedYear, selectedMonth, day);
    date.setHours(0, 0, 0, 0);
    const maxDate = new Date(maxDateObj);
    maxDate.setHours(0, 0, 0, 0);
    return date > maxDate;
  };

  const isDateSelected = (day: number): boolean => {
    if (!value) return false;
    const selectedDate = new Date(value);
    return (
      selectedDate.getFullYear() === selectedYear &&
      selectedDate.getMonth() === selectedMonth &&
      selectedDate.getDate() === day
    );
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Check if we can navigate to previous/next month
    const canGoPrev = selectedYear > minYear || 
                     (selectedYear === minYear && selectedMonth > 0);
    // Can go next only if not at current year/month
    const canGoNext = selectedYear < currentYear || 
                     (selectedYear === currentYear && selectedMonth < currentMonth);

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => canGoPrev && handleMonthChange('prev')}
            style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}
            disabled={!canGoPrev}
          >
            <Text style={[styles.navButtonText, !canGoPrev && styles.navButtonTextDisabled]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.monthYearContainer}>
            <Text style={styles.monthText}>{monthNames[selectedMonth]}</Text>
            <TouchableOpacity
              onPress={() => setShowYearPicker(true)}
              style={styles.yearButton}
            >
              <Text style={styles.yearText}>{selectedYear}</Text>
              <Text style={styles.yearArrow}>▼</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => canGoNext && handleMonthChange('next')}
            style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
            disabled={!canGoNext}
          >
            <Text style={[styles.navButtonText, !canGoNext && styles.navButtonTextDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysRow}>
          {weekDays.map((day) => (
            <View key={day} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }
            const disabled = isDateDisabled(day);
            const selected = isDateSelected(day);
            return (
              <TouchableOpacity
                key={`day-${day}`}
                style={[
                  styles.dayCell,
                  selected && styles.dayCellSelected,
                  disabled && styles.dayCellDisabled,
                ]}
                onPress={() => {
                  if (!disabled) {
                    console.log('📅 Date selected:', { year: selectedYear, month: selectedMonth, day });
                    handleDateSelect(day);
                  }
                }}
                disabled={disabled}
                activeOpacity={disabled ? 1 : 0.7}
              >
                <Text
                  style={[
                    styles.dayText,
                    selected && styles.dayTextSelected,
                    disabled && styles.dayTextDisabled,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderYearPicker = () => {
    return (
      <View style={styles.yearPickerContainer}>
        <View style={styles.yearPickerHeader}>
          <Text style={styles.yearPickerTitle}>Select Year</Text>
          <TouchableOpacity
            onPress={() => setShowYearPicker(false)}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          ref={yearScrollViewRef}
          style={styles.yearScrollView}
          contentContainerStyle={styles.yearScrollContent}
          showsVerticalScrollIndicator={true}
        >
          {years.map((year) => {
            const isSelected = year === selectedYear;
            // Disable future years (years > currentYear should not even be in the list, but double-check)
            const isDisabled = year > currentYear || year < minYear;
            return (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearItem,
                  isSelected && styles.yearItemSelected,
                  isDisabled && styles.yearItemDisabled,
                ]}
                onPress={() => !isDisabled && handleYearSelect(year)}
                disabled={isDisabled}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.yearItemText,
                    isSelected && styles.yearItemTextSelected,
                    isDisabled && styles.yearItemTextDisabled,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const displayValue = value
    ? (() => {
        // Parse YYYY-MM-DD format and display in readable format
        const [year, month, day] = value.split('-').map(Number);
        if (year && month && day) {
          const date = new Date(year, month - 1, day);
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
        return value;
      })()
    : '';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setIsOpen(true)}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value ? displayValue : placeholder}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {showYearPicker ? renderYearPicker() : renderCalendar()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  inputText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  calendarIcon: {
    fontSize: 20,
    marginLeft: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: typography.fontSize['2xl'],
    color: colors.textSecondary,
  },
  calendarContainer: {
    width: '100%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: spacing.sm,
    backgroundColor: colors.gray100,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: typography.fontSize['2xl'],
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  navButtonTextDisabled: {
    color: colors.textSecondary,
  },
  monthYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    backgroundColor: colors.gray100,
    gap: spacing.xs / 2,
  },
  yearText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  yearArrow: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  yearPickerContainer: {
    width: '100%',
    maxHeight: 400,
  },
  yearPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
  },
  yearPickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  backButton: {
    padding: spacing.xs,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  yearScrollView: {
    maxHeight: 300,
  },
  yearScrollContent: {
    paddingVertical: spacing.xs,
  },
  yearItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.gray50,
  },
  yearItemSelected: {
    backgroundColor: colors.primary,
  },
  yearItemDisabled: {
    opacity: 0.3,
  },
  yearItemText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  yearItemTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  yearItemTextDisabled: {
    color: colors.textSecondary,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekDayText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  dayTextDisabled: {
    color: colors.textSecondary,
  },
});

