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
        const hfResponse = await fetch("https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0", {
            method: "POST",
            headers: { "Authorization": `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: prompt })
        });
        if (!hfResponse.ok) throw new Error(`HF Error: ${hfResponse.status}`);
        const imageBuffer = await hfResponse.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        return new Response(JSON.stringify({ image: `data:image/jpeg;base64,${base64}` }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }
}
export async function onRequestOptions() {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}
