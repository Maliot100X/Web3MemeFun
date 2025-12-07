/* ------------------------------
   WEB3MEMEFUN - APP ENGINE CORE
   PART 1 — INITIAL SETUP
--------------------------------*/

// --- 1. FIREBASE INIT ---
const firebaseConfig = {
    apiKey: "AIzaSyDwyviB0cz-dudEuihPWze9cAkLa58WeZs",
    authDomain: "web3memefun.firebaseapp.com",
    projectId: "web3memefun",
    storageBucket: "web3memefun.firebasestorage.app",
    messagingSenderId: "227343388230",
    appId: "1:227343388230:web:617c118813d1136958c447"
};

const appFB = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// --- 2. TELEGRAM USER INIT ---
let tg = window.Telegram.WebApp;
tg.expand();

let USER_ID = tg.initDataUnsafe?.user?.id || ("guest_" + Math.floor(Math.random()*999999));

document.getElementById("userId").innerText = "User: " + USER_ID;


// --- 3. CREATE ACCOUNT IF NOT EXISTS ---
async function initUser() {
    let ref = db.collection("users").doc(USER_ID);
    let snap = await ref.get();

    if (!snap.exists) {
        await ref.set({
            balance: 10000, // START WITH 10K USDT
            portfolio: {},
            lastDaily: 0,
            created: Date.now()
        });
    }

    loadUser();
}

async function loadUser() {
    let ref = db.collection("users").doc(USER_ID);
    let data = (await ref.get()).data();

    window.USER_BALANCE = data.balance;
    window.USER_PORTFOLIO = data.portfolio || {};

    document.getElementById("userBalance").innerText =
        "Balance: " + USER_BALANCE.toLocaleString() + " USDT";
}

initUser();


// --- 4. UI TAB SWITCHING ---
function openTab(id) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

// Default tab loaded
openTab("market");


// --- 5. MARKET LIST PLACEHOLDER ---
function loadMarket() {
    document.getElementById("marketList").innerHTML =
        `<p style="color:#bbb">Loading market...</p>`;
}

loadMarket();


// --- PART 1 COMPLETE ---
console.log("Web3MemeFun Engine Loaded (PART 1)");
/* ------------------------------
   PART 2 — TOKEN CREATION ENGINE
--------------------------------*/

// GLOBAL STORAGE FOR MARKET
let MARKET = [];

// FIREBASE TOKEN COLLECTION
const tokenRef = db.collection("tokens");


// --- CREATE TOKEN FUNCTION ---
async function createToken() {

    let name = document.getElementById("tokenName").value.trim();
    let ticker = document.getElementById("tokenTicker").value.trim().toUpperCase();
    let img = document.getElementById("tokenImg").value.trim();
    let preBuy = parseInt(document.getElementById("preBuy").value);

    if (!name || !ticker || !img) {
        alert("Enter all fields!");
        return;
    }

    // COST: 2000 USDT
    if (USER_BALANCE < 2000) {
        alert("You need at least 2000 USDT to launch a token.");
        return;
    }

    // DEDUCT COST
    USER_BALANCE -= 2000;

    // UPDATE USER BALANCE IN FIREBASE
    await db.collection("users").doc(USER_ID).update({
        balance: USER_BALANCE
    });

    document.getElementById("userBalance").innerText =
        "Balance: " + USER_BALANCE.toLocaleString() + " USDT";

    // TOKEN START SETTINGS (pumpfun style)
    let supply = 1_000_000_000; // 1B
    let liquidity = 4000 + preBuy; // starting MC
    let price = liquidity / supply;

    // TOKEN OBJECT
    let token = {
        id: Date.now().toString(),
        name: name,
        ticker: ticker,
        img: img,
        supply: supply,
        liquidity: liquidity,
        price: price,
        created: Date.now(),
        creator: USER_ID,
        buys: 0,
        sells: 0,
        mc: liquidity,
        holders: {}
    };

    // SAVE TOKEN TO FIREBASE
    await tokenRef.doc(token.id).set(token);

    // IF USER PREBOUGHT
    if (preBuy > 0) {

        // add tokens to creator portfolio
        let tokensReceived = preBuy / price;

        USER_PORTFOLIO[token.id] = {
            amount: tokensReceived,
            invest: preBuy
        };

        await db.collection("users").doc(USER_ID).update({
            portfolio: USER_PORTFOLIO
        });
    }

    alert("🚀 Token launched!");
    loadMarketTokens();
}
/* ------------------------------
   PART 3 — MARKET + BUY/SELL ENGINE
--------------------------------*/

// LOAD TOKENS FROM FIREBASE INTO MARKET TAB
async function loadMarketTokens() {
    let snap = await tokenRef.orderBy("created", "desc").get();

    MARKET = [];

    snap.forEach(doc => {
        let t = doc.data();
        MARKET.push(t);
    });

    renderMarket();
}

function renderMarket() {
    let box = document.getElementById("marketList");
    box.innerHTML = "";

    MARKET.forEach(t => {
        box.innerHTML += `
        <div class="market-item" onclick="openTrade('${t.id}')">
            <div style="display:flex;align-items:center;gap:10px;">
                <img src="${t.img}" style="width:40px;height:40px;border-radius:50%;">
                <div>
                    <b>${t.name} (${t.ticker})</b><br>
                    <span style="color:#0f0;">MC: ${Math.floor(t.mc).toLocaleString()} USD</span>
                </div>
            </div>
        </div>`;
    });
}

loadMarketTokens();


