# GitHub Pages での公開メモ

このゲームは「素のHTML/JS/画像」だけで、外部ライブラリ・ビルド・サーバ処理が不要です。
相対パスのみ・`fetch`やESモジュール未使用なので、**GitHub Pages（サブパス配信 `https://ユーザー名.github.io/リポジトリ名/`）でそのまま動きます**。
ローカルHTTP配信のサブパス再現で、全画像ロード・404ゼロ・エラーゼロを確認済みです。

## サイトのルートに `index.html` を置く（3通り）
GitHub Pages が公開できるのは「リポジトリ直下」か「`/docs` フォルダ」のどちらかです。`index.html` がそこに来るようにします。

- **A. ゲームをリポジトリ直下に置く**：`game/` の中身（`index.html`・`assets`・`js`・`css`・`data`・`.nojekyll`）をリポジトリの一番上にコピー。
  - 公開URL：`https://ユーザー名.github.io/リポジトリ名/`
- **B. `game` を `docs` にリネーム**：リポジトリ直下に `docs/`（＝旧game）を置き、Settings → Pages → Source を「main ブランチ / `/docs`」に設定。
- **C. `gh-pages` ブランチ**：そのブランチの直下に `game/` の中身を置く。

> いずれも `index.html` と同じ階層に `assets/ js/ css/ data/ .nojekyll` がそろっていればOKです。

## 同梱した `.nojekyll` について
GitHub Pages は既定で Jekyll を通し、`_` で始まるフォルダ（`_raw` 等）を公開対象から外します。
ゲーム本体は `_` 始まりのパスを読み込まないため無くても動きますが、取りこぼし防止のベストプラクティスとして
**サイトのルートに空ファイル `.nojekyll` を置いています**（A/B/C いずれの方式でも、`index.html` と同じ階層に置いてください）。

## リポジトリを軽くする（任意）
公開に不要な開発用ファイルは `.gitignore`（プロジェクト直下に同梱）で除外しています。
- 必須で公開するもの：`index.html` / `assets/sprites/` / `js/` / `css/` / `data/` / `.nojekyll`
- 公開不要：`assets/_contact/`（確認用スクショ）、`tools/`、`.venv/`、`node_modules/`
- 任意で除外可：`assets/_raw/` と元画像（スプライトを作り直さないなら不要・約12MB節約）

## 更新が反映されないとき（キャッシュ）
GitHub Pages / ブラウザはファイルを数分キャッシュします。更新後に古い画面が出たら、
**⌘+Shift+R（強制再読み込み）** か、数分待ってから再読み込みしてください。

## 動作要件
- スマホ/タブレット/PCの最新ブラウザ（Chrome / Safari / Edge）。HTTPS配信で音もそのまま鳴ります。
- 縦横どちらでも動きますが、横向き全画面（右上の ⛶）推奨。
