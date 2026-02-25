// --- 1. 設定與初始化 ---
const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat",
    model: "llama-3.3-70b-versatile",
    prompt: "你是一個網站助理。當需要畫圖或設計時，請輸出 [DRAW: 英文描述] 標籤。請確保描述詳細一點。",
    chips: "兔兔網在哪裡？,助理能做什麼？,聯絡站長",
    color: "#ff8fb1",
    avatarUrl: "https://raw.githubusercontent.com/lonlontwo/lonlontwo-gpt/main/bunny-avatar.png"
};
let CONFIG = { ...defaultConfig };

// --- 2. 獲取配置 ---
async function syncConfig() {
    try {
        const firebaseUrl = "https://firestore.googleapis.com/v1/projects/green-tract-416604/databases/(default)/documents/configs/bunny-assistant";
        const resp = await fetch(firebaseUrl);
        const data = await resp.json();
        if (data.fields) {
            if (data.fields.botName) CONFIG.botName = data.fields.botName.stringValue;
            if (data.fields.chips) CONFIG.chips = data.fields.chips.stringValue;
            if (data.fields.color) CONFIG.color = data.fields.color.stringValue;
            applyConfig();
        }
    } catch (e) { applyConfig(); }
}

function applyConfig() {
    document.documentElement.style.setProperty('--primary-color', CONFIG.color);
    const chipContainer = document.getElementById('quick-replies');
    if (chipContainer) {
        chipContainer.innerHTML = '';
        CONFIG.chips.split(',').forEach(text => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.innerText = text.trim();
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

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserMessage(userInput.value.trim());
});

async function handleUserMessage(text) {
    if (!text) return;
    addMessage(text, 'user');
    userInput.value = '';
    typingIndicator.style.display = 'flex';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: "user", content: text }] })
        });
        const data = await response.json();
        typingIndicator.style.display = 'none';
        if (data.choices && data.choices[0].message) {
            addMessage(data.choices[0].message.content, 'bot');
        }
    } catch (e) {
        typingIndicator.style.display = 'none';
        addMessage("❌ 兔兔現在連不到伺服器 (Error 1033)，請檢查網路！", 'bot');
    }
}

// 🎨 核心繪圖渲染邏輯 (這一段最重要)
function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `message ${side}-message`;
    
    if (side === 'bot' && text.includes('[DRAW:')) {
        const match = text.match(/\[DRAW:\s*(.+?)\]/i);
        if (match) {
            const rawPrompt = match[1];
            const cleanText = text.replace(/\[DRAW:.+?\]/i, '').trim();
            const seed = Math.floor(Math.random() * 999999);
            
            // 自動優化提示詞，讓它看起來更有質感
            const enhancedPrompt = `${rawPrompt}, cinematic lighting, detailed, masterpiece, 8k resolution`;
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?seed=${seed}&nologo=true&model=flux`;

            div.innerHTML = `
                ${cleanText ? `<div>${cleanText}</div>` : ''}
                <div class="ai-image-card">
                    <div class="image-loader">🥕 兔兔正在努力畫圖...</div>
                    <img src="${imageUrl}" class="ai-img" 
                        onload="this.style.display='block'; this.previousElementSibling.style.display='none';" 
                        onerror="this.previousElementSibling.innerText='❌ 哎呀，畫紙濕掉了 (生成失敗)';"
                    >
                </div>
            `;
            chatMessages.appendChild(div);
            return div;
        }
    }

    div.innerText = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
syncConfig();
