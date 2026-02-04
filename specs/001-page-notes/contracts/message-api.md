# Message Passing API Contract

**Version**: 1.0.0  
**Purpose**: Background Script ↔ Content Script間の通信プロトコル定義

## Overview

chrome.runtime.messagingを使用して、Content ScriptからBackground Scriptへメモ操作を要求。型安全なメッセージフォーマットを定義。

---

## Message Types

### Request Messages

Content Script → Background Scriptへ送信するメッセージ。

```typescript
type RequestMessage =
  | { type: 'GET_NOTE'; pageKey: string }
  | { type: 'CREATE_NOTE'; pageKey: string; content: string }
  | { type: 'UPDATE_NOTE'; pageKey: string; content: string }
  | { type: 'DELETE_NOTE'; pageKey: string }
  | { type: 'LIST_ALL_NOTES' };
```

### Response Messages

Background Script → Content Scriptへ返すレスポンス。

```typescript
type ResponseMessage =
  | { success: true; note?: Note; notes?: Note[] }
  | { success: false; error: StorageError };
```

---

## Message Flows

### 1. GET_NOTE

メモを取得。

**Request**:
```typescript
{
  type: 'GET_NOTE',
  pageKey: 'https://example.com/page'
}
```

**Response (Success - Note Found)**:
```typescript
{
  success: true,
  note: {
    pageKey: 'https://example.com/page',
    content: 'メモ内容',
    createdAt: 1738675200000,
    updatedAt: 1738675200000
  }
}
```

**Response (Success - Note Not Found)**:
```typescript
{
  success: true,
  note: undefined
}
```

**Usage**:
```typescript
// Content Script
const response = await chrome.runtime.sendMessage({
  type: 'GET_NOTE',
  pageKey: normalizeUrl(window.location.href)
});

if (response.success && response.note) {
  displayNote(response.note);
} else {
  showEmptyState();
}
```

---

### 2. CREATE_NOTE

新規メモを作成。

**Request**:
```typescript
{
  type: 'CREATE_NOTE',
  pageKey: 'https://example.com/page',
  content: 'New note content'
}
```

**Response (Success)**:
```typescript
{
  success: true,
  note: {
    pageKey: 'https://example.com/page',
    content: 'New note content',
    createdAt: 1738675200000,
    updatedAt: 1738675200000
  }
}
```

**Response (Error - Invalid Input)**:
```typescript
{
  success: false,
  error: {
    code: 'INVALID_INPUT',
    message: 'Content must be 1-1000 characters'
  }
}
```

**Response (Error - Quota Exceeded)**:
```typescript
{
  success: false,
  error: {
    code: 'QUOTA_EXCEEDED',
    message: 'Storage quota exceeded'
  }
}
```

**Usage**:
```typescript
// Content Script
const response = await chrome.runtime.sendMessage({
  type: 'CREATE_NOTE',
  pageKey: normalizeUrl(window.location.href),
  content: userInput.value
});

if (response.success) {
  displayNote(response.note!);
  showToast('メモを保存しました', 'success');
} else {
  showToast(response.error.message, 'error');
}
```

---

### 3. UPDATE_NOTE

既存メモを更新。

**Request**:
```typescript
{
  type: 'UPDATE_NOTE',
  pageKey: 'https://example.com/page',
  content: 'Updated content'
}
```

**Response (Success)**:
```typescript
{
  success: true,
  note: {
    pageKey: 'https://example.com/page',
    content: 'Updated content',
    createdAt: 1738675200000,
    updatedAt: 1738675800000  // 更新時刻が変わる
  }
}
```

**Response (Error - Not Found)**:
```typescript
{
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: 'Note not found'
  }
}
```

**Usage**:
```typescript
// Content Script
const response = await chrome.runtime.sendMessage({
  type: 'UPDATE_NOTE',
  pageKey: normalizeUrl(window.location.href),
  content: editedContent.value
});

if (response.success) {
  displayNote(response.note!);
  showToast('メモを更新しました', 'success');
} else {
  showToast(response.error.message, 'error');
}
```

---

### 4. DELETE_NOTE

メモを削除。

**Request**:
```typescript
{
  type: 'DELETE_NOTE',
  pageKey: 'https://example.com/page'
}
```

**Response (Success)**:
```typescript
{
  success: true
}
```

**Response (Error - Uncommon)**:
```typescript
{
  success: false,
  error: {
    code: 'UNKNOWN',
    message: 'Failed to delete note'
  }
}
```

**Usage**:
```typescript
// Content Script
const confirmed = confirm('メモを削除しますか?');
if (!confirmed) return;

const response = await chrome.runtime.sendMessage({
  type: 'DELETE_NOTE',
  pageKey: normalizeUrl(window.location.href)
});

if (response.success) {
  hideNote();
  showToast('メモを削除しました', 'success');
} else {
  showToast('削除に失敗しました', 'error');
}
```

---

### 5. LIST_ALL_NOTES

すべてのメモを取得（管理UI用、将来拡張）。

**Request**:
```typescript
{
  type: 'LIST_ALL_NOTES'
}
```

