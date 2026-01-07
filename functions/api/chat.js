export async function onRequestPost(context) {
    // 允許 CORS
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    try {
        // 1. 從 Firebase 讀取設定
        let GROQ_API_KEY = null;
        let knowledgeUrls = "";
        let systemPrompt = "";

        try {
            const firebaseUrl = "https://firestore.googleapis.com/v1/projects/green-tract-416604/databases/(default)/documents/configs/bunny-assistant";
            const firebaseResp = await fetch(firebaseUrl);
            const firebaseData = await firebaseResp.json();

            if (firebaseData.fields) {
                if (firebaseData.fields.groqApiKey) {
                    GROQ_API_KEY = firebaseData.fields.groqApiKey.stringValue;
                }
                if (firebaseData.fields.knowledgeUrls) {
                    knowledgeUrls = firebaseData.fields.knowledgeUrls.stringValue;
                }
                if (firebaseData.fields.prompt) {
                    systemPrompt = firebaseData.fields.prompt.stringValue;
                }
            }
        } catch (e) {
            console.log("Firebase fetch failed:", e.message);
        }

        // 2. 如果 Firebase 沒有 API Key，就用環境變數
        if (!GROQ_API_KEY) {
            GROQ_API_KEY = context.env.GROQ_API_KEY;
        }

        // 3. 如果都沒有，返回錯誤
        if (!GROQ_API_KEY) {
            return new Response(JSON.stringify({
                error: { message: "API Key 未設定！請在兔兔後台設定 Groq API Key。" }
            }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        // 4. 抓取知識庫內容 (大幅限制大小以避免 TPM 超限)
        let knowledgeContent = "";
        if (knowledgeUrls) {
            const urls = knowledgeUrls.split('\n').map(u => u.trim()).filter(u => u);
            const fetchPromises = urls.map(async (url) => {
                try {
                    const resp = await fetch(url);
                    if (resp.ok) {
                        const text = await resp.text();
                        // 每個檔案限制 1500 字元
                        return text.slice(0, 1500);
                    }
                } catch (e) {
                    console.log(`Failed to fetch ${url}:`, e.message);
                }
                return "";
            });

            const contents = await Promise.all(fetchPromises);
            knowledgeContent = contents.filter(c => c).join('\n\n---\n\n');

            // 總量限制 3000 字元
            if (knowledgeContent.length > 3000) {
                knowledgeContent = knowledgeContent.slice(0, 3000) + "\n...(內容已截斷)";
            }
        }

        // 5. 建立增強的系統提示詞
        let enhancedPrompt = systemPrompt || "你是一個友善的網站助理。";

        if (knowledgeContent) {
            enhancedPrompt += `\n\n以下是網站的資料，請根據這些資料來回答用戶的問題：\n\n${knowledgeContent}`;
        }

        // 限制總 prompt 長度
        if (enhancedPrompt.length > 4000) {
            enhancedPrompt = enhancedPrompt.slice(0, 4000) + "\n...(已截斷)";
        }

        const requestBody = await context.request.json();

        // 6. 替換系統提示詞
        let messages = requestBody.messages || [];
        if (messages.length > 0 && messages[0].role === "system") {
            messages[0].content = enhancedPrompt;
        } else {
            messages = [{ role: "system", content: enhancedPrompt }, ...messages];
        }

        // 7. 呼叫 Groq API (含 Fallback 機制)
        const primaryModel = requestBody.model || "llama-3.3-70b-versatile";
        const fallbackModels = [
            "llama-3.1-8b-instant",      // 8B 快速模型
            "mixtral-8x7b-32768",        // Mixtral MoE 模型
            "gemma2-9b-it",              // Google Gemma2 9B
            "llama3-8b-8192"             // Llama3 8B (舊版穩定)
        ];

        const modelsToTry = [primaryModel, ...fallbackModels];
        let data = null;
        let lastError = null;

        for (const model of modelsToTry) {
            try {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: requestBody.temperature || 0.7,
                        max_tokens: requestBody.max_tokens || 512  // 減少 token 用量
                    })
                });

                data = await response.json();

                // 檢查是否為速率限制錯誤 (HTTP 429 或 body 中的 rate limit 訊息)
                const isRateLimited = response.status === 429 ||
                    (data.error && data.error.message &&
                        (data.error.message.includes('Rate limit') ||
                            data.error.message.includes('rate_limit') ||
                            data.error.message.includes('TPM') ||
                            data.error.message.includes('RPM')));

                // 如果成功且有回覆，跳出迴圈
                if (response.ok && data.choices && data.choices.length > 0) {
                    console.log(`✅ 使用模型: ${model}`);
                    break;
                }

                // 如果是速率限制，嘗試下一個模型
                if (isRateLimited) {
                    console.log(`⚠️ 模型 ${model} 被限速，嘗試備用模型...`);
                    lastError = data;
                    continue;
                }

                // 其他錯誤直接返回
                console.log(`❌ 模型 ${model} 錯誤: ${data.error?.message}`);
                break;

            } catch (e) {
                console.log(`❌ 模型 ${model} 失敗: ${e.message}`);
                lastError = { error: { message: e.message } };
            }
        }

        // 如果所有模型都失敗
        if (!data || (data.error && !data.choices)) {
            data = lastError || { error: { message: "所有模型都暫時無法使用，請稍後再試。" } };
        }

        return new Response(JSON.stringify(data), {
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders
            }
        });
    }
}

// 處理預檢請求
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    });
}
