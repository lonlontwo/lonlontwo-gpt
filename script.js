const defaultConfig = {
    botName: "兔兔助理", apiEndpoint: "/api/chat",
    chips: "兔兔網在哪裡？,助理能做什麼？,聯絡站長",
    color: "#ff8fb1",
    avatarUrl: "https://raw.githubusercontent.com/lonlontwo/lonlontwo-gpt/main/bunny-avatar.png"
};
let CONFIG = { ...defaultConfig };
let selectedProvider = null; // 使用者目前選擇的模型

const modelLabels = {
    groq:     "🟢 Groq (Llama)",
    gemini:   "🔵 Google Gemini",
    deepseek: "🟣 DeepSeek",
    openai:   "🟠 OpenAI (GPT)"
};

async function syncConfig() {
    try {
        const resp = await fetch("https://firestore.googleapis.com/v1/projects/green-tract-416604/databases/(default)/documents/configs/bunny-assistant");
        const data = await resp.json();
        if (data.fields) {
            CONFIG.botName = data.fields.botName?.stringValue || CONFIG.botName;
            CONFIG.color   = data.fields.color?.stringValue   || CONFIG.color;
            // 讀取開放給使用者的模型清單
            const userModelsStr = data.fields.userModels?.stringValue || "";
            const userModels = userModelsStr.split(',').map(m => m.trim()).filter(m => m);
            setupModelSelector(userModels);
            applyConfig();
        }
    } catch (e) { applyConfig(); }
}

// 設置前台模型選擇器
function setupModelSelector(models) {
    const selectorDiv = document.getElementById('model-selector');
    const selectEl    = document.getElementById('model-select');
    if (!selectorDiv || !selectEl) return;

    if (models.length >= 2) {
        // 填入選項
        selectEl.innerHTML = '';
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = modelLabels[m] || m;
            selectEl.appendChild(opt);
        });
        selectedProvider = models[0]; // 預設選第一個
        selectEl.value = selectedProvider;
        selectEl.onchange = () => { selectedProvider = selectEl.value; };
        selectorDiv.style.display = 'flex';
    } else {
        selectorDiv.style.display = 'none';
        selectedProvider = null; // 讓 Worker 用後台設定的預設
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
        (CONFIG.chips || "").split(',').forEach(text => {
            const chip = document.createElement('div');
            chip.className = 'chip'; chip.innerText = text.trim();
            chip.onclick = () => handleUserMessage(text.trim());
            chipContainer.appendChild(chip);
        });
    }
}

const chatContainer = document.getElementById('chat-container');
const chatForm      = document.getElementById('chat-form');
const userInput     = document.getElementById('user-input');
const chatMessages  = document.getElementById('chat-messages');
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
        const body = { messages: [{ role: "user", content: text }] };
        // 如果使用者有選擇模型，帶入 provider
        if (selectedProvider) body.provider = selectedProvider;

        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        typingIndicator.style.display = 'none';
        if (data.choices && data.choices[0].message) addMessage(data.choices[0].message.content, 'bot');
        else addMessage("❌ 連線出錯，請稍後再試。", 'bot');
    } catch (e) {
        typingIndicator.style.display = 'none';
        addMessage("❌ 連線出錯，請稍後再試。", 'bot');
    }
}

function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `message ${side}-message`;
    div.innerText = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

syncConfig();

