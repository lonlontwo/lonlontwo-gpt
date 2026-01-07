export async function onRequestPost(context) {
    // 允許 CORS
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    try {
        // 1. 先嘗試從 Firebase 讀取 API Key
        let GROQ_API_KEY = null;

        try {
            const firebaseUrl = "https://firestore.googleapis.com/v1/projects/green-tract-416604/databases/(default)/documents/configs/bunny-assistant";
            const firebaseResp = await fetch(firebaseUrl);
            const firebaseData = await firebaseResp.json();

            if (firebaseData.fields && firebaseData.fields.groqApiKey) {
                GROQ_API_KEY = firebaseData.fields.groqApiKey.stringValue;
                console.log("Using API Key from Firebase");
            }
        } catch (e) {
            console.log("Firebase fetch failed, using env variable:", e.message);
        }

        // 2. 如果 Firebase 沒有，就用環境變數
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

        const requestBody = await context.request.json();

        // 呼叫 Groq API
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: requestBody.model || "llama-3.3-70b-versatile",
                messages: requestBody.messages,
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
