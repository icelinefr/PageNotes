# Tasks: PageNotes Chrome拡張機能

**入力**: `specs/001-page-notes/`の設計ドキュメント
**前提条件**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**テスト**: 憲章（テストなしポリシー）に従い、手動テストタスクのみを含む

**構成**: タスクはユーザーストーリー別にグループ化され、各ストーリーの独立した実装とテストを可能にする

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（例: US1, US2, US3）
- 説明には正確なファイルパスを含める

---

## Phase 1: セットアップ（共有インフラストラクチャ）

**目的**: プロジェクトの初期化と基本的なChrome拡張機能の構造

- [X] T001 [plan.md](plan.md)に従ってプロジェクト構造（src/, dist/ディレクトリ）を作成
- [X] T002 TypeScript 5.x、esbuild、@types/chrome依存関係を含むpackage.jsonを初期化
- [X] T003 [P] ES2020ターゲット、strictモード、chrome型定義を含むtsconfig.jsonを設定
- [X] T004 [P] package.jsonにビルドスクリプト（build, watch, clean）を追加（[quickstart.md](quickstart.md)参照）
- [X] T005 [research.md](research.md) Decision 1に従ってManifest V3設定を含むsrc/manifest.jsonを作成

---

## Phase 2: 基盤構築（ブロッキング前提条件）

**目的**: すべてのユーザーストーリーを実装する前に完了しなければならないコアインフラストラクチャ

**⚠️ 重要**: このフェーズが完了するまで、ユーザーストーリーの作業は開始できません

- [X] T006 [P] [data-model.md](data-model.md)に従ってsrc/types/index.tsにNoteインターフェースを定義
- [X] T007 [P] [contracts/message-api.md](contracts/message-api.md)に従ってsrc/types/index.tsにメッセージ型（RequestMessage, ResponseMessage）を定義
- [X] T008 [P] [research.md](research.md) Decision 3に従ってsrc/background/url-utils.tsにnormalizeUrl()ヘルパーを実装
- [X] T009 [contracts/storage-api.md](contracts/storage-api.md)に従ってsrc/background/storage.tsにcreateNote()を含むストレージAPIラッパーを作成
- [X] T010 [contracts/storage-api.md](contracts/storage-api.md)に従ってsrc/background/storage.tsにgetNote()操作を追加
- [X] T011 [contracts/message-api.md](contracts/message-api.md)に従ってsrc/background/index.tsにchrome.runtime.onMessageを処理するメッセージリスナーをセットアップ
- [X] T012 src/background/index.tsにGET_NOTEメッセージハンドラを実装
- [X] T013 src/background/index.tsにCREATE_NOTEメッセージハンドラを実装

**チェックポイント**: 基盤準備完了 - ユーザーストーリーの実装を並列開始可能

---

## Phase 3: ユーザーストーリー 1 - メモの作成と表示（優先度: P1）🎯 MVP

**目標**: ユーザーが任意のWebページでメモを作成し、そのページに戻ったときに自動的に表示される

**独立テスト**: 任意のWebページでメモを作成し、ページをリロードして、メモが画面右下隅に自動的に表示されることを確認

### ユーザーストーリー 1の実装

- [X] T014 [P] [US1] [research.md](research.md) Decision 5に従ってsrc/content/note-widget.tsにShadow DOMセットアップを含むNoteWidgetクラスのスケルトンを作成
- [X] T015 [P] [US1] src/content/note-widget.tsにウィジェットスタイルを追加（position: fixed、右下隅、Shadow DOM分離）
- [X] T016 [US1] spec.md clarificationに従って自動展開でメモコンテンツを表示するshowNote()メソッドをsrc/content/note-widget.tsに実装
- [X] T017 [US1] メモ作成UIを処理するcreateNote()メソッドをsrc/content/note-widget.tsに実装
- [X] T018 [US1] CREATE_NOTEメッセージを送信する保存ボタンハンドラをsrc/content/note-widget.tsに追加
- [X] T019 [US1] [quickstart.md](quickstart.md) Step 14に従ってsrc/content/index.tsにコンテンツスクリプトの初期化を実装
- [X] T020 [US1] ページロード時にメモを自動読み込みするためのDOMContentLoadedリスナーをsrc/content/index.tsに追加
- [X] T021 [US1] src/content/index.tsでGET_NOTEメッセージを送信し、NoteWidget経由で結果を表示
- [X] T022 [US1] spec.md FR-001に従って1〜1,000文字制限の入力検証をsrc/content/note-widget.tsに追加
- [X] T023 [US1] [research.md](research.md) Decision 4に従ってSPAサポートのためのMutationObserverをsrc/content/index.tsに実装
- [X] T024 [US1] 入力中に「X/1000」を表示する文字カウンターUIをsrc/content/note-widget.tsに追加
- [X] T025 [US1] [research.md](research.md) Decision 6に従ってメモ作成後の成功トースト通知をsrc/content/note-widget.tsに追加
- [X] T026 [US1] [research.md](research.md) Decision 5に従ってウィジェット位置調整のためのHTML5ドラッグをsrc/content/note-widget.tsに実装

