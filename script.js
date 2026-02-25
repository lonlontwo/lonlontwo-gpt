// --- 兔兔助理：雙迴路最強穩定版 ---

const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat",
    model: "llama-3.3-70b-versatile",
    prompt: "你是一個網站助理。當使用者要求畫圖時，請在回覆中加入 [DRAW: 英文描述] 格式。描述盡量豐富且使用英文。",
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
        addMessage("❌ 伺服器有點忙，請等一下再試！", 'bot');
    }
}

// 核心：穩定性最強的繪圖攔截器
function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `message ${side}-message`;
    
    // 正則規則
    const drawRegex = /\[DRAW:\s*([\s\S]+?)\]/i;
    
    if (side === 'bot' && drawRegex.test(text)) {
        const match = text.match(drawRegex);
        const rawPrompt = match[1].replace(/[\n\r\[\]"]/g, ' ').trim();
        const cleanText = text.replace(drawRegex, '').trim();
        const seed = Math.floor(Math.random() * 10000);
        
        // 🔹 線路 A：專業 AI 繪圖 (Pollinations)
        const primaryUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(rawPrompt)}?seed=${seed}&nologo=true&width=512&height=512`;
        
        // 🔹 線路 B：備用圖庫 (Unsplash) - 如果 AI 壞了，至少會出一張相關的真圖
        const fallbackUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(rawPrompt)}`;

        div.innerHTML = `
            ${cleanText ? `<div>${cleanText}</div>` : ''}
            <div class="ai-image-card" style="margin-top:10px; border:2px dashed var(--primary-color); border-radius:12px; padding:8px; background:#fff; text-align:center;">
                <div class="image-loader" style="color:var(--primary-color); padding:15px;">🐰 兔兔畫圖中...</div>
                <img src="${primaryUrl}" style="display:none; width:100%; border-radius:8px;" 
                    onload="this.style.display='block'; this.previousElementSibling.style.display='none';" 
                    onerror="console.log('線路A失敗，切換線路B'); this.src='${fallbackUrl}'; this.onerror=function(){this.previousElementSibling.innerText='❌ 畫紙真的破了，請檢查網路';};">
                <div style="font-size:10px; color:#ccc; margin-top:5px;">
                    <a href="${primaryUrl}" target="_blank" style="color:#aaa; text-decoration:none;">[ 打不開？點我直接查看來源網址 ]</a>
                </div>
            </div>
        `;
    } else {
        div.innerText = text;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}
syncConfig();
