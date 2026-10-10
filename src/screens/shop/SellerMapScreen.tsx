import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components/common';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { useAuth } from '../../hooks';
import { useGetShopBuyersQuery } from '../../store/api/shopApi';
import { showErrorToast } from '../../utils/toast';

type Point = { lat: number; lon: number };

const joinAddress = (parts: Array<string | undefined | null>) =>
  parts.map((part) => String(part || '').trim()).filter(Boolean).join(', ');

const PLACE_ALIASES: Record<string, string> = {
  villupuram: 'Viluppuram',
  viluppuram: 'Viluppuram',
};

let lastLookupAt = 0;

const nominatim = async (params: string) => {
  const wait = 1100 - (Date.now() - lastLookupAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastLookupAt = Date.now();
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&${params}`,
    { headers: { Accept: 'application/json', 'User-Agent': 'NaturalDropsApp/1.0' } },
  );
  if (!response.ok) {
    return [];
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
};

const rankPlace = (row: any) => {
  const kind = `${row?.class || ''} ${row?.type || ''} ${row?.addresstype || ''}`;
  if (row?.class === 'place' && /city|town|village|suburb|hamlet|municipality/.test(kind)) {
    return 5;
  }
  if (row?.class === 'place') {
    return 4;
  }
  if (/station/.test(kind)) {
    return 3;
  }
  if (/administrative|county|state_district/.test(kind)) {
    return 2;
  }
  return 0;
};

const bestPoint = (rows: any[]): (Point & { rank: number }) | null => {
  const ranked = rows
    .map((row) => ({ lat: Number(row.lat), lon: Number(row.lon), rank: rankPlace(row) }))
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon))
    .sort((a, b) => b.rank - a.rank);
  return ranked[0] || null;
};

const searchPlace = async (query: string): Promise<Point | null> => {
  const free = bestPoint(await nominatim(`q=${encodeURIComponent(query)}`));
  if (free && free.rank >= 4) {
    return free;
  }
  const parts = query.split(',').map((part) => part.trim()).filter(Boolean);
  const cityName = parts[0] || '';
  const stateName = parts.find((part) => /tamil nadu/i.test(part)) || 'Tamil Nadu';
  const city = PLACE_ALIASES[cityName.toLowerCase()] || cityName;
  const structured = bestPoint(await nominatim(
    `city=${encodeURIComponent(city)}&state=${encodeURIComponent(stateName)}&country=India`,
  ));
  if (structured && (!free || structured.rank > free.rank)) {
    return structured;
  }
  return free;
};

const placeQueries = (raw: string) => {
  const text = raw.replace(/\s+—\s+/g, ', ').replace(/\s{2,}/g, ' ').trim();
  const pin = text.match(/\b\d{6}\b/)?.[0] || '';
  const withoutDoors = text
    .replace(/\b\d+\s*\/\s*\d+\b/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,+/g, ',')
    .replace(/^\s*,|,\s*$/g, '')
    .trim();
  const bits: string[] = [];
  withoutDoors.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => {
    if (/^\d{6}$/.test(part) || /^\d+$/.test(part)) {
      return;
    }
    if (!bits.some((item) => item.toLowerCase() === part.toLowerCase())) {
      bits.push(part);
    }
  });
  const stateIndex = bits.findIndex((part) => /tamil nadu|india/i.test(part));
  const state = stateIndex >= 0 ? bits[stateIndex] : 'Tamil Nadu';
  const city = stateIndex > 0 ? bits[stateIndex - 1] : bits[bits.length - 1];
  const area = stateIndex > 1 ? bits[stateIndex - 2] : '';
  const areaQuery = [area, city, state, 'India'].filter(Boolean).join(', ');
  const cityQuery = [city, state, 'India'].filter(Boolean).join(', ');
  const streetFirst = /street|nagar|road|salai|colony|area/i.test(area);
  return Array.from(new Set([
    streetFirst ? cityQuery : areaQuery,
    streetFirst ? areaQuery : cityQuery,
    pin ? `${pin}, India` : '',
  ].filter((item) => item.length > 2)));
};

const straightKm = (start: Point, end: Point) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(end.lat - start.lat);
  const dLon = toRad(end.lon - start.lon);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(start.lat)) * Math.cos(toRad(end.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};

const geocode = async (query: string): Promise<Point | null> => {
  for (const attempt of placeQueries(query)) {
    const point = await searchPlace(attempt);
    if (point) {
      return point;
    }
  }
  return null;
};

const loadLeaflet = () => {
  const win = window as any;
  if (win.L) {
    return Promise.resolve(win.L);
  }
  if (!document.querySelector('link[data-leaflet]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.setAttribute('data-leaflet', '1');
    document.head.appendChild(css);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const L = (window as any).L;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      resolve(L);
    };
    script.onerror = () => reject(new Error('Map library failed'));
    document.body.appendChild(script);
  });
};

export const SellerMapScreen = () => {
  const { user } = useAuth();
  const { data: buyers = [] } = useGetShopBuyersQuery();
  const sellerAddress = joinAddress([
    user?.houseDoorNo,
    user?.streetArea,
    user?.city,
    user?.district,
    user?.state,
    user?.pincode,
  ]);
  const fromReady = useRef(false);
  const [fromAddress, setFromAddress] = useState(sellerAddress);
  const [fromName, setFromName] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [toName, setToName] = useState('');
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([]);
  const [fromPoint, setFromPoint] = useState<Point | null>(null);
  const [toPoint, setToPoint] = useState<Point | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [finding, setFinding] = useState(false);
  const leafletMap = useRef<any>(null);
  const skipPlaceLookup = useRef(false);

  useEffect(() => {
    if (!fromReady.current && sellerAddress) {
      setFromAddress(sellerAddress);
      fromReady.current = true;
    }
  }, [sellerAddress]);

  const addressBook = useMemo(() => {
    const seller = sellerAddress
      ? [{ id: 'seller', name: user?.fullName || user?.username || 'Seller address', address: sellerAddress }]
      : [];
    const saved = buyers
      .map((buyer) => {
        const name = buyer.fullName || buyer.username || 'Buyer';
        const address = joinAddress([buyer.houseDoorNo, buyer.streetArea, buyer.city, buyer.district, buyer.state, buyer.pincode]);
        return { id: String(buyer.id), name, address };
      })
      .filter((buyer) => buyer.address);
    return [...seller, ...saved];
  }, [buyers, sellerAddress, user?.fullName, user?.username]);

  const matchAddresses = (raw: string) => {
    const query = raw.trim().toLowerCase();
    const untouched = query === sellerAddress.trim().toLowerCase();
    return addressBook
      .filter((item) => untouched || !query || `${item.name} ${item.address}`.toLowerCase().includes(query))
      .slice(0, 6);
  };

  const fromSuggestions = matchAddresses(fromAddress);
  const toSuggestions = matchAddresses(toAddress);

  useEffect(() => {
    const text = activeField === 'from' ? fromAddress : activeField === 'to' ? toAddress : '';
    const knownAddress = addressBook.some((item) => item.address.toLowerCase() === text.trim().toLowerCase());
    if (!activeField || skipPlaceLookup.current || knownAddress || text.trim().length < 3) {
      setPlaceSuggestions([]);
      return undefined;
    }
    setPlaceSuggestions([]);
    let cancelled = false;
    const timer = setTimeout(async () => {
      const rows = await nominatim(`q=${encodeURIComponent(text.trim())}`);
      if (cancelled) {
        return;
      }
      const names = rows
        .map((row) => String(row.display_name || '').trim())
        .filter((name) => name && !addressBook.some((item) => item.address.toLowerCase() === name.toLowerCase()))
        .slice(0, 4);
      setPlaceSuggestions(names);
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeField, fromAddress, toAddress, addressBook]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }
    let cancelled = false;
    const draw = async () => {
      const L = await loadLeaflet();
      const node = document.getElementById('seller-route-map');
      if (cancelled || !node) {
        return;
      }
      if (!leafletMap.current) {
        leafletMap.current = L.map(node).setView([11.7, 79.4], 8);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(leafletMap.current);
      }
      const map = leafletMap.current;
      map.eachLayer((layer: any) => {
        if (!layer._url) {
          map.removeLayer(layer);
        }
      });
      if (fromPoint) {
        L.marker([fromPoint.lat, fromPoint.lon]).addTo(map).bindPopup('From');
      }
      if (toPoint) {
        L.marker([toPoint.lat, toPoint.lon]).addTo(map).bindPopup('To');
      }
      if (fromPoint && toPoint) {
        let usedRoad = false;
        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${fromPoint.lon},${fromPoint.lat};${toPoint.lon},${toPoint.lat}?overview=full&geometries=geojson`,
          );
          const data = await response.json();
          const route = data?.routes?.[0];
          const line = route?.geometry?.coordinates;
          const roadKm = typeof route?.distance === 'number' ? route.distance / 1000 : null;
          if (!cancelled && roadKm != null) {
            usedRoad = true;
            setDistanceKm(roadKm);
          }
          if (line?.length) {
            const latLngs = line.map((pair: number[]) => [pair[1], pair[0]]);
            L.polyline(latLngs, { color: '#0232AA', weight: 5 }).addTo(map);
            map.fitBounds(latLngs, { padding: [24, 24] });
            setTimeout(() => map.invalidateSize(), 200);
            return;
          }
        } catch {
          // Markers still show when the road route is unavailable.
        }
        if (!cancelled && !usedRoad) {
          setDistanceKm(straightKm(fromPoint, toPoint));
        }
        map.fitBounds([[fromPoint.lat, fromPoint.lon], [toPoint.lat, toPoint.lon]], { padding: [24, 24] });
        setTimeout(() => map.invalidateSize(), 200);
        return;
      }
      const point = toPoint || fromPoint;
      if (point) {
        map.setView([point.lat, point.lon], 13);
      }
      setTimeout(() => map.invalidateSize(), 200);
    };
    draw();
    return () => {
      cancelled = true;
    };
  }, [fromPoint, toPoint]);

  const showRoute = async (nextTo = toAddress, nextFrom = fromAddress) => {
    if (!nextFrom.trim()) {
      showErrorToast('Enter the From address');
      return;
    }
    if (!nextTo.trim()) {
      showErrorToast('Enter the To address');
      return;
    }
    setFinding(true);
    setActiveField(null);
    setPlaceSuggestions([]);
    setDistanceKm(null);
    try {
      const start = await geocode(nextFrom.trim());
      if (!start) {
        showErrorToast('Could not find the From address');
        return;
      }
      const end = await geocode(nextTo.trim());
      if (!end) {
        showErrorToast('Could not find the To address');
        return;
      }
      setFromPoint(start);
      setToPoint(end);
    } catch {
      showErrorToast('Could not load the route');
    } finally {
      setFinding(false);
    }
  };

  const pickAddress = (field: 'from' | 'to', name: string, address: string) => {
    skipPlaceLookup.current = true;
    setPlaceSuggestions([]);
    setActiveField(null);
    if (field === 'from') {
      setFromName(name);
      setFromAddress(address);
      if (toAddress.trim()) {
        showRoute(toAddress, address);
      }
      return;
    }
    setToName(name);
    setToAddress(address);
    showRoute(address, fromAddress);
  };

  const suggestionList = (field: 'from' | 'to', saved: Array<{ id: string; name: string; address: string }>) => {
    if (activeField !== field || (saved.length === 0 && placeSuggestions.length === 0)) {
      return null;
    }
    return (
      <ScrollView style={styles.suggestions} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {saved.map((item) => (
          <TouchableOpacity
            key={`${field}-${item.id}`}
            style={styles.suggestion}
            onPress={() => pickAddress(field, item.name, item.address)}
          >
            <Text style={styles.suggestionName}>{item.name}</Text>
            <Text style={styles.suggestionAddress}>{item.address}</Text>
          </TouchableOpacity>
        ))}
        {placeSuggestions.map((place) => (
          <TouchableOpacity
            key={`${field}-${place}`}
            style={styles.suggestion}
            onPress={() => pickAddress(field, '', place)}
          >
            <Text style={styles.suggestionAddress}>{place}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.label}>From</Text>
        <TextInput
          style={styles.input}
          value={fromName ? `${fromName} — ${fromAddress}` : fromAddress}
          onChangeText={(text) => {
            skipPlaceLookup.current = false;
            setFromName('');
            setFromAddress(text);
            setDistanceKm(null);
            setActiveField('from');
          }}
          onFocus={() => setActiveField('from')}
          placeholder="Seller address or buyer name"
          placeholderTextColor={colors.textSecondary}
        />
        {suggestionList('from', fromSuggestions)}
        <TouchableOpacity onPress={() => {
          skipPlaceLookup.current = true;
          setFromName('');
          setFromAddress(sellerAddress);
          setActiveField(null);
        }}>
          <Text style={styles.change}>Reset to seller address</Text>
        </TouchableOpacity>

        <Text style={styles.label}>To</Text>
        <TextInput
          style={styles.input}
          value={toName ? `${toName} — ${toAddress}` : toAddress}
          onChangeText={(text) => {
            skipPlaceLookup.current = false;
            setToName('');
            setToAddress(text);
            setDistanceKm(null);
            setActiveField('to');
          }}
          onFocus={() => setActiveField('to')}
          placeholder="Buyer name or another address"
          placeholderTextColor={colors.textSecondary}
        />
        {suggestionList('to', toSuggestions)}
        <Button title={finding ? 'Finding route…' : 'Show route'} onPress={() => showRoute()} disabled={finding} />
        {distanceKm != null && (
          <View style={styles.distanceBox}>
            <Text style={styles.distanceValue}>{distanceKm.toFixed(1)} km</Text>
            <Text style={styles.distanceLabel}>Distance</Text>
          </View>
        )}
        <Text style={styles.hint}>Door number is not on the map. The route uses the town area.</Text>
      </View>
      {Platform.OS === 'web' ? (
        <View nativeID="seller-route-map" style={styles.map} />
      ) : (
        <View style={styles.nativeNote}>
          <Text style={styles.suggestionAddress}>Open this map in the browser to see the route.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  panel: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    color: colors.textPrimary,
    backgroundColor: colors.gray50,
  },
  distanceBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  distanceValue: {
    color: colors.white,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
  },
  distanceLabel: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.sm,
  },
  change: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  suggestions: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xs,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  suggestion: {
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionName: { color: colors.textPrimary, fontWeight: typography.fontWeight.bold },
  suggestionAddress: { color: colors.textSecondary, marginTop: 2 },
  map: { flex: 1, minHeight: 360 },
  nativeNote: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});
