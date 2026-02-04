# Research: PageNotes Chrome Extension

**Date**: 2026-02-04  
**Purpose**: Phase 0 - 技術選択とアーキテクチャの調査・決定

## Overview

Chrome拡張機能としてWebページにメモを追加する機能を実装するため、Manifest V3、ストレージ戦略、Content Script注入パターン、URLマッチングロジックについて調査を実施。

---

## 1. Chrome Extension Manifest Version

### Decision: Manifest V3を使用

**Rationale**:
- Manifest V2は2024年に廃止予定（現在は2026年、V3必須）
- Service WorkerベースのBackground Scriptで効率的なリソース管理
- 権限モデルが厳格でセキュリティ向上
- 長期的なメンテナンス性

**Alternatives Considered**:
- Manifest V2: 廃止済みのため却下

**Implementation**:
```json
{
  "manifest_version": 3,
  "name": "PageNotes",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab"],
  "background": {
    "service_worker": "background/index.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/index.js"],
    "css": ["content/styles.css"]
  }]
}
```

---

## 2. Storage Strategy

### Decision: chrome.storage.local

**Rationale**:
- ローカル専用（ユーザーのプライバシー保護、メモは個人的なもの）
- 最大10MB（100メモ×1,000文字×2byte = 約200KB、十分な余裕）
- 非同期API（Promise対応）でパフォーマンス良好
- オフライン動作可能

**Alternatives Considered**:
- `chrome.storage.sync`: 複数デバイス間同期だが容量制限が厳しい（100KB）、100メモで超過リスク
- `localStorage`: Content Scriptからアクセス困難、ドメイン単位で分離される
- IndexedDB: オーバースペック、シンプルなKey-Value構造で十分

**Data Schema**:
```typescript
interface Note {
  pageKey: string;      // URL key (protocol + domain + path)
  content: string;      // メモ本文 (max 1,000 chars)
  createdAt: number;    // Unix timestamp
  updatedAt: number;    // Unix timestamp
}

// Storage format: { [pageKey]: Note }
// Example: { "https://example.com/page": { pageKey: "...", content: "...", ... } }
```

---

## 3. URL Normalization Logic

### Decision: Protocol + Domain + Path（Query & Hash除外）

**Rationale**:
- 仕様で決定済み（Clarifications参照）
- クエリパラメータは動的コンテンツに使われることが多い
- ハッシュは同一ページ内のアンカー

**Implementation**:
```typescript
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // protocol + hostname + pathname のみ
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (e) {
    console.error('Invalid URL:', url);
    return url; // Fallback to original
  }
}

// Example:
// Input:  "https://example.com/page?id=123#section"
// Output: "https://example.com/page"
```

---

## 4. Content Script Injection Pattern

### Decision: Programmatic Injection + MutationObserver for SPAs

**Rationale**:
- Content Script自動注入: manifest.jsonで`<all_urls>`指定、全ページで利用可能
- SPA対応: `MutationObserver`でDOM変化検知、URL変化をlisten
- パフォーマンス: DOMContentLoadedで初期化、遅延なし

**Alternatives Considered**:
- Manual injection via `chrome.scripting`: ユーザーアクション必須、UX悪化
- Popup only: ページ上にメモ表示不可、要件満たさず

**Implementation Pattern**:
```typescript
// content/index.ts
document.addEventListener('DOMContentLoaded', () => {
  initNoteWidget();
  
  // SPA対応: URL変化を監視
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      updateNoteDisplay();
    }
  }).observe(document, { subtree: true, childList: true });
});
```

---

## 5. UI/UX Architecture

### Decision: Shadow DOM + Draggable Widget

**Rationale**:
- Shadow DOM: ページのCSSと隔離、スタイル競合なし
- Position: Fixed右下隅（仕様通り）
- Draggable: HTML5 Drag and Drop API使用
- Resizable: CSS `resize: both` プロパティ

**Component Structure**:
```typescript
class NoteWidget {
  private shadowRoot: ShadowRoot;
  private container: HTMLElement;
  
  constructor() {
    // Create shadow DOM
    const host = document.createElement('div');
    host.id = 'pagenotes-widget';
    this.shadowRoot = host.attachShadow({ mode: 'closed' });
    
    // Build UI
    this.container = this.buildContainer();
    this.shadowRoot.appendChild(this.container);
    document.body.appendChild(host);
  }
  
  private buildContainer(): HTMLElement {
    // Fixed position, right: 20px, bottom: 20px
    // Draggable, resizable
    // Auto-expand on load
  }
}
```

