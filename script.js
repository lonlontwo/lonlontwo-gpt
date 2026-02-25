// --- 兔兔助理：完整修復穩定版 (包含繪圖功能) ---

// 1. 預設配置
const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat",
    model: "llama-3.3-70b-versatile",
    prompt: "你是一個網站助理，名叫「兔兔助理」。你的語氣非常可愛、親切。當使用者要求畫圖時，請輸出 [DRAW: 英文詳細描述] 格式。",
    chips: "兔兔網在哪裡？,助理能做什麼？,聯絡站長",
    color: "#ff8fb1",
    avatarUrl: "https://raw.githubusercontent.com/lonlontwo/lonlontwo-gpt/main/bunny-avatar.png"
};

let CONFIG = { ...defaultConfig };

// 2. 同步 Firebase 配置
async function syncConfig() {
    try {
        const firebaseUrl = "https://firestore.googleapis.com/v1/projects/green-tract-416604/databases/(default)/documents/configs/bunny-assistant";
        const resp = await fetch(firebaseUrl);
        const data = await resp.json();

        if (data.fields) {
            if (data.fields.botName) CONFIG.botName = data.fields.botName.stringValue;
            if (data.fields.chips) CONFIG.chips = data.fields.chips.stringValue;
            if (data.fields.color) CONFIG.color = data.fields.color.stringValue;
            if (data.fields.avatarUrl) CONFIG.avatarUrl = data.fields.avatarUrl.stringValue;
            applyConfig();
        }
    } catch (e) {
        console.log("Using default config:", e.message);
        applyConfig();
    }
}

function applyConfig() {
    document.documentElement.style.setProperty('--primary-color', CONFIG.color);
    const botTitle = document.querySelector('.chat-header h2');
    if (botTitle) botTitle.innerText = CONFIG.botName;
    const avatarImg = document.getElementById('bunny-header-icon');
    if (avatarImg) avatarImg.src = CONFIG.avatarUrl;

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

// 3. UI 元素與介面控制
const chatContainer = document.getElementById('chat-container');
const closeBtn = document.getElementById('close-chat');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatMessages = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('typing-indicator');

// 介面預設開啟
chatContainer.classList.add('active');

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        window.history.back();
    });
}

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserMessage(userInput.value.trim());
});

// 4. 訊息處理邏輯
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
            body: JSON.stringify({
                messages: [{ role: "user", content: text }]
            })
        });

        const data = await response.json();
        typingIndicator.style.display = 'none';

        if (data.choices && data.choices[0].message) {
            addMessage(data.choices[0].message.content, 'bot');
        } else {
            addMessage("❌ 兔兔現在沒辦法回應，請檢查後台設定。", 'bot');
        }

    } catch (error) {
        typingIndicator.style.display = 'none';
        addMessage("❌ 連線出現問題，請稍後再試。", 'bot');
    }
}

// 5. 核心：訊息顯示與生圖攔截
function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `message ${side}-message`;

    // 繪圖指令偵測正則
    const drawRegex = /\[DRAW:\s*([\s\S]+?)\]/i;

    if (side === 'bot' && drawRegex.test(text)) {
        const match = text.match(drawRegex);
        // 清理 Prompt：移除特殊符號與換行
        let promptValue = match[1].replace(/[\n\r\[\]"]/g, ' ').trim();
        const cleanText = text.replace(drawRegex, '').trim();
        
        const seed = Math.floor(Math.random() * 1000000);
        // 使用極簡化 URL 避免報錯，並移除 model 參數提高相容性
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptValue)}?seed=${seed}&nologo=true`;

        div.innerHTML = `
            ${cleanText ? `<div>${cleanText}</div>` : ''}
            <div class="ai-image-card" style="margin-top:10px; border: 2px dashed var(--primary-color); border-radius: 12px; padding: 8px; background: #fff; text-align: center;">
                <div class="image-loader" style="color: var(--primary-color); padding: 15px;">🐰 兔兔畫圖中...</div>
                <img src="${imageUrl}" style="display:none; width: 100%; border-radius: 8px;" 
                    onload="this.style.display='block'; this.previousElementSibling.style.display='none';"
                    onerror="this.previousElementSibling.innerText='❌ 目前畫室客滿，請稍後再試！';">
            </div>
        `;
    } else {
        div.innerText = text;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

// 啟動同步與設定
syncConfig();
