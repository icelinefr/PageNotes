# PageNotes

Webページにメモを作成・表示・編集・削除できるChrome拡張機能

## 機能

- **メモの作成**: 任意のWebページでメモを作成
- **自動表示**: ページを再訪問したときに自動的にメモを表示
- **メモの編集**: 既存のメモ内容を更新
- **メモの削除**: 不要なメモを削除
- **ドラッグ&リサイズ**: ウィジェットの位置とサイズを自由に調整
- **1ページ1メモ**: シンプルで予測可能な動作
- **SPA対応**: React、Vueなどの動的Webアプリでも動作

## インストール

### 開発版のインストール

1. リポジトリをクローン
   ```bash
   git clone <repository-url>
   cd PageNotes
   ```

2. 依存関係をインストール
   ```bash
   npm install
   ```

3. ビルド
   ```bash
   npm run build
   ```

4. Chromeで拡張機能を読み込む
   - Chrome を開き、`chrome://extensions/` にアクセス
   - 右上の「デベロッパーモード」を有効化
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist/` ディレクトリを選択

## 使い方

### メモの作成

1. 任意のWebページを開く
2. ページ右下隅に表示されるPageNotesウィジェットのテキストエリアにメモを入力
3. 「保存」ボタンをクリック
4. メモが自動的に表示される

### メモの表示

- メモが存在するページを開くと、自動的に右下隅にメモが展開表示されます
- ヘッダー部分をドラッグして位置を移動できます

### メモの編集

1. メモ表示中に「編集」ボタンをクリック
2. テキストエリアで内容を変更
3. 「更新」ボタンをクリック
   - または「キャンセル」で元に戻す

### メモの削除

1. メモ表示中に「削除」ボタンをクリック
2. 確認ダイアログで「OK」をクリック

## 仕様

- **メモの文字数制限**: 1,000文字
- **URLマッチング**: プロトコル + ドメイン + パス（クエリパラメータとハッシュは無視）
  - 例: `https://example.com/page?id=123` と `https://example.com/page` は同じメモ
- **ストレージ**: chrome.storage.local（最大10MB、最大100メモ推奨）
- **初期位置**: 画面右下隅
- **UI**: Shadow DOM による CSS 隔離

## 開発

### ビルドコマンド

```bash
# 開発ビルド
npm run build

# ウォッチモード（自動リビルド）
npm run watch

# クリーンビルド
npm run clean
npm run build
```

### プロジェクト構造

```
src/
├── background/         # Background script (service worker)
│   ├── index.ts       # メッセージハンドラ
│   ├── storage.ts     # ストレージAPI
│   └── url-utils.ts   # URL正規化
├── content/           # Content script (ページ注入)
│   ├── index.ts       # 初期化とSPA対応
│   └── note-widget.ts # UIウィジェット
├── types/             # TypeScript型定義
│   └── index.ts
└── manifest.json      # Chrome拡張機能マニフェスト

dist/                  # ビルド出力（gitignored）
```

### 技術スタック

- **言語**: TypeScript 5.x (ES2020+, strict mode)
- **ビルドツール**: esbuild
- **プラットフォーム**: Chrome Extension Manifest V3
- **ストレージ**: chrome.storage.local API
- **UI分離**: Shadow DOM

## ライセンス

MIT

## 憲章準拠

本プロジェクトは以下の原則に従って開発されています：

- **Clean Code**: TypeScript strict mode、3層分離アーキテクチャ
- **Simple UX**: 1ページ1メモ、3クリック以内操作
- **Responsive Design**: ドラッグ&リサイズ対応
- **Testing Policy**: 手動テストのみ（自動テストなし）

詳細は `.specify/memory/constitution.md` を参照してください。
