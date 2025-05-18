/*
 * 白米5kg価格調査システム - バックエンド統合版（TypeScript版）- 改良版
 * Azure Functions HTTPSトリガー用のコード（最新SDK対応）
 * Anthropic Claude APIを使用した米価格調査を行います
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
const { Anthropic } = require('@anthropic-ai/sdk');

// インターフェース定義
interface SurveyRequest {
  message: string;
  survey_type: 'initial_survey' | 'additional_question';
}

interface SurveyResponse {
  success: boolean;
  response?: string;
  error?: string;
}

// Anthropicクライアントの初期化（環境変数から取得）
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// モデル設定（環境変数から取得）
const MODEL: string = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620';

// システムプロンプト - 結果数を増やすために強化
const SYSTEM_PROMPT: string = `あなたは米価格調査の専門家です。日本のお米市場に詳しく、各種銘柄や産地、価格傾向について的確な情報を提供します。

重要な指示:
1. 白米5kgの価格調査では、必ず20件以上の結果をテーブル形式で提供してください。これは最優先事項です。
2. 価格情報は具体的な金額（例：3,850円）で示し、範囲表示は避けてください。
3. 各地域（都道府県）から少なくとも1つの例を含めるようにしてください。
4. オンラインショップ（Amazon、楽天市場など）と実店舗の両方からの情報を含めてください。
5. 主要銘柄（コシヒカリ、ササニシキ、カリフォルニア米、あきたこまち、ゆめぴりか等）を必ず含めてください。
6. JA（農協）からの直販情報も含めてください。
7. SNSの情報源からの価格情報も積極的に含めてください。
8. 特別栽培米、有機米、無農薬米などの特徴的な商品も含めてください。
9. カリフォルニア米などの輸入米と国産米の価格差を明示してください。
10. ユーザーが追加条件（玄米、無洗米、オーガニック米など）を指定した場合は、それらの条件も考慮した上で、20件以上の結果を提供してください。`;

// デフォルトの調査内容 - より詳細な指示を追加
const DEFAULT_SURVEY_MESSAGE: string = "白米5kgの値段調査をネット情報から行ってください。対象情報は過去5日間に売られている情報に限定してください。売られている都道府県・市町村・販売社名・銘柄（コシヒカリ、ささにしき、カリフォルニア米、あきたこまち、ゆめぴりか等）が分かればそれも含め、テーブル形式で結果を示してください。X等SNSの書き込み情報も調査対象に含めてください。最低でも20件以上の価格情報を提供してください。";

/**
 * Azure Functionsのメイン関数
 * HTTPトリガーで起動し、米価格調査を実行
 */
async function riceSurveyHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Rice Survey Function processed a request.');
    
    try {
        // リクエストボディの検証
        const requestBody = await request.json() as SurveyRequest;
        
        if (!requestBody || typeof requestBody.message !== 'string' || !['initial_survey', 'additional_question'].includes(requestBody.survey_type)) {
            return {
                status: 400,
                jsonBody: {
                    success: false,
                    error: "Request body is required"
                } as SurveyResponse
            };
        }
        
        // 型安全な方法で値を取得
        let message: string = requestBody.message;
        const survey_type: 'initial_survey' | 'additional_question' = requestBody.survey_type;
        
        // 初期調査で入力が空の場合はデフォルトを使用
        if (survey_type === 'initial_survey' && (!message || message.trim() === '')) {
            message = DEFAULT_SURVEY_MESSAGE;
            context.log('Using default survey message');
        }
        
        // 追加質問の場合はメッセージの必須チェック
        if (survey_type === 'additional_question' && (!message || typeof message !== 'string' || message.trim() === '')) {
            return {
                status: 400,
                jsonBody: { 
                    success: false,
                    error: "A valid question is required for additional questions" 
                } as SurveyResponse
            };
        }
        
        // survey_typeの検証
        if (survey_type !== 'initial_survey' && survey_type !== 'additional_question') {
            return {
                status: 400,
                jsonBody: { 
                    success: false,
                    error: "Invalid survey type. Must be 'initial_survey' or 'additional_question'" 
                } as SurveyResponse
            };
        }
        
        // ログ出力
        context.log(`Processing rice survey request: "${message.substring(0, 50)}..."`);
        context.log(`Survey type: ${survey_type}`);
        context.log(`Using API Key from environment variable: ${process.env.ANTHROPIC_API_KEY ? "Found" : "Not Found"}`);
        context.log(`Using Model: ${MODEL}`);
        
        // 調査タイプに基づいてプロンプトを作成
        let prompt: string;
        
        if (survey_type === 'initial_survey') {
            // 初期調査プロンプト（5kg白米の価格調査）- 改良版
            prompt = `あなたは米価格調査の専門家です。以下の指示に従ってください。

**重要な指示**:
1. 白米5kgの価格調査を実施し、結果を包括的にテーブル形式でまとめてください。
2. 必ず20件以上の価格情報を提供してください。これは最優先事項です。
3. 対象情報は過去5日間に販売されている情報に限定してください。
4. 以下の情報を必ず含めてください：
   - 都道府県
   - 市町村/地域
   - 販売店/販売元
   - 銘柄（コシヒカリ、ササニシキ、カリフォルニア米、あきたこまち、ゆめぴりか等）
   - 価格（円）- 具体的な金額で表示
   - 特徴（産年、等級、栽培方法など）
5. オンライン店舗（Amazon、楽天市場など）と実店舗の両方を含めてください。
6. 少なくとも3つの異なる地域からの情報を含めてください。
7. X（旧Twitter）やInstagramなどのSNSからの情報も含めてください。
8. 必ずカリフォルニア米のような輸入米の情報も含めてください。
9. JAや農家からの直売情報も可能な限り含めてください。
10. ユーザーが追加条件を指定している場合は、それらの条件も考慮してください。

**ユーザーの調査依頼**: ${message}`;
        } else {
            // 追加質問プロンプト - より詳細に
            prompt = `あなたは米価格調査の専門家です。以下のユーザーの質問に対して、
できるだけ詳細で具体的な情報を提供してください。特に価格、銘柄、産地、関税制度などについては
数値データや具体例を含めて詳しく回答してください。表形式で情報を整理することが適切な場合は、
必ず表形式で回答してください。

質問に関連する情報をできるだけ多く（最低でも10項目以上）含め、包括的な回答を提供してください。
SNSなどの情報源からの情報も含めると良いでしょう。

**ユーザーの質問**: ${message}`;
        }
        
        // MCP最適化を適用
        const optimizedPrompt: string = await optimizeWithMCP(prompt, survey_type);
        
        // Claude APIにリクエスト送信 - パラメータ強化
        const response = await sendToAnthropic(optimizedPrompt);
        
        // レスポンス作成
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            jsonBody: {
                success: true,
                response: response.content
            } as SurveyResponse
        };
        
    } catch (error: unknown) {
        context.error('Error in rice survey function:', error);
        
        // エラーレスポンス
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            } as SurveyResponse
        };
    }
}

