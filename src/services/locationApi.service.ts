/**
 * Location API Service for India
 * Handles pincode lookup and location autocomplete
 */

export interface PincodeLocation {
  pincode: string;
  city: string;
  district: string;
  state: string;
  country: string;
}

export interface LocationSuggestion {
  name: string;
  type: 'city' | 'district' | 'state';
  state?: string;
}

export interface PincodeSuggestion {
  pincode: string;
  name: string;
  displayName: string;
  city: string;
  district: string;
  state: string;
}

class LocationApiService {
  private cache: Map<string, PincodeLocation> = new Map();
  private suggestionCache: Map<string, LocationSuggestion[]> = new Map();

  /**
   * Fetch location details from pincode
   * Uses postalpincode.in API (free, no API key required)
   */
  async getLocationByPincode(pincode: string): Promise<PincodeLocation | null> {
    if (!pincode || pincode.length !== 6) {
      return null;
    }

    // Check cache first
    if (this.cache.has(pincode)) {
      return this.cache.get(pincode)!;
    }

    try {
      // Use postalpincode.in API (free, India-specific)
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Pincode lookup failed');
      }

      const data = await response.json();

      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOffice = data[0].PostOffice[0];
        const location: PincodeLocation = {
          pincode: pincode,
          city: postOffice.District || postOffice.Name || '',
          district: postOffice.District || '',
          state: postOffice.State || '',
          country: postOffice.Country || 'India',
        };

        // Cache the result
        this.cache.set(pincode, location);
        return location;
      }

