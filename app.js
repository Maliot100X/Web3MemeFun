// ---------- FIREBASE INIT ----------
const firebaseConfig = {
  apiKey: "AIzaSyDwyviB0cz-dudEuihPWze9cAkLa58WeZs",
  authDomain: "web3memefun.firebaseapp.com",
  projectId: "web3memefun",
  storageBucket: "web3memefun.firebasestorage.app",
  messagingSenderId: "227343388230",
  appId: "1:227343388230:web:617c118813d1136958c447"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---------- USER INIT (TELEGRAM OR BROWSER) ----------
let tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
let USER_ID;

if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
  USER_ID = "tg_" + tg.initDataUnsafe.user.id;
  tg.expand();
} else {
  USER_ID = localStorage.getItem("w3_user");
  if (!USER_ID) {
    USER_ID = "guest_" + Math.floor(Math.random() * 1e9);
    localStorage.setItem("w3_user", USER_ID);
  }
}

document.getElementById("userId").innerText = "User: " + USER_ID;

let USER_BAL = 0;
let PORTFOLIO = {};
let CURRENT_TOKEN = null;

// ---------- INIT USER DOC ----------
async function initUser() {
  const ref = db.collection("users").doc(USER_ID);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      balance: 10000,
      portfolio: {},
      lastDaily: 0
    });
  }

  await loadUser();
  await ensureDemoTokens();
  await loadMarket();
}
initUser();

// ---------- LOAD USER ----------
async function loadUser() {
  const ref = db.collection("users").doc(USER_ID);
  const snap = await ref.get();
  const data = snap.data();

  USER_BAL = data.balance;
  PORTFOLIO = data.portfolio || {};

  document.getElementById("userBalance").innerText =
    "Balance: " + USER_BAL.toLocaleString() + " USDT";

  loadPortfolio();
}

// ---------- TABS ----------
function openTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ---------- DEMO TOKENS (SO MARKET IS NEVER EMPTY) ----------
async function ensureDemoTokens() {
  const snap = await db.collection("tokens").limit(1).get();
  if (!snap.empty) return;

  const demo = [
    {
      name: "DOGEJESUS",
      ticker: "DJS",
      img: "https://i.imgur.com/0Z8FQJm.png",
      mc: 5000
    },
    {
      name: "CATGOD",
      ticker: "CAT",
      img: "https://i.imgur.com/Xg5Ww1S.png",
      mc: 8000
    },
    {
      name: "MALIOTCOIN",
      ticker: "MAL",
      img: "https://i.imgur.com/eZz5f8M.png",
      mc: 12000
    }
  ];

  for (let d of demo) {
    let supply = 1_000_000_000;
    let liquidity = d.mc;
    let price = liquidity / supply;
    let id = "demo_" + d.ticker;

    await db.collection("tokens").doc(id).set({
      id,
      name: d.name,
      ticker: d.ticker,
      img: d.img,
      supply,
      liquidity,
      price,
      mc: liquidity,
      created: Date.now(),
      buys: 0,
      sells: 0
    });
  }
}

// ---------- CREATE TOKEN ----------
async function createToken() {
  const name = document.getElementById("tokenName").value.trim();
  const ticker = document.getElementById("tokenTicker").value.trim().toUpperCase();
  const img = document.getElementById("tokenImg").value.trim();
  const pre = parseFloat(document.getElementById("preBuy").value) || 0;

  if (!name || !ticker || !img) {
    alert("Fill all fields.");
    return;
  }

  if (USER_BAL < 2000) {
    alert("You need at least 2000 USDT to launch.");
    return;
  }

  // Deduct launch cost
  USER_BAL -= 2000;
  await db.collection("users").doc(USER_ID).update({ balance: USER_BAL });

  const supply = 1_000_000_000;
  let liquidity = 4000 + pre;
  let price = liquidity / supply;
  const id = Date.now().toString();

  await db.collection("tokens").doc(id).set({
    id,
    name,
    ticker,
    img,
    supply,
    liquidity,
    price,
    mc: liquidity,
    created: Date.now(),
    buys: 0,
    sells: 0
  });

  // Optional: pre-buy
  if (pre > 0) {
    const tokens = pre / price;

    if (!PORTFOLIO[id]) {
      PORTFOLIO[id] = { amount: 0, invest: 0 };
    }

    PORTFOLIO[id].amount += tokens;
    PORTFOLIO[id].invest += pre;

    await db.collection("users").doc(USER_ID).update({
      portfolio: PORTFOLIO
    });
  }

  alert("🚀 Token launched!");
  await loadUser();
  await loadMarket();
}

