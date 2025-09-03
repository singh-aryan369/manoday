import { 
  CreateJournalRequest, 
  UpdateJournalRequest, 
  DeleteJournalRequest, 
  ListJournalsRequest, 
  ReadJournalRequest,
  CreateJournalResponse,
  UpdateJournalResponse,
  DeleteJournalResponse,
  ListJournalsResponse,
  ReadJournalResponse,
  JournalResponse
} from '../types/JournalTypes';
import { journalConfig } from '../config/journalConfig';

export class JournalService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = journalConfig.api.baseUrl;
  }

  /**
   * Create a new journal entry
   */
  async createJournal(request: CreateJournalRequest): Promise<CreateJournalResponse> {
    try {
      console.log('🔗 JournalService: Creating journal entry', {
        url: `${this.baseUrl}?action=create`,
        request: request
      });

      const response = await fetch(`${this.baseUrl}?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': request.userId
        },
        body: JSON.stringify({
          title: request.title,
          content: request.content,
          userId: request.userId
        })
      });

      console.log('🔗 JournalService: Response status:', response.status);
      console.log('🔗 JournalService: Response headers:', response.headers);

      const data = await response.json();
      console.log('🔗 JournalService: Response data:', data);
      
      return data;
    } catch (error) {
      console.error('🔗 JournalService: Error creating journal entry:', error);
      return {
        success: false,
        error: 'Failed to create journal entry'
      };
    }
  }

  /**
   * Read a specific journal entry
   */
  async readJournal(request: ReadJournalRequest): Promise<ReadJournalResponse> {
    try {
      const response = await fetch(`${this.baseUrl}?action=read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': request.userId
        },
        body: JSON.stringify({
          journalId: request.journalId,
          userId: request.userId
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error reading journal entry:', error);
      return {
        success: false,
        error: 'Failed to read journal entry'
      };
    }
  }

  /**
   * Update an existing journal entry
   */
  async updateJournal(request: UpdateJournalRequest): Promise<UpdateJournalResponse> {
    try {
      const response = await fetch(`${this.baseUrl}?action=update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': request.userId
        },
        body: JSON.stringify({
          journalId: request.journalId,
          title: request.title,
          content: request.content,
          userId: request.userId
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating journal entry:', error);
      return {
        success: false,
        error: 'Failed to update journal entry'
      };
    }
  }

  /**
   * Delete a journal entry
   */
  async deleteJournal(request: DeleteJournalRequest): Promise<DeleteJournalResponse> {
    try {
      const response = await fetch(`${this.baseUrl}?action=delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': request.userId
        },
        body: JSON.stringify({
          journalId: request.journalId,
          userId: request.userId
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      return {
        success: false,
        error: 'Failed to delete journal entry'
      };
    }
  }

  /**
   * List all journal entries for a user
   */
  async listJournals(request: ListJournalsRequest): Promise<ListJournalsResponse> {
    try {
      console.log('🔗 JournalService: Listing journals', {
        url: `${this.baseUrl}?action=list`,
        request: request
      });

      const response = await fetch(`${this.baseUrl}?action=list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': request.userId
        },
        body: JSON.stringify({
          userId: request.userId,
          limit: request.limit,
          offset: request.offset
        })
      });

      console.log('🔗 JournalService: List response status:', response.status);

      const data = await response.json();
      console.log('🔗 JournalService: List response data:', data);
      
      return data;
    } catch (error) {
      console.error('🔗 JournalService: Error listing journal entries:', error);
      return {
        success: false,
        error: 'Failed to list journal entries'
      };
    }
  }

  /**
   * Health check for journal service
   */
  async healthCheck(): Promise<JournalResponse> {
    try {
      const response = await fetch(`${this.baseUrl}?action=health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking journal service health:', error);
      return {
        success: false,
        error: 'Failed to check journal service health'
      };
    }
  }
}
