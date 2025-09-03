import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { EncryptionService } from './encryption.service';
import { 
  JournalEntry, 
  CreateJournalRequest, 
  UpdateJournalRequest, 
  DeleteJournalRequest, 
  ListJournalsRequest, 
  ReadJournalRequest 
} from '../types/journal.types';

export class JournalService {
  private db = admin.firestore();
  private collectionName = 'journals';

  /**
   * Create a new journal entry
   */
  async createJournal(request: CreateJournalRequest): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info('Creating new journal entry', { userId: request.userId, title: request.title });

      const journalId = this.db.collection(this.collectionName).doc().id;
      const now = new Date();

      // Encrypt the journal data
      const journalData = {
        title: request.title,
        content: request.content
      };

      const { encryptedData, iv } = EncryptionService.encryptWellnessData(journalData, request.userId);

      const journalEntry: JournalEntry = {
        id: journalId,
        title: '', // Will be encrypted
        content: '', // Will be encrypted
        createdAt: now,
        updatedAt: now,
        userId: request.userId,
        isEncrypted: true,
        // Store encrypted data separately
        encryptedData,
        iv
      };

      // Store in user's subcollection
      await this.db
        .collection(this.collectionName)
        .doc(request.userId)
        .collection('entries')
        .doc(journalId)
        .set(journalEntry);

      logger.info('Journal entry created successfully', { journalId, userId: request.userId });

