# Quickstart: Collapsible Note Widget Implementation

**Date**: 2026年2月13日  
**Branch**: 002-collapsible-note-widget  
**Purpose**: 実装の手順とガイドラインを提供

## Prerequisites

- TypeScript 5.3+がインストールされていること
- 既存のPageNotes拡張機能のコードベースへのアクセス
- [spec.md](./spec.md)、[research.md](./research.md)、[data-model.md](./data-model.md)を読んでいること

---

## Implementation Overview

### 変更対象ファイル

1. `src/types/index.ts` - 型定義の追加
2. `src/content/note-widget.ts` - NoteWidgetクラスの拡張（メイン実装）
3. `src/background/storage.ts` - ストレージAPI関数の追加（オプション）

### 新規ファイル

なし（既存ファイルの拡張のみ）

---

## Step 1: 型定義の追加

**File**: `src/types/index.ts`

```typescript
// 既存のNote型の後に追加

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

---

## Step 2: NoteWidgetクラスの拡張

**File**: `src/content/note-widget.ts`

### 2.1 プロパティの追加

```typescript
export class NoteWidget {
  private container: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private currentNote: Note | null = null;
  
  // ↓ 以下を追加
  private isExpanded: boolean = false; // ウィジェットの展開状態
  private collapsedBar: HTMLDivElement | null = null; // 畳まれた状態のバー
  private expandedContainer: HTMLDivElement | null = null; // 展開状態のコンテナ
  // ↑ ここまで追加

  constructor() {
    // ... 既存のコード ...
  }
}
```

### 2.2 初期化処理の変更

```typescript
constructor() {
  this.container = document.createElement("div");
  this.container.id = "pagenotes-widget";
  this.shadowRoot = this.container.attachShadow({ mode: "open" });

  this.initializeStyles();
  
  // ↓ 既存のinitializeStructureを変更
  // this.initializeStructure(); // 削除
  // ↑
  
  // ↓ 以下を追加
  this.initializeCollapsedBar(); // 畳まれた状態のバーを作成
  this.initializeExpandedContainer(); // 展開状態のコンテナを作成（既存ロジック）
  this.initializeWidgetState(); // 保存された状態を復元
  // ↑ ここまで追加

  document.body.appendChild(this.container);
}
```

### 2.3 畳まれた状態のバー作成

```typescript
/**
 * 畳まれた状態のバーUIを作成
 */
private initializeCollapsedBar(): void {
  this.collapsedBar = document.createElement("div");
  this.collapsedBar.className = "widget-collapsed-bar";
  
  const label = document.createElement("span");
  label.className = "collapsed-label";
  label.textContent = "PageNotes";
  
  this.collapsedBar.appendChild(label);
  
  // クリックイベント: ウィジェットを展開
  this.collapsedBar.addEventListener("click", () => {
    this.toggleWidget(true);
  });
  
  this.shadowRoot.appendChild(this.collapsedBar);
}
```

### 2.4 展開状態のコンテナ作成

```typescript
/**
 * 展開状態のコンテナを作成（既存のinitializeStructure()を改名・調整）
 */
private initializeExpandedContainer(): void {
  // 既存のinitializeStructure()のコードをここに移動
  // container要素を this.expandedContainer に変更
  
  this.expandedContainer = document.createElement("div");
  this.expandedContainer.className = "widget-container";
  
  // ヘッダー部分
  const header = document.createElement("div");
  header.className = "widget-header";
  
  const title = document.createElement("h3");
  title.textContent = "メモ";
  
  // ↓ 閉じるボタンに加えて、畳むボタンを追加
  const collapseButton = document.createElement("button");
  collapseButton.className = "collapse-button";
  collapseButton.textContent = "−"; // マイナス記号
  collapseButton.title = "畳む";
  collapseButton.addEventListener("click", () => {
    this.toggleWidget(false);
  });
  
  const closeButton = document.createElement("button");
  // ... 既存の閉じるボタンのコード ...
  
  header.appendChild(title);
  header.appendChild(collapseButton);
  header.appendChild(closeButton);
  // ↑ ここまで変更
  
  // 以下、既存のコードを継続...
  // textarea, saveButton, deleteButton などを追加
  
  this.shadowRoot.appendChild(this.expandedContainer);
}
```

### 2.5 状態管理メソッド

```typescript
/**
 * ウィジェットの展開/畳む状態を切り替え
 */
private async toggleWidget(expand: boolean): Promise<void> {
  this.isExpanded = expand;
  this.updateDisplay();
  
  // 状態を保存
  const domain = this.getCurrentDomain();
  await this.saveWidgetState(domain, this.isExpanded);
}

/**
 * 表示の更新（展開 or 畳む）
 */
private updateDisplay(): void {
  if (this.isExpanded) {
    this.collapsedBar!.style.display = "none";
    this.expandedContainer!.style.display = "block";
  } else {
    this.collapsedBar!.style.display = "flex";
    this.expandedContainer!.style.display = "none";
  }
}

/**
 * 現在のドメインを取得
 */
