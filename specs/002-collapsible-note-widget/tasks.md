# Tasks: Collapsible Note Widget

**Branch**: `002-collapsible-note-widget`  
**Input**: Design documents from `/specs/002-collapsible-note-widget/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/widget-state-storage.md](./contracts/widget-state-storage.md), [quickstart.md](./quickstart.md)

**Tests**: テストコードは実装しません（Testing Policy: 手動テストのみ）

**Organization**: タスクはユーザーストーリーごとにグループ化され、各ストーリーを独立して実装・テスト可能にします。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（US1, US2, US3）
- ファイルパスを含む明確な説明

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: プロジェクト初期化と基本構造の準備

- [X] T001 既存のプロジェクト構造を確認し、変更対象ファイルを特定
- [X] T002 TypeScriptコンパイル設定（tsconfig.json）が厳格モードであることを確認
- [X] T003 Chrome Extension manifest.json の permissions に "storage" が含まれていることを確認

**Checkpoint**: 開発環境確認完了

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのユーザーストーリーの前提となるコアインフラストラクチャ

**⚠️ CRITICAL**: このフェーズが完了するまで、ユーザーストーリーの作業を開始できません

- [X] T004 [P] WidgetState型定義を src/types/index.ts に追加
- [X] T005 [P] NoteWidgetクラスに isExpanded プロパティを追加（src/content/note-widget.ts）
- [X] T006 [P] NoteWidgetクラスに collapsedBar と expandedContainer プロパティを追加
- [X] T007 getCurrentDomain() メソッドを実装（ドメイン正規化）in src/content/note-widget.ts
- [X] T008 isValidWidgetState() バリデーションメソッドを実装 in src/content/note-widget.ts

**Checkpoint**: 基盤準備完了 - ユーザーストーリーの実装を並行して開始可能

---

## Phase 3: User Story 1 - Toggle Widget Visibility (Priority: P1) 🎯 MVP

**Goal**: ユーザーがワンクリックでメモウィジェットを展開/畳むことができるようにする。デフォルトは畳まれた状態で、右下に「PageNotes」バーを表示。

**Independent Test**: ページを開く → バーが表示される → クリックして展開 → 畳むボタンで畳む → 既存のメモ機能が動作する

### Implementation for User Story 1

- [X] T009 [P] [US1] 畳まれた状態のCSSスタイルを追加（.widget-collapsed-bar）in src/content/note-widget.ts の initializeStyles()
- [X] T010 [P] [US1] 展開状態のCSSアニメーション設定を追加（transition, transform-origin）in src/content/note-widget.ts の initializeStyles()
- [X] T011 [US1] initializeCollapsedBar() メソッドを実装（バーUI作成）in src/content/note-widget.ts
  - 「PageNotes」テキストラベルを含む横長バーを作成
  - クリックイベントリスナーを追加（展開処理）
  - Shadow DOMに追加
- [X] T012 [US1] initializeExpandedContainer() メソッドを実装（既存のinitializeStructure()を改名・調整）in src/content/note-widget.ts
  - 既存のウィジェットUI作成ロジックを移動
  - 「畳むボタン」（−アイコン）を追加
  - 畳むボタンのイベントリスナーを追加
- [X] T013 [US1] updateDisplay() メソッドを実装（表示切り替え）in src/content/note-widget.ts
  - isExpanded フラグに基づいて display プロパティを切り替え
- [X] T014 [US1] toggleWidget(expand: boolean) メソッドを実装 in src/content/note-widget.ts
  - isExpanded 状態を更新
  - updateDisplay() を呼び出し
- [X] T015 [US1] constructor() を更新 in src/content/note-widget.ts
  - initializeCollapsedBar() と initializeExpandedContainer() を呼び出し
  - 初期状態を畳まれた状態に設定
- [ ] T016 [US1] 手動テスト: 初回表示と展開/畳む操作の動作確認
  - ページ読み込み時にバーが表示される
  - バーをクリックしてウィジェットが展開される
  - 畳むボタンでウィジェットが畳まれる
  - アニメーションが滑らか（0.3秒）
  - 既存のメモ機能（作成、編集、削除、ドラッグ）が動作する

**Checkpoint**: User Story 1 完了 - 基本的なトグル機能が動作し、独立してテスト可能

---

## Phase 4: User Story 2 - State Persistence Across Pages (Priority: P2)

**Goal**: ドメインごとにウィジェットの展開/畳まれた状態を永続化し、ページリロードやページ移動後も状態を復元する。

**Independent Test**: ウィジェットを展開 → ページリロード → 展開状態が保持される。同じドメインの別ページに移動 → 状態が保持される。

### Implementation for User Story 2

- [X] T017 [P] [US2] saveWidgetState(domain: string, isExpanded: boolean) メソッドを実装 in src/content/note-widget.ts
  - WidgetState オブジェクトを構築
  - chrome.storage.local.set() でドメインごとに保存
  - エラーハンドリング
- [X] T018 [P] [US2] loadWidgetState(domain: string) メソッドを実装 in src/content/note-widget.ts
  - chrome.storage.local.get() でドメインごとの状態を読み込み
  - バリデーション（isValidWidgetState 使用）
  - 存在しない場合は null を返す
  - エラーハンドリング
- [X] T019 [US2] initializeWidgetState() メソッドを実装 in src/content/note-widget.ts
  - getCurrentDomain() でドメイン取得
  - loadWidgetState() で保存された状態を読み込み
  - 状態が存在する場合は isExpanded を設定
  - 存在しない場合はデフォルト（false）を設定
  - updateDisplay() を呼び出し
- [X] T020 [US2] toggleWidget() メソッドを更新 in src/content/note-widget.ts
  - saveWidgetState() を呼び出して状態を保存
- [X] T021 [US2] constructor() を更新 in src/content/note-widget.ts
  - initializeWidgetState() を呼び出し（非同期処理）
  - 初期化完了後に表示を更新
- [ ] T022 [US2] 手動テスト: 状態永続化の動作確認
  - ウィジェットを展開 → ページリロード → 展開状態が保持される
  - ウィジェットを畳む → ページリロード → 畳まれた状態が保持される
  - 同じドメイン内の別ページに移動 → 状態が保持される
  - 異なるドメインに移動 → デフォルト状態（畳まれた）で表示される
  - Chrome DevTools → Application → Storage で保存データを確認

**Checkpoint**: User Story 2 完了 - 状態永続化が動作し、US1とUS2が両方独立してテスト可能

---

## Phase 5: User Story 3 - Visual Indicator for Collapsed State (Priority: P3)

**Goal**: 畳まれた状態のバーに視覚的なフィードバック（ホバー効果、ツールチップ）を追加し、ユーザビリティを向上させる。

**Independent Test**: バーにマウスホバー → 色が変化、影が濃くなる、ツールチップが表示される。

### Implementation for User Story 3

- [X] T023 [P] [US3] ホバー効果のCSSスタイルを追加 in src/content/note-widget.ts の initializeStyles()
  - .widget-collapsed-bar:hover スタイル
  - box-shadow の強調
  - transform: translateY(-2px) で浮き上がり効果
- [X] T024 [US3] ツールチップ要素を initializeCollapsedBar() に追加 in src/content/note-widget.ts
  - title属性を設定（「クリックしてメモを開く」）
  - または、カスタムツールチップ要素を作成
- [X] T025 [US3] 畳むボタンのホバー効果を改善 in src/content/note-widget.ts の initializeStyles()
  - .collapse-button:hover スタイル
  - 背景色の変化
  - カーソル変更（pointer）
- [ ] T026 [US3] 手動テスト: 視覚的フィードバックの動作確認
  - バーにマウスホバー → 色が変化、影が濃くなる
  - ツールチップが表示される（ブラウザネイティブまたはカスタム）
  - 畳むボタンにマウスホバー → 背景色が変化
  - すべての視覚的フィードバックが直感的でわかりやすい

**Checkpoint**: User Story 3 完了 - すべてのユーザーストーリーが独立して機能する

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 複数のユーザーストーリーに影響する改善

- [X] T027 [P] コードの整理とリファクタリング（重複削除、コメント追加）
- [X] T028 [P] 既存のドラッグ＆ドロップ機能が展開状態でのみ動作することを確認
- [ ] T029 エッジケースの動作確認
  - 非常に遅いデバイスでアニメーションが適切に動作するか
  - 小さい画面サイズでウィジェットが適切に表示されるか
  - ストレージAPIエラー時にデフォルト状態で動作するか
- [ ] T030 quickstart.md のテストシナリオをすべて実行
  - 初回表示
  - 展開/畳む操作
  - 状態永続化
  - ドメイン間の独立性
  - 既存機能の動作確認
  - 視覚的フィードバック
- [ ] T031 パフォーマンス検証
  - アニメーションのフレームレート測定（Chrome DevTools Performance tab）
  - 展開時間が0.3秒以内であることを確認
  - ストレージ読み込み時間が10ms以内であることを確認
- [ ] T032 ビルドして Chrome Extension をリロード、実際のWebサイトで動作確認
- [X] T033 docs/development-log.md に実装内容を記録（オプション）

**Final Checkpoint**: すべてのタスクが完了し、機能が完全に動作する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし - すぐに開始可能
- **Foundational (Phase 2)**: Setup完了後 - すべてのユーザーストーリーをブロック
- **User Stories (Phase 3-5)**: Foundational完了後
  - 並行実行可能（チームメンバーが複数いる場合）
  - または優先順位順に実装（P1 → P2 → P3）
- **Polish (Phase 6)**: すべての必要なユーザーストーリーが完了後

### User Story Dependencies

- **User Story 1 (P1)**: Foundational完了後に開始可能 - 他のストーリーへの依存なし ✅ MVP
- **User Story 2 (P2)**: Foundational完了後に開始可能 - US1と統合するがUS1完了を待つ必要はない
  - 推奨: US1完了後に開始（テストが容易）
- **User Story 3 (P3)**: Foundational完了後に開始可能 - US1と統合するがUS1完了を待つ必要はない
  - 推奨: US1完了後に開始（視覚的フィードバックの対象が必要）

### Within Each User Story

1. US1内のタスク順序:
   - CSSスタイル追加（T009, T010）→ 並行実行可能
   - UI作成メソッド実装（T011, T012）→ 並行実行可能
   - 状態管理メソッド実装（T013, T014）→ UI作成後
   - constructor更新（T015）→ すべてのメソッド完了後
   - 手動テスト（T016）→ 実装完了後

2. US2内のタスク順序:
   - ストレージメソッド実装（T017, T018）→ 並行実行可能
   - 初期化メソッド実装（T019）→ ストレージメソッド完了後
   - toggleWidget更新（T020）→ ストレージメソッド完了後
   - constructor更新（T021）→ 初期化メソッド完了後
   - 手動テスト（T022）→ 実装完了後

3. US3内のタスク順序:
   - CSSスタイル追加（T023, T025）→ 並行実行可能
   - ツールチップ追加（T024）→ いつでも実行可能
   - 手動テスト（T026）→ 実装完了後

### Parallel Opportunities

- **Phase 1**: T001-T003 すべて並行実行可能
- **Phase 2**: T004-T008 すべて並行実行可能（異なるメソッド/型定義）
- **Phase 3 (US1)**: T009とT010（CSSスタイル）、T011とT012（UI作成）は並行実行可能
- **Phase 4 (US2)**: T017とT018（ストレージメソッド）は並行実行可能
- **Phase 5 (US3)**: T023とT025（CSSスタイル）は並行実行可能
- **Phase 6**: T027とT028は並行実行可能
- **異なるUser Stories**: US1完了後、US2とUS3は並行実行可能

---

## Parallel Example: User Story 1

Developer A がUI作成に集中している間、Developer B がCSSスタイリングを実装できます：

```bash
# Developer A
git checkout -b feature/us1-ui-creation
# T011, T012 を実装
git commit -m "feat(US1): UI作成メソッドを実装"

