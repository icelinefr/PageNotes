import type { Note, WidgetState } from "../types/index.js";

/**
 * NoteWidget class - manages the floating note UI widget
 * Uses Shadow DOM for style isolation
 */
export class NoteWidget {
  private container: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private currentNote: Note | null = null;
  private isExpanded: boolean = false;
  private collapsedBar!: HTMLButtonElement;
  private expandedContainer!: HTMLDivElement;
  // For memory leak prevention: store event listeners for cleanup
  private dragListeners: Array<{ target: EventTarget; event: string; handler: EventListener }> = [];

  constructor() {
    // Create container element
    this.container = document.createElement("div");
    this.container.id = "pagenotes-widget";

    // Attach shadow DOM for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: "open" });

    // Initialize styles and structure
    this.initializeStyles();
    this.initializeStructure(); // Creates both collapsed bar and expanded container
    this.initializeDragAndDrop(); // T026

    // T021: Initialize widget state from storage (race condition fix: remove sync updateDisplay)
    this.initializeWidgetState().catch((error) => {
      console.error("Failed to initialize widget state:", error);
      // Default to collapsed state on error
      this.isExpanded = false;
      this.updateDisplay();
    });

    // Append to document body
    document.body.appendChild(this.container);
  }

  /**
   * Initialize widget styles
   */
  private initializeStyles(): void {
    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
      }

