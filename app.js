const STORAGE_KEY = "partner-rep-map-v1";
const WARM_DAYS = 90;

const CITY_COORDS = {
  "denver|co": [39.7392, -104.9903],
  "dallas|tx": [32.7767, -96.797],
  "austin|tx": [30.2672, -97.7431],
  "houston|tx": [29.7604, -95.3698],
  "atlanta|ga": [33.749, -84.388],
  "phoenix|az": [33.4484, -112.074],
  "chicago|il": [41.8781, -87.6298],
  "seattle|wa": [47.6062, -122.3321],
  "boston|ma": [42.3601, -71.0589],
  "kansas city|mo": [39.0997, -94.5786],
  "minneapolis|mn": [44.9778, -93.265],
  "charlotte|nc": [35.2271, -80.8431],
  "irvine|ca": [33.6846, -117.8265],
  "los angeles|ca": [34.0522, -118.2437],
  "san francisco|ca": [37.7749, -122.4194],
  "san diego|ca": [32.7157, -117.1611],
  "san jose|ca": [37.3382, -121.8863],
  "nashville|tn": [36.1627, -86.7816],
  "orlando|fl": [28.5383, -81.3792],
  "miami|fl": [25.7617, -80.1918],
  "tampa|fl": [27.9506, -82.4572],
  "portland|or": [45.5152, -122.6784],
  "new york|ny": [40.7128, -74.006],
  "nyc|ny": [40.7128, -74.006],
  "philadelphia|pa": [39.9526, -75.1652],
  "pittsburgh|pa": [40.4406, -79.9959],
  "detroit|mi": [42.3314, -83.0458],
  "columbus|oh": [39.9612, -82.9988],
  "cleveland|oh": [41.4993, -81.6944],
  "indianapolis|in": [39.7684, -86.1581],
  "st louis|mo": [38.627, -90.1994],
  "st. louis|mo": [38.627, -90.1994],
  "salt lake city|ut": [40.7608, -111.891],
  "las vegas|nv": [36.1699, -115.1398],
  "albuquerque|nm": [35.0844, -106.6504],
  "oklahoma city|ok": [35.4676, -97.5164],
  "omaha|ne": [41.2565, -95.9345],
  "milwaukee|wi": [43.0389, -87.9065],
  "baltimore|md": [39.2904, -76.6122],
  "washington|dc": [38.9072, -77.0369],
  "richmond|va": [37.5407, -77.436],
  "raleigh|nc": [35.7796, -78.6382],
  "charleston|sc": [32.7765, -79.9311],
  "new orleans|la": [29.9511, -90.0715],
  "birmingham|al": [33.5186, -86.8104],
  "louisville|ky": [38.2527, -85.7585],
  "memphis|tn": [35.1495, -90.049],
  "boise|id": [43.615, -116.2023],
  "anchorage|ak": [61.2181, -149.9003],
  "honolulu|hi": [21.3069, -157.8583],
  "laguna niguel|ca": [33.5225, -117.7076],
  "irvine ca|ca": [33.6846, -117.8265]
};

const state = {
  accounts: [],
  people: [],
  selectedAccountId: "acc-pellera",
  viewMode: "one", // one | multi
  selectedMulti: new Set(),
  statusFilter: "all",
  selectedPersonId: null,
  map: null,
  markers: [],
  layer: null
};

function daysSince(dateStr) {
  if (!dateStr) return 9999;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return 9999;
  return Math.floor((Date.now() - t) / 86400000);
}

function statusOf(person) {
  if (person.champion) return "champion";
  return daysSince(person.lastTouch) <= WARM_DAYS ? "warm" : "cold";
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state.accounts = parsed.accounts || [];
      state.people = parsed.people || [];
      state.selectedAccountId = parsed.selectedAccountId || (state.accounts[0] && state.accounts[0].id);
      return;
    } catch (e) {}
  }
  resetSample();
}

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accounts: state.accounts,
      people: state.people,
      selectedAccountId: state.selectedAccountId
    })
  );
}

function resetSample() {
  const seed = window.SAMPLE_DATA;
  state.accounts = JSON.parse(JSON.stringify(seed.accounts));
  state.people = JSON.parse(JSON.stringify(seed.people));
  state.selectedAccountId = "acc-pellera";
  save();
}

function visibleAccounts() {
  if (state.viewMode === "one") {
    return state.accounts.filter((a) => a.id === state.selectedAccountId);
  }
  if (state.selectedMulti.size === 0) return state.accounts;
  return state.accounts.filter((a) => state.selectedMulti.has(a.id));
}

function visiblePeople() {
  const ids = new Set(visibleAccounts().map((a) => a.id));
  return state.people
    .filter((p) => ids.has(p.accountId))
    .filter((p) => state.statusFilter === "all" || statusOf(p) === state.statusFilter);
}

