/* FIREBASE INIT */
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

/* TELEGRAM INIT */
let tg = window.Telegram.WebApp;
tg.expand();

let USER_ID = tg.initDataUnsafe?.user?.id || ("guest_" + Math.floor(Math.random()*999999));
document.getElementById("userId").innerText = "User: " + USER_ID;

let USER_BAL = 0;
let PORTFOLIO = {};

/* INIT USER */
async function initUser() {
    let ref = db.collection("users").doc(USER_ID);
    let snap = await ref.get();

    if (!snap.exists) {
        await ref.set({
            balance: 10000,
            portfolio: {},
            lastDaily: 0
        });
    }

    loadUser();
}
initUser();

/* LOAD USER */
async function loadUser() {
    let ref = db.collection("users").doc(USER_ID);
    let data = (await ref.get()).data();

    USER_BAL = data.balance;
    PORTFOLIO = data.portfolio || {};

    document.getElementById("userBalance").innerText =
        "Balance: " + USER_BAL.toLocaleString() + " USDT";

    loadPortfolio();
}

/* SWITCH TABS */
function openTab(id) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}
openTab("market");

/* LOAD PORTFOLIO */
function loadPortfolio() {
    let box = document.getElementById("portfolioList");
    box.innerHTML = "";

    Object.keys(PORTFOLIO).forEach(tid => {
        let p = PORTFOLIO[tid];

        box.innerHTML += `
        <div class="card">
            <b>${tid}</b><br>
            Amount: ${p.amount.toFixed(2)}<br>
            Invested: ${p.invest}
        </div>`;
    });
}

/* CREATE TOKEN */
async function createToken() {
    let name = tokenName.value.trim();
    let ticker = tokenTicker.value.trim().toUpperCase();
    let img = tokenImg.value.trim();
    let preBuy = parseInt(preBuy.value);

    if (!name || !ticker || !img) return alert("Fill all fields!");
    if (USER_BAL < 2000) return alert("Need 2000 USDT");

    USER_BAL -= 2000;

    await db.collection("users").doc(USER_ID).update({
        balance: USER_BAL
    });

    let supply = 1_000_000_000;
    let liquidity = 4000 + preBuy;
    let price = liquidity / supply;

    let id = Date.now().toString();

    await db.collection("tokens").doc(id).set({
        id,
        name,
        ticker,
        img,
        supply,
        liquidity,
        price,
        created: Date.now(),
        buys: 0,
        sells: 0,
        mc: liquidity
    });

    alert("Token Launched!");
    loadMarket();
}

/* LOAD MARKET */
async function loadMarket() {
    let snap = await db.collection("tokens").orderBy("created", "desc").get();

    let list = document.getElementById("marketList");
    list.innerHTML = "";

    snap.forEach(doc => {
        let t = doc.data();

        list.innerHTML += `
        <div class="card">
            <img src="${t.img}" width="50">
            <b>${t.name} (${t.ticker})</b><br>
            Price: ${t.price.toFixed(12)}<br>
            MC: ${t.mc}<br>
        </div>`;
    });
}
loadMarket();

/* DAILY BONUS */
async function claimDaily() {
    let ref = db.collection("users").doc(USER_ID);
    let data = (await ref.get()).data();

    let now = Date.now();

    if (now - data.lastDaily < 24*60*60*1000) return alert("Come back later!");

    USER_BAL += 500;

    await ref.update({
        balance: USER_BAL,
        lastDaily: now
    });

    document.getElementById("userBalance").innerText =
        "Balance: " + USER_BAL + " USDT";

    alert("Claimed 500 USDT!");
}