      .widget-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 320px;
        min-height: 200px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        resize: both;
        overflow: auto;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform-origin: bottom right;
      }

      /* T009: 畳まれた状態のバーUI */
      .widget-collapsed-bar {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 200px;
        height: 48px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        padding: 0 20px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s;
      }

      /* T023: 改善されたホバー効果 */
      .widget-collapsed-bar:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        background-color: #f8f9fa;
      }

      .collapsed-label {
        font-size: 14px;
        font-weight: 600;
        color: #333;
        user-select: none;
      }

      /* T010: 展開/畳むアニメーション用クラス */
      .widget-container.hidden {
        display: none;
      }

      .widget-collapsed-bar.hidden {
        display: none;
      }

      /* T025: 畳むボタンのホバー効果 */
      .collapse-button {
        background: transparent;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 4px 8px;
        color: #666;
        transition: color 0.2s, background-color 0.2s;
        border-radius: 4px;
      }

      .collapse-button:hover {
        color: #333;
        background-color: #e8eaed;
      }

      .widget-header {
        padding: 12px 16px;
        border-bottom: 1px solid #eee;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .widget-title {
        font-weight: 600;
        color: #333;
        margin: 0;
        font-size: 14px;
      }

      .widget-body {
        padding: 16px;
        flex: 1;
        overflow-y: auto;
      }

      .note-content {
        white-space: pre-wrap;
        word-wrap: break-word;
        line-height: 1.5;
        color: #333;
      }

      .note-textarea {
        width: 100%;
        min-height: 150px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
        box-sizing: border-box;
      }

      .note-textarea:focus {
        outline: none;
        border-color: #4285f4;
      }

      .widget-footer {
        padding: 12px 16px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .char-counter {
        font-size: 12px;
        color: #666;
      }

      .char-counter.warning {
        color: #d93025;
      }

      .button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .button-primary {
        background: #4285f4;
        color: white;
      }

      .button-primary:hover {
        background: #3367d6;
      }

      .button-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .button-secondary {
        background: #f1f3f4;
        color: #333;
        margin-right: 8px;
      }

      .button-secondary:hover {
        background: #e8eaed;
      }

      .button-danger {
        background: #d93025;
        color: white;
      }

      .button-danger:hover {
        background: #b71c1c;
      }

      .empty-state {
        color: #666;
        font-style: italic;
      }

      .toast {
        position: fixed;
        bottom: 100px;
        right: 20px;
        background: #323232;
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 2147483648;
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  /**
   * Initialize collapsed bar UI (T011)
   * 畳まれた状態のバーUIを作成
   * Changed from div to button for keyboard accessibility (T3)
   */
  private initializeCollapsedBar(): void {
    this.collapsedBar = document.createElement("button");
    this.collapsedBar.className = "widget-collapsed-bar";
    this.collapsedBar.title = "クリックしてメモを開く";
    this.collapsedBar.innerHTML = `
      <span class="collapsed-label">PageNotes</span>
    `;

    // クリックで展開（ボタンの native click と keyboard が自動対応）
    this.collapsedBar.addEventListener("click", () => {
      this.toggleWidget(true);
    });

    this.shadowRoot.appendChild(this.collapsedBar);
  }

  /**
   * Initialize expanded container UI (T012)
   * 展開状態のウィジェットUIを作成（既存のinitializeStructure()の内容を移動）
   */
  private initializeExpandedContainer(): void {
    this.expandedContainer = document.createElement("div");
    this.expandedContainer.className = "widget-container";
    this.expandedContainer.innerHTML = `
      <div class="widget-header">
        <h3 class="widget-title">PageNotes</h3>
        <button class="collapse-button" title="畳む">−</button>
      </div>
      <div class="widget-body">
        <div class="empty-state">このページにはメモがありません</div>
      </div>
      <div class="widget-footer">
        <span class="char-counter">0/1000</span>
        <button class="button button-primary">保存</button>
      </div>
    `;

    // 畳むボタンのイベントリスナー
    const collapseBtn = this.expandedContainer.querySelector(".collapse-button");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        this.toggleWidget(false);
      });
    }

    this.shadowRoot.appendChild(this.expandedContainer);

    // キーイベントの伝播を停止してページ側のショートカットと干渉しないようにする
    this.shadowRoot.addEventListener("keydown", (e: Event) => {
      e.stopPropagation();
    });
    this.shadowRoot.addEventListener("keypress", (e: Event) => {
      e.stopPropagation();
    });
    this.shadowRoot.addEventListener("keyup", (e: Event) => {
      e.stopPropagation();
    });
  }

  /**
   * Initialize widget HTML structure (deprecated - replaced by initializeCollapsedBar and initializeExpandedContainer)
   */
  private initializeStructure(): void {
    // この関数は後方互換性のため残しますが、実際の初期化は個別のメソッドで行います
    this.initializeCollapsedBar();
    this.initializeExpandedContainer();
  }

  /**
   * Show note content with auto-expand support
   * Ensures widget is expanded so the note is visible (T4)
   */
  public showNote(note: Note): void {
    // Auto-expand widget when showing a note
    this.toggleWidget(true);
    this.currentNote = note;
    const body = this.expandedContainer.querySelector(".widget-body") as HTMLElement;
    const footer = this.expandedContainer.querySelector(".widget-footer") as HTMLElement;

    if (body) {
      body.innerHTML = `
        <div class="note-content">${this.escapeHtml(note.content)}</div>
      `;
    }

    if (footer) {
      footer.innerHTML = `
        <span class="char-counter">${note.content.length}/1000</span>
        <div>
          <button class="button button-secondary edit-btn">編集</button>
          <button class="button button-danger delete-btn">削除</button>
        </div>
      `;

      // Add edit button handler (T029)
      const editBtn = footer.querySelector(".edit-btn");
      if (editBtn) {
        editBtn.addEventListener("click", () => this.editNote());
      }

      // Add delete button handler (T038)
      const deleteBtn = footer.querySelector(".delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => this.deleteNote());
      }
    }
  }

  /**
   * Show create note UI
   */
  public createNote(): void {
    const body = this.expandedContainer.querySelector(".widget-body") as HTMLElement;
    const footer = this.expandedContainer.querySelector(".widget-footer") as HTMLElement;

    if (body) {
      body.innerHTML = `
        <textarea class="note-textarea" placeholder="メモを入力..."></textarea>
      `;

      // Add input validation and character counter (T022, T024)
      const textarea = body.querySelector(".note-textarea") as HTMLTextAreaElement;
      if (textarea) {
        textarea.addEventListener("input", () => {
          this.updateCharCounter(textarea.value.length);
        });
      }
    }

    if (footer) {
      footer.innerHTML = `
        <span class="char-counter">0/1000</span>
        <button class="button button-primary save-btn">保存</button>
      `;

      // Add save button handler (T018)
      const saveBtn = footer.querySelector(".save-btn");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => this.handleSave());
      }
    }
  }

  /**
   * Edit existing note (T030)
   */
  private editNote(): void {
    if (!this.currentNote) return;

    const body = this.expandedContainer.querySelector(".widget-body") as HTMLElement;
    const footer = this.expandedContainer.querySelector(".widget-footer") as HTMLElement;

    if (body) {
      body.innerHTML = `
        <textarea class="note-textarea">${this.escapeHtml(this.currentNote.content)}</textarea>
      `;

      // Add input validation (T034)
      const textarea = body.querySelector(".note-textarea") as HTMLTextAreaElement;
      if (textarea) {
        textarea.addEventListener("input", () => {
          this.updateCharCounter(textarea.value.length);
        });
      }
    }

    if (footer) {
      footer.innerHTML = `
        <span class="char-counter">${this.currentNote.content.length}/1000</span>
        <div>
          <button class="button button-secondary cancel-btn">キャンセル</button>
          <button class="button button-primary update-btn">更新</button>
        </div>
      `;

      // Cancel button handler (T032)
      const cancelBtn = footer.querySelector(".cancel-btn");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          if (this.currentNote) {
            this.showNote(this.currentNote);
          }
        });
      }

      // Update button handler (T031, T033)
      const updateBtn = footer.querySelector(".update-btn");
      if (updateBtn) {
        updateBtn.addEventListener("click", () => this.handleUpdate());
      }
    }
  }

  /**
   * Delete note with confirmation (T039)
   */
  private async deleteNote(): Promise<void> {
    if (!this.currentNote) return;

    const confirmed = confirm("このメモを削除してもよろしいですか？");
    if (!confirmed) return;

    // Send DELETE_NOTE message (T040)
    try {
      const response = await chrome.runtime.sendMessage({
        type: "DELETE_NOTE",
        pageKey: this.currentNote.pageKey,
      });

      if (response.success) {
        // Show success toast (T042)
        this.showToast("メモを削除しました");

        // Remove widget from DOM (T041)
        this.currentNote = null;
        this.createNote();
      } else {
        alert("削除に失敗しました: " + response.error.message);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("削除に失敗しました");
    }
  }

  /**
   * Handle save button click (T018)
   */
  private async handleSave(): Promise<void> {
    const textarea = this.shadowRoot.querySelector(".note-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const content = textarea.value.trim();

    // Validate input (T022)
    if (!content) {
      alert("メモ内容を入力してください");
      return;
    }

    if (content.length > 1000) {
      alert("メモは1,000文字以内で入力してください");
      return;
    }

    // Get current page key
    const pageKey = await this.getPageKey();

    // Send CREATE_NOTE message
    try {
      const response = await chrome.runtime.sendMessage({
        type: "CREATE_NOTE",
        pageKey,
        content,
      });

      if (response.success && response.note) {
        this.showNote(response.note);
        this.showToast("メモを保存しました"); // T025
      } else {
        alert("保存に失敗しました: " + response.error.message);
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("保存に失敗しました");
    }
  }

  /**
   * Handle update button click (T031)
   */
  private async handleUpdate(): Promise<void> {
    if (!this.currentNote) return;

    const textarea = this.shadowRoot.querySelector(".note-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const content = textarea.value.trim();

    // Validate input (T034)
    if (!content) {
      alert("メモ内容を入力してください");
      return;
    }

    if (content.length > 1000) {
      alert("メモは1,000文字以内で入力してください");
      return;
    }

    // Send UPDATE_NOTE message
    try {
      const response = await chrome.runtime.sendMessage({
        type: "UPDATE_NOTE",
        pageKey: this.currentNote.pageKey,
        content,
      });

      if (response.success && response.note) {
        this.currentNote = response.note;
        this.showNote(response.note); // T033
        this.showToast("メモを更新しました"); // T035
      } else {
        alert("更新に失敗しました: " + response.error.message);
      }
    } catch (error) {
      console.error("Update failed:", error);
      alert("更新に失敗しました");
    }
  }

  /**
   * Update character counter (T024)
   */
  private updateCharCounter(length: number): void {
    const counter = this.expandedContainer.querySelector(".char-counter") as HTMLElement;
    if (counter) {
      counter.textContent = `${length}/1000`;
      if (length > 1000) {
        counter.classList.add("warning");
      } else {
        counter.classList.remove("warning");
      }
    }
  }

  /**
   * Show success toast notification (T025, T035, T042)
   */
  private showToast(message: string): void {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    this.shadowRoot.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Get normalized page key
   */
  private async getPageKey(): Promise<string> {
    // Import normalizeUrl from background script
    const url = window.location.href;
    // Simple normalization for now (will be replaced with proper import)
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Remove widget from DOM
   */
  public destroy(): void {
    this.container.remove();
  }

  /**
   * Initialize drag and drop for widget positioning (T026)
   * ドラッグ＆ドロップは展開状態でのみ動作
   * T6: Removed setTimeout wrapper (expandedContainer guaranteed to be set)
   * T1: Added listener cleanup to prevent memory leaks
   */
  private initializeDragAndDrop(): void {
    const widgetContainer = this.expandedContainer;
    const header = this.expandedContainer.querySelector(".widget-header") as HTMLElement;

    if (!widgetContainer || !header) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = widgetContainer.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      // 固定位置指定をleft/topに切り替え
      widgetContainer.style.right = "auto";
      widgetContainer.style.bottom = "auto";
      widgetContainer.style.left = `${initialLeft}px`;
      widgetContainer.style.top = `${initialTop}px`;

      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      // マウスの移動量を計算
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // 初期位置からの相対位置を計算
      widgetContainer.style.left = `${initialLeft + deltaX}px`;
      widgetContainer.style.top = `${initialTop + deltaY}px`;
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
      }
    };

    // Add listeners and store for cleanup (T1: memory leak prevention)
    header.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    this.dragListeners.push(
      { target: header, event: "mousedown", handler: onMouseDown },
      { target: document, event: "mousemove", handler: onMouseMove },
      { target: document, event: "mouseup", handler: onMouseUp }
    );
  }

  /**
   * T1: Cleanup drag and drop listeners to prevent memory leaks
   */
  private cleanupDragListeners(): void {
    for (const listener of this.dragListeners) {
      listener.target.removeEventListener(listener.event, listener.handler);
    }
    this.dragListeners = [];
  }

  /**
   * Update display based on isExpanded state (T013)
   * isExpandedフラグに基づいて表示を切り替え
   */
  private updateDisplay(): void {
    if (this.isExpanded) {
      this.collapsedBar.classList.add("hidden");
      this.expandedContainer.classList.remove("hidden");
    } else {
      this.collapsedBar.classList.remove("hidden");
      this.expandedContainer.classList.add("hidden");
    }
  }

  /**
   * Toggle widget expanded/collapsed state (T014, T020)
   * @param expand - true: 展開, false: 畳む
   */
  private toggleWidget(expand: boolean): void {
    this.isExpanded = expand;
    this.updateDisplay();

    // T020: 状態をストレージに保存
    const domain = this.getCurrentDomain();
    if (domain) {
      this.saveWidgetState(domain, expand).catch((error) => {
        console.error("Failed to save widget state after toggle:", error);
      });
    }
  }

  /**
   * Save widget state to storage (T017)
   * @param domain - ドメイン名（正規化済み）
   * @param isExpanded - 展開状態
   */
  private async saveWidgetState(domain: string, isExpanded: boolean): Promise<void> {
    if (!domain) {
      // T2: Throw error as per specification (contracts/widget-state-storage.md)
      throw new Error("Invalid Domain: domain is empty");
    }

    const state: WidgetState = {
      isExpanded,
      domain,
      lastUpdated: Date.now(),
    };

    const key = `widget_state:${domain}`;

    try {
      await chrome.storage.local.set({ [key]: state });
    } catch (error) {
      console.error("Failed to save widget state:", error);
      throw error;
    }
  }

  /**
   * Load widget state from storage (T018)
   * @param domain - ドメイン名（正規化済み）
   * @returns 保存された状態、または null
   */
  private async loadWidgetState(domain: string): Promise<WidgetState | null> {
    if (!domain) {
      console.error("Cannot load widget state: domain is empty");
      return null;
    }

    const key = `widget_state:${domain}`;

    try {
      const result = await chrome.storage.local.get(key);
      const state = result[key];

      if (!state) {
        return null;
      }

      // Validate state
      if (!this.isValidWidgetState(state)) {
        console.warn("Invalid widget state data:", state);
        return null;
      }

      return state;
    } catch (error) {
      console.error("Failed to load widget state:", error);
      return null;
    }
  }

  /**
   * Initialize widget state from storage (T019)
   * ドメインごとに保存された状態を読み込み、復元する
   */
  private async initializeWidgetState(): Promise<void> {
    const domain = this.getCurrentDomain();

    if (!domain) {
      // ドメイン取得失敗時はデフォルト状態（畳まれた状態）
      this.isExpanded = false;
      this.updateDisplay();
      return;
    }

    const state = await this.loadWidgetState(domain);

    if (state) {
      // 保存された状態を復元
      this.isExpanded = state.isExpanded;
    } else {
      // 初回訪問時はデフォルト状態（畳まれた状態）
      this.isExpanded = false;
    }

    this.updateDisplay();
  }

  /**
   * Get current domain (normalized) - T007
   * ドメイン正規化: プロトコル、パス、クエリパラメータを除去
   */
  private getCurrentDomain(): string {
    try {
      const url = new URL(window.location.href);
      return url.hostname.toLowerCase();
    } catch (e) {
      console.error("Failed to get current domain:", e);
      return "";
    }
  }

  /**
   * Validate WidgetState object - T008
   * @param state - 検証対象のオブジェクト
   * @returns 有効なWidgetStateの場合true
   */
  private isValidWidgetState(state: any): state is WidgetState {
    return (
      typeof state === "object" &&
      state !== null &&
      typeof state.isExpanded === "boolean" &&
      typeof state.domain === "string" &&
      state.domain.length > 0 &&
      typeof state.lastUpdated === "number" &&
      state.lastUpdated > 0
    );
  }
}