// ---------- LOAD MARKET ----------
async function loadMarket() {
  const snap = await db.collection("tokens").orderBy("mc", "desc").get();
  const list = document.getElementById("marketList");
  list.innerHTML = "";

  snap.forEach(doc => {
    const t = doc.data();
    const width = Math.min(100, Math.max(5, t.mc / 200)); // simple bar

    list.innerHTML += `
      <div class="card">
        <img src="${t.img}" width="40" height="40" />
        <div class="market-info">
          <b>${t.name} (${t.ticker})</b><br/>
          <span class="price-text">
            Price: ${t.price.toFixed(12)} USDT<br/>
            MC: ${Math.floor(t.mc).toLocaleString()} USDT
          </span>
          <div class="mc-bar" style="width:${width}%"></div>
        </div>
        <div>
          <button onclick="openTrade('${t.id}')">Trade</button>
        </div>
      </div>
    `;
  });
}

// ---------- PORTFOLIO ----------
async function loadPortfolio() {
  const box = document.getElementById("portfolioList");
  box.innerHTML = "";

  let totalValue = 0;

  const ids = Object.keys(PORTFOLIO);
  if (ids.length === 0) {
    box.innerHTML = "<p>No tokens yet.</p>";
    return;
  }

  for (let tid of ids) {
    const snap = await db.collection("tokens").doc(tid).get();
    if (!snap.exists) continue;
    const t = snap.data();

    const hold = PORTFOLIO[tid].amount;
    const value = hold * t.price;
    totalValue += value;

    box.innerHTML += `
      <div class="card">
        <b>${t.name} (${t.ticker})</b><br/>
        Amount: ${hold.toFixed(2)}<br/>
        Value: ${value.toFixed(2)} USDT
      </div>
    `;
  }

  box.innerHTML += `
    <div class="card">
      <b>Total portfolio value:</b> ${totalValue.toFixed(2)} USDT
    </div>
  `;
}

// ---------- DAILY BONUS ----------
async function claimDaily() {
  const ref = db.collection("users").doc(USER_ID);
  const snap = await ref.get();
  const data = snap.data();

  const now = Date.now();
  if (now - data.lastDaily < 24 * 60 * 60 * 1000) {
    alert("Already claimed. Come back later.");
    return;
  }

  USER_BAL += 500;

  await ref.update({
    balance: USER_BAL,
    lastDaily: now
  });

  await loadUser();
  alert("Claimed 500 USDT!");
}

// ---------- TRADE PANEL ----------
async function openTrade(id) {
  const snap = await db.collection("tokens").doc(id).get();
  if (!snap.exists) return alert("Token not found");
  CURRENT_TOKEN = snap.data();

  document.getElementById("tradeTitle").innerText =
    `${CURRENT_TOKEN.name} (${CURRENT_TOKEN.ticker})`;

  document.getElementById("tradePrice").innerText =
    `Price: ${CURRENT_TOKEN.price.toFixed(12)} USDT`;

  document.getElementById("tradeMC").innerText =
    `MC: ${Math.floor(CURRENT_TOKEN.mc)} USDT`;

  document.getElementById("buyAmount").value = "";
  document.getElementById("sellPercent").value = "";

  document.getElementById("tradePanel").classList.remove("hidden");
}

function closeTrade() {
  document.getElementById("tradePanel").classList.add("hidden");
  CURRENT_TOKEN = null;
}

