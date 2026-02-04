# Implementation Plan: PageNotes Extension

**Branch**: `001-page-notes` | **Date**: 2026-02-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-page-notes/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Chrome拡張機能として、Webページに対してメモを作成・表示・編集・削除する機能を提供する。1ページ1メモ方式で、URLのパス部分でメモを紐付け、画面右下隅に自動展開表示する。TypeScriptでクリーンコード・シンプルUX・レスポンシブデザインを実現。

## Technical Context

**Language/Version**: TypeScript 5.x (ES2020+), strict mode有効  
**Primary Dependencies**: Chrome Extension Manifest V3 API, chrome.storage API, chrome.tabs API  
**Storage**: chrome.storage.local (ローカルストレージ、最大10MB)  
**Testing**: なし（憲章のテストポリシーに従い、手動テストのみ）  
**Target Platform**: Google Chrome 88+ (Manifest V3サポート)  
**Project Type**: Chrome Extension (single project structure)  
**Performance Goals**: メモ表示1秒以内、100個メモでも遅延なし  
**Constraints**: chrome.storage.local容量制限10MB、1メモ1,000文字まで  
**Scale/Scope**: 最大100ページ分のメモ管理

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Check (Before Phase 0)**:
- [x] **Clean Code**: 単一責任原則（Storage/UI/Content Script分離）、TypeScript strict modeで型安全性確保
- [x] **Simple UX**: 1ページ1メモで認知負荷最小化、3クリック以内で全操作完結、即座のフィードバック提供
- [x] **Responsive Design**: モバイルファーストではないがChrome拡張機能の性質上デスクトップ中心、ドラッグ&リサイズでUI調整可能
- [x] **Testing Policy**: テストコード不要、手動テストで品質保証
- [x] **Technology Stack**: TypeScript strict mode使用、Chrome Extension APIのみ依存

**Post-Phase 1 Re-Check**:
- [x] **Clean Code**: ✅ 設計完了 - Background/Content/Types の3層分離、各モジュールは単一責任、DRY原則適用（url-utils, storage抽象化）
- [x] **Simple UX**: ✅ 設計完了 - Shadow DOMで隔離UI、画面右下隅固定、自動展開表示、Toast通知で即座フィードバック
- [x] **Responsive Design**: ✅ 設計完了 - デスクトップ最適化、resize: bothでサイズ調整可能、モバイルでも基本動作保証
- [x] **Testing Policy**: ✅ 準拠 - quickstart.mdに手動テストチェックリスト定義、自動テストコードなし
- [x] **Technology Stack**: ✅ 準拠 - TypeScript strict mode、esbuildビルド、Chrome Extension Manifest V3、型定義完備

**Verdict**: ✅ All gates passed. Ready for Phase 2 (tasks.md generation)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command) ✅ COMPLETED
```

### Source Code (repository root)

```text
src/
├── background/          # Background script (service worker)
│   ├── index.ts
│   └── storage.ts
├── content/             # Content script (injected into web pages)
│   ├── index.ts
│   ├── note-widget.ts
│   └── url-utils.ts
├── popup/               # Extension popup UI
│   ├── index.html
│   ├── index.ts
│   └── styles.css
├── types/               # TypeScript type definitions
│   └── index.ts
└── manifest.json        # Chrome Extension manifest

dist/                    # Build output (gitignored)
```

**Structure Decision**: Chrome Extension用のシングルプロジェクト構造を採用。Background Script（永続処理）、Content Script（ページ注入）、Popup（拡張機能UI）の3層構造。TypeScriptでビルドし、dist/に出力。テストディレクトリは憲章に従い作成しない。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed                               | Simpler Alternative Rejected Because                                                                      |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Responsive Design (部分的) | Chrome拡張機能はデスクトップブラウザ中心 | モバイルChromeでも動作するが、拡張機能の性質上デスクトップ最適化が主目的。UIはドラッグ&リサイズで調整可能 |
| -------------------------- | ------------------                       | ------------------------------------                                                                      |
| [e.g., 4th project]        | [current need]                           | [why 3 projects insufficient]                                                                             |
| [e.g., Repository pattern] | [specific problem]                       | [why direct DB access insufficient]                                                                       |
