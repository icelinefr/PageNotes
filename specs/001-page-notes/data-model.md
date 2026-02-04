# Data Model: PageNotes

**Date**: 2026-02-04  
**Purpose**: Phase 1 - エンティティとデータ構造の定義

## Overview

PageNotesはシンプルなKey-Value構造でメモを管理。1ページ1メモ方式で、正規化されたURL（pageKey）をキーとして使用。chrome.storage.localにJSON形式で保存。

---

## Entities

### 1. Note（メモ）

Webページに紐付けられたユーザーのテキストメモ。

**Attributes**:

| Field       | Type     | Required | Description                                 | Constraints       |
| ----------- | -------- | -------- | ------------------------------------------- | ----------------- |
| `pageKey`   | `string` | Yes      | 正規化されたURL（protocol + domain + path） | 一意キー、URL形式 |
| `content`   | `string` | Yes      | メモ本文                                    | 1〜1,000文字      |
| `createdAt` | `number` | Yes      | 作成日時（Unix timestamp）                  | > 0               |
| `updatedAt` | `number` | Yes      | 最終更新日時（Unix timestamp）              | >= createdAt      |

**TypeScript Definition**:
```typescript
interface Note {
  pageKey: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
```

**Example**:
```json
{
  "pageKey": "https://example.com/articles/typescript",
  "content": "TypeScriptの型システムについて復習する\n- Union types\n- Intersection types",
  "createdAt": 1738675200000,
  "updatedAt": 1738675800000
}
```

**Validation Rules**:
- `pageKey`: 有効なURL形式、クエリパラメータとハッシュは除外済み
- `content`: 空文字列不可、最大1,000文字
- `createdAt`: 現在時刻以前
- `updatedAt`: createdAt以降

---

## Storage Schema

### chrome.storage.local Structure

Key-Value形式で、pageKeyをキーとしてNote全体を値として保存。

**Format**:
```typescript
type StorageData = {
  [pageKey: string]: Note;
};
```

**Example Storage Content**:
```json
{
  "https://example.com/page1": {
    "pageKey": "https://example.com/page1",
    "content": "このページの要点をまとめる",
    "createdAt": 1738675200000,
    "updatedAt": 1738675200000
  },
  "https://github.com/typescript": {
    "pageKey": "https://github.com/typescript",
    "content": "TypeScript公式リポジトリ\nContributing guidelineを確認",
    "createdAt": 1738676000000,
    "updatedAt": 1738677000000
  }
}
```

**Capacity Analysis**:
- Max storage: 10MB (chrome.storage.local limit)
- Max notes: 100 (仕様SC-005)
- Per note size: ~2KB (1,000 chars × 2 bytes + metadata)
- Total usage: 100 notes × 2KB = 200KB (2% of limit, safe margin)

---

## Data Operations

### 1. Create Note

**Input**:
- `pageKey`: string (normalized URL)
- `content`: string (1-1,000 chars)

**Process**:
1. Validate inputs
2. Create Note object with current timestamp
3. Save to storage with pageKey as key

**TypeScript**:
```typescript
async function createNote(pageKey: string, content: string): Promise<Note> {
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
```

---

### 2. Get Note

**Input**:
- `pageKey`: string (normalized URL)

**Output**:
- `Note | null` (null if not found)

**Process**:
1. Query storage by pageKey
2. Return note or null

**TypeScript**:
```typescript
async function getNote(pageKey: string): Promise<Note | null> {
  const result = await chrome.storage.local.get([pageKey]);
  return result[pageKey] || null;
}
```

---

### 3. Update Note

**Input**:
- `pageKey`: string (normalized URL)
- `content`: string (new content, 1-1,000 chars)

**Process**:
1. Validate content
2. Get existing note
3. Update content and updatedAt
4. Save to storage

**TypeScript**:
```typescript
async function updateNote(pageKey: string, content: string): Promise<Note> {
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
```

---

### 4. Delete Note

**Input**:
- `pageKey`: string (normalized URL)

**Process**:
1. Remove from storage by pageKey

**TypeScript**:
```typescript
async function deleteNote(pageKey: string): Promise<void> {
  await chrome.storage.local.remove([pageKey]);
}
```

---

### 5. List All Notes

