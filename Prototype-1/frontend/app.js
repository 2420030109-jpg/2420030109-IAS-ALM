const API = "http://127.0.0.1:5000/api";
let lastSdesCipherHex = "";

async function call(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  return res.json();
}
async function getCall(path) {
  const res = await fetch(API + path, { credentials: "include" });
  return res.json();
}

// ---------- auth ----------
async function doRegister() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const r = await call("/auth/register", { username, password });
  document.getElementById("authMsg").innerText = r.message;
  if (r.success) doLogin();
}
async function doLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const r = await call("/auth/login", { username, password });
  document.getElementById("authMsg").innerText = r.message;
  if (r.success) {
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("tabs").classList.remove("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("whoami").innerText = "Logged in as " + r.data.username;
    document.getElementById("logoutBtn").classList.remove("hidden");
  }
}
document.getElementById("logoutBtn").onclick = async () => {
  await call("/auth/logout");
  location.reload();
};

// ---------- tabs ----------
document.querySelectorAll("nav button").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll("nav button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.remove("hidden");
  };
});

// ---------- classical ----------
async function runCaesar() {
  const text = document.getElementById("caesarText").value;
  const shift = document.getElementById("caesarShift").value;
  const r = await call("/classical/caesar", { text, shift });
  document.getElementById("caesarOut").innerText = JSON.stringify(r.data, null, 2);
}
async function runPlayfair() {
  const text = document.getElementById("pfText").value;
  const key = document.getElementById("pfKey").value;
  const r = await call("/classical/playfair", { text, key });
  document.getElementById("pfOut").innerText = JSON.stringify(r.data, null, 2);
}

// ---------- s-des ----------
async function runSdes() {
  const text = document.getElementById("sdesText").value;
  const key = document.getElementById("sdesKey").value;
  const r = await call("/sdes/encrypt", { text, key });
  document.getElementById("sdesOut").innerText = JSON.stringify(r.data, null, 2);
  if (r.success) lastSdesCipherHex = r.data.ciphertext_hex;
}

// ---------- crypto engine ----------
async function runEngine() {
  const algorithm = document.getElementById("engAlgo").value;
  const mode = document.getElementById("engMode").value;
  const text = document.getElementById("engText").value;
  const key_hex = document.getElementById("engKey").value;
  const r = await call("/crypto/encrypt", { algorithm, mode, text, key_hex });
  document.getElementById("engOut").innerText = JSON.stringify(r.data || r, null, 2);
}

// ---------- modes ----------
async function runModesCompare() {
  const text = document.getElementById("modesText").value;
  const key_hex = document.getElementById("modesKey").value;
  const r = await call("/modes/compare", { algorithm: "aes256", text, key_hex });
  document.getElementById("modesOut").innerText = JSON.stringify(r.data || r, null, 2);
}

// ---------- prng ----------
async function runLcg() {
  const seed = document.getElementById("lcgSeed").value;
  const n = document.getElementById("lcgN").value;
  const r = await call("/prng/lcg", { seed, n });
  document.getElementById("lcgOut").innerText = JSON.stringify(r.data, null, 2);
}
async function runBbs() {
  const seed = document.getElementById("bbsSeed").value;
  const n = document.getElementById("bbsN").value;
  const r = await call("/prng/bbs", { seed, n });
  document.getElementById("bbsOut").innerText = JSON.stringify(r.data, null, 2);
}
async function runAnsi() {
  const r = await call("/prng/ansi", {});
  document.getElementById("ansiOut").innerText = JSON.stringify(r.data || r, null, 2);
}

// ---------- attacks ----------
async function runBruteForce() {
  const known_first_plain_byte = document.getElementById("bfKnownByte").value;
  const r = await call("/attack/bruteforce", {
    ciphertext_hex: lastSdesCipherHex,
    known_first_plain_byte,
  });
  document.getElementById("bfOut").innerText = JSON.stringify(r.data || r, null, 2);
}
async function runEcbLeak() {
  const r = await call("/attack/ecb-leakage", { length: 256, pattern_byte: 65 });
  document.getElementById("ecbOut").innerText = JSON.stringify(r.data || r, null, 2);
}

// ---------- history ----------
async function loadHistory() {
  const r = await getCall("/runs");
  document.getElementById("historyOut").innerText = JSON.stringify(r.data || r, null, 2);
}
