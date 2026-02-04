import type { RequestMessage, ResponseMessage } from "../types/index.js";
import { createNote, getNote, updateNote, deleteNote, listAllNotes } from "./storage.js";

/**
 * Background script message listener
 * Handles messages from content scripts
 */
chrome.runtime.onMessage.addListener(
  (
    message: RequestMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ResponseMessage) => void,
  ) => {
    // Handle async operations
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        console.error("Message handler error:", error);
        sendResponse({
          success: false,
          error: {
            code: "UNKNOWN",
            message: error.message || "Unknown error occurred",
          },
        });
      });

    // Return true to indicate async response
    return true;
  },
);

/**
 * Process incoming messages and route to appropriate handler
 */
async function handleMessage(message: RequestMessage): Promise<ResponseMessage> {
  switch (message.type) {
    case "GET_NOTE":
      return handleGetNote(message.pageKey);

    case "CREATE_NOTE":
      return handleCreateNote(message.pageKey, message.content);

    case "UPDATE_NOTE":
      return handleUpdateNote(message.pageKey, message.content);

    case "DELETE_NOTE":
      return handleDeleteNote(message.pageKey);

    case "LIST_ALL_NOTES":
      return handleListAllNotes();

    default:
      return {
        success: false,
        error: {
          code: "UNKNOWN",
          message: `Unknown message type: ${(message as any).type}`,
        },
      };
  }
}

/**
 * Handle GET_NOTE request
 */
async function handleGetNote(pageKey: string): Promise<ResponseMessage> {
  try {
    const note = await getNote(pageKey);
    return {
      success: true,
      note: note || undefined,
    };
  } catch (error) {
    console.error("GET_NOTE failed:", error);
    return {
      success: false,
      error: {
        code: "UNKNOWN",
        message: "Failed to retrieve note",
      },
    };
  }
}

/**
 * Handle CREATE_NOTE request
 */
async function handleCreateNote(pageKey: string, content: string): Promise<ResponseMessage> {
  try {
    const note = await createNote(pageKey, content);
    return {
      success: true,
      note,
    };
  } catch (error: any) {
    console.error("CREATE_NOTE failed:", error);
    return {
      success: false,
      error: error.code
        ? error
        : {
            code: "UNKNOWN",
            message: error.message || "Failed to create note",
          },
    };
  }
}

/**
 * Handle UPDATE_NOTE request (T028)
 */
async function handleUpdateNote(pageKey: string, content: string): Promise<ResponseMessage> {
  try {
    const note = await updateNote(pageKey, content);
    return {
      success: true,
      note,
    };
  } catch (error: any) {
    console.error("UPDATE_NOTE failed:", error);
    return {
      success: false,
      error: error.code
        ? error
        : {
            code: "UNKNOWN",
            message: error.message || "Failed to update note",
          },
    };
  }
}

/**
 * Handle DELETE_NOTE request (T037)
 */
async function handleDeleteNote(pageKey: string): Promise<ResponseMessage> {
  try {
    await deleteNote(pageKey);
    return {
      success: true,
    };
  } catch (error: any) {
    console.error("DELETE_NOTE failed:", error);
    return {
      success: false,
      error: error.code
        ? error
        : {
            code: "UNKNOWN",
            message: error.message || "Failed to delete note",
          },
    };
  }
}

/**
 * Handle LIST_ALL_NOTES request (T044)
 */
async function handleListAllNotes(): Promise<ResponseMessage> {
  try {
    const notes = await listAllNotes();
    return {
      success: true,
      notes,
    };
  } catch (error: any) {
    console.error("LIST_ALL_NOTES failed:", error);
    return {
      success: false,
      error: {
        code: "UNKNOWN",
        message: error.message || "Failed to list notes",
      },
    };
  }
}

console.log("PageNotes background script loaded");
