export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface HelplineCenter {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  website?: string;
  latitude: number;
  longitude: number;
  distance?: number; // in kilometers
  specialties?: string[];
  is24Hours: boolean;
  description?: string;
}

export interface HelplineSearchRequest {
  latitude: number;
  longitude: number;
  radius?: number; // in kilometers, default 50
  limit?: number; // default 20
}

export interface HelplineSearchResponse {
  centers: HelplineCenter[];
  totalFound: number;
  searchRadius: number;
  userLocation: UserLocation;
}

export interface GoogleMapsPlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  types: string[];
}

export interface GoogleMapsResponse {
  results: GoogleMapsPlace[];
  status: string;
  next_page_token?: string;
}