// ---------- BUY ----------
async function buyToken() {
  if (!CURRENT_TOKEN) return;
  const amt = parseFloat(document.getElementById("buyAmount").value);
  if (!amt || amt <= 0) return alert("Invalid amount");
  if (amt > USER_BAL) return alert("Not enough balance");

  // fee 1%
  const fee = amt * 0.01;
  const net = amt - fee;

  const tokenRef = db.collection("tokens").doc(CURRENT_TOKEN.id);
  const snap = await tokenRef.get();
  const t = snap.data();

  const tokens = net / t.price;

  USER_BAL -= amt;
  await db.collection("users").doc(USER_ID).update({ balance: USER_BAL });

  if (!PORTFOLIO[t.id]) {
    PORTFOLIO[t.id] = { amount: 0, invest: 0 };
  }
  PORTFOLIO[t.id].amount += tokens;
  PORTFOLIO[t.id].invest += amt;

  await db.collection("users").doc(USER_ID).update({ portfolio: PORTFOLIO });

  t.liquidity += net;
  t.mc = t.liquidity;
  t.price = t.liquidity / t.supply;
  t.buys++;

  await tokenRef.update(t);

  await loadUser();
  await loadMarket();
  alert("Buy success!");
  closeTrade();
}

// ---------- SELL ----------
async function sellToken() {
  if (!CURRENT_TOKEN) return;
  const percent = parseFloat(document.getElementById("sellPercent").value);
  if (!percent || percent <= 0 || percent > 100) {
    return alert("Enter % between 1 and 100");
  }

  const tokenRef = db.collection("tokens").doc(CURRENT_TOKEN.id);
  const snap = await tokenRef.get();
  const t = snap.data();

  if (!PORTFOLIO[t.id] || PORTFOLIO[t.id].amount <= 0) {
    return alert("You have no tokens.");
  }

  const hold = PORTFOLIO[t.id].amount;
  const sellAmount = hold * (percent / 100);
  const value = sellAmount * t.price;

  const fee = value * 0.01;
  const net = value - fee;

  PORTFOLIO[t.id].amount -= sellAmount;
  if (PORTFOLIO[t.id].amount <= 0) {
    delete PORTFOLIO[t.id];
  }

  await db.collection("users").doc(USER_ID).update({ portfolio: PORTFOLIO });

  USER_BAL += net;
  await db.collection("users").doc(USER_ID).update({ balance: USER_BAL });

  t.liquidity -= net;
  if (t.liquidity < 0) t.liquidity = 0;
  t.mc = t.liquidity;
  t.price = t.liquidity / t.supply;
  t.sells++;

  await tokenRef.update(t);

  await loadUser();
  await loadMarket();
  alert("Sell success!");
  closeTrade();
}

// ---------- SIMPLE BOT (PUMP / DUMP RANDOMLY) ----------
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

async function runBots() {
  const snap = await db.collection("tokens").get();

  snap.forEach(async doc => {
    let t = doc.data();

    // Skip tiny tokens
    if (t.mc < 2000) return;

    // random small pump
    if (Math.random() < 0.35) {
      let amount = rand(20, 150);
      t.liquidity += amount;
      t.mc = t.liquidity;
      t.price = t.liquidity / t.supply;
      t.buys++;
      await db.collection("tokens").doc(t.id).update(t);
    }

    // random small dump
    if (Math.random() < 0.2) {
      let amount = rand(15, 100);
      t.liquidity -= amount;
      if (t.liquidity < 0) t.liquidity = 0;
      t.mc = t.liquidity;
      t.price = t.liquidity / t.supply;
      t.sells++;
      await db.collection("tokens").doc(t.id).update(t);
    }
  });

  // refresh UI
  loadMarket();
  loadPortfolio();

  const wait = rand(12000, 22000); // 12–22 seconds
  setTimeout(runBots, wait);
}

// start bots after 5s
setTimeout(runBots, 5000);
