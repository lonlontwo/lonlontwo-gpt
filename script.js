/* --- 兔兔助理：終極暴力修復版 (生圖必出) --- */

const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat",
    model: "llama-3.3-70b-versatile",
    prompt: "你是一個助理。生圖時請用 [DRAW: 英文詳細描述]。",
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
        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: "user", content: text }] })
        });
        const data = await response.json();
        typingIndicator.style.display = 'none';
        if (data.choices) addMessage(data.choices[0].message.content, 'bot');
    } catch (e) {
        typingIndicator.style.display = 'none';
        addMessage("❌ 連線異常，請稍後再試。", 'bot');
    }
}

// 🛡️ 核心：絕對不出錯的生圖渲染器
function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `message ${side}-message`;
    
    // 1. 偵測有沒有畫圖標籤
    const drawRegex = /\[DRAW:\s*([\s\S]+?)\]/i;
    if (side === 'bot' && drawRegex.test(text)) {
        const match = text.match(drawRegex);
        // 強力清理提示詞：只留下字母、數字和空白，絕不留換行或引號
        const prompt = match[1].replace(/[^a-zA-Z0-9 ]/g, " ").trim();
        const cleanText = text.replace(drawRegex, '').trim();
        const seed = Math.floor(Math.random() * 888888);
        
        // 生成 URL
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true&model=turbo`;

        div.innerHTML = `
            ${cleanText ? `<div style="margin-bottom:8px">${cleanText}</div>` : ''}
            <div class="ai-image-card" style="border:2px dashed var(--primary-color); padding:8px; border-radius:12px; background:#fff; text-align:center;">
                <div class="image-loader" style="color:var(--primary-color); padding:10px;">🐰 兔兔正在現場作畫中...</div>
                <img src="${imageUrl}" style="display:none; width:100%; border-radius:8px;" 
                     onload="this.style.display='block'; this.previousElementSibling.style.display='none';"
                     onerror="this.src='https://source.unsplash.com/featured/?${encodeURIComponent(prompt)}'; this.onerror=function(){this.previousElementSibling.innerText='❌ 繪圖伺服器目前掛掉了，請點連結查看：';};">
                <div style="margin-top:10px; font-size:10px;">
                    <a href="${imageUrl}" target="_blank" style="color:#ff8fb1; text-decoration:none;">[ 🔗 點此直接查看 / 下載圖片 ]</a>
                </div>
            </div>
        `;
    } else {
        div.innerText = text;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

syncConfig();
