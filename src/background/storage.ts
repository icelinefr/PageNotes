import type { Note, StorageError } from "../types/index.js";

/**
 * Create a new note and save to storage
 *
 * @param pageKey - Normalized URL
 * @param content - Note content (1-1,000 chars)
 * @returns Created note object
 * @throws INVALID_INPUT if content is empty or exceeds 1,000 chars
 * @throws QUOTA_EXCEEDED if storage limit is reached
 */
export async function createNote(pageKey: string, content: string): Promise<Note> {
  // Validate input
  if (!content || content.length === 0) {
    throw {
      code: "INVALID_INPUT",
      message: "Content cannot be empty",
    } as StorageError;
  }

  if (content.length > 1000) {
    throw {
      code: "INVALID_INPUT",
      message: "Content exceeds 1,000 character limit",
    } as StorageError;
  }

  const now = Date.now();
  const note: Note = {
    pageKey,
    content,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await chrome.storage.local.set({ [pageKey]: note });
    return note;
  } catch (error) {
    console.error("Failed to create note:", error);
    if (error instanceof Error && error.message.includes("QUOTA_EXCEEDED")) {
      throw {
        code: "QUOTA_EXCEEDED",
        message: "Storage quota exceeded. Please delete some notes.",
      } as StorageError;
    }
    throw {
      code: "UNKNOWN",
      message: "Failed to save note",
    } as StorageError;
  }
}

/**
 * Get note by pageKey
 *
 * @param pageKey - Normalized URL
 * @returns Note object or null if not found
 */
export async function getNote(pageKey: string): Promise<Note | null> {
  try {
    const result = await chrome.storage.local.get([pageKey]);
    return result[pageKey] || null;
  } catch (error) {
    console.error("Failed to get note:", error);
    return null;
  }
}

/**
 * Update existing note content (T027)
 *
 * @param pageKey - Normalized URL
 * @param content - New note content (1-1,000 chars)
 * @returns Updated note object
 * @throws INVALID_INPUT if content is empty or exceeds 1,000 chars
 * @throws NOT_FOUND if note doesn't exist
 * @throws QUOTA_EXCEEDED if storage limit is reached
 */
export async function updateNote(pageKey: string, content: string): Promise<Note> {
  // Validate input
  if (!content || content.length === 0) {
    throw {
      code: "INVALID_INPUT",
      message: "Content cannot be empty",
    } as StorageError;
  }

  if (content.length > 1000) {
    throw {
      code: "INVALID_INPUT",
      message: "Content exceeds 1,000 character limit",
    } as StorageError;
  }

  // Check if note exists
  const existing = await getNote(pageKey);
  if (!existing) {
    throw {
      code: "NOT_FOUND",
      message: "Note not found",
    } as StorageError;
  }

  // Update note
  const updated: Note = {
    ...existing,
    content,
    updatedAt: Date.now(),
  };

  try {
    await chrome.storage.local.set({ [pageKey]: updated });
    return updated;
  } catch (error) {
    console.error("Failed to update note:", error);
    if (error instanceof Error && error.message.includes("QUOTA_EXCEEDED")) {
      throw {
        code: "QUOTA_EXCEEDED",
        message: "Storage quota exceeded",
      } as StorageError;
    }
    throw {
      code: "UNKNOWN",
      message: "Failed to update note",
    } as StorageError;
  }
}

/**
 * Delete note by pageKey (T036)
 *
 * @param pageKey - Normalized URL
 */
export async function deleteNote(pageKey: string): Promise<void> {
  try {
    await chrome.storage.local.remove([pageKey]);
  } catch (error) {
    console.error("Failed to delete note:", error);
    throw {
      code: "UNKNOWN",
      message: "Failed to delete note",
    } as StorageError;
  }
}

/**
 * List all notes sorted by update time (T043)
 *
 * @returns Array of all notes, sorted by most recently updated
 */
export async function listAllNotes(): Promise<Note[]> {
  try {
    const storage = await chrome.storage.local.get(null);
    return Object.values(storage as { [key: string]: Note })
      .filter((item) => item && item.pageKey && item.content) // Filter valid notes
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error("Failed to list notes:", error);
    return [];
  }
}
