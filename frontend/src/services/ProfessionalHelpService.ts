import { HelplineCenter, UserLocation, HelplineSearchRequest, HelplineSearchResponse } from '../types/ProfessionalHelpTypes';
import { config } from '../config/professionalHelpConfig';

class ProfessionalHelpService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api.baseUrl;
  }

  /**
   * Get nearby helpline centers based on user location
   */
  async getNearbyHelplines(location: UserLocation, radius: number = 50): Promise<HelplineCenter[]> {
    try {
      const request: HelplineSearchRequest = {
        latitude: location.latitude,
        longitude: location.longitude,
        radius,
        limit: 20
      };

      const response = await fetch(`${this.baseUrl}/professionalHelp?action=nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: HelplineSearchResponse = await response.json();
      return data.centers;

    } catch (error) {
      console.error('Error fetching nearby helplines:', error);
      
      // Fallback to hardcoded helplines if API fails
      return this.getFallbackHelplines(location);
    }
  }

  /**
   * Get helpline centers by city/region
   */
  async getHelplinesByCity(city: string, state?: string): Promise<HelplineCenter[]> {
    try {
      const response = await fetch(`${this.baseUrl}/professionalHelp?action=city`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ city, state })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: HelplineSearchResponse = await response.json();
      return data.centers;

    } catch (error) {
      console.error('Error fetching helplines by city:', error);
      return this.getFallbackHelplinesByCity(city);
    }
  }

  /**
   * Get national helpline numbers
   */
  async getNationalHelplines(): Promise<HelplineCenter[]> {
    try {
      const response = await fetch(`${this.baseUrl}/professionalHelp?action=national`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: HelplineSearchResponse = await response.json();
      return data.centers;

    } catch (error) {
      console.error('Error fetching national helplines:', error);
      return this.getFallbackNationalHelplines();
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Fallback helplines when API is unavailable
   */
  private getFallbackHelplines(location: UserLocation): HelplineCenter[] {
    const fallbackCenters: HelplineCenter[] = [
      {
        id: 'national-1',
        name: 'KIRAN Mental Health Rehabilitation Helpline',
        address: 'Available Pan India',
        phoneNumber: '1800-599-0019',
        website: 'https://www.kiranhelpline.in',
        latitude: location.latitude,
        longitude: location.longitude,
        distance: 0,
        specialties: ['Mental Health Support', 'Crisis Intervention', 'Rehabilitation'],
        is24Hours: true,
        description: '24/7 mental health rehabilitation helpline by Government of India'
      },
      {
        id: 'national-2',
        name: 'Vandrevala Foundation Helpline',
        address: 'Available Pan India',
        phoneNumber: '1860-2662-345 / 1800-2333-330',
        website: 'https://www.vandrevalafoundation.com',
        latitude: location.latitude,
        longitude: location.longitude,
        distance: 0,
        specialties: ['Crisis Support', 'Mental Health Counseling', 'Suicide Prevention'],
        is24Hours: true,
        description: 'Free mental health support and crisis intervention'
      },
      {
        id: 'national-3',
        name: 'Sneha Suicide Prevention Centre',
        address: 'Available Pan India',
        phoneNumber: '044-24640050 / 044-24640060',
        website: 'https://www.snehaindia.org',
        latitude: location.latitude,
        longitude: location.longitude,
        distance: 0,
        specialties: ['Suicide Prevention', 'Crisis Support', 'Mental Health'],
        is24Hours: true,
        description: '24/7 suicide prevention and emotional support'
      }
    ];

    return fallbackCenters;
  }

  /**
   * Fallback helplines by city
   */
  private getFallbackHelplinesByCity(city: string): HelplineCenter[] {
    // This would typically contain city-specific helplines
    // For now, return national helplines
    return this.getFallbackNationalHelplines();
  }

  /**
   * Fallback national helplines
   */
  private getFallbackNationalHelplines(): HelplineCenter[] {
    return [
      {
        id: 'national-1',
        name: 'KIRAN Mental Health Rehabilitation Helpline',
        address: 'Available Pan India',
        phoneNumber: '1800-599-0019',
        website: 'https://www.kiranhelpline.in',
        latitude: 28.6139,
        longitude: 77.2090,
        specialties: ['Mental Health Support', 'Crisis Intervention', 'Rehabilitation'],
        is24Hours: true,
        description: '24/7 mental health rehabilitation helpline by Government of India'
      },
      {
        id: 'national-2',
        name: 'Vandrevala Foundation Helpline',
        address: 'Available Pan India',
        phoneNumber: '1860-2662-345 / 1800-2333-330',
        website: 'https://www.vandrevalafoundation.com',
        latitude: 28.6139,
        longitude: 77.2090,
        specialties: ['Crisis Support', 'Mental Health Counseling', 'Suicide Prevention'],
        is24Hours: true,
        description: 'Free mental health support and crisis intervention'
      },
      {
        id: 'national-3',
        name: 'Sneha Suicide Prevention Centre',
        address: 'Available Pan India',
        phoneNumber: '044-24640050 / 044-24640060',
        website: 'https://www.snehaindia.org',
        latitude: 13.0827,
        longitude: 80.2707,
        specialties: ['Suicide Prevention', 'Crisis Support', 'Mental Health'],
        is24Hours: true,
        description: '24/7 suicide prevention and emotional support'
      },
      {
        id: 'national-4',
        name: 'AASRA Suicide Prevention Helpline',
        address: 'Available Pan India',
        phoneNumber: '91-22-27546669 / 91-22-27546668',
        website: 'https://www.aasra.info',
        latitude: 19.0760,
        longitude: 72.8777,
        specialties: ['Suicide Prevention', 'Crisis Intervention', 'Emotional Support'],
        is24Hours: true,
        description: '24/7 suicide prevention and emotional support helpline'
      },
      {
        id: 'national-5',
        name: 'National Commission for Women Helpline',
        address: 'Available Pan India',
        phoneNumber: '181',
        website: 'https://ncw.nic.in',
        latitude: 28.6139,
        longitude: 77.2090,
        specialties: ['Women Safety', 'Domestic Violence', 'Legal Support'],
        is24Hours: true,
        description: '24/7 helpline for women in distress and domestic violence cases'
      }
    ];
  }


}

export default ProfessionalHelpService;
