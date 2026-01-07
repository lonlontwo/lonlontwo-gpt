(async function () {
    // 1. Firebase 初始化 (直接填入您剛才拿到的 Config)
    const firebaseConfig = {
        apiKey: "AIzaSyCTHEOqKPVA7Mj8qTUcd9pJ0YrvIgGkBCs",
        authDomain: "green-tract-416604.firebaseapp.com",
        projectId: "green-tract-416604",
        storageBucket: "green-tract-416604.firebasestorage.app",
        messagingSenderId: "1004090879489",
        appId: "1:1004090879489:web:cef299869048b5ab391a00"
    };

    // 引入 Firebase SDK
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
    const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

    // 預設設定
    let CONFIG = {
        botName: "兔兔助理",
        apiKey: "AIzaSyC9dFeJfq8gQ3yyYcaoxbEJfsHNNS0wH-c", // 新的 Gemini Key
        apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        prompt: "你是一個網站助理，名叫「兔兔助理」。你的語氣非常可愛、親切，常帶有兔子相關的表情符號（如 🐰, 🥕, 🐾）。",
        chips: "兔兔是誰？,功能介紹,聯絡站長",
        color: "#ff8fb1",
        avatar: "https://raw.githubusercontent.com/lonlontwo/lonlontwo-gpt/main/bunny-avatar.png"
    };

    // 嘗試從雲端抓取最新設定
    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const snap = await getDoc(doc(db, "configs", "bunny-assistant"));
        if (snap.exists()) {
            const data = snap.data();
            // 合併雲端資料
            Object.assign(CONFIG, data);
            console.log("🐰 兔兔助理：雲端設定同步成功！");
        }
    } catch (e) {
        console.warn("🐰 兔兔助理：雲端連線失敗，使用本地預設值。", e);
    }

    // --- 以下是介面生成邏輯 (已修復路徑) ---
    const style = document.createElement('style');
    style.innerHTML = `
        :root { --bunny-primary: ${CONFIG.color}; }
        #bunny-widget-container { position: fixed; bottom: 30px; right: 30px; z-index: 999999; font-family: 'Noto Sans TC', sans-serif; }
        .bunny-btn { width: 65px; height: 65px; background: white; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.1); cursor: pointer; display: flex; align-items: center; justify-content: center; border: 3px solid var(--bunny-primary); transition: transform 0.3s; }
        .bunny-btn:hover { transform: scale(1.1); }
        .bunny-btn img { width: 80%; border-radius: 50%; }
        .bunny-chat-window { position: absolute; bottom: 85px; right: 0; width: 350px; height: 500px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; }
        .bunny-header { background: var(--bunny-primary); color: white; padding: 15px; display: flex; align-items: center; justify-content: space-between; }
        .bunny-messages { flex: 1; padding: 15px; overflow-y: auto; background: #fff5f7; display: flex; flex-direction: column; gap: 10px; }
        .bunny-msg { padding: 10px 14px; border-radius: 15px; max-width: 80%; font-size: 14px; line-height: 1.5; word-break: break-all; }
        .bunny-msg.bot { background: white; align-self: flex-start; border-bottom-left-radius: 2px; color: #555; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .bunny-msg.user { background: var(--bunny-primary); align-self: flex-end; border-bottom-right-radius: 2px; color: white; }
        .bunny-input-area { padding: 15px; border-top: 1px solid #eee; display: flex; gap: 8px; background: white; }
        .bunny-input { flex: 1; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; outline: none; }
        .bunny-send { background: var(--bunny-primary); color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; }
        .bunny-chips { padding: 8px 15px; display: flex; gap: 5px; overflow-x: auto; white-space: nowrap; background: white; border-top: 1px solid #f9f9f9; }
        .bunny-chips::-webkit-scrollbar { display: none; }
        .bunny-chip { background: white; border: 1px solid var(--bunny-primary); color: var(--bunny-primary); padding: 4px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; transition: 0.2s; }
        .bunny-chip:hover { background: var(--bunny-primary); color: white; }
    `;
    document.head.appendChild(style);

    const widget = document.createElement('div');
    widget.id = 'bunny-widget-container';
    widget.innerHTML = `
        <div class="bunny-chat-window" id="bunnyChat">
            <div class="bunny-header">
                <span style="font-weight: bold;">🐰 ${CONFIG.botName}</span>
                <span style="cursor: pointer; font-size: 20px;" id="closeBunny">×</span>
            </div>
            <div class="bunny-messages" id="bunnyMsgs">
                <div class="bunny-msg bot">您好呀！我是${CONFIG.botName}，有什麼兔兔可以幫您的嗎？🐰</div>
            </div>
            <div class="bunny-chips" id="bunnyChips"></div>
            <div class="bunny-input-area">
                <input type="text" class="bunny-input" id="bunnyInput" placeholder="請輸入訊息...">
                <button class="bunny-send" id="bunnySend">➔</button>
            </div>
        </div>
        <div class="bunny-btn" id="bunnyLauncher">
            <img src="${CONFIG.avatar}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2663/2663067.png'">
        </div>
    `;
    document.body.appendChild(widget);

    const bunnyChat = document.getElementById('bunnyChat');
    const bunnyMsgs = document.getElementById('bunnyMsgs');
    const bunnyInput = document.getElementById('bunnyInput');

    document.getElementById('bunnyLauncher').onclick = () => {
        bunnyChat.style.display = bunnyChat.style.display === 'flex' ? 'none' : 'flex';
        if (bunnyChat.style.display === 'flex') bunnyInput.focus();
    };
    document.getElementById('closeBunny').onclick = () => bunnyChat.style.display = 'none';

    async function sendMessage(text) {
        if (!text) return;
        addMsg(text, 'user');
        bunnyInput.value = '';

        const loading = addMsg('兔兔正在思考...', 'bot');
        try {
            const resp = await fetch(`${CONFIG.apiEndpoint}?key=${CONFIG.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `${CONFIG.prompt}\n使用者說：${text}` }] }] })
            });
            const data = await resp.json();
            if (data.error) throw new Error(data.error.message);
            loading.innerText = data.candidates[0].content.parts[0].text;
        } catch (e) {
            loading.innerText = "嗚嗚，兔兔腦袋好像打結了... 請檢查 Gemini API Key 是否正確！🥕";
            console.error(e);
        }
        bunnyMsgs.scrollTop = bunnyMsgs.scrollHeight;
    }

    function addMsg(text, role) {
        const d = document.createElement('div');
        d.className = `bunny-msg ${role}`;
        d.innerText = text;
        bunnyMsgs.appendChild(d);
        bunnyMsgs.scrollTop = bunnyMsgs.scrollHeight;
        return d;
    }

    document.getElementById('bunnySend').onclick = () => sendMessage(bunnyInput.value);
    bunnyInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(bunnyInput.value); };

    CONFIG.chips.split(',').forEach(txt => {
        const c = document.createElement('div');
        c.className = 'bunny-chip';
        c.innerText = txt.trim();
        c.onclick = () => sendMessage(txt.trim());
        document.getElementById('bunnyChips').appendChild(c);
    });

})();
