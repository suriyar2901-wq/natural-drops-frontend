import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Input } from './Input';
import { AddressMatch, locationApiService } from '../../services/locationApi.service';
import { colors, spacing, typography } from '../../theme';

interface AddressValue {
  area: string;
  city: string;
  pincode: string;
  matched: boolean;
}

interface AddressMatchFieldsProps {
  area: string;
  city: string;
  pincode: string;
  matched: boolean;
  onChange: (next: AddressValue) => void;
}

export const AddressMatchFields = ({ area, city, pincode, matched, onChange }: AddressMatchFieldsProps) => {
  const [activeField, setActiveField] = useState<'area' | 'pincode' | null>(null);
  const [suggestions, setSuggestions] = useState<AddressMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    const query = activeField === 'pincode' ? pincode.trim() : area.trim();
    const canSearch = activeField === 'pincode' ? /^\d{6}$/.test(query) : query.length >= 3;
    if (!activeField || matched || !canSearch) {
      setSuggestions([]);
      setLoading(false);
      if (!matched && activeField === 'area' && area.trim().length > 0 && area.trim().length < 3) {
        setHint('Type at least 3 letters, then pick the area.');
      } else if (!canSearch) {
        setHint('');
      }
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const found = await locationApiService.searchAddressMatches(query);
      if (cancelled) {
        return;
      }
      if (activeField === 'pincode') {
        const areaQuery = area.trim().toLowerCase();
        const named = areaQuery.length >= 2
          ? found.filter((item) => item.area.toLowerCase().includes(areaQuery))
          : found;
        setSuggestions(named.length > 0 ? named : found);
        if (found.length === 0) {
          setHint('This pincode is not valid. Pick another pincode.');
        } else if (named.length === 0) {
          setHint(`“${area.trim()}” is not in pincode ${pincode}. Pick one of the areas below.`);
        } else {
          setHint('Pick an area. City and pincode stay with that area.');
        }
      } else {
        const pin = pincode.trim();
        const cityQuery = city.trim().toLowerCase();
        if (/^\d{6}$/.test(pin)) {
          const samePin = found.filter((item) => item.pincode === pin);
          setSuggestions(samePin);
          setHint(samePin.length === 0
            ? `“${area.trim()}” is not in pincode ${pin}. Clear the pincode or type the area for that pincode.`
            : 'Pick a suggestion so the pincode stays correct.');
        } else if (cityQuery.length >= 2) {
          const sameCity = found.filter((item) => (
            item.city.toLowerCase().includes(cityQuery) || cityQuery.includes(item.city.toLowerCase())
          ));
          setSuggestions(sameCity.length > 0 ? sameCity : found);
          setHint(sameCity.length === 0
            ? `“${area.trim()}” is not in ${city.trim()}. Pick a suggestion to set the correct city and pincode.`
            : 'Pick a suggestion. City and pincode will match that area.');
        } else {
          setSuggestions(found);
          setHint(found.length === 0
            ? 'No matching area. Check the spelling.'
            : 'Pick a suggestion so the pincode stays correct.');
        }
      }
      setLoading(false);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeField, area, city, pincode, matched]);

  const edit = (next: Partial<AddressValue>) => {
    onChange({
      area: next.area ?? area,
      city: next.city ?? city,
      pincode: next.pincode ?? pincode,
      matched: false,
    });
    setHint('');
  };

  const pick = (item: AddressMatch) => {
    onChange({ area: item.area, city: item.city, pincode: item.pincode, matched: true });
    setSuggestions([]);
    setActiveField(null);
    setHint('');
  };

  return (
    <View>
      <Input
        label="Area *"
        value={area}
        autoCorrect={false}
        onFocus={() => setActiveField('area')}
        onChangeText={(text) => {
          setActiveField('area');
          edit({ area: text });
        }}
        placeholder="Type area, then pick a suggestion"
      />
      {activeField === 'area' && (loading || suggestions.length > 0 || !!hint) && (
        <SuggestionList loading={loading} hint={hint} suggestions={suggestions} onPick={pick} />
      )}
      <Input
        label="City *"
        value={city}
        onChangeText={(text) => edit({ city: text })}
        placeholder="Fills when you pick an area"
      />
      <Input
        label="Pincode *"
        value={pincode}
        keyboardType="numeric"
        onFocus={() => setActiveField('pincode')}
        onChangeText={(text) => {
          setActiveField('pincode');
          edit({ pincode: text.replace(/[^0-9]/g, '').slice(0, 6) });
        }}
        placeholder="6-digit pincode"
      />
      {activeField === 'pincode' && (loading || suggestions.length > 0 || !!hint) && (
        <SuggestionList loading={loading} hint={hint} suggestions={suggestions} onPick={pick} />
      )}
      {matched && <Text style={styles.ok}>Area, city and pincode match.</Text>}
    </View>
  );
};

const SuggestionList = ({
  loading,
  hint,
  suggestions,
  onPick,
}: {
  loading: boolean;
  hint: string;
  suggestions: AddressMatch[];
  onPick: (item: AddressMatch) => void;
}) => (
  <View style={styles.list}>
    {loading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
    {!!hint && <Text style={styles.hint}>{hint}</Text>}
    {suggestions.map((item) => (
      <TouchableOpacity key={`${item.area}-${item.pincode}`} style={styles.row} onPress={() => onPick(item)}>
        <Text style={styles.area}>{item.area}</Text>
        <Text style={styles.meta}>{item.city}{item.state ? `, ${item.state}` : ''} · {item.pincode}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  loader: { marginVertical: spacing.sm },
  hint: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  area: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  meta: { color: colors.textSecondary, marginTop: 2, fontSize: typography.fontSize.sm },
  ok: { color: colors.success, marginBottom: spacing.sm },
});
