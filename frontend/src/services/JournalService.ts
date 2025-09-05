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
import { ClientEncryptionService, EncryptedData } from './ClientEncryptionService';

export class JournalService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = journalConfig.api.baseUrl;
  }

  /**
   * Create a new journal entry with client-side encryption
   * Password is never sent to server
   */
  async createJournalEncrypted(
    title: string,
    content: string,
    userId: string,
    userPassword: string
  ): Promise<CreateJournalResponse> {
    try {
      console.log('🔐 JournalService: Creating encrypted journal entry');

      // Encrypt the data client-side
      const encryptedData = await ClientEncryptionService.encryptData(
        JSON.stringify({ title, content }),
        userId,
        userPassword
      );

      console.log('🔐 JournalService: Data encrypted, sending to server');

      const response = await fetch(`${this.baseUrl}?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          encryptedData: encryptedData.encryptedData,
          iv: encryptedData.iv,
          salt: encryptedData.salt,
          userId: userId
        })
      });

      const data = await response.json();
      console.log('🔐 JournalService: Encrypted journal created:', data);
      
      return data;
    } catch (error) {
      console.error('🔐 JournalService: Error creating encrypted journal:', error);
      return {
        success: false,
        error: 'Failed to create encrypted journal entry'
      };
    }
  }

  /**
   * Read a journal entry and decrypt it client-side
   * Password is never sent to server
   */
  async readJournalEncrypted(
    journalId: string,
    userId: string,
    userPassword: string
  ): Promise<{ success: boolean; data?: { title: string; content: string }; error?: string }> {
    try {
      console.log('🔐 JournalService: Reading encrypted journal entry');

      // Get encrypted data from server
      const response = await fetch(`${this.baseUrl}?action=read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          journalId: journalId,
          userId: userId
        })
      });

      const serverData = await response.json();
      
      if (!serverData.success) {
        return { success: false, error: serverData.error };
      }

      // Check if this is old format (server-side encrypted) or new format (client-side encrypted)
      if (serverData.data.salt) {
        // New format - client-side encrypted with salt
        console.log('🔐 Using new client-side decryption method');
        const encryptedData: EncryptedData = {
          encryptedData: serverData.data.encryptedData,
          iv: serverData.data.iv,
          salt: serverData.data.salt
        };

        const decryptedData = await ClientEncryptionService.decryptData(
          encryptedData,
          userId,
          userPassword
        );

        const { title, content } = JSON.parse(decryptedData);

        console.log('🔐 JournalService: Journal decrypted successfully (new format)');

        return {
          success: true,
          data: { title, content }
        };
      } else if (serverData.data.encryptedData && serverData.data.iv) {
        // Old format - server-side encrypted, decrypt client-side
        console.log('🔐 Using old format client-side decryption method');
        
        try {
          const decryptedData = await ClientEncryptionService.decryptOldFormatData(
            serverData.data.encryptedData,
            serverData.data.iv,
            userId
          );

          const { title, content } = JSON.parse(decryptedData);

          console.log('🔐 JournalService: Old format journal decrypted successfully');

          return {
            success: true,
            data: { title, content }
          };
        } catch (error) {
          console.error('🔐 JournalService: Failed to decrypt old format journal:', error);
          return {
            success: false,
            error: 'Failed to decrypt old format journal - wrong password?'
          };
        }
      } else {
        // Fallback - no data available
        console.log('🔐 No journal data available');
        return {
          success: false,
          error: 'No journal data found'
        };
      }
    } catch (error) {
      console.error('🔐 JournalService: Error reading encrypted journal:', error);
      return {
        success: false,
        error: 'Failed to decrypt journal entry - wrong password?'
      };
    }
  }

  /**
   * Update a journal entry with client-side encryption
   * Password is never sent to server
   */
  async updateJournalEncrypted(
    journalId: string,
    title: string,
    content: string,
    userId: string,
    userPassword: string
  ): Promise<UpdateJournalResponse> {
    try {
      console.log('🔐 JournalService: Updating encrypted journal entry');

      // Encrypt the data client-side
      const encryptedData = await ClientEncryptionService.encryptData(
        JSON.stringify({ title, content }),
        userId,
        userPassword
      );

      const response = await fetch(`${this.baseUrl}?action=update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          journalId: journalId,
          encryptedData: encryptedData.encryptedData,
          iv: encryptedData.iv,
          salt: encryptedData.salt,
          userId: userId
        })
      });

      const data = await response.json();
      console.log('🔐 JournalService: Encrypted journal updated:', data);
      
      return data;
    } catch (error) {
      console.error('🔐 JournalService: Error updating encrypted journal:', error);
      return {
        success: false,
        error: 'Failed to update encrypted journal entry'
      };
    }
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