**チェックポイント**: この時点でユーザーストーリー 1は完全に機能する - ユーザーはメモを作成し、自動的に表示できる

---

## Phase 4: ユーザーストーリー 2 - メモの編集（優先度: P2）

**目標**: ユーザーが既存のメモ内容を更新し、変更を即座に確認できる

**独立テスト**: メモを作成し、編集ボタンをクリックし、内容を変更して保存し、ページをリロードして更新された内容が表示されることを確認

### ユーザーストーリー 2の実装

- [X] T027 [US2] [contracts/storage-api.md](contracts/storage-api.md)に従ってsrc/background/storage.tsにupdateNote()操作を追加
- [X] T028 [US2] [contracts/message-api.md](contracts/message-api.md)に従ってsrc/background/index.tsにUPDATE_NOTEメッセージハンドラを実装
- [X] T029 [US2] src/content/note-widget.tsのメモ表示UIに編集ボタンを追加
- [X] T030 [US2] 編集モードを有効にするeditNote()メソッドをsrc/content/note-widget.tsに実装
- [X] T031 [US2] UPDATE_NOTEメッセージを送信する更新ボタンハンドラをsrc/content/note-widget.tsに追加
- [X] T032 [US2] 保存せずに表示モードに戻すキャンセルボタンをsrc/content/note-widget.tsに実装
- [X] T033 [US2] 更新成功後にsrc/content/note-widget.tsでメモ表示を即座に更新
- [X] T034 [US2] src/content/note-widget.tsに編集操作の検証（1〜1,000文字）を追加
- [X] T035 [US2] メモ更新後の成功トースト通知をsrc/content/note-widget.tsに追加

**チェックポイント**: この時点でユーザーストーリー 1と2の両方が独立して機能する - ユーザーはメモを作成、表示、編集できる

---

## Phase 5: ユーザーストーリー 3 - メモの削除（優先度: P3）

**目標**: ユーザーが不要なメモを削除してワークスペースをクリーンに保つことができる

**独立テスト**: メモを作成し、削除ボタンをクリックし、削除を確認し、ページをリロードしてメモが表示されないことを確認

### ユーザーストーリー 3の実装

- [X] T036 [US3] [contracts/storage-api.md](contracts/storage-api.md)に従ってsrc/background/storage.tsにdeleteNote()操作を追加
- [X] T037 [US3] [contracts/message-api.md](contracts/message-api.md)に従ってsrc/background/index.tsにDELETE_NOTEメッセージハンドラを実装
- [X] T038 [US3] src/content/note-widget.tsのメモ表示UIに削除ボタンを追加
- [X] T039 [US3] 確認ダイアログを含むdeleteNote()メソッドをsrc/content/note-widget.tsに実装
- [X] T040 [US3] 確認時にsrc/content/note-widget.tsでDELETE_NOTEメッセージを送信
- [X] T041 [US3] 削除成功後にsrc/content/note-widget.tsでウィジェットをDOMから削除
- [X] T042 [US3] メモ削除後の成功トースト通知をsrc/content/note-widget.tsに追加

**チェックポイント**: すべてのユーザーストーリーが独立して機能する - 完全なCRUD操作が利用可能

---

## Phase 6: 仕上げと横断的関心事

**目的**: 複数のユーザーストーリーに影響する改善とエッジケース処理

