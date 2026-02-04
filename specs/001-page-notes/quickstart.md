# Quick Start: PageNotes Development

**Date**: 2026-02-04  
**Purpose**: 開発環境セットアップと実装手順のガイド

## Overview

PageNotes Chrome拡張機能の開発開始から動作確認までの手順を記載。TypeScript + esbuildでビルドし、Chromeにロードして動作確認。

---

## Prerequisites

### Required

- **Node.js**: 20.x以上
- **npm**: 10.x以上
- **Google Chrome**: 88以上（Manifest V3サポート）
- **TypeScript**: 5.x（devDependencyとしてインストール）
- **esbuild**: ビルドツール（devDependencyとしてインストール）

### Recommended

- **VSCode**: TypeScript開発環境
- **Chrome DevTools**: デバッグ用

---

## Project Setup

### 1. Initialize Project

```bash
# プロジェクトルートで実行
cd C:\vscode\typescript\PageNotes

# package.json作成
npm init -y

# TypeScript & esbuild インストール
npm install --save-dev typescript esbuild @types/chrome

# tsconfig.json作成
npx tsc --init
```

### 2. Configure tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "types": ["chrome"],
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Configure package.json Scripts

```json
{
  "name": "pagenotes",
  "version": "1.0.0",
  "scripts": {
    "build": "esbuild src/background/index.ts src/content/index.ts src/popup/index.ts --bundle --outdir=dist --platform=browser --target=es2020 --format=esm",
    "watch": "npm run build -- --watch",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.268",
    "esbuild": "^0.20.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Project Structure Creation

### 4. Create Directory Structure

```bash
mkdir -p src/background
mkdir -p src/content
mkdir -p src/popup
mkdir -p src/types
```

### 5. Create manifest.json

```bash
# src/manifest.json
```

```json
{
  "manifest_version": 3,
  "name": "PageNotes",
  "version": "1.0.0",
  "description": "Webページにメモを残して再訪問時に表示",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "background": {
    "service_worker": "background/index.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/index.js"],
      "css": ["content/styles.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

## Type Definitions

### 6. Create src/types/index.ts

```typescript
// src/types/index.ts

export interface Note {
  pageKey: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export type RequestMessage =
  | { type: 'GET_NOTE'; pageKey: string }
  | { type: 'CREATE_NOTE'; pageKey: string; content: string }
  | { type: 'UPDATE_NOTE'; pageKey: string; content: string }
  | { type: 'DELETE_NOTE'; pageKey: string }
  | { type: 'LIST_ALL_NOTES' };

export interface StorageError {
  code: 'QUOTA_EXCEEDED' | 'INVALID_INPUT' | 'NOT_FOUND' | 'UNKNOWN';
  message: string;
}

export type ResponseMessage =
  | { success: true; note?: Note; notes?: Note[] }
  | { success: false; error: StorageError };
```

---

## Implementation Steps

### Phase 1: Background Script (Storage Management)

#### 7. src/background/storage.ts

```typescript
import { Note } from '../types';

export async function createNote(pageKey: string, content: string): Promise<Note> {
  if (!content || content.length > 1000) {
    throw new Error('Content must be 1-1000 characters');
  }
  
  const now = Date.now();
  const note: Note = {
    pageKey,
    content,
    createdAt: now,
    updatedAt: now
  };
  
  await chrome.storage.local.set({ [pageKey]: note });
  return note;
}

export async function getNote(pageKey: string): Promise<Note | null> {
  const result = await chrome.storage.local.get([pageKey]);
  return result[pageKey] || null;
}

export async function updateNote(pageKey: string, content: string): Promise<Note> {
  if (!content || content.length > 1000) {
    throw new Error('Content must be 1-1000 characters');
  }
  
  const existing = await getNote(pageKey);
  if (!existing) {
    throw new Error('Note not found');
  }
  
  const updated: Note = {
    ...existing,
    content,
    updatedAt: Date.now()
  };
  
  await chrome.storage.local.set({ [pageKey]: updated });
  return updated;
}

export async function deleteNote(pageKey: string): Promise<void> {
  await chrome.storage.local.remove([pageKey]);
}

export async function listAllNotes(): Promise<Note[]> {
  const storage = await chrome.storage.local.get(null);
  return Object.values(storage as { [key: string]: Note })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
```

#### 8. src/background/index.ts

```typescript
import { RequestMessage, ResponseMessage } from '../types';
import { createNote, getNote, updateNote, deleteNote, listAllNotes } from './storage';

chrome.runtime.onMessage.addListener((
  message: RequestMessage,
  sender,
  sendResponse: (response: ResponseMessage) => void
) => {
  (async () => {
    try {
      switch (message.type) {
        case 'GET_NOTE': {
          const note = await getNote(message.pageKey);
          sendResponse({ success: true, note: note || undefined });
          break;
        }
        
        case 'CREATE_NOTE': {
          const note = await createNote(message.pageKey, message.content);
          sendResponse({ success: true, note });
          break;
        }
        
        case 'UPDATE_NOTE': {
          const note = await updateNote(message.pageKey, message.content);
          sendResponse({ success: true, note });
          break;
        }
        
        case 'DELETE_NOTE': {
          await deleteNote(message.pageKey);
          sendResponse({ success: true });
          break;
        }
        
        case 'LIST_ALL_NOTES': {
          const notes = await listAllNotes();
          sendResponse({ success: true, notes });
          break;
        }
      }
    } catch (error: any) {
      sendResponse({
        success: false,
        error: {
          code: error.message.includes('1000') ? 'INVALID_INPUT' :
                error.message.includes('not found') ? 'NOT_FOUND' : 'UNKNOWN',
          message: error.message
        }
      });
    }
  })();
  
  return true; // Keep channel open for async response
});
```

---

### Phase 2: Content Script (UI Widget)

#### 9. src/content/url-utils.ts

```typescript
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (error) {
    console.error('Invalid URL:', url, error);
    throw new Error('Invalid URL format');
  }
}
```

#### 10. src/content/note-widget.ts

```typescript
import { Note, RequestMessage, ResponseMessage } from '../types';

export class NoteWidget {
  private shadowRoot: ShadowRoot;
  private container: HTMLDivElement;
  private textarea: HTMLTextAreaElement;
  private pageKey: string;
  private currentNote: Note | null = null;

  constructor(pageKey: string) {
    this.pageKey = pageKey;
    
    // Create shadow DOM
    const host = document.createElement('div');
    host.id = 'pagenotes-widget';
    this.shadowRoot = host.attachShadow({ mode: 'closed' });
    
    // Build UI
    this.container = this.buildContainer();
    this.shadowRoot.appendChild(this.container);
    document.body.appendChild(host);
  }

  private buildContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 300px;
      min-height: 200px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 16px;
      z-index: 999999;
      resize: both;
      overflow: auto;
    `;
    
    // Textarea
    this.textarea = document.createElement('textarea');
    this.textarea.placeholder = 'メモを入力...';
    this.textarea.style.cssText = `
      width: 100%;
      height: 150px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      font-size: 14px;
      resize: vertical;
    `;
    this.textarea.maxLength = 1000;
    
    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.style.cssText = `
      margin-top: 8px;
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
    `;
    saveBtn.addEventListener('click', () => this.saveNote());
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '削除';
    deleteBtn.style.cssText = `
      margin-top: 8px;
      margin-left: 8px;
      padding: 8px 16px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
    `;
    deleteBtn.addEventListener('click', () => this.deleteNote());
    
    container.appendChild(this.textarea);
    container.appendChild(saveBtn);
    container.appendChild(deleteBtn);
    
    return container;
  }

  async loadNote(): Promise<void> {
    const response = await this.sendMessage<Note | undefined>({
      type: 'GET_NOTE',
      pageKey: this.pageKey
    });
    
    if (response) {
      this.currentNote = response;
      this.textarea.value = response.content;
    }
  }

  private async saveNote(): Promise<void> {
    const content = this.textarea.value.trim();
    if (!content) {
      alert('メモを入力してください');
      return;
    }
    
    try {
      const message: RequestMessage = this.currentNote
        ? { type: 'UPDATE_NOTE', pageKey: this.pageKey, content }
        : { type: 'CREATE_NOTE', pageKey: this.pageKey, content };
      
      const note = await this.sendMessage<Note>(message);
      this.currentNote = note;
      this.showToast('保存しました', 'success');
    } catch (error: any) {
      this.showToast(error.message, 'error');
    }
  }

  private async deleteNote(): Promise<void> {
    if (!confirm('メモを削除しますか？')) return;
    
    try {
      await this.sendMessage({ type: 'DELETE_NOTE', pageKey: this.pageKey });
      this.currentNote = null;
      this.textarea.value = '';
      this.showToast('削除しました', 'success');
    } catch (error: any) {
      this.showToast(error.message, 'error');
    }
  }

  private async sendMessage<T>(message: RequestMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: ResponseMessage) => {
        if (response.success) {
          resolve((response.note || response.notes) as T);
        } else {
          reject(new Error(response.error.message));
        }
      });
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#28a745' : '#dc3545'};
      color: white;
      border-radius: 4px;
      z-index: 1000000;
    `;
    this.shadowRoot.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
}
```