**Response (Success)**:
```typescript
{
  success: true,
  notes: [
    {
      pageKey: 'https://example.com/page1',
      content: 'Note 1',
      createdAt: 1738675200000,
      updatedAt: 1738675200000
    },
    {
      pageKey: 'https://github.com/typescript',
      content: 'Note 2',
      createdAt: 1738676000000,
      updatedAt: 1738677000000
    }
  ]
}
```

**Usage**:
```typescript
// Popup Script (管理UI)
const response = await chrome.runtime.sendMessage({
  type: 'LIST_ALL_NOTES'
});

if (response.success) {
  renderNoteList(response.notes!);
}
```

---

## Background Script Implementation

Background Scriptでメッセージを受信して処理。

```typescript
// background/index.ts
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
        
        default:
          sendResponse({
            success: false,
            error: { code: 'UNKNOWN', message: 'Unknown message type' }
          });
      }
    } catch (error) {
      sendResponse({
        success: false,
        error: {
          code: error.code || 'UNKNOWN',
          message: error.message || 'Unknown error'
        }
      });
    }
  })();
  
  // Return true to keep sendResponse callback active for async
  return true;
});
```

---

## Content Script Helper

Content Scriptで使いやすいヘルパー関数。

```typescript
// content/message-helper.ts
export async function sendStorageMessage<T = Note | Note[] | undefined>(
  message: RequestMessage
): Promise<T> {
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

// Usage example
try {
  const note = await sendStorageMessage<Note>({
    type: 'GET_NOTE',
    pageKey: normalizeUrl(window.location.href)
  });
  if (note) {
    displayNote(note);
  }
} catch (error) {
  console.error('Failed to get note:', error);
  showToast(error.message, 'error');
}
```

---

## Error Handling

### Client-Side (Content Script)

```typescript
try {
  const response = await chrome.runtime.sendMessage({
    type: 'CREATE_NOTE',
    pageKey: pageKey,
    content: content
  });
  
  if (response.success) {
    // Success handling
    displayNote(response.note!);
  } else {
    // Error handling based on error code
    switch (response.error.code) {
      case 'INVALID_INPUT':
        showToast('入力内容を確認してください', 'error');
        break;
      case 'QUOTA_EXCEEDED':
        showToast('保存容量が上限に達しました', 'error');
        break;
      default:
        showToast('エラーが発生しました', 'error');
    }
  }
} catch (error) {
  // Network/communication error
  console.error('Message sending failed:', error);
  showToast('通信エラーが発生しました', 'error');
}
```

---

## Performance Considerations

### Message Latency

| Operation      | Expected Latency | Notes                                       |
| -------------- | ---------------- | ------------------------------------------- |
| GET_NOTE       | < 20ms           | Storage read + message passing              |
| CREATE_NOTE    | < 30ms           | Storage write + message passing             |
| UPDATE_NOTE    | < 30ms           | Storage read + write + message passing      |
| DELETE_NOTE    | < 20ms           | Storage delete + message passing            |
| LIST_ALL_NOTES | < 100ms          | Full storage read + sorting (max 100 items) |

### Batching (Future Optimization)

現バージョンでは不要だが、将来の最適化として検討:
- 複数メモの一括取得
- Debounced auto-save（編集中の連続保存を抑制）

---

## Security

### Message Validation

Background Scriptでメッセージ型を厳密にチェック。

```typescript
function isValidRequestMessage(message: any): message is RequestMessage {
  if (!message || typeof message !== 'object') return false;
  
  switch (message.type) {
    case 'GET_NOTE':
    case 'DELETE_NOTE':
      return typeof message.pageKey === 'string';
    
    case 'CREATE_NOTE':
    case 'UPDATE_NOTE':
      return typeof message.pageKey === 'string' &&
             typeof message.content === 'string';
    
    case 'LIST_ALL_NOTES':
      return true;
    
    default:
      return false;
  }
}

// Usage in listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isValidRequestMessage(message)) {
    sendResponse({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Invalid message format' }
    });
    return;
  }
  
  // Process valid message...
});
```

---

## Testing

### Manual Test Scenarios

1. **GET_NOTE - Existing**: Content Scriptでメモ取得→表示確認
2. **GET_NOTE - Not Found**: 新規ページでnull返却確認
3. **CREATE_NOTE - Success**: メモ作成→Successレスポンス確認
4. **CREATE_NOTE - Invalid**: 1,001文字入力→INVALID_INPUTエラー確認
5. **UPDATE_NOTE - Success**: メモ編集→updatedAt更新確認
6. **UPDATE_NOTE - Not Found**: 存在しないページKey→NOT_FOUNDエラー確認
7. **DELETE_NOTE**: メモ削除→再取得でnull確認
8. **LIST_ALL_NOTES**: Popup UIで全メモリスト表示確認

---

## Summary

| Aspect             | Detail                                      |
| ------------------ | ------------------------------------------- |
| **Protocol**       | chrome.runtime.sendMessage / onMessage      |
| **Message Format** | Typed union types (TypeScript)              |
| **Response Type**  | Success/Error with typed error codes        |
| **Error Handling** | Client-side try-catch + error code handling |
| **Latency**        | < 30ms for single operations                |
| **Security**       | Message validation in Background Script     |

**Next**: quickstart.mdで実装手順を記述
