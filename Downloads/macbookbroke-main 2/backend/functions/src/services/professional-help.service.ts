import { HelplineCenter, HelplineSearchRequest } from '../types/professional-help.types';
import { config } from '../config';
import { logger } from '../utils/logger';

export class ProfessionalHelpService {
  private googleMapsApiKey: string;

  constructor() {
    this.googleMapsApiKey = config.googleMaps?.apiKey || '';
  }

  /**
   * Get nearby helpline centers based on user location
   */
  async getNearbyHelplines(searchRequest: HelplineSearchRequest): Promise<HelplineCenter[]> {
    try {
      const { latitude, longitude, radius = 25, limit = 20 } = searchRequest;

      logger.info('Searching for nearby helplines', {
        latitude,
        longitude,
        radius,
        limit
      });

      // Try Google Places API first if API key is available
      if (this.googleMapsApiKey && this.googleMapsApiKey.length > 10) {
        try {
          const googleResults = await this.searchGooglePlaces(latitude, longitude, radius * 1000); // Convert km to meters
          if (googleResults.length > 0) {
            logger.info('Found helplines via Google Places API', { count: googleResults.length });
            return googleResults.slice(0, limit);
          }
        } catch (error) {
          logger.warn('Google Places API failed, falling back to hardcoded data', error);
        }
      }

      // Fallback to hardcoded helplines
      const fallbackHelplines = this.getFallbackHelplines(latitude, longitude, radius);
      logger.info('Using fallback helplines', { count: fallbackHelplines.length });
      
      return fallbackHelplines.slice(0, limit);

    } catch (error) {
      logger.error('Error in getNearbyHelplines:', error);
      throw error;
    }
  }

  /**
   * Get helpline centers by city
   */
  async getHelplinesByCity(city: string, state?: string): Promise<HelplineCenter[]> {
    try {
      logger.info('Searching for helplines by city', { city, state });

      // For now, return national helplines as they're available everywhere
      // In a real implementation, you might have a database of city-specific helplines
      const nationalHelplines = this.getNationalHelplines();
      
      // Filter or modify based on city if needed
      return nationalHelplines;

    } catch (error) {
      logger.error('Error in getHelplinesByCity:', error);
      throw error;
    }
  }

  /**
   * Get national helpline numbers
   */
  async getNationalHelplines(): Promise<HelplineCenter[]> {
    try {
      logger.info('Fetching national helplines');
      return this.getNationalHelplinesData();

    } catch (error) {
      logger.error('Error in getNationalHelplines:', error);
      throw error;
    }
  }

