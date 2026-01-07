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

        // 4. 抓取知識庫內容
        let knowledgeContent = "";
        if (knowledgeUrls) {
            const urls = knowledgeUrls.split('\n').map(u => u.trim()).filter(u => u);
            const fetchPromises = urls.map(async (url) => {
                try {
                    const resp = await fetch(url);
                    if (resp.ok) {
                        const text = await resp.text();
                        // 限制每個檔案的大小，避免超過 token 限制
                        return text.slice(0, 5000);
                    }
                } catch (e) {
                    console.log(`Failed to fetch ${url}:`, e.message);
                }
                return "";
            });

            const contents = await Promise.all(fetchPromises);
            knowledgeContent = contents.filter(c => c).join('\n\n---\n\n');
        }

        // 5. 建立增強的系統提示詞
        let enhancedPrompt = systemPrompt || "你是一個友善的網站助理。";

        if (knowledgeContent) {
            enhancedPrompt += `\n\n以下是網站的資料，請根據這些資料來回答用戶的問題：\n\n${knowledgeContent}`;
        }

        const requestBody = await context.request.json();

        // 6. 替換系統提示詞
        let messages = requestBody.messages || [];
        if (messages.length > 0 && messages[0].role === "system") {
            messages[0].content = enhancedPrompt;
        } else {
            messages = [{ role: "system", content: enhancedPrompt }, ...messages];
        }

        // 7. 呼叫 Groq API
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: requestBody.model || "llama-3.3-70b-versatile",
                messages: messages,
                temperature: requestBody.temperature || 0.7,
                max_tokens: requestBody.max_tokens || 1024
            })
        });

        const data = await response.json();

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
