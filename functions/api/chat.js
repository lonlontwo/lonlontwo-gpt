export async function onRequestPost(context) {
    // 允許 CORS
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    try {
        // 1. 從 Firebase 讀取設定
        let config = {};
        try {
            const firebaseUrl = "https://firestore.googleapis.com/v1/projects/green-tract-416604/databases/(default)/documents/configs/bunny-assistant";
            const firebaseResp = await fetch(firebaseUrl);
            const firebaseData = await firebaseResp.json();

            if (firebaseData.fields) {
                const f = firebaseData.fields;
                config.activeProvider  = f.activeProvider?.stringValue  || "groq";
                config.userModels      = f.userModels?.stringValue       || "";
                config.groqApiKey      = f.groqApiKey?.stringValue      || "";
                config.geminiApiKey    = f.geminiApiKey?.stringValue     || "";
                config.deepseekApiKey  = f.deepseekApiKey?.stringValue   || "";
                config.openaiApiKey    = f.openaiApiKey?.stringValue     || "";
                config.knowledgeUrls   = f.knowledgeUrls?.stringValue    || "";
                config.systemPrompt    = f.prompt?.stringValue           || "";
            }
        } catch (e) {
            console.log("Firebase fetch failed:", e.message);
        }

        // 2. 決定使用哪個模型商的設定
        const providerMap = {
            groq: {
                apiKey:   config.groqApiKey     || context.env.GROQ_API_KEY,
                endpoint: "https://api.groq.com/openai/v1/chat/completions",
                model:    "llama-3.3-70b-versatile",
                fallbacks: ["llama-3.1-8b-instant", "gemma2-9b-it", "llama3-8b-8192"]
            },
            gemini: {
                apiKey:   config.geminiApiKey   || context.env.GEMINI_API_KEY,
                endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                model:    "gemini-2.0-flash",
                fallbacks: ["gemini-1.5-flash", "gemini-1.5-flash-8b"]
            },
            deepseek: {
                apiKey:   config.deepseekApiKey || context.env.DEEPSEEK_API_KEY,
                endpoint: "https://api.deepseek.com/v1/chat/completions",
                model:    "deepseek-chat",
                fallbacks: []
            },
            openai: {
                apiKey:   config.openaiApiKey   || context.env.OPENAI_API_KEY,
                endpoint: "https://api.openai.com/v1/chat/completions",
                model:    "gpt-4o-mini",
                fallbacks: ["gpt-3.5-turbo"]
            }
        };

        // 判斷最終使用的 provider：
        // 若前台使用者選擇了某個 provider，且它在後台開放清單內，就用使用者選的
        const requestBody = await context.request.json();
        const allowedModels = config.userModels ? config.userModels.split(',').map(m => m.trim()).filter(m => m) : [];
        const requestedProvider = requestBody.provider;
        let activeProviderKey = config.activeProvider || "groq";
        if (requestedProvider && allowedModels.includes(requestedProvider) && providerMap[requestedProvider]) {
            activeProviderKey = requestedProvider;
        }
        const provider = providerMap[activeProviderKey] || providerMap.groq;

        // 3. 如果沒有 API Key，返回錯誤
        if (!provider.apiKey) {
            return new Response(JSON.stringify({
                error: { message: `API Key 未設定（模型商：${config.activeProvider}）！請在後台 API 金鑰分頁填入對應的 Key。` }
            }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        // 4. 抓取知識庫內容
        let knowledgeContent = "";
        if (config.knowledgeUrls) {
            const urls = config.knowledgeUrls.split('\n').map(u => u.trim()).filter(u => u);
            const fetchPromises = urls.map(async (url) => {
                try {
                    const resp = await fetch(url);
                    if (resp.ok) {
                        const text = await resp.text();
                        return text.slice(0, 1500); // 每個檔案限制 1500 字元
                    }
                } catch (e) {
                    console.log(`Failed to fetch ${url}:`, e.message);
                }
                return "";
            });
            const contents = await Promise.all(fetchPromises);
            knowledgeContent = contents.filter(c => c).join('\n\n---\n\n');
            if (knowledgeContent.length > 3000) {
                knowledgeContent = knowledgeContent.slice(0, 3000) + "\n...(內容已截斷)";
            }
        }

        // 5. 建立增強的系統提示詞
        let enhancedPrompt = config.systemPrompt || "你是一個友善的網站助理。";
        if (knowledgeContent) {
            enhancedPrompt += `\n\n以下是網站的資料，請根據這些資料來回答用戶的問題：\n\n${knowledgeContent}`;
        }
        if (enhancedPrompt.length > 4000) {
            enhancedPrompt = enhancedPrompt.slice(0, 4000) + "\n...(已截斷)";
        }



        // 6. 整理 messages（注入系統提示詞）
        let messages = requestBody.messages || [];
        if (messages.length > 0 && messages[0].role === "system") {
            messages[0].content = enhancedPrompt;
        } else {
            messages = [{ role: "system", content: enhancedPrompt }, ...messages];
        }

        // 7. 呼叫 API（含 Fallback 機制）
        const modelsToTry = [requestBody.model || provider.model, ...provider.fallbacks];
        let data = null;
        let lastError = null;

        for (const model of modelsToTry) {
            try {
                const response = await fetch(provider.endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${provider.apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: requestBody.temperature || 0.7,
                        max_tokens: requestBody.max_tokens || 512
                    })
                });

                data = await response.json();

                // 修正：Gemini 有時回傳陣列格式錯誤 [{error:{...}}]
                if (Array.isArray(data)) {
                    data = data[0] || { error: { message: "Gemini 回傳空陣列" } };
                }

                const errorMsg = data.error?.message || "";
                const isRateLimited = response.status === 429 ||
                    errorMsg.includes('Rate limit') ||
                    errorMsg.includes('rate_limit') ||
                    errorMsg.includes('TPM') ||
                    errorMsg.includes('RPM') ||
                    errorMsg.includes('quota');

                if (response.ok && data.choices?.length > 0) {
                    console.log(`✅ [${activeProviderKey}] 使用模型: ${model}`);
                    break;
                }

                if (isRateLimited) {
                    console.log(`⚠️ 模型 ${model} 被限速，嘗試備用...`);
                    lastError = data;
                    continue;
                }

                console.log(`❌ 模型 ${model} 錯誤: ${errorMsg}`);
                lastError = data;
                continue; // 繼續嘗試下一個 fallback

            } catch (e) {
                console.log(`❌ 模型 ${model} 失敗: ${e.message}`);
                lastError = { error: { message: e.message } };
            }
        }

        if (!data || (!data.choices && !data.error)) {
            data = lastError || { error: { message: "所有模型都暫時無法使用，請稍後再試。" } };
        }

        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders }
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
