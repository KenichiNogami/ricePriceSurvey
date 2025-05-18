# 白米5kg価格調査システム

## 概要

このシステムは、日本全国の白米5kgの価格情報をリアルタイムで調査し、テーブル形式で表示するウェブアプリケーションです。オンラインショップや実店舗、SNSなどから収集した最新の価格情報を一覧で確認することができます。

![白米価格調査画面](./onigiri.jpg)

## 一般ユーザー向け説明

### 機能紹介

- **白米5kg価格調査**: 全国の白米5kgの販売価格をリアルタイムで調査
- **豊富な情報**: 都道府県、市町村、販売店名、銘柄、価格、特徴などの情報を表示
- **SNS情報**: X（旧Twitter）やInstagramなどのSNSからの情報も含む

### 使用方法

1. **シンプルな操作**:
   - サイト上部のおにぎり画像をクリックするだけで調査開始
   - 調査結果がテーブル形式で表示されます
   - 調査中はローディングスピナーが表示されます

### 調査結果の見方

- **テーブル形式**: 調査結果は見やすいテーブル形式で表示されます
- **情報源**: SNSからの情報は「(X情報)」などと表示されます
- **多様な情報**: 地域や銘柄、販売チャネルの多様な情報を表示します
- **特徴**: 産年、等級、栽培方法などの特徴も確認できます

## システム開発者向け説明

### システム構成

- **フロントエンド**: HTML, CSS, JavaScript (Bootstrap 5.3.0)
- **バックエンド**: Azure Functions
- **AI**: Anthropic Claude API

### 主要ファイル

- `ricesurvey.html`: フロントエンドのUIとJavaScriptロジック
- `httpTrigger1.ts`: Azure Functionsのバックエンドコード
- `onigiri.jpg` / `onigiri.ico`: アプリケーションのイメージ・アイコンファイル

### API仕様

#### リクエスト形式

```json
{
  "message": "白米5kgの値段調査をネット情報から行ってください...",
  "survey_type": "initial_survey"
}
```

- `message`: 調査内容または質問内容
- `survey_type`: 「initial_survey」(価格調査)

#### レスポンス形式

```json
{
  "success": true,
  "response": "調査結果のテキスト（マークダウン形式）"
}
```

- `success`: 処理の成功/失敗
- `response`: 調査結果のテキスト（マークダウン形式）
- `error`: エラーが発生した場合のエラーメッセージ

### 重要なセキュリティ注意事項

1. **Azure Function キーの取り扱い**:
   - Function キーをクライアントサイドのHTMLや JavaScript内に直接記述しないでください
   - Function キーは環境変数やサーバーサイドの設定で管理し、CORS設定を適切に行ってください
   - 公開リポジトリにFunction キーを含むコードをコミットしないでください

2. **CORS (Cross-Origin Resource Sharing)設定**:
   - Azure Functionsの設定でCORSを適切に構成し、許可されたオリジンからのリクエストのみを受け付けるようにしてください
   - Function Keyを使用する場合は、サーバーサイドのプロキシを経由するか、認証済みクライアントのみがアクセスできるように設計してください

### 主要な実装ポイント

1. **シンプルなUI設計**:
   - 画像クリックで調査開始というシンプルな操作性
   - 中央に揃えたコンテンツ配置で視認性向上
   - レスポンシブデザインで様々なデバイスに対応

2. **調査メッセージ設計**:
   - デフォルトの調査内容を詳細に設定:
   ```javascript
   const DEFAULT_SURVEY_MESSAGE = "白米５kgの値段調査をネット情報から行ってください。対象情報は過去５日間に売られている情報に限定してください。売られている都道府県・市町村・販売社名・銘柄（コシヒカリ、ささにしき、カリフォルニア米等）が分かればそれも含め、テーブルで示してください。";
   ```

3. **レスポンス表示機能**:
   - Markdown形式のレスポンスをHTML形式に変換する機能
   - テーブル形式のデータを適切に表示するための専用処理
   - エラーハンドリングとユーザーへのフィードバック

### 拡張・カスタマイズ方法

1. **UI調整**:
   - `ricesurvey.html` の CSS を編集して、見た目をカスタマイズできます

2. **調査内容カスタマイズ**:
   - JavaScript内の `DEFAULT_SURVEY_MESSAGE` 変数を変更して、調査内容を調整できます

3. **機能追加**:
   - 将来的に追加サーチ機能などを追加する場合は、HTMLとJavaScriptを拡張してください

### デプロイ方法

1. Azure Functionsへのデプロイ:
   ```bash
   npm install -g azure-functions-core-tools@4
   func azure functionapp publish pricesurvey
   ```

2. 環境変数の設定:
   - `ANTHROPIC_API_KEY`: Anthropic Claude APIキー
   - `CLAUDE_MODEL`: 使用するClaudeモデル

## トラブルシューティング

- **結果が表示されない場合**: ブラウザのコンソールでエラーを確認し、APIアドレスやネットワーク接続を確認してください
- **APIエラー**: Azure Functionsのログを確認し、Anthropic APIキーが正しく設定されているか確認してください
- **表示の問題**: フロントエンドのマークダウン変換関数 `convertMarkdownToHtml` を確認・修正してください

## リンク・参考資料

- [Anthropic Claude API ドキュメント](https://docs.anthropic.com/)
- [Azure Functions ドキュメント](https://docs.microsoft.com/ja-jp/azure/azure-functions/)
- [Bootstrap ドキュメント](https://getbootstrap.com/docs/5.3/)

## ライセンス

MIT License

---

※このアプリケーションは情報提供を目的としており、表示される価格情報は実際の販売価格と異なる場合があります。
