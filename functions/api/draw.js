export async function onRequestPost(context) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
    try {
        const body = await context.request.json();
        const prompt = body.prompt || "a cute bunny";
        const HF_TOKEN = "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";

        const hfResponse = await fetch(
            "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HF_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ inputs: prompt })
            }
        );

        if (!hfResponse.ok) {
            const errText = await hfResponse.text();
            throw new Error(`HF ${hfResponse.status}: ${errText}`);
        }

        // 修復版：用 Cloudflare 原生方式轉換 base64，不用 spread 運算子
        const imageBuffer = await hfResponse.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);
        
        // 分批轉換避免 stack overflow
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        return new Response(JSON.stringify({ image: dataUrl }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    });
}
