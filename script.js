// --- 兔兔助理：極速防崩潰版 (修復 1033) ---
const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat",
    prompt: "你是一個可愛助理。生圖時請用 [DRAW: 英文描述]。",
    chips: "兔兔網在哪裡？,助理能做什麼？,聯絡站長",
    color: "#ff8fb1",
    avatarUrl: "https://raw.githubusercontent.com/lonlontwo/lonlontwo-gpt/main/bunny-avatar.png"
};
let CONFIG = { ...defaultConfig };

async function syncConfig() {
    try {
        const resp = await fetch("https://firestore.googleapis.com/v1/projects/green-tract-416604/databases/(default)/documents/configs/bunny-assistant");
        const data = await resp.json();
        if (data.fields) {
            CONFIG.botName = data.fields.botName?.stringValue || CONFIG.botName;
            CONFIG.color = data.fields.color?.stringValue || CONFIG.color;
            applyConfig();
        }
    } catch (e) { applyConfig(); }
}

function applyConfig() {
    document.documentElement.style.setProperty('--primary-color', CONFIG.color);
    const chipContainer = document.getElementById('quick-replies');
    if (chipContainer) {
        chipContainer.innerHTML = '';
        (CONFIG.chips || "").split(',').forEach(text => {
            const chip = document.createElement('div');
            chip.className = 'chip'; chip.innerText = text.trim();
            chip.onclick = () => handleUserMessage(text.trim());
            chipContainer.appendChild(chip);
        });
    }
}

const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatMessages = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('typing-indicator');

chatContainer.classList.add('active');
chatForm.addEventListener('submit', (e) => { e.preventDefault(); handleUserMessage(userInput.value.trim()); });

async function handleUserMessage(text) {
    if (!text) return;
    addMessage(text, 'user');
    userInput.value = '';
    typingIndicator.style.display = 'flex';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // 🔹 增加更長的 Timeout 監控或優化請求
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25秒自動中斷，避免卡死

        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                messages: [{ role: "user", content: text }],
                stream: false // 暫時關閉 stream 測試穩定性
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        // 如果後端傳回 1033 或其他錯誤
        if (!response.ok) {
            const errCode = response.status;
            throw new Error(`Cloudflare Error ${errCode}`);
        }

        const data = await response.json();
        typingIndicator.style.display = 'none';
        if (data.choices) addMessage(data.choices[0].message.content, 'bot');

    } catch (e) {
        typingIndicator.style.display = 'none';
        if (e.name === 'AbortError') {
            addMessage("❌ Llama 思考太久了（超時），請換個簡單的問法試試！", 'bot');
        } else {
            addMessage(`❌ 出現了 1033 或連線錯誤，請稍後再試。`, 'bot');
        }
    }
}

function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `message ${side}-message`;
    
    if (side === 'bot' && text.includes('[DRAW:')) {
        const match = text.match(/\[DRAW:\s*([\s\S]+?)\]/i);
        if (match) {
            const prompt = match[1].replace(/[^a-zA-Z0-9 ]/g, " ").trim();
            const cleanText = text.replace(/\[DRAW:.+?\]/i, '').trim();
            // 直接出圖，不囉唆
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&model=turbo`;

            div.innerHTML = `
                ${cleanText ? `<div>${cleanText}</div>` : ''}
                <div class="ai-image-card" style="border:2px dashed var(--primary-color); padding:8px; border-radius:12px; background:#fff; margin-top:10px;">
                    <div class="image-loader" style="color:var(--primary-color); padding:15px; text-align:center;">🥕 兔兔正在連線畫紙中...</div>
                    <img src="${imageUrl}" style="display:none; width:100%; border-radius:8px;" 
                         onload="this.style.display='block'; this.previousElementSibling.style.display='none';"
                         onerror="this.src='https://source.unsplash.com/featured/?${encodeURIComponent(prompt)}';">
                </div>
            `;
            chatMessages.appendChild(div);
            return;
        }
    }
    div.innerText = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

syncConfig();
