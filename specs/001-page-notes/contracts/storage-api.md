# Storage API Contract

**Version**: 1.0.0  
**Purpose**: chrome.storage操作の内部APIインターフェース定義

## Overview

Background ScriptとContent Script間でメモの永続化操作を行うためのAPI仕様。chrome.storage.localを抽象化し、型安全なインターフェースを提供。

---

## Types

### Note

```typescript
interface Note {
  pageKey: string;      // Normalized URL (protocol + domain + path)
  content: string;      // Note content (1-1,000 chars)
  createdAt: number;    // Unix timestamp (milliseconds)
  updatedAt: number;    // Unix timestamp (milliseconds)
}
```

### StorageError

```typescript
interface StorageError {
  code: 'QUOTA_EXCEEDED' | 'INVALID_INPUT' | 'NOT_FOUND' | 'UNKNOWN';
  message: string;
}
```

---

## Operations

### 1. createNote

新規メモを作成し、storageに保存。

**Signature**:
```typescript
function createNote(
  pageKey: string,
  content: string
): Promise<Note>
```

**Parameters**:
- `pageKey`: 正規化されたURL（`normalizeUrl()`で生成）
- `content`: メモ本文（1〜1,000文字）

**Returns**:
- `Promise<Note>`: 作成されたメモオブジェクト

**Throws**:
- `INVALID_INPUT`: contentが空または1,000文字超過
- `QUOTA_EXCEEDED`: ストレージ容量超過（稀）

**Example**:
```typescript
const note = await createNote(
  'https://example.com/page',
  'このページの要点をまとめる'
);
// => { pageKey: '...', content: '...', createdAt: 1738675200000, updatedAt: 1738675200000 }
```

---

### 2. getNote

指定されたpageKeyのメモを取得。

**Signature**:
```typescript
function getNote(
  pageKey: string
): Promise<Note | null>
```

**Parameters**:
- `pageKey`: 正規化されたURL

**Returns**:
- `Promise<Note | null>`: メモオブジェクト、存在しない場合はnull

**Throws**:
- なし（エラー時はnull返却）

**Example**:
```typescript
const note = await getNote('https://example.com/page');
if (note) {
  console.log('Found note:', note.content);
} else {
  console.log('No note for this page');
}
```

---

### 3. updateNote

既存メモの内容を更新。

**Signature**:
```typescript
function updateNote(
  pageKey: string,
  content: string
): Promise<Note>
```

**Parameters**:
- `pageKey`: 正規化されたURL
- `content`: 新しいメモ本文（1〜1,000文字）

**Returns**:
- `Promise<Note>`: 更新されたメモオブジェクト（updatedAtが更新される）

**Throws**:
- `INVALID_INPUT`: contentが空または1,000文字超過
- `NOT_FOUND`: 指定されたpageKeyのメモが存在しない
- `QUOTA_EXCEEDED`: ストレージ容量超過（稀）

**Example**:
```typescript
const updated = await updateNote(
  'https://example.com/page',
  '要点を追加: TypeScriptのジェネリクス'
);
// => { ..., content: '要点を追加: ...', updatedAt: 1738675800000 }
```

---

### 4. deleteNote

指定されたpageKeyのメモを削除。

**Signature**:
```typescript
function deleteNote(
  pageKey: string
): Promise<void>
```

**Parameters**:
- `pageKey`: 正規化されたURL

**Returns**:
- `Promise<void>`: 常に成功（メモが存在しなくてもエラーにならない）

**Throws**:
- なし

**Example**:
```typescript
await deleteNote('https://example.com/page');
console.log('Note deleted (or did not exist)');
```

---

### 5. listAllNotes

すべてのメモを取得（管理UI用）。

**Signature**:
```typescript
function listAllNotes(): Promise<Note[]>
```

**Parameters**:
- なし

**Returns**:
- `Promise<Note[]>`: すべてのメモの配列（updatedAt降順でソート）

**Throws**:
- なし（エラー時は空配列返却）

**Example**:
```typescript
const notes = await listAllNotes();
console.log(`Total notes: ${notes.length}`);
notes.forEach(note => {
  console.log(`- ${note.pageKey}: ${note.content.substring(0, 50)}...`);
});
```

---

## Utility Functions

### normalizeUrl

URLを正規化してpageKeyを生成。

**Signature**:
```typescript
function normalizeUrl(url: string): string
```

**Parameters**:
- `url`: 任意のURL文字列

**Returns**:
- `string`: 正規化されたURL（protocol + domain + path）

