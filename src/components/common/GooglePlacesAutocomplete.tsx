/**
 * Google Places Autocomplete Component
 * Provides address search with autocomplete suggestions
 * 
 * Uses Google Places API (New) - Autocomplete Service
 * Documentation: https://developers.google.com/maps/documentation/places/web-service/autocomplete
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors, typography, spacing } from '../../theme';

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface PlaceDetails {
  placeId: string;
  address: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  components?: {
    streetNumber?: string;
    route?: string;
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    country?: string;
  };
}

interface GooglePlacesAutocompleteProps {
  onPlaceSelected: (place: PlaceDetails) => void;
  placeholder?: string;
  apiKey: string;
  debounceMs?: number;
  minLength?: number;
  countryRestriction?: string; // ISO 3166-1 Alpha-2 country code (e.g., 'IN' for India)
  types?: string; // e.g., 'address', 'establishment', 'geocode'
  style?: any;
}

export const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  onPlaceSelected,
  placeholder = 'Search for an address...',
  apiKey,
  debounceMs = 300,
  minLength = 3,
  countryRestriction,
  types = 'address',
  style,
}) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.length >= minLength) {
      debounceTimer.current = setTimeout(() => {
        fetchPredictions(query);
      }, debounceMs);
    } else {
      setPredictions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  /**
   * Fetch autocomplete predictions from Google Places API
   */
  const fetchPredictions = async (input: string) => {
    if (!apiKey) {
      console.error('Google Places API key is not configured');
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        input,
        key: apiKey,
        types,
        language: 'en',
      });

      if (countryRestriction) {
        params.append('components', `country:${countryRestriction}`);
      }

      // Use Google Places API (New) - Autocomplete
      const url = `https://places.googleapis.com/v1/places:autocomplete`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input: input,
          locationBias: countryRestriction
            ? {
                regionCode: countryRestriction,
              }
            : undefined,
          includedRegionCodes: countryRestriction ? [countryRestriction] : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();

      // Transform response to our format
      const transformedPredictions: PlacePrediction[] = [];

      if (data.suggestions && Array.isArray(data.suggestions)) {
        data.suggestions.forEach((suggestion: any) => {
          if (suggestion.placePrediction) {
            const pred = suggestion.placePrediction;
            transformedPredictions.push({
              placeId: pred.placeId || '',
              description: pred.text?.text || '',
              mainText: pred.structuredFormat?.mainText?.text || '',
              secondaryText: pred.structuredFormat?.secondaryText?.text || '',
              types: pred.types || [],
            });
          }
        });
      }

      setPredictions(transformedPredictions);
      setShowSuggestions(transformedPredictions.length > 0);
    } catch (error: any) {
      console.error('Error fetching predictions:', error);
      // Fallback to old Places API if new API fails
      await fetchPredictionsLegacy(input);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fallback to legacy Places Autocomplete API
   */
  const fetchPredictionsLegacy = async (input: string) => {
    try {
      const params = new URLSearchParams({
        input,
        key: apiKey,
        types,
        language: 'en',
      });

      if (countryRestriction) {
        params.append('components', `country:${countryRestriction}`);
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.predictions) {
        const transformedPredictions: PlacePrediction[] = data.predictions.map((pred: any) => ({
          placeId: pred.place_id,
          description: pred.description,
          mainText: pred.structured_formatting?.main_text || pred.description,
          secondaryText: pred.structured_formatting?.secondary_text || '',
          types: pred.types || [],
        }));

        setPredictions(transformedPredictions);
        setShowSuggestions(transformedPredictions.length > 0);
      }
    } catch (error: any) {
      console.error('Error fetching predictions (legacy):', error);
      setPredictions([]);
      setShowSuggestions(false);
    }
  };

  /**
   * Fetch place details by place ID
   */
  const fetchPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    if (!apiKey) {
      console.error('Google Places API key is not configured');
      return null;
    }

    try {
      // Try new Places API first
      const url = `https://places.googleapis.com/v1/places/${placeId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const location = data.location;

        return {
          placeId: data.id || placeId,
          address: data.formattedAddress || data.displayName?.text || '',
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          formattedAddress: data.formattedAddress || data.displayName?.text || '',
          components: parseAddressComponents(data.addressComponents),
        };
      }

      // Fallback to legacy API
      return await fetchPlaceDetailsLegacy(placeId);
    } catch (error: any) {
      console.error('Error fetching place details:', error);
      return await fetchPlaceDetailsLegacy(placeId);
    }
  };

  /**
   * Fallback to legacy Places Details API
   */
  const fetchPlaceDetailsLegacy = async (placeId: string): Promise<PlaceDetails | null> => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&fields=formatted_address,geometry,address_components`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const result = data.result;
        const location = result.geometry?.location;

        return {
          placeId: placeId,
          address: result.formatted_address || '',
          latitude: location?.lat || 0,
          longitude: location?.lng || 0,
          formattedAddress: result.formatted_address || '',
          components: parseAddressComponents(result.address_components),
        };
      }
    } catch (error: any) {
      console.error('Error fetching place details (legacy):', error);
    }

    return null;
  };

  /**
   * Parse address components from Google Places response
   */
  const parseAddressComponents = (components: any[]): PlaceDetails['components'] => {
    if (!components || !Array.isArray(components)) {
      return {};
    }

    const parsed: any = {};

    components.forEach((component: any) => {
      const types = component.types || [];
      const longName = component.long_name || component.text || '';
      const shortName = component.short_name || component.shortText || '';

      if (types.includes('street_number')) {
        parsed.streetNumber = longName;
      } else if (types.includes('route')) {
        parsed.route = longName;
      } else if (types.includes('locality')) {
        parsed.locality = longName;
      } else if (types.includes('administrative_area_level_1')) {
        parsed.administrativeArea = shortName;
      } else if (types.includes('postal_code')) {
        parsed.postalCode = longName;
      } else if (types.includes('country')) {
        parsed.country = shortName;
      }
    });

    return parsed;
  };

  /**
   * Handle place selection
   */
  const handlePlaceSelect = async (prediction: PlacePrediction) => {
    setQuery(prediction.description);
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const placeDetails = await fetchPlaceDetails(prediction.placeId);
      if (placeDetails) {
        onPlaceSelected(placeDetails);
      }
    } catch (error: any) {
      console.error('Error selecting place:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Render prediction item
   */
  const renderPrediction = ({ item }: { item: PlacePrediction }) => (
    <TouchableOpacity
      style={styles.predictionItem}
      onPress={() => handlePlaceSelect(item)}
    >
      <View style={styles.predictionIcon}>
        <Text style={styles.predictionIconText}>📍</Text>
      </View>
      <View style={styles.predictionText}>
        <Text style={styles.predictionMainText}>{item.mainText}</Text>
        {item.secondaryText ? (
          <Text style={styles.predictionSecondaryText}>{item.secondaryText}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {isLoading && (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      {showSuggestions && predictions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={predictions}
            renderItem={renderPrediction}
            keyExtractor={(item) => item.placeId}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  loader: {
    marginLeft: spacing.sm,
  },
  suggestionsContainer: {
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionsList: {
    flexGrow: 0,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  predictionIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  predictionIconText: {
    fontSize: 18,
  },
  predictionText: {
    flex: 1,
  },
  predictionMainText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  predictionSecondaryText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});