private getCurrentDomain(): string {
  try {
    const url = new URL(window.location.href);
    return url.hostname.toLowerCase();
  } catch (e) {
    console.error("Failed to get domain:", e);
    return "unknown";
  }
}

/**
 * 保存された状態を読み込んで復元
 */
private async initializeWidgetState(): Promise<void> {
  const domain = this.getCurrentDomain();
  const savedState = await this.loadWidgetState(domain);
  
  if (savedState !== null) {
    this.isExpanded = savedState.isExpanded;
  } else {
    // デフォルト: 畳まれた状態
    this.isExpanded = false;
  }
  
  this.updateDisplay();
}

/**
 * ウィジェット状態を保存
 */
private async saveWidgetState(domain: string, isExpanded: boolean): Promise<void> {
  const key = `widget_state:${domain}`;
  const state: WidgetState = {
    isExpanded,
    domain,
    lastUpdated: Date.now(),
  };
  
  try {
    await chrome.storage.local.set({ [key]: state });
  } catch (e) {
    console.error("Failed to save widget state:", e);
  }
}

/**
 * ウィジェット状態を読み込み
 */
private async loadWidgetState(domain: string): Promise<WidgetState | null> {
  const key = `widget_state:${domain}`;
  
  try {
    const result = await chrome.storage.local.get(key);
    const state = result[key];
    
    // バリデーション
    if (this.isValidWidgetState(state)) {
      return state;
    }
  } catch (e) {
    console.error("Failed to load widget state:", e);
  }
  
  return null;
}

/**
 * WidgetStateのバリデーション
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
```

---

## Step 3: CSSスタイルの追加

**File**: `src/content/note-widget.ts` の `initializeStyles()` メソッド

```typescript
private initializeStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
    }

    /* 既存のスタイルはそのまま維持 */
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
      z-index: 10000;
      display: none; /* 初期は非表示 */
      /* アニメーション追加 */
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: bottom right;
    }

    /* ↓ 以下を追加 */
    /* 畳まれた状態のバー */
    .widget-collapsed-bar {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      display: none; /* 初期は非表示 */
      align-items: center;
      gap: 8px;
      z-index: 10000;
      transition: box-shadow 0.2s, transform 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .widget-collapsed-bar:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .collapsed-label {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      user-select: none;
    }

    /* 畳むボタンのスタイル */
    .collapse-button {
      background: transparent;
      border: none;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      padding: 4px 8px;
      color: #666;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .collapse-button:hover {
      background: #f0f0f0;
      color: #333;
    }
    /* ↑ ここまで追加 */

    /* 以下、既存のスタイルを維持 */
    .widget-header {
      /* ... */
    }
    /* ... */
  `;
  
  this.shadowRoot.appendChild(style);
}
```

---

## Step 4: ビルドとテスト

### ビルド

```powershell
npm run build
```

### Chrome拡張機能の再読み込み

1. `chrome://extensions/` を開く
2. 「再読み込み」ボタンをクリック
3. 任意のWebページを開く

### テストシナリオ

1. **初回表示**
   - [ ] ウィジェットが畳まれた状態で右下に表示される
   - [ ] 「PageNotes」というテキストが表示される

2. **展開操作**
   - [ ] バーをクリックするとウィジェットが展開される
   - [ ] アニメーションが滑らか（0.3秒程度）

3. **畳む操作**
   - [ ] 「−」ボタンをクリックするとウィジェットが畳まれる
   - [ ] アニメーションが滑らか

4. **状態の永続化**
   - [ ] ウィジェットを展開してページをリロード → 展開状態が保持される
   - [ ] ウィジェットを畳んでページをリロード → 畳まれた状態が保持される

5. **ドメイン間の独立性**
   - [ ] example.comで展開、github.comに移動 → 畳まれた状態
   - [ ] example.comに戻る → 展開状態

6. **既存機能の動作確認**
   - [ ] メモの作成、編集、削除が正常に動作する
   - [ ] ドラッグ＆ドロップが正常に動作する

---

## Troubleshooting

### ウィジェットが表示されない

- ビルドが正しく実行されているか確認
- Console でエラーが出ていないか確認
- `document.body.appendChild(this.container)` が実行されているか確認

### 状態が保存されない

- chrome.storage.local APIのパーミッションが設定されているか確認（manifest.json）
- Console でストレージエラーが出ていないか確認
- Chrome DevTools → Application → Storage → Local Storage で確認

### アニメーションがカクカクする

- CSS transitionの`cubic-bezier`値を調整
- `will-change: transform`を追加してGPU加速を有効化

---

## Next Steps

実装が完了したら:

1. `/speckit.tasks` コマンドを実行してタスクリストを生成
2. タスクに従って実装を進める
3. 各タスク完了後にコミット
4. すべてのタスクが完了したらPRを作成

---

## References

- [Feature Specification](./spec.md)
- [Research Document](./research.md)
- [Data Model](./data-model.md)
- [Widget State Storage Contract](./contracts/widget-state-storage.md)
- [Chrome Storage API Documentation](https://developer.chrome.com/docs/extensions/reference/storage/)