**Throws**:
- `INVALID_INPUT`: URL形式が不正

**Examples**:
```typescript
normalizeUrl('https://example.com/page?id=123#section')
// => 'https://example.com/page'

normalizeUrl('https://example.com/page')
// => 'https://example.com/page'

normalizeUrl('invalid-url')
// => throws INVALID_INPUT
```

---

## chrome.storage.local Direct Operations

（参考）chrome APIの直接呼び出し例。

### Set (Save)

```typescript
await chrome.storage.local.set({
  [pageKey]: note
});
```

### Get (Retrieve)

```typescript
const result = await chrome.storage.local.get([pageKey]);
const note: Note | undefined = result[pageKey];
```

### Remove (Delete)

```typescript
await chrome.storage.local.remove([pageKey]);
```

### Get All

```typescript
const allData = await chrome.storage.local.get(null);
// allData: { [pageKey]: Note }
```

---

## Error Codes

| Code             | Description                        | User-Facing Message            |
| ---------------- | ---------------------------------- | ------------------------------ |
| `INVALID_INPUT`  | 入力値が不正（空文字、長すぎる等） | 「入力内容を確認してください」 |
| `NOT_FOUND`      | メモが存在しない                   | 「メモが見つかりません」       |
| `QUOTA_EXCEEDED` | ストレージ容量超過                 | 「保存容量が上限に達しました」 |
| `UNKNOWN`        | 予期しないエラー                   | 「エラーが発生しました」       |

---

## Performance Characteristics

| Operation      | Time Complexity | Notes                                    |
| -------------- | --------------- | ---------------------------------------- |
| `createNote`   | O(1)            | Key-Value挿入                            |
| `getNote`      | O(1)            | Key直接アクセス                          |
| `updateNote`   | O(1)            | Key-Value更新                            |
| `deleteNote`   | O(1)            | Key削除                                  |
| `listAllNotes` | O(n)            | 全データ取得+ソート（n=メモ数、最大100） |

**Expected Latency**:
- Single note operations: < 10ms
- List all notes (100 items): < 50ms

---

## Usage Example (End-to-End)

```typescript
// 1. ページロード時
const currentUrl = window.location.href;
const pageKey = normalizeUrl(currentUrl);

// 2. メモ取得
const existingNote = await getNote(pageKey);
if (existingNote) {
  displayNote(existingNote);
}

// 3. ユーザーがメモ作成
const userInput = '新しいメモ内容';
const newNote = await createNote(pageKey, userInput);
displayNote(newNote);

// 4. ユーザーが編集
const updatedContent = '編集後のメモ内容';
const updated = await updateNote(pageKey, updatedContent);
displayNote(updated);

// 5. ユーザーが削除
await deleteNote(pageKey);
hideNote();
```

---

## Versioning & Compatibility

**Current Version**: 1.0.0

**Breaking Changes Policy**:
- メジャーバージョン変更時のみ破壊的変更を許可
- データマイグレーションは拡張機能起動時に自動実行

**Future Considerations**:
- Multi-note per page (1ページ複数メモ): 要検討、現バージョンは1ページ1メモ
- Cloud sync (chrome.storage.sync): 容量制約により現状不採用
- Rich text support: 現バージョンはプレーンテキストのみ

---

## Testing Strategy

**Manual Testing** (憲章に従いコードテストなし):
1. 各操作（Create/Get/Update/Delete）の正常系を手動確認
2. エラーケース（1,000文字超過、存在しないメモの更新等）を手動確認
3. ブラウザ再起動後のデータ永続性確認
4. 100メモ作成してパフォーマンス確認

**Test Scenarios**:
- ✅ メモ作成→ページリロード→メモ表示確認
- ✅ メモ編集→保存→リロード→変更反映確認
- ✅ メモ削除→リロード→非表示確認
- ✅ 1,001文字入力→エラーメッセージ確認
- ✅ クエリパラメータ付きURL→同じメモ表示確認

---

## Summary

| Aspect              | Detail                                               |
| ------------------- | ---------------------------------------------------- |
| **API Style**       | Promise-based async functions                        |
| **Storage Backend** | chrome.storage.local                                 |
| **Error Handling**  | Typed error codes with user-friendly messages        |
| **Performance**     | O(1) for single operations, < 50ms for list all      |
| **Type Safety**     | Full TypeScript definitions                          |
| **Testing**         | Manual testing (no automated tests per constitution) |

**Next**: quickstart.mdで実装手順を記述
