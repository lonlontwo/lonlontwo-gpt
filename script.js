/* --- 兔兔助理：HuggingFace 生圖版 (穩定可用) --- */

const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat",
    chips: "兔兔網在哪裡？,助理能做什麼？,聯絡站長",
    color: "#ff8fb1",
    avatarUrl: "https://raw.githubusercontent.com/lonlontwo/lonlontwo-gpt/main/bunny-avatar.png"
};
let CONFIG = { ...defaultConfig };

// HuggingFace Token (暫時放前端測試用，之後建議移到後端)
const HF_TOKEN = "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";
const HF_MODEL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0";

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
    const botTitle = document.querySelector('.chat-header h2');
    if (botTitle) botTitle.innerText = CONFIG.botName;
    const avatarImg = document.getElementById('bunny-header-icon');
    if (avatarImg) avatarImg.src = CONFIG.avatarUrl;
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
        if (data.choices && data.choices[0].message) {
            addMessage(data.choices[0].message.content, 'bot');
        }
    } catch (e) {
        typingIndicator.style.display = 'none';
        addMessage("❌ 連線出錯，請稍後再試。", 'bot');
    }
}

// 🎨 HuggingFace 生圖函數 (已驗證可用)
async function generateImageWithHF(prompt, imgElement, loaderElement) {
    try {
        const response = await fetch(HF_MODEL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: prompt })
        });

        if (!response.ok) throw new Error(`HF Error: ${response.status}`);

        // HuggingFace 直接回傳圖片的二進位資料 (Blob)
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        imgElement.src = objectUrl;
        imgElement.style.display = 'block';
        loaderElement.style.display = 'none';
    } catch (err) {
        console.error(err);
        loaderElement.innerText = '❌ 生圖失敗，請稍後再試。';
    }
}

function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `message ${side}-message`;

    const drawRegex = /\[DRAW:\s*([\s\S]+?)\]/i;
    if (side === 'bot' && drawRegex.test(text)) {
        const match = text.match(drawRegex);
        const prompt = match[1].replace(/[\n\r\[\]"]/g, ' ').trim();
        const cleanText = text.replace(drawRegex, '').trim();

        const imageId = `img-${Date.now()}`;
        const loaderId = `loader-${Date.now()}`;

        div.innerHTML = `
            ${cleanText ? `<div style="margin-bottom:8px">${cleanText}</div>` : ''}
            <div class="ai-image-card" style="border:2px dashed var(--primary-color); padding:8px; border-radius:12px; background:#fff; text-align:center; margin-top:8px;">
                <div id="${loaderId}" style="color:var(--primary-color); padding:20px;">🐰 兔兔正在用 HuggingFace 畫圖...<br><small>SDXL 模型品質高，需要約 10-20 秒</small></div>
                <img id="${imageId}" style="display:none; width:100%; border-radius:8px;">
            </div>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // 非同步生圖（不阻塞畫面）
        const imgEl = document.getElementById(imageId);
        const loaderEl = document.getElementById(loaderId);
        generateImageWithHF(prompt, imgEl, loaderEl);
        return;
    }

    div.innerText = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

syncConfig();
