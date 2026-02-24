# Research: Collapsible Note Widget

**Date**: 2026年2月13日  
**Branch**: 002-collapsible-note-widget  
**Purpose**: Technical Context内の不明点を解決し、実装に必要な技術的決定を記録する

## Research Tasks

### 1. CSS Transitionによる滑らかなアニメーション実装方法

**Context**: FR-004で「右下から左上方向への展開アニメーション」が要求されている。SC-006で30fps以上のフレームレートが必要。

**Research Question**: CSS transitionとtransformを使用して、パフォーマンスの高いアニメーションを実装する方法は？

**Findings**:

- **推奨アプローチ**: CSS `transform`プロパティ（translateX, translateY, scale）を使用
  - GPU加速が有効になり、レイアウトの再計算を避けられる
  - `will-change: transform`を追加することで、ブラウザが最適化を事前に準備
  - `transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)`でイージング設定

- **実装パターン**:
  ```css
  /* 畳まれた状態（初期位置：右下） */
  .widget-collapsed {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: auto; /* テキスト幅に応じて調整 */
    height: 40px;
    transform: scale(1);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* 展開状態（左上方向に移動） */
  .widget-expanded {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 320px;
    min-height: 200px;
    transform: scale(1) translate(0, 0);
    transform-origin: bottom right; /* 右下を基準点に */
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  ```

- **パフォーマンス考慮事項**:
  - `transform`, `opacity`のみをアニメーションさせることでGPU加速を最大化
  - `width`, `height`の変更は避け、`scale`で代替可能な場合はそちらを使用
  - しかし、コンテンツが変わるため`width`/`height`の変更は必要

**Decision**: CSS transition with transform and cubic-bezier easing を使用。transform-originを`bottom right`に設定し、右下を基点に展開。

**Alternatives Considered**:
- JavaScript requestAnimationFrameによる手動アニメーション → オーバーエンジニアリング、CSS transitionで十分
- CSS keyframesアニメーション → transitionで十分、複雑な制御は不要

---

### 2. Chrome Storage APIでのドメインごとの状態永続化

**Context**: FR-005で「同じドメイン内でページを移動しても状態を保持」、FR-009で「ページリロード時に状態を復元」が要求されている。

**Research Question**: chrome.storage.local APIを使用して、ドメインごとにウィジェット状態を保存・復元する最適な方法は？

**Findings**:

- **ストレージキー設計**:
  ```typescript
  // キーフォーマット: "widget_state:{domain}"
  // 例: "widget_state:example.com"
  interface WidgetStateStorage {
    [key: `widget_state:${string}`]: WidgetState;
  }

  interface WidgetState {
    isExpanded: boolean;
    domain: string;
    lastUpdated: number; // タイムスタンプ
  }
  ```

- **ドメイン正規化**: 既存の`url-utils.ts`のロジックを活用
  - サブドメインは保持（`blog.example.com` ≠ `shop.example.com`）
  - プロトコル（http/https）は無視
  - パス、クエリパラメータは無視

- **API使用パターン**:
  ```typescript
  // 保存
  async function saveWidgetState(domain: string, isExpanded: boolean): Promise<void> {
    const key = `widget_state:${domain}`;
    const state: WidgetState = {
      isExpanded,
      domain,
      lastUpdated: Date.now()
    };
    await chrome.storage.local.set({ [key]: state });
  }

  // 読み込み
  async function loadWidgetState(domain: string): Promise<WidgetState | null> {
    const key = `widget_state:${domain}`;
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }
  ```

- **デフォルト動作**:
  - 初回訪問時（状態が保存されていない）→ 畳まれた状態（FR-001）
  - 状態が保存されている場合 → 保存された状態を復元

**Decision**: `widget_state:{domain}`形式のキーでchrome.storage.localに保存。既存のurl-utils.tsのドメイン正規化ロジックを再利用。

**Alternatives Considered**:
- グローバル設定（全ドメイン共通） → 要件に反する（ドメインごとの状態保持が必要）
- localStorage使用 → Content Scriptから直接アクセス可能だが、chrome.storage.localのほうがChrome Extension推奨パターン

---

### 3. Shadow DOMでの状態管理とイベントハンドリング

**Context**: 既存のNoteWidgetクラスはShadow DOMを使用してスタイル分離を実現している。展開/畳むトグル機能を追加する必要がある。