  /**
   * Search Google Places API for mental health centers
   */
  private async searchGooglePlaces(latitude: number, longitude: number, radius: number): Promise<HelplineCenter[]> {
    try {
      const searchQueries = [
        'mental health crisis center',
        'suicide prevention center',
        'mental health helpline',
        'crisis intervention center',
        'mental health support center'
      ];

      const allResults: HelplineCenter[] = [];

      for (const query of searchQueries) {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' India')}&location=${latitude},${longitude}&radius=${radius}&key=${this.googleMapsApiKey}`;
          
          const response = await fetch(url);
          
          if (!response.ok) {
            logger.warn(`Google Places API error for query "${query}":`, response.status);
            continue;
          }

          const data = await response.json();
          
          if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            logger.warn(`Google Places API error for query "${query}":`, data.status);
            continue;
          }

          if (data.results && data.results.length > 0) {
            // Filter to only include Indian results
            const indianResults = data.results.filter((place: any) => 
              place.formatted_address && place.formatted_address.includes('India')
            );
            
            if (indianResults.length > 0) {
              const centers = await Promise.all(
                indianResults.map((place: any) => this.convertGooglePlaceToHelplineCenter(place, latitude, longitude))
              );
              allResults.push(...centers);
            }
          }

        } catch (error) {
          logger.warn(`Error searching Google Places for query "${query}":`, error);
          continue;
        }
      }

      // Remove duplicates based on place_id
      const uniqueResults = allResults.filter((center, index, self) => 
        index === self.findIndex(c => c.id === center.id)
      );

      return uniqueResults;

    } catch (error) {
      logger.error('Error in searchGooglePlaces:', error);
      throw error;
    }
  }

  /**
   * Convert Google Places result to HelplineCenter
   */
  private async convertGooglePlaceToHelplineCenter(place: any, userLat: number, userLng: number): Promise<HelplineCenter> {
    const distance = this.calculateDistance(userLat, userLng, place.geometry.location.lat, place.geometry.location.lng);
    
    // Get detailed place information including phone number
    let phoneNumber = 'Contact for details';
    let website = place.website;
    
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,website,opening_hours&key=${this.googleMapsApiKey}`;
      const detailsResponse = await fetch(detailsUrl);
      
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        if (detailsData.result) {
          phoneNumber = detailsData.result.formatted_phone_number || 'Contact for details';
          website = detailsData.result.website || place.website;
        }
      }
    } catch (error) {
      logger.warn('Failed to get place details:', error);
    }
    
    return {
      id: `google-${place.place_id}`,
      name: place.name,
      address: place.formatted_address,
      phoneNumber,
      website,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      distance,
      specialties: this.extractSpecialties(place.types),
      is24Hours: place.opening_hours?.open_now || false,
      description: 'Mental health support center found via Google Places'
    };
  }

  /**
   * Extract specialties from Google Places types
   */
  private extractSpecialties(types: string[]): string[] {
    const specialtyMap: { [key: string]: string } = {
      'hospital': 'Medical Support',
      'health': 'Health Services',
      'establishment': 'General Support',
      'point_of_interest': 'Support Services'
    };

    return types
      .map(type => specialtyMap[type])
      .filter(specialty => specialty)
      .slice(0, 3); // Limit to 3 specialties
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
   * Get fallback helplines when API is unavailable
   */
  private getFallbackHelplines(latitude: number, longitude: number, radius: number): HelplineCenter[] {
    const nationalHelplines = this.getNationalHelplinesData();
    
    // Add distance calculation for national helplines
    return nationalHelplines.map(center => ({
      ...center,
      latitude,
      longitude,
      distance: 0 // National helplines are available everywhere
    }));
  }

  /**
   * Get national helplines data
   */
  private getNationalHelplinesData(): HelplineCenter[] {
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
        name: 'iCall Psychosocial Helpline',
        address: 'Available Pan India',
        phoneNumber: '9152987821',
        website: 'https://icallhelpline.org',
        latitude: 19.0760,
        longitude: 72.8777,
        specialties: ['Psychosocial Support', 'Mental Health Counseling', 'Crisis Intervention'],
        is24Hours: false,
        description: 'Professional mental health counseling and support services'
      },
      {
        id: 'national-4',
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
        id: 'national-5',
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
        id: 'national-6',
        name: 'National Commission for Women Helpline',
        address: 'Available Pan India',
        phoneNumber: '181',
        website: 'https://ncw.nic.in',
        latitude: 28.6139,
        longitude: 77.2090,
        specialties: ['Women Safety', 'Domestic Violence', 'Legal Support'],
        is24Hours: true,
        description: '24/7 helpline for women in distress and domestic violence cases'
      },
      {
        id: 'national-7',
        name: 'Childline India Foundation',
        address: 'Available Pan India',
        phoneNumber: '1098',
        website: 'https://www.childlineindia.org',
        latitude: 28.6139,
        longitude: 77.2090,
        specialties: ['Child Protection', 'Child Abuse Prevention', 'Child Welfare'],
        is24Hours: true,
        description: '24/7 helpline for children in need of care and protection'
      },
      {
        id: 'national-8',
        name: 'National Mental Health Helpline',
        address: 'Available Pan India',
        phoneNumber: '080-46110007',
        website: 'https://www.nimhans.ac.in',
        latitude: 12.9716,
        longitude: 77.5946,
        specialties: ['Mental Health Support', 'Psychiatric Care', 'Crisis Intervention'],
        is24Hours: true,
        description: 'Professional mental health support by NIMHANS'
      },
      {
        id: 'national-9',
        name: 'Roshni Helpline',
        address: 'Available Pan India',
        phoneNumber: '040-66202000 / 040-66202001',
        website: 'https://www.roshnihelpline.org',
        latitude: 17.3850,
        longitude: 78.4867,
        specialties: ['Crisis Support', 'Mental Health', 'Emotional Support'],
        is24Hours: true,
        description: '24/7 crisis support and mental health helpline'
      },
      {
        id: 'national-10',
        name: 'Sumaitri Suicide Prevention Centre',
        address: 'Available Pan India',
        phoneNumber: '011-23389090',
        website: 'https://www.sumaitri.net',
        latitude: 28.6139,
        longitude: 77.2090,
        specialties: ['Suicide Prevention', 'Crisis Intervention', 'Mental Health Support'],
        is24Hours: true,
        description: '24/7 suicide prevention and emotional support services'
      }
    ];
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<any> {
    try {
      const hasGoogleMapsKey = this.googleMapsApiKey && this.googleMapsApiKey.length > 10;
      
      return {
        googleMapsConfigured: hasGoogleMapsKey,
        fallbackDataAvailable: true,
        nationalHelplinesCount: this.getNationalHelplinesData().length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error in health check:', error);
      throw error;
    }
  }
}
