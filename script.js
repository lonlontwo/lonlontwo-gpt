// --- 1. 設定與初始化 ---
const defaultConfig = {
    botName: "兔兔助理",
    apiEndpoint: "/api/chat", // 使用我們自己的代理 API
    model: "llama-3.3-70b-versatile",
    prompt: "你是一個網站助理，名叫「兔兔助理」。你的語氣非常可愛、親切，常帶有兔子相關的表情符號（如 🐰, 🥕, 🐾）。你負責協助使用者了解『兔兔網』的內容。",
    chips: "兔兔網在哪裡？,助理能做什麼？,聯絡站長",
    color: "#ff8fb1"
};

// 從 localStorage 讀取設定，如果沒有就用預設的
const CONFIG = JSON.parse(localStorage.getItem('BUNNY_CONFIG')) || defaultConfig;

// 套用主題色
document.documentElement.style.setProperty('--primary-color', CONFIG.color);

const launcher = document.getElementById('bunny-launcher');
const chatContainer = document.getElementById('chat-container');
const closeBtn = document.getElementById('close-chat');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatMessages = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('typing-indicator');

// --- 2. 介面初始化 ---
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

// 修改標題
const botTitle = document.querySelector('.chat-header h2');
if (botTitle) botTitle.innerText = CONFIG.botName;

// --- 3. 介面控制 ---
launcher.addEventListener('click', () => {
    chatContainer.classList.add('active');
    launcher.style.transform = 'scale(0)';
    setTimeout(() => userInput.focus(), 400);
});

closeBtn.addEventListener('click', () => {
    chatContainer.classList.remove('active');
    launcher.style.transform = 'scale(1)';
});

// --- 4. 聊天邏輯 ---
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserMessage(userInput.value.trim());
});

async function handleUserMessage(message) {
    if (!message) return;

    addMessage(message, 'user');
    userInput.value = '';
    setTyping(true);

    try {
        const response = await getBotResponse(message);
        addMessage(response, 'bot');
    } catch (error) {
        addMessage("哎呀，兔兔的腦腦好像當機了... 可能是 API Key 有問題喔！🥕", 'bot');
        console.error("API Error:", error);
    } finally {
        setTyping(false);
    }
}

function addMessage(text, sender) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');

    const formattedText = text.replace(/\n/g, '<br>');

    msgDiv.innerHTML = `
        <div class="msg-content">${formattedText}</div>
        <div class="msg-time" style="font-size: 0.6rem; opacity: 0.5; margin-top: 4px; text-align: ${sender === 'user' ? 'right' : 'left'}">
            ${time}
        </div>
    `;

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}

function setTyping(isTyping) {
    typingIndicator.style.display = isTyping ? 'flex' : 'none';
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}

async function getBotResponse(userMsg) {
    const response = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: CONFIG.model || "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: CONFIG.prompt },
                { role: "user", content: userMsg }
            ],
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}
