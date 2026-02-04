// Note entity - represents a note attached to a web page
export interface Note {
  pageKey: string; // Normalized URL (protocol + domain + path)
  content: string; // Note content (1-1,000 chars)
  createdAt: number; // Unix timestamp (milliseconds)
  updatedAt: number; // Unix timestamp (milliseconds)
}

// Storage error types
export interface StorageError {
  code: "QUOTA_EXCEEDED" | "INVALID_INPUT" | "NOT_FOUND" | "UNKNOWN";
  message: string;
}

// Request message types from Content Script to Background Script
export type RequestMessage =
  | { type: "GET_NOTE"; pageKey: string }
  | { type: "CREATE_NOTE"; pageKey: string; content: string }
  | { type: "UPDATE_NOTE"; pageKey: string; content: string }
  | { type: "DELETE_NOTE"; pageKey: string }
  | { type: "LIST_ALL_NOTES" };

// Response message types from Background Script to Content Script
export type ResponseMessage = { success: true; note?: Note; notes?: Note[] } | { success: false; error: StorageError };
