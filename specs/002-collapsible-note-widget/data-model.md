# Data Model: Collapsible Note Widget

**Date**: 2026年2月13日  
**Branch**: 002-collapsible-note-widget  
**Purpose**: ウィジェット状態管理に必要なデータ構造を定義

## Entity: WidgetState

**説明**: ドメインごとのウィジェット展開/畳まれた状態を保持するエンティティ

### Properties

| Property      | Type      | Required | Description                          | Validation Rules                             |
| ------------- | --------- | -------- | ------------------------------------ | -------------------------------------------- |
| `isExpanded`  | `boolean` | Yes      | ウィジェットが展開されているかどうか | -                                            |
| `domain`      | `string`  | Yes      | 状態が適用されるドメイン名           | 正規化されたドメイン（プロトコル・パス除外） |
| `lastUpdated` | `number`  | Yes      | 最終更新タイムスタンプ（ミリ秒）     | `Date.now()`形式                             |

### TypeScript Definition

```typescript
/**
 * ウィジェットの展開/畳まれた状態を表す型
 */
export interface WidgetState {
  /** ウィジェットが展開されているかどうか */
  isExpanded: boolean;
  
  /** 状態が適用されるドメイン名（正規化済み） */
  domain: string;
  
  /** 最終更新タイムスタンプ（ミリ秒） */
  lastUpdated: number;
}
```

### Storage Format

**Storage Key**: `widget_state:{domain}`

**Example**:
```json
{
  "widget_state:example.com": {
    "isExpanded": true,
    "domain": "example.com",
    "lastUpdated": 1707820800000
  },
  "widget_state:github.com": {
    "isExpanded": false,
    "domain": "github.com",
    "lastUpdated": 1707824400000
  }
}
```

### State Transitions

```
初期状態（未保存）
    ↓ ページ読み込み
畳まれた状態 (isExpanded: false)
    ↓ ユーザーがバーをクリック
展開状態 (isExpanded: true)
    ↓ ストレージに保存
    ↓ ユーザーが閉じるボタンをクリック
畳まれた状態 (isExpanded: false)
    ↓ ストレージに保存
    ↓ ページリロードまたはページ移動
[保存された状態を復元]
```

### Domain Normalization Rules

ドメイン正規化ロジック（既存の`url-utils.ts`を使用）:

1. **プロトコル除去**: `https://example.com` → `example.com`
2. **パス除去**: `example.com/path/to/page` → `example.com`
3. **クエリパラメータ除去**: `example.com?query=value` → `example.com`
4. **サブドメイン保持**: `blog.example.com` ≠ `shop.example.com`
5. **小文字変換**: `Example.COM` → `example.com`

---

## Entity: Note (既存)

**説明**: Webページに関連付けられたメモデータ（既存エンティティ、変更なし）

### Properties (参照のみ)

| Property    | Type     | Description                         |
| ----------- | -------- | ----------------------------------- |
| `id`        | `string` | メモの一意識別子                    |
| `url`       | `string` | メモが関連付けられているページのURL |
| `title`     | `string` | ページタイトル                      |
| `content`   | `string` | メモの本文                          |
| `createdAt` | `number` | 作成日時（タイムスタンプ）          |
| `updatedAt` | `number` | 最終更新日時（タイムスタンプ）      |

**注**: このエンティティは既存の実装で使用されており、本フィーチャーでは変更を加えない。

---

## Relationships

```
┌─────────────────┐
│  WidgetState    │
│  (ドメインごと)  │
└─────────────────┘
        │ 1
        │
        │ has many
        │
        ▼ *
┌─────────────────┐
│     Note        │
│  (URLごと)      │
└─────────────────┘
```

- 1つのドメインに対して1つのWidgetStateが存在
- 1つのドメイン内には複数のNoteが存在可能（URLごと）
- WidgetStateとNoteは独立して管理される（直接的な関連はない）

---

## Storage Schema

### Chrome Storage Local

```typescript
interface StorageSchema {
  // ウィジェット状態（本フィーチャーで追加）
  [key: `widget_state:${string}`]: WidgetState;
  
  // メモデータ（既存）
  [key: `note:${string}`]: Note;
}
```

### Storage Quota Considerations

- **Widget State Size**: 約100バイト/ドメイン
- **Estimated Max Domains**: 1000ドメイン（ユーザーが訪問する現実的な数）
- **Total Widget State Storage**: 約100KB（chrome.storage.local制限の10MB以下）

**結論**: ストレージ容量は問題なし

---

## Data Validation

### WidgetState Validation

```typescript
function isValidWidgetState(state: any): state is WidgetState {
  return (
    typeof state === 'object' &&
    state !== null &&
    typeof state.isExpanded === 'boolean' &&
    typeof state.domain === 'string' &&
    state.domain.length > 0 &&
    typeof state.lastUpdated === 'number' &&
    state.lastUpdated > 0
  );
}
```

### Error Handling

- **不正なデータが保存されている場合**: デフォルト状態（畳まれた状態）にフォールバック
- **ストレージアクセスエラー**: コンソールに警告を出力し、デフォルト状態で動作継続
- **ドメイン正規化失敗**: 現在のページでのみ状態を保持、永続化はスキップ

---

## Migration Strategy

**既存ユーザーへの影響**: なし

- 既存のNoteデータは変更なし
- WidgetStateは新規キーとして追加
- 初回訪問時は自動的にデフォルト状態（畳まれた状態）で表示

**バージョン管理**: 不要（後方互換性あり）
