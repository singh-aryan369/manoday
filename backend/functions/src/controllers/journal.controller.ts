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
      const { title, content } = req.body;

      if (!title || !content) {
        res.status(400).json({
          success: false,
          error: 'Title and content are required'
        });
        return;
      }

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
        res.status(200).json(result);
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
      const { journalId, title, content } = req.body;

      if (!journalId) {
        res.status(400).json({
          success: false,
          error: 'Journal ID is required'
        });
        return;
      }

      if (!title && !content) {
        res.status(400).json({
          success: false,
          error: 'At least one field (title or content) is required for update'
        });
        return;
      }

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