      return {
        success: true,
        data: {
          journalId,
          message: 'Journal entry created successfully'
        }
      };
    } catch (error) {
      logger.error('Error creating journal entry', error);
      return {
        success: false,
        error: 'Failed to create journal entry'
      };
    }
  }

  /**
   * Read a specific journal entry
   */
  async readJournal(request: ReadJournalRequest): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info('Reading journal entry', { journalId: request.journalId, userId: request.userId });

      const journalDoc = await this.db
        .collection(this.collectionName)
        .doc(request.userId)
        .collection('entries')
        .doc(request.journalId)
        .get();

      if (!journalDoc.exists) {
        return {
          success: false,
          error: 'Journal entry not found'
        };
      }

      const journalData = journalDoc.data() as JournalEntry;

      // Verify ownership
      if (journalData.userId !== request.userId) {
        return {
          success: false,
          error: 'Unauthorized access to journal entry'
        };
      }

      // Decrypt the journal data if it's encrypted
      if (journalData.isEncrypted && journalData.encryptedData && journalData.iv) {
        try {
          const decryptedData = EncryptionService.decryptWellnessData(
            journalData.encryptedData,
            journalData.iv,
            request.userId
          );

          // Update the journal data with decrypted content
          journalData.title = decryptedData.title;
          journalData.content = decryptedData.content;
        } catch (decryptError) {
          logger.error('Error decrypting journal entry', decryptError);
          return {
            success: false,
            error: 'Failed to decrypt journal entry'
          };
        }
      }

      logger.info('Journal entry read successfully', { journalId: request.journalId });

      return {
        success: true,
        data: journalData
      };
    } catch (error) {
      logger.error('Error reading journal entry', error);
      return {
        success: false,
        error: 'Failed to read journal entry'
      };
    }
  }

  /**
   * Update an existing journal entry
   */
  async updateJournal(request: UpdateJournalRequest): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info('Updating journal entry', { journalId: request.journalId, userId: request.userId });

      const journalRef = this.db
        .collection(this.collectionName)
        .doc(request.userId)
        .collection('entries')
        .doc(request.journalId);

      const journalDoc = await journalRef.get();

      if (!journalDoc.exists) {
        return {
          success: false,
          error: 'Journal entry not found'
        };
      }

      const existingData = journalDoc.data() as JournalEntry;

      // Verify ownership
      if (existingData.userId !== request.userId) {
        return {
          success: false,
          error: 'Unauthorized access to journal entry'
        };
      }

      // Get current decrypted data
      let currentTitle = existingData.title;
      let currentContent = existingData.content;

      if (existingData.isEncrypted && existingData.encryptedData && existingData.iv) {
        try {
          const decryptedData = EncryptionService.decryptWellnessData(
            existingData.encryptedData,
            existingData.iv,
            request.userId
          );
          currentTitle = decryptedData.title;
          currentContent = decryptedData.content;
        } catch (decryptError) {
          logger.error('Error decrypting existing journal entry for update', decryptError);
          return {
            success: false,
            error: 'Failed to decrypt existing journal entry'
          };
        }
      }

      // Prepare updated data
      const updatedTitle = request.title !== undefined ? request.title : currentTitle;
      const updatedContent = request.content !== undefined ? request.content : currentContent;

      // Encrypt the updated data
      const journalData = {
        title: updatedTitle,
        content: updatedContent
      };

      const { encryptedData, iv } = EncryptionService.encryptWellnessData(journalData, request.userId);

      const updateData: Partial<JournalEntry> = {
        updatedAt: new Date(),
        title: '', // Will be encrypted
        content: '', // Will be encrypted
        encryptedData,
        iv
      };

      await journalRef.update(updateData);

      logger.info('Journal entry updated successfully', { journalId: request.journalId });

      return {
        success: true,
        data: {
          journalId: request.journalId,
          message: 'Journal entry updated successfully'
        }
      };
    } catch (error) {
      logger.error('Error updating journal entry', error);
      return {
        success: false,
        error: 'Failed to update journal entry'
      };
    }
  }

  /**
   * Delete a journal entry
   */
  async deleteJournal(request: DeleteJournalRequest): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info('Deleting journal entry', { journalId: request.journalId, userId: request.userId });

      const journalRef = this.db
        .collection(this.collectionName)
        .doc(request.userId)
        .collection('entries')
        .doc(request.journalId);

      const journalDoc = await journalRef.get();

      if (!journalDoc.exists) {
        return {
          success: false,
          error: 'Journal entry not found'
        };
      }

      const existingData = journalDoc.data() as JournalEntry;

      // Verify ownership
      if (existingData.userId !== request.userId) {
        return {
          success: false,
          error: 'Unauthorized access to journal entry'
        };
      }

      await journalRef.delete();

      logger.info('Journal entry deleted successfully', { journalId: request.journalId });

      return {
        success: true,
        data: {
          journalId: request.journalId,
          message: 'Journal entry deleted successfully'
        }
      };
    } catch (error) {
      logger.error('Error deleting journal entry', error);
      return {
        success: false,
        error: 'Failed to delete journal entry'
      };
    }
  }

  /**
   * List all journal entries for a user
   */
  async listJournals(request: ListJournalsRequest): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info('Listing journal entries', { userId: request.userId });

      const limit = request.limit || 50;
      const offset = request.offset || 0;

      let query = this.db
        .collection(this.collectionName)
        .doc(request.userId)
        .collection('entries')
        .orderBy('updatedAt', 'desc')
        .limit(limit);

      if (offset > 0) {
        // For pagination, we'd need to implement cursor-based pagination
        // For now, we'll use offset with limit
        query = query.offset(offset);
      }

      const snapshot = await query.get();
      const journals: JournalEntry[] = [];

      snapshot.forEach((doc: any) => {
        const data = doc.data() as JournalEntry;
        
        // Decrypt the journal data if it's encrypted
        if (data.isEncrypted && data.encryptedData && data.iv) {
          try {
            const decryptedData = EncryptionService.decryptWellnessData(
              data.encryptedData,
              data.iv,
              request.userId
            );
            
            // Update the journal data with decrypted content
            data.title = decryptedData.title;
            data.content = decryptedData.content;
          } catch (decryptError) {
            logger.error('Error decrypting journal entry in list', decryptError);
            // Keep encrypted data if decryption fails
            data.title = '[Encrypted]';
            data.content = '[Encrypted]';
          }
        }
        
        journals.push(data);
      });

      logger.info('Journal entries listed successfully', { 
        userId: request.userId, 
        count: journals.length 
      });

      return {
        success: true,
        data: {
          journals,
          total: journals.length,
          limit,
          offset
        }
      };
    } catch (error) {
      logger.error('Error listing journal entries', error);
      return {
        success: false,
        error: 'Failed to list journal entries'
      };
    }
  }

  /**
   * Health check for journal service
   */
  async healthCheck(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info('Journal service health check');

      // Test database connection
      await this.db.collection('_health_check').doc('test').set({
        timestamp: new Date(),
        service: 'journal'
      });

      await this.db.collection('_health_check').doc('test').delete();

      return {
        success: true,
        data: {
          status: 'healthy',
          service: 'journal',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Journal service health check failed', error);
      return {
        success: false,
        error: 'Journal service health check failed'
      };
    }
  }
}
