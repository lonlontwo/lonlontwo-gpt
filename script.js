// --- 1. 設定與初始化 ---
const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat",
    model: "llama-3.3-70b-versatile",
    prompt: "你是一個網站助理，名叫「兔兔助理」。你的語氣非常可愛、親切，常帶有兔子相關的表情符號（如 🐰, 🥕, 🐾）。你負責協助使用者了解『兔兔網』的內容。",
    chips: "兔兔網在哪裡？,助理能做什麼？,聯絡站長",
    color: "#ff8fb1",
    avatarUrl: "https://raw.githubusercontent.com/lonlontwo/lonlontwo-gpt/main/bunny-avatar.png"
};

let CONFIG = { ...defaultConfig };

// 抓取雲端設定 (Firebase Firestore REST API)
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

            // 更新介面
            applyConfig();
        }
    } catch (e) {
        console.log("Using default config:", e.message);
        applyConfig();
    }
}

function applyConfig() {
    // 套用主題色
    document.documentElement.style.setProperty('--primary-color', CONFIG.color);

    // 修改標題
    const botTitle = document.querySelector('.chat-header h2');
    if (botTitle) botTitle.innerText = CONFIG.botName;

    // 更新頭像
    const avatarImg = document.getElementById('bunny-header-icon');
    if (avatarImg) avatarImg.src = CONFIG.avatarUrl;

    // 動態產生快速選單按鈕
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

const launcher = document.getElementById('bunny-launcher');
const chatContainer = document.getElementById('chat-container');
const closeBtn = document.getElementById('close-chat');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatMessages = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('typing-indicator');

// --- 3. 介面控制 ---
// 預設常態式打開
chatContainer.classList.add('active');
if (launcher) launcher.style.display = 'none';

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        // 嘗試關閉視窗
        window.close();
        // 如果被阻擋，返回上一頁
        setTimeout(() => {
            window.history.back();
        }, 100);
    });
}

// --- 4. 聊天邏輯 ---
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserMessage(userInput.value.trim());
});

async function handleUserMessage(text) {
    if (!text) return;

    // 使用者訊息
    addMessage(text, 'user');
    userInput.value = '';

    // 顯示思考中
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
        } else if (data.error) {
            addMessage("❌ 錯誤：" + data.error.message, 'bot');
        } else {
            addMessage("❌ 兔兔現在沒辦法回應，請檢查後台設定。", 'bot');
        }

    } catch (error) {
        typingIndicator.style.display = 'none';
        addMessage("❌ 連線失敗，請稍後再試。", 'bot');
        console.error(error);
    }
}

function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `message ${side}-message`;
    div.innerText = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

// 啟動同步
syncConfig();
