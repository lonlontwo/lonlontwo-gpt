// --- 1. 設定與初始化 ---
const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat",
    model: "llama-3.3-70b-versatile",
    prompt: "你是一個網站助理，名叫「兔兔助理」。你的語氣非常可愛、親切。當使用者要求畫圖時，請在回覆中加入 [DRAW: 英文描述] 格式。",
    chips: "兔兔網在哪裡？,助理能做什麼？,聯絡站長",
    color: "#ff8fb1",
    avatarUrl: "https://raw.githubusercontent.com/lonlontwo/lonlontwo-gpt/main/bunny-avatar.png"
};

let CONFIG = { ...defaultConfig };

// 抓取雲端設定
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
            body: JSON.stringify({
                messages: [{ role: "user", content: text }]
            })
        });

        const data = await response.json();
        typingIndicator.style.display = 'none';

        if (data.choices && data.choices[0].message) {
            addMessage(data.choices[0].message.content, 'bot');
        } else {
            addMessage("❌ 兔兔現在沒辦法回應，請稍後再試。", 'bot');
        }

    } catch (error) {
        typingIndicator.style.display = 'none';
        addMessage("❌ 連線失敗，請檢查網路。", 'bot');
    }
}

// 核心函數：處理文字與生圖標籤
function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `message ${side}-message`;
    
    // 檢查機器人回覆中是否包含生圖標籤 [DRAW: description]
    if (side === 'bot' && text.includes('[DRAW:')) {
        const regex = /\[DRAW:\s*(.+?)\]/i;
        const match = text.match(regex);
        
        if (match) {
            const prompt = match[1];
            const cleanText = text.replace(regex, '').trim();
            const seed = Math.floor(Math.random() * 1000000);
            // 使用更強的 FLUX 模型
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true&model=flux&width=1024&height=1024`;

            div.innerHTML = `
                ${cleanText ? `<div style="margin-bottom: 8px;">${cleanText}</div>` : ''}
                <div class="ai-image-card">
                    <div class="image-loader"><span>🥕 兔兔正在努力畫圖...</span></div>
                    <img src="${imageUrl}" class="ai-img" onload="this.style.display='block'; this.previousElementSibling.style.display='none';">
                    <div class="image-overlay">
                        <a href="${imageUrl}" target="_blank" title="查看大圖"><i class="fas fa-expand"></i></a>
                    </div>
                </div>
            `;
        } else {
            div.innerText = text;
        }
    } else {
        div.innerText = text;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

syncConfig();
