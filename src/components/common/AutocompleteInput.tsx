import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Platform, TextInputProps } from 'react-native';
import { colors, typography, spacing } from '../../theme';

export interface AutocompleteOption {
  name: string;
  displayName?: string;
  type?: string;
  state?: string;
  city?: string;
  district?: string;
  pincode?: string;
}

interface AutocompleteInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  placeholder?: string;
  error?: string;
  suggestions: AutocompleteOption[];
  isLoading?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: TextInputProps['keyboardType'];
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChangeText,
  onSelect,
  placeholder,
  error,
  suggestions,
  isLoading = false,
  maxLength,
  autoCapitalize = 'words',
  keyboardType,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const shouldShow = isFocused && suggestions.length > 0 && value.length > 0;
    setShowSuggestions(shouldShow);
    // Reset highlighted index when suggestions change
    if (suggestions.length > 0) {
      setHighlightedIndex(0); // Highlight first suggestion by default
    } else {
      setHighlightedIndex(-1);
    }
  }, [isFocused, suggestions, value]);

  const handleSelect = (option: AutocompleteOption) => {
    onChangeText(option.name);
    if (onSelect) {
      onSelect(option);
    }
    setShowSuggestions(false);
    setIsFocused(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const displaySuggestions = showSuggestions && suggestions.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            isFocused && !displaySuggestions && styles.inputFocused,
            error && styles.inputError,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => {
            setIsFocused(true);
          }}
          onBlur={() => {
            // Delay hiding suggestions to allow selection
            setTimeout(() => {
              setIsFocused(false);
              setShowSuggestions(false);
            }, 200);
          }}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
        />
        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {displaySuggestions && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            renderItem={({ item, index }) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <TouchableOpacity
                  style={[
                    styles.suggestionItem,
                    isHighlighted && styles.suggestionItemHighlighted,
                  ]}
                  onPress={() => handleSelect(item)}
                  onPressIn={() => setHighlightedIndex(index)}
                  onPressOut={() => setHighlightedIndex(index)} // Keep highlighted after press
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.suggestionText,
                    isHighlighted && styles.suggestionTextHighlighted,
                  ]}>
                    {item.displayName || item.name}
                  </Text>
                  {item.state && !item.displayName && (
                    <Text style={styles.suggestionSubtext}>{item.state}</Text>
                  )}
                </TouchableOpacity>
              );
            }}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsList}
            contentContainerStyle={styles.suggestionsListContent}
            maxToRenderPerBatch={10}
            windowSize={5}
            showsVerticalScrollIndicator={true}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg, // Increased margin to prevent label overlap
    position: 'relative',
    zIndex: 1,
    // Ensure container doesn't interfere with dropdown positioning
    ...(Platform.OS === 'web' && {
      isolation: 'isolate' as any,
    }),
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    // Ensure label is always visible
    zIndex: 1,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    minHeight: 44,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    } as any),
  },
  inputFocused: {
    // Only show focus border when dropdown is NOT showing
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.error,
  },
  loaderContainer: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF', // Fully opaque white background
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: spacing.xs,
    maxHeight: 200,
    // Maximum z-index to appear above all other elements
    zIndex: 99999,
    elevation: 50, // Very high elevation for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    overflow: 'hidden',
    // Ensure fully opaque - no transparency at all
    opacity: 1,
    // Additional styling for better overlay effect
    ...(Platform.OS === 'web' && {
      boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
      backgroundColor: '#FFFFFF',
      position: 'fixed' as any, // Use fixed positioning for better layering on web
    } as any),
    ...(Platform.OS !== 'web' && {
      backgroundColor: '#FFFFFF', // Explicit white for mobile
    }),
  },
  suggestionsList: {
    maxHeight: 200,
    backgroundColor: '#FFFFFF', // Fully opaque white
    // Ensure scrollable
    flexGrow: 0,
  },
  suggestionsListContent: {
    backgroundColor: '#FFFFFF', // Fully opaque white
    paddingVertical: spacing.xs,
  },
  suggestionItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: '#FFFFFF', // Fully opaque white background for each item
    minHeight: 44,
    // Ensure items are fully visible - no transparency
    opacity: 1,
  },
  suggestionItemHighlighted: {
    backgroundColor: colors.gray100, // Light gray background like dropdown selection
  },
  suggestionText: {
    fontSize: typography.fontSize.base,
    color: '#212121', // Explicit dark color for maximum contrast
    fontWeight: typography.fontWeight.medium,
  },
  suggestionTextHighlighted: {
    color: '#212121', // Dark color for highlighted text too
    fontWeight: typography.fontWeight.bold, // Bold for better visibility
  },
  suggestionSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
});

