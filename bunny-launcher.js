(function () {
    // 1. 設定與初始化
    const defaultConfig = {
        botName: "兔兔助理",
        apiKey: "AIzaSyCdo6SXaNGx6WF1wTCLemU-7Juq5Ca3CmQ", // 您的 Key
        apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        prompt: "你是一個網站助理，名叫「兔兔助理」。你的語氣非常可愛、親切，常帶有兔子相關的表情符號（如 🐰, 🥕, 🐾）。你負責協助使用者了解『兔兔網』的內容。",
        chips: "兔兔網在哪裡？,助理能做什麼？,聯絡站長",
        color: "#ff8fb1",
        avatar: "https://raw.githubusercontent.com/lonlontwo/lonlontwo-gpt/main/bunny-avatar.png"
    };

    const CONFIG = JSON.parse(localStorage.getItem('BUNNY_CONFIG')) || defaultConfig;

    // 2. 注入 CSS
    const style = document.createElement('style');
    style.innerHTML = `
        :root { --bunny-primary: ${CONFIG.color}; }
        #bunny-widget-container { position: fixed; bottom: 30px; right: 30px; z-index: 999999; font-family: 'Noto Sans TC', sans-serif; }
        .bunny-btn { width: 65px; height: 65px; background: white; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.1); cursor: pointer; display: flex; align-items: center; justify-content: center; border: 3px solid var(--bunny-primary); transition: transform 0.3s; }
        .bunny-btn:hover { transform: scale(1.1); }
        .bunny-btn img { width: 80%; }
        .bunny-chat-window { position: absolute; bottom: 85px; right: 0; width: 350px; height: 500px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; }
        .bunny-header { background: var(--bunny-primary); color: white; padding: 15px; display: flex; align-items: center; justify-content: space-between; }
        .bunny-messages { flex: 1; padding: 15px; overflow-y: auto; background: #fff5f7; display: flex; flex-direction: column; gap: 10px; }
        .bunny-msg { padding: 10px 14px; border-radius: 15px; max-width: 80%; font-size: 14px; line-height: 1.5; }
        .bunny-msg.bot { background: white; align-self: flex-start; border-bottom-left-radius: 2px; color: #555; }
        .bunny-msg.user { background: var(--bunny-primary); align-self: flex-end; border-bottom-right-radius: 2px; color: white; }
        .bunny-input-area { padding: 15px; border-top: 1px solid #eee; display: flex; gap: 8px; }
        .bunny-input { flex: 1; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; outline: none; }
        .bunny-send { background: var(--bunny-primary); color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; }
        .bunny-chips { padding: 0 15px 10px; display: flex; gap: 5px; overflow-x: auto; white-space: nowrap; }
        .bunny-chip { background: white; border: 1px solid var(--bunny-primary); color: var(--bunny-primary); padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; }
    `;
    document.head.appendChild(style);

    // 3. 注入 HTML
    const widget = document.createElement('div');
    widget.id = 'bunny-widget-container';
    widget.innerHTML = `
        <div class="bunny-chat-window" id="bunnyChat">
            <div class="bunny-header">
                <span style="font-weight: bold;">🐰 ${CONFIG.botName}</span>
                <span style="cursor: pointer;" onclick="document.getElementById('bunnyChat').style.display='none'">✕</span>
            </div>
            <div class="bunny-messages" id="bunnyMsgs">
                <div class="bunny-msg bot">您好呀！我是${CONFIG.botName}，有什麼可以幫您的嗎？🐰</div>
            </div>
            <div class="bunny-chips" id="bunnyChips"></div>
            <div class="bunny-input-area">
                <input type="text" class="bunny-input" id="bunnyInput" placeholder="請輸入訊息...">
                <button class="bunny-send" id="bunnySend">➔</button>
            </div>
        </div>
        <div class="bunny-btn" onclick="const c=document.getElementById('bunnyChat'); c.style.display=c.style.display==='flex'?'none':'flex'">
            <img src="${CONFIG.avatar}">
        </div>
    `;
    document.body.appendChild(widget);

    // 4. 重構邏輯
    const sendBtn = document.getElementById('bunnySend');
    const inputField = document.getElementById('bunnyInput');
    const msgContainer = document.getElementById('bunnyMsgs');
    const chipContainer = document.getElementById('bunnyChips');

    // 生成按鈕
    CONFIG.chips.split(',').forEach(txt => {
        const c = document.createElement('div');
        c.className = 'bunny-chip';
        c.innerText = txt.trim();
        c.onclick = () => sendMessage(txt.trim());
        chipContainer.appendChild(c);
    });

    async function sendMessage(text) {
        if (!text) return;
        addMsg(text, 'user');
        inputField.value = '';

        const loading = addMsg('兔兔正在思考...', 'bot');
        try {
            const resp = await fetch(`${CONFIG.apiEndpoint}?key=${CONFIG.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `${CONFIG.prompt}\n使用者說：${text}` }] }] })
            });
            const data = await resp.json();
            loading.innerText = data.candidates[0].content.parts[0].text;
        } catch (e) {
            loading.innerText = "嗚嗚，兔兔腦袋斷線了... 🥕";
        }
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    function addMsg(text, role) {
        const d = document.createElement('div');
        d.className = `bunny-msg ${role}`;
        d.innerText = text;
        msgContainer.appendChild(d);
        msgContainer.scrollTop = msgContainer.scrollHeight;
        return d;
    }

    sendBtn.onclick = () => sendMessage(inputField.value);
    inputField.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(inputField.value); };

    console.log("🐰 兔兔助理外掛已加載！");
})();