/**
 * Claude APIにメッセージを送信する - 改良版
 * @param message - ユーザーメッセージ
 * @returns Claudeからのレスポンス
 */
async function sendToAnthropic(message: string): Promise<any> {
  try {
    // APIリクエスト - パラメータ強化
    const messages = [
      {
        role: 'user',
        content: message
      }
    ];

    const response = await anthropic.messages.create({
      model: MODEL,
      system: SYSTEM_PROMPT,
      messages: messages,
      max_tokens: 4096,
      temperature: 0.7, // 適度な創造性を持たせる
      top_p: 0.9, // 多様な回答を促進
      top_k: 50 // より多様な候補から選択
    });
    
    return response;
  } catch (error: unknown) {
    console.error('Error sending message to Anthropic:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Model Context Protocol (MCP) を使用してプロンプトを最適化 - 改良版
 * @param message - 元のメッセージ
 * @param surveyType - 調査タイプ
 * @returns 最適化されたメッセージ
 */
async function optimizeWithMCP(message: string, surveyType: string): Promise<string> {
  try {
    // 調査タイプ別の指示を準備 - 改良版
    const instructions = surveyType === 'initial_survey' 
      ? `
- 白米5kgの価格調査を行い、結果を包括的なテーブル形式でまとめてください。
- 必ず20件以上の具体的な価格情報を提供してください。これは最優先事項です。
- 都道府県、市町村、販売社名、銘柄、価格の情報を含めてください。
- 対象情報は過去5日間に販売されている情報に限定してください。
- コシヒカリ、ササニシキ、カリフォルニア米、あきたこまち、ゆめぴりかなどの主要銘柄について調査してください。
- オンラインショップ（Amazon、楽天市場）と実店舗の両方を含めてください。
- JAや生産者からの直販情報も含めてください。
- ユーザーが追加条件（玄米も調査、無洗米も調査、関税情報も詳しく等）を指定している場合は、それらの情報も含めてください。
- 特別栽培米・有機米・無農薬米など、特徴的な商品も含めてください。
- X（旧Twitter）やInstagramなどのSNSからの情報も必ず含めてください。
- 輸入米と国産米の価格差が明確になるようにしてください。
- 最新の情報を優先し、信頼性の高い情報源を重視してください。`
      : `
- ユーザーの質問に対して具体的かつ包括的に回答してください。
- 米に関する専門知識を活用し、特に価格、銘柄、産地、関税制度などについて詳しく説明してください。
- 最低でも10項目以上の関連情報を提供し、包括的な回答を心がけてください。
- 必要に応じて情報をテーブル形式で整理してください。
- SNSや専門サイトからの最新情報も積極的に引用してください。
- 質問が不明確な場合は、最も可能性の高い解釈に基づいて回答してください。`;

    // 米価格調査に特化したMCP最適化 - 改良版
    const optimizedQuery: string = `
<MCP:current_query>
${message}
</MCP:current_query>

<MCP:instructions>
${instructions}
</MCP:instructions>

<MCP:context>
現在、日本では米の価格調査が重要視されています。特に白米5kgの価格は、地域や銘柄によって大きく異なります。
コシヒカリは一般的に高価格帯で、特に新潟県魚沼産のものは最高級とされています。
一方、カリフォルニア米などの輸入米は国産米より安価な傾向があります。
また、特別栽培米や有機米は通常の米より高価格で販売されています。
JA（農協）直販、スーパー、オンラインショップ（楽天市場、Amazon）、農家直販など、販売チャネルによっても価格は変動します。
SNS（X/Twitter、Instagram）では消費者が実際に購入した価格情報が共有されることがあります。
</MCP:context>

<MCP:expected_output>
白米5kgの価格調査結果を包括的なテーブル形式で提示し、必ず20件以上の具体的な価格情報を含めてください。
都道府県、市町村/地域、販売店/販売元、銘柄、価格（円）、特徴（産年、等級、栽培方法など）の情報を含め、
様々な地域や販売チャネルからの情報をバランスよく取り入れてください。
ユーザーからの追加条件がある場合は、それを考慮した情報も提供してください。
</MCP:expected_output>
`;

    return optimizedQuery;
  } catch (error: unknown) {
    console.error('Error in MCP optimization:', error);
    // 最適化に失敗した場合は元のメッセージを返す
    return message;
  }
}

// HTTP関数の登録
app.http('riceSurvey', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: riceSurveyHandler
});