- [X] T043 [P] [contracts/storage-api.md](contracts/storage-api.md)に従ってsrc/background/storage.tsにlistAllNotes()操作を追加
- [X] T044 [P] src/background/index.tsにLIST_ALL_NOTESメッセージハンドラを実装
- [ ] T045 [P] ユーザー通知付きでsrc/background/storage.tsにQUOTA_EXCEEDEDのエラーハンドリングを追加
- [ ] T046 [P] ユーザー通知付きでsrc/background/storage.tsにINVALID_INPUTのエラーハンドリングを追加
- [ ] T047 [P] spec.md FR-007に従ってsrc/content/note-widget.tsにウィジェット用のCSS resize: bothを実装
- [ ] T048 [P] [research.md](research.md) Decision 9に従ってsrc/background/storage.tsにすべてのストレージ操作のロギングを追加
- [ ] T049 [research.md](research.md) Decision 8に従って編集中のデバウンス自動保存をsrc/content/note-widget.tsに追加
- [ ] T050 spec.mdエッジケースに従ってURL正規化のエッジケース（クエリパラメータ、ハッシュ、末尾スラッシュ）をテスト
- [ ] T051 spec.mdエッジケースに従ってSPAナビゲーション（React、Vueアプリ）をテスト
- [ ] T052 spec.mdエッジケースに従ってストレージクォータ制限シナリオをテスト
- [ ] T053 spec.mdエッジケースに従って1,000文字制限の強制をテスト
- [ ] T054 [quickstart.md](quickstart.md)から完全な手動テストチェックリストを実行
- [X] T055 インストールと使用方法の説明を含むREADME.mdを更新

---

## 依存関係と実行順序

### フェーズの依存関係

- **セットアップ（Phase 1）**: 依存関係なし - すぐに開始可能
- **基盤構築（Phase 2）**: セットアップ完了に依存 - すべてのユーザーストーリーをブロック
- **ユーザーストーリー（Phase 3-5）**: すべて基盤構築フェーズの完了に依存
  - その後、ユーザーストーリーは並列に進めることが可能（スタッフ次第）
  - または優先順位順に順次（P1 → P2 → P3）
- **仕上げ（Phase 6）**: 希望するすべてのユーザーストーリーが完了していることに依存

### ユーザーストーリーの依存関係

- **ユーザーストーリー 1（P1）**: 基盤構築（Phase 2）後に開始可能 - 他のストーリーへの依存関係なし
  - 実装内容: メモ作成、表示、自動読み込み、文字制限、ドラッグ位置調整
  - 成果物: 作成 + 表示機能を持つMVP
  
- **ユーザーストーリー 2（P2）**: 基盤構築（Phase 2）後に開始可能 - US1に基づくが独立してテスト可能
  - 追加内容: 編集モード、更新操作、キャンセル機能
  - 成果物: 完全なメモ管理（作成、表示、編集）
  
- **ユーザーストーリー 3（P3）**: 基盤構築（Phase 2）後に開始可能 - US1に基づくが独立してテスト可能
  - 追加内容: 確認付き削除操作
  - 成果物: 完全なCRUD操作

### 各ユーザーストーリー内

- **Phase 3（US1）**: T014-T015は並列実行可能 → T016-T018は順次 → T019-T026は統合可能
- **Phase 4（US2）**: T027-T028は並列実行可能 → T029-T035は順次
- **Phase 5（US3）**: T036-T037は並列実行可能 → T038-T042は順次
- **Phase 6（仕上げ）**: T043-T048はすべて並列実行可能 → T049-T055は順次

### 並列実行機会

- **Phase 1**: T003、T004は並列実行可能
- **Phase 2**: T006、T007、T008は並列実行可能（異なるファイル）
- **Phase 3**: T014、T015は並列実行可能（同じファイルの異なるセクション）
- **Phase 4**: T027、T028は並列実行可能（異なるファイル）
- **Phase 5**: T036、T037は並列実行可能（異なるファイル）
- **Phase 6**: T043、T044、T045、T046、T047、T048はすべて並列実行可能（異なる関心事）

---

## 並列実行例: ユーザーストーリー 1

```bash
# ウィジェットクラスとスタイルを同時に起動:
タスク T014: "src/content/note-widget.tsにNoteWidgetクラスのスケルトンを作成"
タスク T015: "src/content/note-widget.tsにウィジェットスタイルを追加"

# これらが完了後、コアメソッドを実装:
タスク T016: "showNote()メソッドを実装"
タスク T017: "createNote()メソッドを実装"
タスク T018: "保存ボタンハンドラを追加"
```

---

## 実装戦略

### MVPファースト（ユーザーストーリー 1のみ）