**Research Question**: Shadow DOM内でのクリックイベント処理と、DOMの動的な切り替えを効率的に実装する方法は？

**Findings**:

- **状態管理アプローチ**:
  ```typescript
  class NoteWidget {
    private isExpanded: boolean = false; // 内部状態
    private collapsedBar: HTMLDivElement | null = null;
    private expandedContainer: HTMLDivElement | null = null;

    // 初期化時に両方のDOM要素を作成
    private initializeStructure(): void {
      // 畳まれた状態のバーを作成
      this.collapsedBar = this.createCollapsedBar();
      // 展開状態のコンテナを作成（既存ロジック）
      this.expandedContainer = this.createExpandedContainer();
      
      // 初期状態に応じて表示を切り替え
      this.updateDisplay();
    }

    private updateDisplay(): void {
      if (this.isExpanded) {
        this.collapsedBar!.style.display = 'none';
        this.expandedContainer!.style.display = 'block';
      } else {
        this.collapsedBar!.style.display = 'block';
        this.expandedContainer!.style.display = 'none';
      }
    }

    toggleWidget(): void {
      this.isExpanded = !this.isExpanded;
      this.updateDisplay();
      this.saveState(); // ストレージに保存
    }
  }
  ```

- **イベントハンドリング**:
  - 畳まれたバー全体をクリック可能に（`cursor: pointer`）
  - 展開状態では、既存の閉じるボタンに加えて「畳むボタン」を追加
  - Shadow DOM内のイベントは通常のDOM同様に`addEventListener`で処理可能

- **DOM構造の切り替え**:
  - `display: none/block`で切り替え（シンプル、パフォーマンス良好）
  - DOM要素の追加/削除は避ける（メモリリーク防止、状態保持のため）

**Decision**: NoteWidgetクラスに`isExpanded`フラグを追加。両方のDOM要素を常に保持し、`display`プロパティで切り替え。

**Alternatives Considered**:
- DOM要素の動的追加/削除 → 複雑性増加、状態管理が困難
- CSS class切り替えのみ → 可能だが、`display`切り替えのほうが明示的

---

### 4. 既存メモ機能との後方互換性維持

**Context**: FR-007で「既存のメモ表示機能をすべて保持」が要求されている。既存の577行のコードに対する影響を最小化する必要がある。

**Research Question**: 既存のメモ機能（作成、編集、削除、ドラッグ＆ドロップ）を壊さずに、トグル機能を追加する方法は？

**Findings**:

- **既存コードの影響分析**:
  - `initializeStructure()`メソッド → 拡張が必要（畳まれた状態のバーを追加）
  - `initializeStyles()`メソッド → 拡張が必要（新しいCSSスタイルを追加）
  - その他のメソッド（`loadNote()`, `saveNote()`, `deleteNote()`, `initializeDragAndDrop()`）→ 変更不要

- **拡張戦略**:
  1. 既存の`.widget-container`クラスは展開状態用として維持
  2. 新しい`.widget-collapsed-bar`クラスを追加
  3. 既存メソッドは展開状態でのみ機能（畳まれた状態では無効化不要、非表示なため）

- **注意点**:
  - ドラッグ＆ドロップ機能は展開状態でのみ有効
  - 畳まれた状態ではドラッグできないようにする（`pointer-events: auto`を展開状態のみに設定）

**Decision**: 既存のコードを最小限の変更で拡張。新しいメソッド（`toggleWidget()`, `saveWidgetState()`, `loadWidgetState()`）を追加し、既存メソッドは変更しない。

**Alternatives Considered**:
- 全面的なリファクタリング → リスクが高い、要件に反する（既存機能の保持）

---

## Summary of Decisions

| 項目               | 決定内容                                              | 理由                                           |
| ------------------ | ----------------------------------------------------- | ---------------------------------------------- |
| アニメーション実装 | CSS transition + transform                            | GPU加速、シンプル、30fps以上達成可能           |
| 状態永続化         | chrome.storage.local with `widget_state:{domain}` key | Chrome Extension推奨、ドメインごとの分離が容易 |
| 状態管理           | `isExpanded`フラグ + `display`切り替え                | シンプル、既存コードへの影響最小               |
| 後方互換性         | 既存メソッド不変、新規メソッド追加                    | リスク最小化、段階的拡張                       |

## Open Questions

なし - すべての技術的決定が完了しました。Phase 1（データモデルとコントラクト定義）に進む準備が整っています。