**Alternatives Considered**:
- iframe: 重い、セキュリティ制約多い
- 直接DOM挿入: ページCSSと競合リスク

---

## 6. Communication Pattern

### Decision: chrome.runtime.messaging for Background ↔ Content Script

**Rationale**:
- Content Scriptはchrome.storage直接アクセス可能だが、Background Scriptで一元管理が望ましい
- メッセージング: `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`
- 型安全性: TypeScriptでメッセージ型定義

**Message Types**:
```typescript
type Message =
  | { type: 'GET_NOTE'; pageKey: string }
  | { type: 'SAVE_NOTE'; pageKey: string; content: string }
  | { type: 'DELETE_NOTE'; pageKey: string };

type Response =
  | { success: true; note?: Note }
  | { success: false; error: string };
```

**Alternatives Considered**:
- Direct storage access from Content Script: 可能だが、ビジネスロジック分散で保守性低下

---

## 7. TypeScript Build Configuration

### Decision: esbuild for Fast Bundling

**Rationale**:
- 高速ビルド（webpack比10倍以上）
- TypeScript nativeサポート
- Code splitting不要（拡張機能は小規模）
- Zero config（シンプル設定）

**Build Script**:
```json
{
  "scripts": {
    "build": "esbuild src/background/index.ts src/content/index.ts src/popup/index.ts --bundle --outdir=dist --platform=browser --target=es2020",
    "watch": "npm run build -- --watch"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["chrome"]
  }
}
```

**Alternatives Considered**:
- webpack: オーバースペック、設定複雑
- Rollup: esbuildより遅い
- tsc only: bundling必要

---

## 8. Error Handling & User Feedback

### Decision: Toast Notifications + Console Logging

**Rationale**:
- 即座のフィードバック: 保存成功/失敗をToast表示（3秒自動消去）
- 開発者向け: console.error でデバッグ情報
- エラー分類: Storage quota exceeded, Invalid URL, Network errorなど

**Implementation Pattern**:
```typescript
function showToast(message: string, type: 'success' | 'error') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  shadowRoot.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// Usage
try {
  await saveNote(pageKey, content);
  showToast('メモを保存しました', 'success');
} catch (error) {
  console.error('Save failed:', error);
  showToast('保存に失敗しました', 'error');
}
```

---

## 9. Performance Optimization

### Decision: Lazy Loading + Debounced Auto-Save

**Rationale**:
- Lazy loading: メモウィジェットは初回表示時のみDOM構築
- Debounced auto-save: 編集中は500ms debounce、過度なストレージ書き込み防止
- Indexed retrieval: `chrome.storage.local.get([pageKey])` で特定メモのみ取得

**Implementation**:
```typescript
// Debounce utility
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Auto-save (500ms debounce)
const autoSave = debounce(async (content: string) => {
  await saveNote(currentPageKey, content);
}, 500);

textarea.addEventListener('input', (e) => {
  autoSave((e.target as HTMLTextAreaElement).value);
});
```

---

## 10. Accessibility & Mobile Considerations

### Decision: Keyboard Navigation + Touch-Friendly Sizing

**Rationale**:
- キーボード操作: Tab/Enter/Escapeで全操作可能
- ARIA labels: スクリーンリーダー対応
- タッチ操作: ボタンサイズ44x44px以上（憲章準拠）
- モバイルChrome: デスクトップ最適化だが、基本機能は動作

**Implementation**:
- `tabindex` 適切に設定
- `aria-label` でボタン説明
- Focus管理: モーダル開閉時にfocusトラップ

---

## Summary of Decisions

| Category         | Decision                       | Key Reason                         |
| ---------------- | ------------------------------ | ---------------------------------- |
| Manifest Version | V3                             | 必須、Service Worker、セキュリティ |
| Storage          | chrome.storage.local           | 容量十分、プライバシー、オフライン |
| URL Key          | Protocol + Domain + Path       | 仕様決定、Query/Hash除外           |
| Injection        | Auto-inject + MutationObserver | SPA対応、パフォーマンス            |
| UI Isolation     | Shadow DOM                     | CSS競合回避                        |
| Build Tool       | esbuild                        | 高速、シンプル                     |
| Communication    | chrome.runtime.messaging       | 一元管理、型安全                   |
| Error Handling   | Toast + Console                | 即座のフィードバック               |
| Performance      | Lazy + Debounce                | リソース効率                       |
| Accessibility    | Keyboard + ARIA                | 憲章準拠、UX向上                   |

**Next Phase**: Phase 1でdata-model.md、contracts/、quickstart.mdを作成