**Output**:
- `Note[]` (all notes, for management UI)

**Process**:
1. Get all storage data
2. Convert to array
3. Sort by updatedAt descending

**TypeScript**:
```typescript
async function listAllNotes(): Promise<Note[]> {
  const storage = await chrome.storage.local.get(null);
  return Object.values(storage as StorageData)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
```

---

## URL Normalization

### normalizeUrl Function

URLから正規化されたpageKeyを生成。

**Logic**:
1. Parse URL with `new URL()`
2. Extract protocol, hostname, pathname
3. Combine: `${protocol}//${hostname}${pathname}`
4. Exclude: search (query), hash

**TypeScript**:
```typescript
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (error) {
    console.error('Invalid URL:', url, error);
    throw new Error('Invalid URL format');
  }
}
```

**Examples**:

| Input URL                                 | Normalized pageKey           |
| ----------------------------------------- | ---------------------------- |
| `https://example.com/page`                | `https://example.com/page`   |
| `https://example.com/page?id=123`         | `https://example.com/page`   |
| `https://example.com/page#section`        | `https://example.com/page`   |
| `https://example.com/page?id=123#section` | `https://example.com/page`   |
| `http://localhost:3000/test`              | `http://localhost:3000/test` |

---

## State Management

### In-Memory Cache (Optional Optimization)

Content Scriptでページ読み込み時に現在のメモをキャッシュ、再取得を削減。

**Structure**:
```typescript
class NoteCache {
  private cache: Map<string, Note | null> = new Map();
  
  async get(pageKey: string): Promise<Note | null> {
    if (this.cache.has(pageKey)) {
      return this.cache.get(pageKey)!;
    }
    
    const note = await getNote(pageKey);
    this.cache.set(pageKey, note);
    return note;
  }
  
  set(pageKey: string, note: Note | null): void {
    this.cache.set(pageKey, note);
  }
  
  invalidate(pageKey: string): void {
    this.cache.delete(pageKey);
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

**Usage**: Content Scriptでインスタンス保持、ページ遷移時に`clear()`

---

## Data Migration (Future)

現在のバージョン（v1.0.0）では不要だが、将来の拡張に備えた設計。

**Version Field**:
```typescript
interface Note {
  version: number; // Schema version (default: 1)
  pageKey: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}
```

**Migration Strategy**:
1. 拡張機能起動時にバージョンチェック
2. 古いスキーマを検出したら移行処理実行
3. Background Scriptで一括変換

---

## Error Handling

### Storage Quota Exceeded

**Detection**:
```typescript
try {
  await chrome.storage.local.set({ [pageKey]: note });
} catch (error) {
  if (error.message.includes('QUOTA_BYTES')) {
    // Handle quota exceeded
    throw new Error('ストレージ容量が上限に達しました');
  }
  throw error;
}
```

**Mitigation**:
- ユーザーに通知: 「メモの保存容量が上限に近づいています」
- 古いメモの削除を提案
- 仕様では100メモまで対応（200KB）、実際の上限10MBなので余裕あり

---

## Security Considerations

### Data Sanitization

**Content Sanitization**:
- HTML/Script injection防止: Content表示時にtextContentを使用（innerHTMLは不使用）
- XSS防止: Shadow DOM内で隔離、ページJavaScriptからアクセス不可

**Example**:
```typescript
// Safe: textContent使用
noteElement.textContent = note.content;

// Unsafe: innerHTML使用禁止
// noteElement.innerHTML = note.content; // ❌
```

---

## Summary

| Aspect             | Detail                                               |
| ------------------ | ---------------------------------------------------- |
| **Primary Entity** | Note (pageKey, content, createdAt, updatedAt)        |
| **Storage**        | chrome.storage.local, Key-Value, JSON                |
| **Key Format**     | Normalized URL (protocol + domain + path)            |
| **Capacity**       | 100 notes, ~200KB total, 10MB limit                  |
| **Operations**     | Create, Get, Update, Delete, List                    |
| **Caching**        | Optional in-memory cache for performance             |
| **Security**       | textContent only, no innerHTML, Shadow DOM isolation |

**Next**: contracts/ でAPI仕様を定義、quickstart.mdで使用方法を記述