#### 11. src/content/index.ts

```typescript
import { NoteWidget } from './note-widget';
import { normalizeUrl } from './url-utils';

let widget: NoteWidget | null = null;

function initWidget(): void {
  const pageKey = normalizeUrl(window.location.href);
  widget = new NoteWidget(pageKey);
  widget.loadNote();
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}

// SPA support: reinit on URL change
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    initWidget();
  }
}).observe(document, { subtree: true, childList: true });
```

---

## Build & Load Extension

### 12. Build

```bash
# Build once
npm run build

# Or watch mode for development
npm run watch
```

**Output**: `dist/background/index.js`, `dist/content/index.js`

### 13. Copy manifest.json to dist/

```bash
cp src/manifest.json dist/
```

### 14. Load Extension in Chrome

1. Chrome を開く
2. アドレスバーに `chrome://extensions/` と入力
3. 右上の「デベロッパーモード」をON
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `dist/` フォルダを選択

---

## Testing

### Manual Test Checklist

#### US1: メモの作成と表示 (P1)

- [ ] 任意のWebページを開く
- [ ] 画面右下にメモウィジェットが表示される
- [ ] メモを入力して「保存」ボタンをクリック
- [ ] 「保存しました」トーストが表示される
- [ ] ページをリロード
- [ ] メモが自動的に表示される