function rankPeople(list) {
  const rank = { champion: 0, warm: 1, cold: 2 };
  return [...list].sort((a, b) => {
    const sa = statusOf(a);
    const sb = statusOf(b);
    if (rank[sa] !== rank[sb]) return rank[sa] - rank[sb];
    return daysSince(a.lastTouch) - daysSince(b.lastTouch);
  });
}

function accountName(id) {
  const a = state.accounts.find((x) => x.id === id);
  return a ? a.name : "Unknown";
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.display = "none"), 1800);
}

function renderAccountSelect() {
  const sel = document.getElementById("accountSelect");
  sel.innerHTML = "";
  state.accounts.forEach((a) => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.name;
    sel.appendChild(opt);
  });
  if (!state.accounts.some((a) => a.id === state.selectedAccountId) && state.accounts[0]) {
    state.selectedAccountId = state.accounts[0].id;
  }
  sel.value = state.selectedAccountId || "";
  document.getElementById("viewMode").value = state.viewMode;
  sel.disabled = state.viewMode !== "one";
}

function renderList() {
  const ranked = rankPeople(visiblePeople());
  const counts = { champion: 0, warm: 0, cold: 0 };
  visiblePeople().forEach((p) => counts[statusOf(p)]++);
  const acctLabel =
    state.viewMode === "one"
      ? accountName(state.selectedAccountId)
      : state.selectedMulti.size
        ? `${state.selectedMulti.size} accounts`
        : "All accounts";
  document.getElementById("sheetTitle").textContent = acctLabel;
  document.getElementById("sheetCounts").textContent =
    `${ranked.length} reps · ${counts.champion} champ · ${counts.warm} warm · ${counts.cold} cold`;

  const list = document.getElementById("list");
  list.innerHTML = "";
  ranked.forEach((p, i) => {
    const st = statusOf(p);
    const row = document.createElement("div");
    row.className = "person" + (p.id === state.selectedPersonId ? " active" : "");
    row.setAttribute("role", "button");
    row.innerHTML = `
      <div class="dot ${st}"></div>
      <div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="meta">${escapeHtml(p.title)} · ${escapeHtml(p.city)}, ${escapeHtml(p.state)} · ${escapeHtml(accountName(p.accountId))}</div>
        <div class="status-tag ${st}">${st}${st !== "champion" && p.lastTouch ? " · last touch " + p.lastTouch : ""}</div>
      </div>
      <div class="rank">#${i + 1}</div>`;
    row.addEventListener("click", () => focusPerson(p.id, true));
    row.addEventListener("dblclick", () => openPersonEditor(p.id));
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "ghost";
    edit.style.cssText = "flex:0;padding:6px 8px;font-size:11px;margin-left:6px";
    edit.textContent = "Edit";
    edit.addEventListener("click", (e) => {
      e.stopPropagation();
      openPersonEditor(p.id);
    });
    row.appendChild(edit);
    list.appendChild(row);
  });
  if (!ranked.length) {
    list.innerHTML = `<div class="person"><div></div><div class="meta">No reps match this view. Add a person or change filters.</div></div>`;
  }
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function clearMarkers() {
  if (state.layer) state.layer.clearLayers();
  state.markers = [];
}

function addMarkers() {
  clearMarkers();
  const ranked = rankPeople(visiblePeople());
  ranked.forEach((p) => {
    if (p.lat == null || p.lng == null) return;
    const st = statusOf(p);
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin ${st}"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    const m = L.marker([p.lat, p.lng], { icon, title: p.name });
    m.bindPopup(`
      <div class="popup-card">
        <b>${escapeHtml(p.name)}</b>
        ${escapeHtml(p.title)}<br>
        ${escapeHtml(p.city)}, ${escapeHtml(p.state)}<br>
        ${escapeHtml(accountName(p.accountId))}<br>
        <span class="status-tag ${st}">${st}</span>
      </div>`);
    m.on("click", () => focusPerson(p.id, false));
    state.layer.addLayer(m);
    state.markers.push({ id: p.id, marker: m });
  });
}

function focusPerson(id, pan) {
  state.selectedPersonId = id;
  renderList();
  const found = state.markers.find((x) => x.id === id);
  if (found) {
    if (pan) state.map.setView(found.marker.getLatLng(), Math.max(state.map.getZoom(), 7), { animate: true });
    found.marker.openPopup();
  }
}

function fitVisible() {
  const pts = visiblePeople().filter((p) => p.lat != null);
  if (!pts.length) {
    state.map.setView([39.8, -98.5], 4);
    return;
  }
  const b = L.latLngBounds(pts.map((p) => [p.lat, p.lng]));
  state.map.fitBounds(b.pad(0.25));
}

function refresh() {
  renderAccountSelect();
  renderList();
  addMarkers();
}

function lookupCoords(city, stateCode) {
  const key = `${(city || "").trim().toLowerCase()}|${(stateCode || "").trim().toLowerCase()}`;
  if (CITY_COORDS[key]) return { lat: CITY_COORDS[key][0], lng: CITY_COORDS[key][1] };
  return null;
}

async function geocode(city, stateCode) {
  const local = lookupCoords(city, stateCode);
  if (local) return local;
  const q = encodeURIComponent(`${city}, ${stateCode}, USA`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const json = await res.json();
  if (json && json[0]) return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
  throw new Error("Could not find that city. Try a larger nearby city.");
}

function openModal(id) {
  document.getElementById(id).classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
  document.body.style.overflow = "hidden";
}
function openPersonEditor(id) {
  const p = state.people.find((x) => x.id === id);
  if (!p) return;
  fillAccountOptions("personAccount", p.accountId);
  document.getElementById("personName").value = p.name;
  document.getElementById("personTitle").value = p.title || "";
  document.getElementById("personCity").value = p.city || "";
  document.getElementById("personState").value = p.state || "";
  document.getElementById("personTouch").value = p.lastTouch || "";
  document.getElementById("personChampion").checked = !!p.champion;
  document.getElementById("personModal").dataset.editId = p.id;
  document.getElementById("personModalTitle").textContent = "Update rep";
  openModal("personModal");
}

function fillAccountOptions(selectId, selected) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = state.accounts.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join("");
  if (selected) sel.value = selected;
}

function uid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 9);
}

