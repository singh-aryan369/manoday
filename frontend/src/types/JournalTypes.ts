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
}

export interface CreateJournalRequest {
  title: string;
  content: string;
  userId: string;
}

export interface UpdateJournalRequest {
  journalId: string;
  title?: string;
  content?: string;
  userId: string;
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

export interface JournalResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface ListJournalsResponse {
  success: boolean;
  data?: {
    journals: JournalEntry[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

export interface CreateJournalResponse {
  success: boolean;
  data?: {
    journalId: string;
    message: string;
  };
  error?: string;
}

export interface UpdateJournalResponse {
  success: boolean;
  data?: {
    journalId: string;
    message: string;
  };
  error?: string;
}

export interface DeleteJournalResponse {
  success: boolean;
  data?: {
    journalId: string;
    message: string;
  };
  error?: string;
}

export interface ReadJournalResponse {
  success: boolean;
  data?: JournalEntry;
  error?: string;
}
