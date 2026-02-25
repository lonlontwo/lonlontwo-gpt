// --- 兔兔助理：極速繪圖增強版 ---
const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat",
    model: "llama-3.3-70b-versatile",
    prompt: "你是一個網站助理。當需要畫圖或設計時，請輸出 [DRAW: 英文描述] 格式。描述越詳細越好。",
    chips: "兔兔網在哪裡？,助理能做什麼？,聯絡站長",
    color: "#ff8fb1",
    avatarUrl: "https://raw.githubusercontent.com/lonlontwo/lonlontwo-gpt/main/bunny-avatar.png"
};
let CONFIG = { ...defaultConfig };

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
        addMessage("❌ 兔兔現在不舒服，請檢查後台設定。", 'bot');
    }
}

function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `message ${side}-message`;
    
    // 🎨 修改後的「必出圖」邏輯
    const drawRegex = /\[DRAW:\s*(.+?)\]/i;
    if (side === 'bot' && drawRegex.test(text)) {
        const match = text.match(drawRegex);
        const prompt = match[1].replace(/[\[\]]/g, ''); // 淨化提示詞
        const cleanText = text.replace(drawRegex, '').trim();
        const seed = Math.floor(Math.random() * 1000000);
        
        // 使用 Turbo 模型：速度最快，不容易超時
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true&model=turbo&width=800&height=800`;

        div.innerHTML = `
            ${cleanText ? `<div style="margin-bottom:8px">${cleanText}</div>` : ''}
            <div class="ai-image-card" style="border: 2px dashed var(--primary-color); padding: 10px; border-radius: 12px; text-align: center; background: #fff;">
                <div class="image-loader" style="color: var(--primary-color); padding: 20px;">🐰 兔兔畫圖中...</div>
                <img src="${imageUrl}" style="display:none; width:100%; border-radius: 8px;" 
                    onload="this.style.display='block'; this.previousElementSibling.style.display='none';"
                    onerror="this.previousElementSibling.innerText='❌ 畫紙破了，請再試一次！';">
            </div>
        `;
    } else {
        div.innerText = text;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
syncConfig();