# Developer B (同時進行)
git checkout -b feature/us1-css-styling
# T009, T010 を実装
git commit -m "feat(US1): CSSスタイルとアニメーションを追加"

# マージ後、Developer A または B
git checkout 002-collapsible-note-widget
git merge feature/us1-ui-creation
git merge feature/us1-css-styling
# T013, T014, T015, T016 を順次実装
```

---

## Implementation Strategy

### MVP First (推奨)

User Story 1（P1）のみを実装し、動作するMVPを最初に提供：

1. Phase 1: Setup → Phase 2: Foundational → Phase 3: User Story 1
2. テストとフィードバック収集
3. 必要に応じてUser Story 2, 3を追加

### Incremental Delivery

各ユーザーストーリーを個別に完成させ、段階的にデリバリー：

1. US1完成 → デプロイ → フィードバック
2. US2完成 → デプロイ → フィードバック
3. US3完成 → デプロイ → フィードバック

### Full Feature

すべてのユーザーストーリーを完成させてから一括デリバリー：

1. Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
2. すべて完成後にデプロイ

**推奨**: MVP Firstアプローチで、User Story 1を最初に完成させ、ユーザーフィードバックを得てから残りを実装。

---

## Total Task Count

- **Setup**: 3タスク
- **Foundational**: 5タスク
- **User Story 1 (P1)**: 8タスク
- **User Story 2 (P2)**: 6タスク
- **User Story 3 (P3)**: 4タスク
- **Polish**: 7タスク

**Total**: 33タスク

**Estimated Time**: 
- Setup + Foundational: 2-3時間
- User Story 1: 4-6時間
- User Story 2: 2-3時間
- User Story 3: 1-2時間
- Polish: 2-3時間

**Total Estimated Time**: 11-17時間（1人での実装の場合）

---

## Success Criteria

各フェーズ完了時に以下を確認：

### Phase 3 (US1) Success
- [ ] ページ読み込み時にバーが畳まれた状態で表示される
- [ ] バーをクリックするとウィジェットが展開される
- [ ] 展開されたウィジェットで既存のメモ機能がすべて動作する
- [ ] 畳むボタンでウィジェットが畳まれる
- [ ] アニメーションが滑らか（30fps以上）

### Phase 4 (US2) Success
- [ ] ウィジェットの状態がドメインごとに保存される
- [ ] ページリロード後に状態が復元される
- [ ] 同じドメイン内のページ移動後に状態が保持される
- [ ] 異なるドメインでは独立した状態が管理される

### Phase 5 (US3) Success
- [ ] バーにマウスホバーすると視覚的フィードバックが表示される
- [ ] ツールチップが表示される
- [ ] 畳むボタンのホバー効果が動作する

### Final Success (All Phases)
- [ ] すべての機能要件（FR-001 〜 FR-009）を満たす
- [ ] すべての成功基準（SC-001 〜 SC-006）を達成
- [ ] 既存のメモ機能に影響がない（後方互換性）
- [ ] Constitution Checkのすべての項目に準拠
