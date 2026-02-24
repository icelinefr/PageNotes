# Contract: Widget State Storage API

**Date**: 2026年2月13日  
**Purpose**: ウィジェット状態の保存・読み込みAPIの契約を定義

## Overview

このAPIは、ドメインごとのウィジェット展開/畳まれた状態を永続化し、復元する機能を提供します。Chrome Storage Local APIを使用して実装されます。

---

## API: `saveWidgetState`

### Description

現在のドメインにおけるウィジェットの展開/畳まれた状態を保存します。

### Signature

```typescript
async function saveWidgetState(domain: string, isExpanded: boolean): Promise<void>
```

### Parameters

| Parameter    | Type      | Required | Description                                                         |
| ------------ | --------- | -------- | ------------------------------------------------------------------- |
| `domain`     | `string`  | Yes      | 正規化されたドメイン名（例: `example.com`）                         |
| `isExpanded` | `boolean` | Yes      | ウィジェットが展開されている場合は`true`、畳まれている場合は`false` |

### Returns

- `Promise<void>`: 保存が完了すると解決される

### Behavior

1. `domain`と`isExpanded`から`WidgetState`オブジェクトを構築
2. `lastUpdated`に現在のタイムスタンプを設定
3. `widget_state:{domain}`キーでchrome.storage.localに保存

### Example Usage

```typescript
// ウィジェットを展開した時
await saveWidgetState('example.com', true);

// ウィジェットを畳んだ時
await saveWidgetState('example.com', false);
```

### Error Handling

- **Storage API Error**: エラーをコンソールに出力し、例外を再スロー
- **Invalid Domain**: 空文字列の場合はエラーをスロー

---

## API: `loadWidgetState`

### Description

指定されたドメインのウィジェット状態を読み込みます。

### Signature

```typescript
async function loadWidgetState(domain: string): Promise<WidgetState | null>
```

### Parameters

| Parameter | Type     | Required | Description                                 |
| --------- | -------- | -------- | ------------------------------------------- |
| `domain`  | `string` | Yes      | 正規化されたドメイン名（例: `example.com`） |

### Returns

- `Promise<WidgetState | null>`: 
  - 保存された状態が存在する場合は`WidgetState`オブジェクト
  - 存在しない場合は`null`

### Behavior

1. `widget_state:{domain}`キーでchrome.storage.localから読み込み
2. データが存在する場合は`WidgetState`オブジェクトを返す
3. データが存在しない場合は`null`を返す
4. 不正なデータの場合は`null`を返す（バリデーション失敗時）

### Example Usage

```typescript
const state = await loadWidgetState('example.com');

if (state === null) {
  // 初回訪問 → デフォルト状態（畳まれた状態）
  console.log('No saved state, using default (collapsed)');
} else {
  // 保存された状態を復元
  if (state.isExpanded) {
    // ウィジェットを展開
  } else {
    // ウィジェットを畳む
  }
}
```

### Error Handling

- **Storage API Error**: エラーをコンソールに出力し、`null`を返す（デフォルト状態にフォールバック）
- **Invalid Data**: バリデーション失敗時は`null`を返す

---

## API: `getCurrentDomain`

### Description

現在のページのURLから正規化されたドメイン名を取得します。

### Signature

```typescript
function getCurrentDomain(): string
```

### Parameters

なし（現在のページの`window.location.href`を使用）

### Returns

- `string`: 正規化されたドメイン名（例: `example.com`）

### Behavior

1. `window.location.href`から現在のURLを取得
2. プロトコル、パス、クエリパラメータを除去
3. ドメイン名を小文字に変換
4. サブドメインは保持

### Example Usage

```typescript
const domain = getCurrentDomain();
// 現在のURL: https://blog.example.com/path/to/page?query=value
// 結果: "blog.example.com"
```

### Error Handling

- **Invalid URL**: エラーをスローする可能性（通常は発生しない）

---

## Implementation Notes

### Storage Key Format

```
widget_state:{domain}
```

例:
- `widget_state:example.com`
- `widget_state:github.com`
- `widget_state:blog.example.com`

### Data Validation

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

### Domain Normalization

既存の`url-utils.ts`のロジックを再利用:

```typescript
function normalizeDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch (e) {
    console.error('Failed to normalize domain:', e);
    throw new Error('Invalid URL');
  }
}
```

---

## Integration with NoteWidget

### Initialization Flow

```typescript
class NoteWidget {
  constructor() {
    // ... existing code ...
    
    // 状態を読み込んで復元
    this.initializeWidgetState();
  }

  private async initializeWidgetState(): Promise<void> {
    const domain = getCurrentDomain();
    const savedState = await loadWidgetState(domain);
    
    if (savedState !== null) {
      this.isExpanded = savedState.isExpanded;
    } else {
      // デフォルト: 畳まれた状態
      this.isExpanded = false;
    }
    
    this.updateDisplay();
  }
}
```

### Toggle Flow

```typescript
class NoteWidget {
  async toggleWidget(): Promise<void> {
    // 状態を切り替え
    this.isExpanded = !this.isExpanded;
    
    // 表示を更新
    this.updateDisplay();
    
    // 状態を保存
    const domain = getCurrentDomain();
    await saveWidgetState(domain, this.isExpanded);
  }
}
```

---

## Testing Scenarios

### Manual Testing

1. **初回訪問**
   - ページを開く → ウィジェットは畳まれた状態
   - ウィジェットを展開 → chrome.storageに保存される
   - ページをリロード → 展開状態が復元される

2. **ドメイン間の独立性**
   - example.comでウィジェットを展開
   - github.comに移動 → ウィジェットは畳まれた状態（初回訪問）
   - example.comに戻る → ウィジェットは展開状態（保存された状態）

3. **サブドメインの扱い**
   - blog.example.comでウィジェットを展開
   - shop.example.comに移動 → ウィジェットは畳まれた状態（異なるドメイン）

4. **エラーハンドリング**
   - chrome.storageが利用できない環境 → デフォルト状態で動作継続
   - 不正なデータが保存されている → デフォルト状態にフォールバック

---

## Security Considerations

- **XSS Protection**: Shadow DOMによるスタイル分離により、外部スタイルの影響を受けない
- **Storage Isolation**: Chrome Extension のStorage APIは拡張機能ごとに分離されている
- **Domain Validation**: ドメイン名の検証により、不正なキーの作成を防止

---

## Performance Considerations

- **Storage Read**: ページ読み込み時に1回のみ実行（約5-10ms）
- **Storage Write**: ウィジェットのトグル時に1回のみ実行（約5-10ms）
- **Caching**: メモリ内にドメインと状態をキャッシュ（オプション、必要に応じて実装）