      return null;
    } catch (error) {
      console.error('Error fetching pincode location:', error);
      return null;
    }
  }

  async getPincodeSuggestions(pincode: string): Promise<PincodeSuggestion[]> {
    if (!pincode || pincode.length !== 6) {
      return [];
    }

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      if (!data || !data[0] || data[0].Status !== 'Success' || !data[0].PostOffice) {
        return [];
      }
      return data[0].PostOffice.map((office: any) => {
        const city = office.Block || office.Name || office.District || '';
        const district = office.District || '';
        const state = office.State || '';
        return {
          pincode,
          name: pincode,
          displayName: `${pincode} • ${office.Name || city}${district ? `, ${district}` : ''}${state ? `, ${state}` : ''}`,
          city,
          district,
          state,
        };
      });
    } catch (error) {
      console.error('Error fetching pincode suggestions:', error);
      return [];
    }
  }

  /**
   * Get autocomplete suggestions for cities/districts/states in India
   * Uses a curated list of Indian locations
   */
  async getLocationSuggestions(
    query: string,
    type: 'city' | 'district' | 'state'
  ): Promise<LocationSuggestion[]> {
    if (!query || query.length < 1) {
      return [];
    }

    const cacheKey = `${type}-${query.toLowerCase()}`;
    if (this.suggestionCache.has(cacheKey)) {
      return this.suggestionCache.get(cacheKey)!;
    }

    try {
      // Use a curated list of Indian locations
      // For production, you might want to use a more comprehensive API or database
      const locations = this.getIndianLocations(type);
      
      const queryLower = query.toLowerCase();
      const suggestions = locations
        .filter(loc => loc.name.toLowerCase().startsWith(queryLower))
        .slice(0, 10) // Limit to 10 suggestions
        .map(loc => ({
          name: loc.name,
          type: loc.type,
          state: loc.state,
        }));

      // Cache the result
      this.suggestionCache.set(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      return [];
    }
  }

  /**
   * Get curated list of Indian locations
   * This is a basic list - for production, use a comprehensive database or API
   */
  private getIndianLocations(type: 'city' | 'district' | 'state'): LocationSuggestion[] {
    // Major Indian states
    const states: LocationSuggestion[] = [
      { name: 'Andhra Pradesh', type: 'state' },
      { name: 'Arunachal Pradesh', type: 'state' },
      { name: 'Assam', type: 'state' },
      { name: 'Bihar', type: 'state' },
      { name: 'Chhattisgarh', type: 'state' },
      { name: 'Goa', type: 'state' },
      { name: 'Gujarat', type: 'state' },
      { name: 'Haryana', type: 'state' },
      { name: 'Himachal Pradesh', type: 'state' },
      { name: 'Jharkhand', type: 'state' },
      { name: 'Karnataka', type: 'state' },
      { name: 'Kerala', type: 'state' },
      { name: 'Madhya Pradesh', type: 'state' },
      { name: 'Maharashtra', type: 'state' },
      { name: 'Manipur', type: 'state' },
      { name: 'Meghalaya', type: 'state' },
      { name: 'Mizoram', type: 'state' },
      { name: 'Nagaland', type: 'state' },
      { name: 'Odisha', type: 'state' },
      { name: 'Punjab', type: 'state' },
      { name: 'Rajasthan', type: 'state' },
      { name: 'Sikkim', type: 'state' },
      { name: 'Tamil Nadu', type: 'state' },
      { name: 'Telangana', type: 'state' },
      { name: 'Tripura', type: 'state' },
      { name: 'Uttar Pradesh', type: 'state' },
      { name: 'Uttarakhand', type: 'state' },
      { name: 'West Bengal', type: 'state' },
      { name: 'Delhi', type: 'state' },
      { name: 'Puducherry', type: 'state' },
    ];

    // Major cities and districts (sample - expand as needed)
    const cities: LocationSuggestion[] = [
      { name: 'Mumbai', type: 'city', state: 'Maharashtra' },
      { name: 'Delhi', type: 'city', state: 'Delhi' },
      { name: 'Bangalore', type: 'city', state: 'Karnataka' },
      { name: 'Hyderabad', type: 'city', state: 'Telangana' },
      { name: 'Chennai', type: 'city', state: 'Tamil Nadu' },
      { name: 'Kolkata', type: 'city', state: 'West Bengal' },
      { name: 'Pune', type: 'city', state: 'Maharashtra' },
      { name: 'Ahmedabad', type: 'city', state: 'Gujarat' },
      { name: 'Jaipur', type: 'city', state: 'Rajasthan' },
      { name: 'Surat', type: 'city', state: 'Gujarat' },
      { name: 'Lucknow', type: 'city', state: 'Uttar Pradesh' },
      { name: 'Kanpur', type: 'city', state: 'Uttar Pradesh' },
      { name: 'Nagpur', type: 'city', state: 'Maharashtra' },
      { name: 'Indore', type: 'city', state: 'Madhya Pradesh' },
      { name: 'Thane', type: 'city', state: 'Maharashtra' },
      { name: 'Bhopal', type: 'city', state: 'Madhya Pradesh' },
      { name: 'Visakhapatnam', type: 'city', state: 'Andhra Pradesh' },
      { name: 'Patna', type: 'city', state: 'Bihar' },
      { name: 'Vadodara', type: 'city', state: 'Gujarat' },
      { name: 'Ghaziabad', type: 'city', state: 'Uttar Pradesh' },
      { name: 'Ludhiana', type: 'city', state: 'Punjab' },
      { name: 'Agra', type: 'city', state: 'Uttar Pradesh' },
      { name: 'Nashik', type: 'city', state: 'Maharashtra' },
      { name: 'Faridabad', type: 'city', state: 'Haryana' },
      { name: 'Meerut', type: 'city', state: 'Uttar Pradesh' },
      { name: 'Rajkot', type: 'city', state: 'Gujarat' },
      { name: 'Varanasi', type: 'city', state: 'Uttar Pradesh' },
      { name: 'Srinagar', type: 'city', state: 'Jammu and Kashmir' },
      { name: 'Amritsar', type: 'city', state: 'Punjab' },
      { name: 'Chandigarh', type: 'city', state: 'Chandigarh' },
      { name: 'Coimbatore', type: 'city', state: 'Tamil Nadu' },
      { name: 'Madurai', type: 'city', state: 'Tamil Nadu' },
      { name: 'Tiruchirappalli', type: 'city', state: 'Tamil Nadu' },
      { name: 'Salem', type: 'city', state: 'Tamil Nadu' },
      { name: 'Tirunelveli', type: 'city', state: 'Tamil Nadu' },
      { name: 'Erode', type: 'city', state: 'Tamil Nadu' },
      { name: 'Vellore', type: 'city', state: 'Tamil Nadu' },
      { name: 'Dindigul', type: 'city', state: 'Tamil Nadu' },
      { name: 'Thanjavur', type: 'city', state: 'Tamil Nadu' },
      { name: 'Hosur', type: 'city', state: 'Tamil Nadu' },
      { name: 'Nagercoil', type: 'city', state: 'Tamil Nadu' },
    ];

    // Districts (sample - expand as needed)
    const districts: LocationSuggestion[] = [
      { name: 'Chennai', type: 'district', state: 'Tamil Nadu' },
      { name: 'Coimbatore', type: 'district', state: 'Tamil Nadu' },
      { name: 'Madurai', type: 'district', state: 'Tamil Nadu' },
      { name: 'Tiruchirappalli', type: 'district', state: 'Tamil Nadu' },
      { name: 'Salem', type: 'district', state: 'Tamil Nadu' },
      { name: 'Tirunelveli', type: 'district', state: 'Tamil Nadu' },
      { name: 'Erode', type: 'district', state: 'Tamil Nadu' },
      { name: 'Vellore', type: 'district', state: 'Tamil Nadu' },
      { name: 'Dindigul', type: 'district', state: 'Tamil Nadu' },
      { name: 'Thanjavur', type: 'district', state: 'Tamil Nadu' },
      { name: 'Kanchipuram', type: 'district', state: 'Tamil Nadu' },
      { name: 'Chengalpattu', type: 'district', state: 'Tamil Nadu' },
      { name: 'Villupuram', type: 'district', state: 'Tamil Nadu' },
      { name: 'Cuddalore', type: 'district', state: 'Tamil Nadu' },
      { name: 'Nagapattinam', type: 'district', state: 'Tamil Nadu' },
      { name: 'Thiruvallur', type: 'district', state: 'Tamil Nadu' },
      { name: 'Krishnagiri', type: 'district', state: 'Tamil Nadu' },
      { name: 'Dharmapuri', type: 'district', state: 'Tamil Nadu' },
      { name: 'Namakkal', type: 'district', state: 'Tamil Nadu' },
      { name: 'Karur', type: 'district', state: 'Tamil Nadu' },
      { name: 'Pudukkottai', type: 'district', state: 'Tamil Nadu' },
      { name: 'Sivaganga', type: 'district', state: 'Tamil Nadu' },
      { name: 'Ramanathapuram', type: 'district', state: 'Tamil Nadu' },
      { name: 'Theni', type: 'district', state: 'Tamil Nadu' },
      { name: 'Virudhunagar', type: 'district', state: 'Tamil Nadu' },
      { name: 'Tuticorin', type: 'district', state: 'Tamil Nadu' },
      { name: 'Kanyakumari', type: 'district', state: 'Tamil Nadu' },
      { name: 'Nilgiris', type: 'district', state: 'Tamil Nadu' },
      { name: 'Mumbai', type: 'district', state: 'Maharashtra' },
      { name: 'Pune', type: 'district', state: 'Maharashtra' },
      { name: 'Thane', type: 'district', state: 'Maharashtra' },
      { name: 'Nashik', type: 'district', state: 'Maharashtra' },
      { name: 'Nagpur', type: 'district', state: 'Maharashtra' },
      { name: 'Aurangabad', type: 'district', state: 'Maharashtra' },
      { name: 'Solapur', type: 'district', state: 'Maharashtra' },
      { name: 'Kolhapur', type: 'district', state: 'Maharashtra' },
      { name: 'Sangli', type: 'district', state: 'Maharashtra' },
      { name: 'Satara', type: 'district', state: 'Maharashtra' },
      { name: 'Ahmednagar', type: 'district', state: 'Maharashtra' },
      { name: 'Jalgaon', type: 'district', state: 'Maharashtra' },
      { name: 'Dhule', type: 'district', state: 'Maharashtra' },
      { name: 'Nandurbar', type: 'district', state: 'Maharashtra' },
      { name: 'Amravati', type: 'district', state: 'Maharashtra' },
      { name: 'Akola', type: 'district', state: 'Maharashtra' },
      { name: 'Washim', type: 'district', state: 'Maharashtra' },
      { name: 'Buldhana', type: 'district', state: 'Maharashtra' },
      { name: 'Yavatmal', type: 'district', state: 'Maharashtra' },
      { name: 'Wardha', type: 'district', state: 'Maharashtra' },
      { name: 'Chandrapur', type: 'district', state: 'Maharashtra' },
      { name: 'Gadchiroli', type: 'district', state: 'Maharashtra' },
      { name: 'Gondia', type: 'district', state: 'Maharashtra' },
      { name: 'Bhandara', type: 'district', state: 'Maharashtra' },
      { name: 'Raigad', type: 'district', state: 'Maharashtra' },
      { name: 'Ratnagiri', type: 'district', state: 'Maharashtra' },
      { name: 'Sindhudurg', type: 'district', state: 'Maharashtra' },
      { name: 'Palghar', type: 'district', state: 'Maharashtra' },
      { name: 'Nanded', type: 'district', state: 'Maharashtra' },
      { name: 'Hingoli', type: 'district', state: 'Maharashtra' },
      { name: 'Parbhani', type: 'district', state: 'Maharashtra' },
      { name: 'Jalna', type: 'district', state: 'Maharashtra' },
      { name: 'Latur', type: 'district', state: 'Maharashtra' },
      { name: 'Beed', type: 'district', state: 'Maharashtra' },
      { name: 'Osmanabad', type: 'district', state: 'Maharashtra' },
      { name: 'Bangalore Urban', type: 'district', state: 'Karnataka' },
      { name: 'Mysore', type: 'district', state: 'Karnataka' },
      { name: 'Hubli', type: 'district', state: 'Karnataka' },
      { name: 'Mangalore', type: 'district', state: 'Karnataka' },
      { name: 'Belgaum', type: 'district', state: 'Karnataka' },
      { name: 'Gulbarga', type: 'district', state: 'Karnataka' },
      { name: 'Hyderabad', type: 'district', state: 'Telangana' },
      { name: 'Warangal', type: 'district', state: 'Telangana' },
      { name: 'Nizamabad', type: 'district', state: 'Telangana' },
      { name: 'Karimnagar', type: 'district', state: 'Telangana' },
      { name: 'Kolkata', type: 'district', state: 'West Bengal' },
      { name: 'Howrah', type: 'district', state: 'West Bengal' },
      { name: 'Hooghly', type: 'district', state: 'West Bengal' },
      { name: 'North 24 Parganas', type: 'district', state: 'West Bengal' },
      { name: 'South 24 Parganas', type: 'district', state: 'West Bengal' },
      { name: 'Nadia', type: 'district', state: 'West Bengal' },
      { name: 'Murshidabad', type: 'district', state: 'West Bengal' },
      { name: 'Bardhaman', type: 'district', state: 'West Bengal' },
      { name: 'Birbhum', type: 'district', state: 'West Bengal' },
      { name: 'Bankura', type: 'district', state: 'West Bengal' },
      { name: 'Purulia', type: 'district', state: 'West Bengal' },
      { name: 'Medinipur', type: 'district', state: 'West Bengal' },
      { name: 'Jhargram', type: 'district', state: 'West Bengal' },
      { name: 'Alipurduar', type: 'district', state: 'West Bengal' },
      { name: 'Jalpaiguri', type: 'district', state: 'West Bengal' },
      { name: 'Darjeeling', type: 'district', state: 'West Bengal' },
      { name: 'Kalimpong', type: 'district', state: 'West Bengal' },
      { name: 'Cooch Behar', type: 'district', state: 'West Bengal' },
      { name: 'Malda', type: 'district', state: 'West Bengal' },
      { name: 'Uttar Dinajpur', type: 'district', state: 'West Bengal' },
      { name: 'Dakshin Dinajpur', type: 'district', state: 'West Bengal' },
      { name: 'Delhi', type: 'district', state: 'Delhi' },
      { name: 'New Delhi', type: 'district', state: 'Delhi' },
      { name: 'Gurgaon', type: 'district', state: 'Haryana' },
      { name: 'Faridabad', type: 'district', state: 'Haryana' },
      { name: 'Panipat', type: 'district', state: 'Haryana' },
      { name: 'Karnal', type: 'district', state: 'Haryana' },
      { name: 'Ambala', type: 'district', state: 'Haryana' },
      { name: 'Yamunanagar', type: 'district', state: 'Haryana' },
      { name: 'Kurukshetra', type: 'district', state: 'Haryana' },
      { name: 'Kaithal', type: 'district', state: 'Haryana' },
      { name: 'Jind', type: 'district', state: 'Haryana' },
      { name: 'Sonipat', type: 'district', state: 'Haryana' },
      { name: 'Rohtak', type: 'district', state: 'Haryana' },
      { name: 'Jhajjar', type: 'district', state: 'Haryana' },
      { name: 'Rewari', type: 'district', state: 'Haryana' },
      { name: 'Mahendragarh', type: 'district', state: 'Haryana' },
      { name: 'Bhiwani', type: 'district', state: 'Haryana' },
      { name: 'Hisar', type: 'district', state: 'Haryana' },
      { name: 'Fatehabad', type: 'district', state: 'Haryana' },
      { name: 'Sirsa', type: 'district', state: 'Haryana' },
      { name: 'Mewat', type: 'district', state: 'Haryana' },
      { name: 'Palwal', type: 'district', state: 'Haryana' },
      { name: 'Nuh', type: 'district', state: 'Haryana' },
    ];

    switch (type) {
      case 'state':
        return states;
      case 'city':
        return cities;
      case 'district':
        return districts;
      default:
        return [];
    }
  }

  /**
   * Clear cache (useful for testing or when data needs refresh)
   */
  clearCache() {
    this.cache.clear();
    this.suggestionCache.clear();
  }
}

export const locationApiService = new LocationApiService();