function initMap() {
  state.map = L.map("map", { zoomControl: false, attributionControl: true });
  L.control.zoom({ position: "bottomleft" }).addTo(state.map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);
  state.layer = L.layerGroup().addTo(state.map);
  state.map.setView([39.8, -98.5], 4);
}

function bindUi() {
  document.getElementById("accountSelect").addEventListener("change", (e) => {
    state.selectedAccountId = e.target.value;
    save();
    refresh();
    fitVisible();
  });
  document.getElementById("viewMode").addEventListener("change", (e) => {
    state.viewMode = e.target.value;
    refresh();
    fitVisible();
  });
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.statusFilter = btn.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("on", b === btn));
      refresh();
    });
  });
  document.getElementById("addAccountBtn").addEventListener("click", () => {
    document.getElementById("newAccountName").value = "";
    openModal("accountModal");
  });
  document.getElementById("addPersonBtn").addEventListener("click", () => {
    fillAccountOptions("personAccount", state.selectedAccountId);
    document.getElementById("personName").value = "";
    document.getElementById("personTitle").value = "Account Executive";
    document.getElementById("personCity").value = "";
    document.getElementById("personState").value = "";
    document.getElementById("personTouch").value = new Date().toISOString().slice(0, 10);
    document.getElementById("personChampion").checked = false;
    document.getElementById("personModal").dataset.editId = "";
    document.getElementById("personModalTitle").textContent = "Add rep";
    openModal("personModal");
  });
  document.getElementById("fitBtn").addEventListener("click", fitVisible);
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Reload sample accounts? This replaces data saved on this phone.")) {
      resetSample();
      refresh();
      fitVisible();
      toast("Sample data restored");
    }
  });
  document.getElementById("saveAccount").addEventListener("click", () => {
    const name = document.getElementById("newAccountName").value.trim();
    if (!name) return toast("Account name required");
    const id = uid("acc");
    state.accounts.push({ id, name, type: "partner" });
    state.selectedAccountId = id;
    state.viewMode = "one";
    save();
    closeModal("accountModal");
    refresh();
    toast("Account added");
  });
  document.getElementById("savePerson").addEventListener("click", async () => {
    const name = document.getElementById("personName").value.trim();
    const title = document.getElementById("personTitle").value.trim() || "Account Executive";
    const city = document.getElementById("personCity").value.trim();
    const st = document.getElementById("personState").value.trim().toUpperCase();
    const accountId = document.getElementById("personAccount").value;
    const lastTouch = document.getElementById("personTouch").value;
    const champion = document.getElementById("personChampion").checked;
    if (!name || !city || !st) return toast("Name, city, and state required");
    const btn = document.getElementById("savePerson");
    btn.disabled = true;
    try {
      const coords = await geocode(city, st);
      const editId = document.getElementById("personModal").dataset.editId;
      if (editId) {
        const p = state.people.find((x) => x.id === editId);
        Object.assign(p, { name, title, city, state: st, accountId, lastTouch, champion, lat: coords.lat, lng: coords.lng });
      } else {
        state.people.push({
          id: uid("p"),
          accountId,
          name,
          title,
          city,
          state: st,
          lastTouch,
          champion,
          lat: coords.lat,
          lng: coords.lng
        });
      }
      save();
      closeModal("personModal");
      refresh();
      toast(editId ? "Rep updated" : "Rep added");
    } catch (err) {
      toast(err.message || "Geocode failed");
    } finally {
      btn.disabled = false;
    }
  });
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => closeModal(b.dataset.close))
  );
}

function init() {
  load();
  initMap();
  bindUi();
  refresh();
  setTimeout(fitVisible, 250);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
