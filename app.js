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
