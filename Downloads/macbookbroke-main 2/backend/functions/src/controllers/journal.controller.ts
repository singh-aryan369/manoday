import { Request, Response } from 'express';
import { JournalService } from '../services/journal.service';
import { logger } from '../utils/logger';
import { 
  CreateJournalRequest, 
  UpdateJournalRequest, 
  DeleteJournalRequest, 
  ListJournalsRequest, 
  ReadJournalRequest 
} from '../types/journal.types';

export class JournalController {
  private journalService: JournalService;

  constructor() {
    this.journalService = new JournalService();
  }

  /**
   * Handle journal API requests
   */
  async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      const { action } = req.query;
      const userId = req.body.userId || req.headers['x-user-id'] as string;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      logger.info('Journal API request', { action, userId });

      switch (action) {
        case 'create':
          await this.createJournal(req, res, userId);
          break;
        case 'read':
          await this.readJournal(req, res, userId);
          break;
        case 'update':
          await this.updateJournal(req, res, userId);
          break;
        case 'delete':
          await this.deleteJournal(req, res, userId);
          break;
        case 'list':
          await this.listJournals(req, res, userId);
          break;
        case 'health':
          await this.healthCheck(req, res);
          break;
        default:
          res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: create, read, update, delete, list, health'
          });
      }
    } catch (error) {
      logger.error('Journal controller error', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Create a new journal entry
   */
  private async createJournal(req: Request, res: Response, userId: string): Promise<void> {
    try {
      const { title, content, encryptedData, iv, salt } = req.body;

      // Check if this is encrypted data (new format) or plain text (old format)
      if (encryptedData && iv && salt) {
        // New encrypted format - store encrypted data directly
        const request: CreateJournalRequest = {
          title: 'Encrypted Journal Entry', // Placeholder title
          content: 'Encrypted content', // Placeholder content
          userId,
          encryptedData,
          iv,
          salt
        };

        const result = await this.journalService.createJournal(request);

        if (result.success) {
          res.status(201).json(result);
        } else {
          res.status(400).json(result);
        }
      } else if (title && content) {
        // Old plain text format - encrypt on server side
        const request: CreateJournalRequest = {
          title,
          content,
          userId
        };

        const result = await this.journalService.createJournal(request);

        if (result.success) {
          res.status(201).json(result);
        } else {
          res.status(400).json(result);
        }
      } else {
        res.status(400).json({
          success: false,
          error: 'Either encrypted data (encryptedData, iv, salt) or plain text (title, content) is required'
        });
        return;
      }
    } catch (error) {
      logger.error('Error in createJournal', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create journal entry'
      });
    }
  }

  /**
   * Read a specific journal entry
   */
  private async readJournal(req: Request, res: Response, userId: string): Promise<void> {
    try {
      const { journalId } = req.body;

      if (!journalId) {
        res.status(400).json({
          success: false,
          error: 'Journal ID is required'
        });
        return;
      }

      const request: ReadJournalRequest = {
        journalId,
        userId
      };

      const result = await this.journalService.readJournal(request);

      if (result.success) {
        // Always return encrypted data for client-side decryption
        // Server never sees decrypted content
        res.status(200).json({
          success: true,
          data: {
            id: result.data?.id,
            encryptedData: result.data?.encryptedData,
            iv: result.data?.iv,
            salt: result.data?.salt,
            createdAt: result.data?.createdAt,
            updatedAt: result.data?.updatedAt
          }
        });
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      logger.error('Error in readJournal', error);
      res.status(500).json({
        success: false,
        error: 'Failed to read journal entry'
      });
    }
  }

  /**
   * Update an existing journal entry
   */
  private async updateJournal(req: Request, res: Response, userId: string): Promise<void> {
    try {
      const { journalId, title, content, encryptedData, iv, salt } = req.body;

      if (!journalId) {
        res.status(400).json({
          success: false,
          error: 'Journal ID is required'
        });
        return;
      }

      // Check if this is encrypted data (new format) or plain text (old format)
      if (encryptedData && iv && salt) {
        // New encrypted format - store encrypted data directly
        const request: UpdateJournalRequest = {
          journalId,
          title: 'Encrypted Journal Entry', // Placeholder title
          content: 'Encrypted content', // Placeholder content
          userId,
          encryptedData,
          iv,
          salt
        };

        const result = await this.journalService.updateJournal(request);

        if (result.success) {
          res.status(200).json(result);
        } else {
          res.status(400).json(result);
        }
      } else if (title && content) {
        // Old plain text format - encrypt on server side
        const request: UpdateJournalRequest = {
          journalId,
          title,
          content,
          userId
        };

        const result = await this.journalService.updateJournal(request);

        if (result.success) {
          res.status(200).json(result);
        } else {
          res.status(400).json(result);
        }
      } else {
        res.status(400).json({
          success: false,
          error: 'Either encrypted data (encryptedData, iv, salt) or plain text (title, content) is required'
        });
        return;
      }
    } catch (error) {
      logger.error('Error in updateJournal', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update journal entry'
      });
    }
  }

  /**
   * Delete a journal entry
   */
  private async deleteJournal(req: Request, res: Response, userId: string): Promise<void> {
    try {
      const { journalId } = req.body;

      if (!journalId) {
        res.status(400).json({
          success: false,
          error: 'Journal ID is required'
        });
        return;
      }

      const request: DeleteJournalRequest = {
        journalId,
        userId
      };

      const result = await this.journalService.deleteJournal(request);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Error in deleteJournal', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete journal entry'
      });
    }
  }

  /**
   * List all journal entries for a user
   */
  private async listJournals(req: Request, res: Response, userId: string): Promise<void> {
    try {
      const { limit, offset } = req.body;

      const request: ListJournalsRequest = {
        userId,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      };

      const result = await this.journalService.listJournals(request);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Error in listJournals', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list journal entries'
      });
    }
  }

  /**
   * Health check endpoint
   */
  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.journalService.healthCheck();

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      logger.error('Error in healthCheck', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }
}
