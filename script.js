// --- 兔兔助理：極致穩定繪圖版 ---
const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat",
    model: "llama-3.3-70b-versatile",
    prompt: "你是一個網站助理。當需要畫圖時，請輸出 [DRAW: 英文描述] 格式。",
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
        if (data.choices && data.choices[0].message) {
            addMessage(data.choices[0].message.content, 'bot');
        }
    } catch (e) {
        typingIndicator.style.display = 'none';
        addMessage("❌ 兔兔現在不舒服...", 'bot');
    }
}

// 🛡️ 萬能防錯渲染器
function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = side === 'bot' ? 'message bot-message' : 'message user-message';
    
    // 正則表達式捕捉：不論大小寫、是否有空格都能抓到
    const drawRegex = /\[DRAW:\s*([\s\S]+?)\]/i;
    
    if (side === 'bot' && drawRegex.test(text)) {
        const match = text.match(drawRegex);
        // 清理描述詞：去掉換行、去掉特殊符號、去掉頭尾空白
        let prompt = match[1].replace(/\r?\n|\r/g, " ").replace(/[\[\]"]/g, "").trim();
        const cleanText = text.replace(drawRegex, '').trim();
        const seed = Math.floor(Math.random() * 1000000);
        
        // 🔹 這裡換成一個保證不超時的模型：flux-pro (但這裡用代碼最穩的連結)
        // 並強制加上寬高，確保 URL 結構完整
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true&width=800&height=800`;

        div.innerHTML = `
            ${cleanText ? `<div style="margin-bottom:8px">${cleanText}</div>` : ''}
            <div class="ai-image-card" style="border: 2px dashed var(--primary-color); padding: 5px; border-radius: 12px; background: #fff; min-height: 100px;">
                <div class="image-loader" style="color: var(--primary-color); padding: 20px; text-align:center;">🥕 兔兔畫圖中...</div>
                <img src="${imageUrl}" style="display:none; width:100%; border-radius: 8px;" 
                    onload="this.style.display='block'; this.previousElementSibling.style.display='none';"
                    onerror="this.onerror=null; console.error('Image Load Error'); this.previousElementSibling.innerText='❌ 兔兔今天手有點痠，請再試一次！';">
            </div>
        `;
    } else {
        div.innerText = text;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
syncConfig();