1. **Phase 1: セットアップを完了** → プロジェクト構造準備完了
2. **Phase 2: 基盤構築を完了** → ストレージAPI + メッセージングインフラストラクチャ準備完了（重要 - すべてのストーリーをブロック）
3. **Phase 3: ユーザーストーリー 1を完了** → 作成 + 自動表示機能を持つMVP
4. **検証して停止**: 
   - Chromeで拡張機能をロード（chrome://extensions/）
   - 複数のWebサイトでテスト（静的HTML、GitHubやYouTubeなどのSPA）
   - リロード時の自動表示を確認
   - 文字制限の強制をテスト
   - ドラッグ位置調整をテスト
5. **準備ができていればデプロイ/デモ** → ユーザーは基本的なメモ取り機能を使い始めることができる

### インクリメンタル配信

1. **セットアップ + 基盤構築** → 基盤準備完了（約1日）
2. **ユーザーストーリー 1を追加** → 独立してテスト → デプロイ/デモ（MVP！約1〜2日）
3. **ユーザーストーリー 2を追加** → 独立してテスト → デプロイ/デモ（約0.5日）
4. **ユーザーストーリー 3を追加** → 独立してテスト → デプロイ/デモ（約0.5日）
5. **仕上げ** → エッジケース + 最適化 → 最終リリース（約0.5〜1日）

**合計見積もり**: フル機能（P1-P3 + 仕上げ）で4〜5日、MVP（P1のみ）で2〜3日

### 並列チーム戦略

複数の開発者がいる場合（基盤構築フェーズ完了後）:

1. **チームでセットアップ + 基盤構築を一緒に完了**（約1日）
2. **基盤構築完了後**:
   - 開発者A: ユーザーストーリー 1（T014-T026）
   - 開発者B: ユーザーストーリー 2（T027-T035）
   - 開発者C: ユーザーストーリー 3（T036-T042）
3. **ストーリーが独立して完了して統合** → すべてmainにマージ
4. **チームで仕上げを一緒に完了**（T043-T055）

**並列見積もり**: すべての機能で2〜3日

---

## 手動テストチェックリスト

憲章（テストなしポリシー）に従い、すべての検証は手動で行います。[quickstart.md](quickstart.md)のテストシナリオを使用:

### ユーザーストーリー 1のテスト

- [ ] 静的HTMLページ（例: Wikipedia記事）でメモを作成
- [ ] ページをリロードして、メモが右下に自動表示されることを確認
- [ ] SPA（例: GitHubリポジトリページ）でメモを作成
- [ ] SPA内をナビゲートして、メモが正しく保持されることを確認
- [ ] 文字制限をテスト: 1,001文字を入力してみる
- [ ] ウィジェットを別の位置にドラッグ
- [ ] URL正規化をテスト: `example.com/page?id=123`でメモを作成し、`example.com/page`で表示されることを確認

### ユーザーストーリー 2のテスト

- [ ] 既存のメモを編集して保存
- [ ] ページをリロードして、編集された内容が表示されることを確認
- [ ] メモを編集してキャンセルをクリック - 元の内容が保持されることを確認
- [ ] メモを1,000文字を超えるように編集 - 検証が保存を防ぐことを確認

### ユーザーストーリー 3のテスト

- [ ] 確認付きでメモを削除
- [ ] ページをリロードして、メモが表示されなくなったことを確認
- [ ] 削除操作をキャンセル - メモが保持されることを確認

### エッジケース

- [ ] クエリパラメータとハッシュフラグメントを含むページでテスト
- [ ] CSS分離（Shadow DOM）を確認するために10以上の異なるWebサイトでテスト
- [ ] 約20個のメモを作成してパフォーマンスを確認（spec.md SC-005: 100個のメモ）
- [ ] ブラウザを再起動 - すべてのメモが保持されることを確認

---

## 注意事項

- **[P]タスク** = 異なるファイルまたは独立したセクション、依存関係なし
- **[Story]ラベル** はタスクを特定のユーザーストーリーにマッピングしてトレーサビリティを確保
- 各ユーザーストーリーは独立して完了およびテスト可能であるべき
- フェーズ完了とみなす前に手動テストチェックリストに合格する必要あり
- 各タスクまたは論理グループの後にコミット
- 任意のチェックポイントで停止してストーリーを独立して検証
- **憲章準拠**: テストポリシーに従って自動テストなし、TypeScript strictモード強制、クリーンな3層アーキテクチャ（Background/Content/Types）
