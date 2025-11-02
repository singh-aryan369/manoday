export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  createdAt: Date | { _seconds: number; _nanoseconds: number };
  updatedAt: Date | { _seconds: number; _nanoseconds: number };
  userId: string;
  isEncrypted: boolean;
  encryptedData?: string;
  iv?: string;
  salt?: string;
}

export interface JournalRequest {
  action: 'create' | 'read' | 'update' | 'delete' | 'list' | 'health';
  userId: string;
  journalId?: string;
  title?: string;
  content?: string;
}

export interface JournalResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface CreateJournalRequest {
  title: string;
  content: string;
  userId: string;
  encryptedData?: string;
  iv?: string;
  salt?: string;
}

export interface UpdateJournalRequest {
  journalId: string;
  title?: string;
  content?: string;
  userId: string;
  encryptedData?: string;
  iv?: string;
  salt?: string;
}

export interface DeleteJournalRequest {
  journalId: string;
  userId: string;
}

export interface ListJournalsRequest {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface ReadJournalRequest {
  journalId: string;
  userId: string;
}
