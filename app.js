/* ==========================
   FIREBASE CONFIG
=========================== */

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

/* ==========================
   USER INIT
=========================== */

let user = localStorage.getItem("w3_user");

if (!user) {
  user = "usr_" + Math.random().toString(36).substring(2);
  localStorage.setItem("w3_user", user);
  db.collection("users").doc(user).set({
    balance: 10000,
    lastDaily: 0
  });
}

document.getElementById("userid").innerText = "User: " + user;

/* ==========================
   LIVE BALANCE
=========================== */

db.collection("users").doc(user).onSnapshot(doc => {
  if (doc.exists) {
    document.getElementById("balance").innerText =
      "Balance: " + doc.data().balance + " USDT";
  }
});

/* ==========================
   DAILY BONUS
=========================== */

function claimDaily() {
  const now = Date.now();
  db.collection("users").doc(user).get().then(doc => {
    const last = doc.data().lastDaily || 0;

    if (now - last < 86400000) {
      alert("Already claimed today.");
      return;
    }

    db.collection("users").doc(user).update({
      balance: firebase.firestore.FieldValue.increment(1000),
      lastDaily: now
    });

    alert("Daily +1000 USDT!");
  });
}

/* ==========================
   OPEN TABS
=========================== */

function openTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ==========================
   CREATE TOKEN
=========================== */

function createToken() {
  db.collection("users").doc(user).get().then(doc => {
    const bal = doc.data().balance;

    if (bal < 2000) {
      alert("Not enough USDT");
      return;
    }

    const tokenId = "tkn_" + Math.random().toString(36).substring(2);

    db.collection("market").doc(tokenId).set({
      name: "Token " + tokenId.substring(4, 8),
      mc: 4000,
      supply: 1000000000,
      creator: user,
      created: Date.now()
    });

    db.collection("users").doc(user).update({
      balance: bal - 2000
    });

    alert("Token Launched!");
  });
}

/* ==========================
   MARKET LIST
=========================== */

db.collection("market").orderBy("mc", "desc").onSnapshot(snap => {
  let html = "";

  snap.forEach(doc => {
    const t = doc.data();
    html += `
      <div class="market-item">
        <b>${t.name}</b><br>
        MC: ${t.mc} USDT <br>
      </div>
    `;
  });

  document.getElementById("market-list").innerHTML = html;
});

/* ==========================
   TASK MARKET CHECK
=========================== */

function taskMarket() {
  db.collection("users").doc(user).update({
    balance: firebase.firestore.FieldValue.increment(200)
  });
  alert("Task complete +200 USDT!");
}