#### US2: メモの編集 (P2)

- [ ] 既存のメモがあるページを開く
- [ ] メモ内容を編集
- [ ] 「保存」ボタンをクリック
- [ ] 「保存しました」トーストが表示される
- [ ] ページをリロード
- [ ] 編集内容が反映されている

#### US3: メモの削除 (P3)

- [ ] 既存のメモがあるページを開く
- [ ] 「削除」ボタンをクリック
- [ ] 確認ダイアログで「OK」
- [ ] 「削除しました」トーストが表示される
- [ ] メモ欄が空になる
- [ ] ページをリロード
- [ ] メモは表示されない

#### Edge Cases

- [ ] URLにクエリパラメータ付き: `?id=123` → 同じメモ表示
- [ ] URLにハッシュ付き: `#section` → 同じメモ表示
- [ ] 1,001文字入力 → 保存不可（maxLength制約）
- [ ] 空メモで保存 → 「メモを入力してください」アラート

---

## Debugging

### Chrome DevTools

1. **Background Script**: `chrome://extensions/` → PageNotes → 「Service Worker」をクリック
2. **Content Script**: ページ上で右クリック → 「検証」 → Console

### Common Issues

| Issue                      | Solution                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| ウィジェットが表示されない | Content Script が inject されているか確認（Console でエラーチェック） |
| メモが保存されない         | Background Script の Console でエラー確認                             |
| リロード後にメモが消える   | chrome.storage.local の権限確認（manifest.json）                      |

---

## Next Steps

### Phase 2: Tasks.md Generation

`/speckit.tasks` コマンドでタスクリストを生成。

### Phase 3: Implementation

1. Background Script (T001-T005)
2. Content Script (T006-T010)
3. UI Polish (T011-T015)

### Phase 4: Polish

- アイコン作成（16x16, 48x48, 128x128）
- Popup UI実装（全メモ一覧）
- ドラッグ&リサイズ実装

---

## Summary

| Step  | Description                     | Output                                 |
| ----- | ------------------------------- | -------------------------------------- |
| 1-3   | プロジェクトセットアップ        | package.json, tsconfig.json            |
| 4-5   | ディレクトリ作成、manifest.json | src/ 構造、manifest.json               |
| 6     | 型定義                          | src/types/index.ts                     |
| 7-8   | Background Script               | storage.ts, index.ts                   |
| 9-11  | Content Script                  | url-utils.ts, note-widget.ts, index.ts |
| 12-14 | ビルド & ロード                 | dist/ → Chrome Extension               |

**Development Time Estimate**: 2-3 days for MVP (P1 only), 4-5 days for full feature (P1-P3)