// --- OPEN TRADE PANEL ---
async function openTrade(id) {
    let snap = await tokenRef.doc(id).get();
    window.CURRENT_TOKEN = snap.data();

    document.getElementById("tradeName").innerText =
        `${CURRENT_TOKEN.name} (${CURRENT_TOKEN.ticker})`;

    document.getElementById("tradePrice").innerText =
        `Price: ${CURRENT_TOKEN.price.toFixed(12)} USDT`;

    document.getElementById("tradeMC").innerText =
        `Market Cap: ${Math.floor(CURRENT_TOKEN.mc)} USD`;

    document.getElementById("tradePanel").classList.remove("hidden");
}

function closeTradePanel() {
    document.getElementById("tradePanel").classList.add("hidden");
}


// --- BUY TOKEN ---
async function buyToken() {
    let amount = parseFloat(document.getElementById("buyAmount").value);

    if (amount <= 0 || isNaN(amount)) return alert("Invalid amount");

    if (USER_BALANCE < amount) return alert("Not enough USDT");

    // FEES (1% like pumpfun)
    let fee = amount * 0.01;
    let net = amount - fee;

    let t = CURRENT_TOKEN;

    let tokensReceived = net / t.price;

    // Update user balance
    USER_BALANCE -= amount;
    await db.collection("users").doc(USER_ID).update({ balance: USER_BALANCE });

    // Update portfolio
    if (!USER_PORTFOLIO[t.id]) {
        USER_PORTFOLIO[t.id] = { amount: 0, invest: 0 };
    }

    USER_PORTFOLIO[t.id].amount += tokensReceived;
    USER_PORTFOLIO[t.id].invest += amount;

    await db.collection("users").doc(USER_ID).update({ portfolio: USER_PORTFOLIO });

    // Update liquidity + price
    t.liquidity += net;
    t.mc = t.liquidity;
    t.price = t.liquidity / t.supply;
    t.buys++;

    await tokenRef.doc(t.id).update(t);

    alert("Buy successful!");
    closeTradePanel();
    loadUser();
    loadMarketTokens();
}


// --- SELL TOKEN ---
async function sellToken() {
    let percent = parseFloat(document.getElementById("sellAmount").value);
    if (percent <= 0 || percent > 100) return alert("Enter % between 1 and 100");

    let t = CURRENT_TOKEN;

    if (!USER_PORTFOLIO[t.id]) return alert("You don't own this token");

    let hold = USER_PORTFOLIO[t.id].amount;
    let sellAmountTokens = hold * (percent / 100);

    if (sellAmountTokens <= 0) return alert("Nothing to sell");

    let usdtValue = sellAmountTokens * t.price;

    // Fee (1%)
    let fee = usdtValue * 0.01;
    let net = usdtValue - fee;

    // Update portfolio
    USER_PORTFOLIO[t.id].amount -= sellAmountTokens;
    if (USER_PORTFOLIO[t.id].amount <= 0) delete USER_PORTFOLIO[t.id];

    await db.collection("users").doc(USER_ID).update({ portfolio: USER_PORTFOLIO });

    // Update user balance
    USER_BALANCE += net;
    await db.collection("users").doc(USER_ID).update({ balance: USER_BALANCE });

    // Update token price
    t.liquidity -= net;
    if (t.liquidity < 0) t.liquidity = 0;

    t.mc = t.liquidity;
    t.price = t.liquidity / t.supply;
    t.sells++;

    await tokenRef.doc(t.id).update(t);

    alert("Sell successful!");
    closeTradePanel();
    loadUser();
    loadMarketTokens();
}


/* --- PART 3 COMPLETE --- */

/* ------------------------------
   PART 4 — FAST BOT ENGINE (20–40s)
--------------------------------*/

// RANDOM HELPERS
function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function chance(p) {
    return Math.random() < p;
}

// MAIN BOT LOOP
async function runBots() {
    let snap = await tokenRef.get();

    snap.forEach(async doc => {
        let t = doc.data();

        // Skip tokens below MC 2000 (dead tokens)
        if (t.mc < 2000) return;

        // RANDOM SMALL BUY
        if (chance(0.30)) { // 30% chance
            let amount = rand(20, 120);  // small buys
            processBotBuy(t, amount);
        }

        // RANDOM SMALL SELL
        if (chance(0.20)) { // 20% chance
            let amount = rand(15, 90);
            processBotSell(t, amount);
        }

        // RANDOM WHALE BUY (BIG PUMP)
        if (chance(0.05)) { // 5% chance
            let amount = rand(300, 1200);
            processBotBuy(t, amount, true);
        }

        // RANDOM WHALE DUMP
        if (chance(0.03)) { // 3% chance
            let amount = rand(250, 900);
            processBotSell(t, amount, true);
        }

    });

    // WAIT 20–40 seconds then repeat
    let wait = rand(20000, 40000);
    console.log("Bots sleeping for", Math.floor(wait/1000), "seconds");
    setTimeout(runBots, wait);
}



// --- BOT BUY FUNCTION ---
async function processBotBuy(t, amount, whale = false) {

    let fee = amount * 0.01;
    let net = amount - fee;

    // Increase liquidity
    t.liquidity += net;
    t.mc = t.liquidity;

    t.price = t.liquidity / t.supply;
    t.buys++;

    if (whale) console.log("🐋 WHALE BUY on", t.ticker, amount);

    await tokenRef.doc(t.id).update(t);
}



// --- BOT SELL FUNCTION ---
async function processBotSell(t, amount, whale = false) {

    let fee = amount * 0.01;
    let net = amount - fee;

    // Liquidity goes DOWN
    t.liquidity -= net;
    if (t.liquidity < 0) t.liquidity = 0;

    t.mc = t.liquidity;
    t.price = t.liquidity / t.supply;
    t.sells++;

    if (whale) console.log("🐋 WHALE DUMP on", t.ticker, amount);

    await tokenRef.doc(t.id).update(t);
}



// START BOTS
setTimeout(runBots, 5000); // wait 5 sec after page load
