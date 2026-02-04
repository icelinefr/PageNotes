import { NoteWidget } from "./note-widget.js";
import type { RequestMessage, ResponseMessage } from "../types/index.js";

let widget: NoteWidget | null = null;
let lastUrl = location.href;

/**
 * Normalize URL to get page key
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (e) {
    console.error("Invalid URL:", url);
    return url;
  }
}

/**
 * Load and display note for current page (T020, T021)
 */
async function loadNote(): Promise<void> {
  const pageKey = normalizeUrl(window.location.href);

  try {
    const response: ResponseMessage = await chrome.runtime.sendMessage({
      type: "GET_NOTE",
      pageKey,
    } as RequestMessage);

    if (!widget) {
      widget = new NoteWidget();
    }

    if (response.success && response.note) {
      // Auto-display note (T021)
      widget.showNote(response.note);
    } else {
      // Show create UI if no note exists
      widget.createNote();
    }
  } catch (error) {
    console.error("Failed to load note:", error);
  }
}

/**
 * Initialize content script (T019)
 */
function initialize(): void {
  // Load note on page load (T020)
  loadNote();

  // Watch for SPA navigation (T023)
  const observer = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log("URL changed to:", currentUrl);
      loadNote();
    }
  });

  // Observe document changes for SPA support
  observer.observe(document, {
    subtree: true,
    childList: true,
  });

  console.log("PageNotes content script initialized");
}

// Initialize when DOM is ready (T020)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
