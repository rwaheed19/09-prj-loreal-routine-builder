/* =====================================================================
   L'ORÉAL PRODUCT-AWARE ROUTINE BUILDER — script.js
   Beginner-friendly comments included throughout so every part of the
   flow is easy to follow.
===================================================================== */

/* ---------------------------------------------------------------------
   1) CONFIG
--------------------------------------------------------------------- */

// TODO: Add your Cloudflare Worker URL here (this is what keeps your
// OpenAI API key hidden from the browser). Example:
// const WORKER_URL = "https://loreal-routine.your-subdomain.workers.dev/";
const WORKER_URL = "https://chatbot-worker.rwaheed2.workers.dev/";

// The system prompt is what tells the AI *how* to behave. It only ever
// gets sent to the model — the user never sees it.
const SYSTEM_PROMPT = `You are the L'Oréal Smart Routine Advisor, a friendly and knowledgeable
beauty consultant for L'Oréal and its family of brands (CeraVe, La Roche-Posay,
Vichy, L'Oréal Paris, Maybelline, Lancôme, Garnier, Kiehl's, Kérastase,
SkinCeuticals, Urban Decay, Yves Saint Laurent, Redken, and similar brands).

When given a list of selected products (with name, brand, category, and
description), build a clear, personalized routine:
- Organize steps in the correct order of application (e.g. cleanse, treat,
  moisturize, protect) and note whether each step belongs in an AM or PM routine.
- Briefly explain *why* each product fits where it does.
- Keep the tone warm, encouraging, and easy to follow — like a helpful
  in-store advisor, not a medical professional.

After the routine is generated, continue the conversation naturally. Only
answer follow-up questions related to the generated routine, or to skincare,
haircare, makeup, fragrance, or general beauty topics. If a user asks about
something unrelated (e.g. homework help, coding, unrelated trivia), politely
steer the conversation back to beauty and routines.`;

const STORAGE_KEY = "lorealSelectedProductIds";

/* ---------------------------------------------------------------------
   2) DOM REFERENCES
--------------------------------------------------------------------- */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");

const selectedProductsList = document.getElementById("selectedProductsList");
const selectedCount = document.getElementById("selectedCount");
const clearAllBtn = document.getElementById("clearAllBtn");
const generateBtn = document.getElementById("generateRoutine");

const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const modal = document.getElementById("descriptionModal");
const modalImage = document.getElementById("modalImage");
const modalBrand = document.getElementById("modalBrand");
const modalProductName = document.getElementById("modalProductName");
const modalDescription = document.getElementById("modalDescription");
const modalSelectBtn = document.getElementById("modalSelectBtn");
const modalClose = document.getElementById("modalClose");

const rtlToggle = document.getElementById("rtlToggle");
const rtlToggleLabel = document.getElementById("rtlToggleLabel");

/* ---------------------------------------------------------------------
   3) STATE
--------------------------------------------------------------------- */
let allProducts = []; // every product loaded from products.json
let selectedIds = loadSelectedIdsFromStorage(); // Set of selected product ids
let conversationHistory = []; // { role: "system"|"user"|"assistant", content: "" }
let routineGenerated = false;
let currentModalProductId = null;

/* ---------------------------------------------------------------------
   4) LOAD PRODUCT DATA
--------------------------------------------------------------------- */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  renderGrid();
  renderSelected();
}

/* ---------------------------------------------------------------------
   5) LOCAL STORAGE HELPERS (Save Selected Products)
--------------------------------------------------------------------- */
function loadSelectedIdsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (err) {
    // If storage is corrupted or unavailable, just start fresh.
    return new Set();
  }
}

function saveSelectedIdsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedIds]));
}

/* ---------------------------------------------------------------------
   6) FILTERING (category dropdown + search field work together)
--------------------------------------------------------------------- */
function getFilteredProducts() {
  const category = categoryFilter.value;
  const query = productSearch.value.trim().toLowerCase();

  return allProducts.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
}

/* ---------------------------------------------------------------------
   7) RENDER: PRODUCT GRID
--------------------------------------------------------------------- */
function renderGrid() {
  const filtered = getFilteredProducts();

  if (filtered.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products match your search. Try a different keyword or category.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = filtered
    .map((product) => {
      const isSelected = selectedIds.has(product.id);
      return `
        <div class="product-card ${isSelected ? "selected" : ""}" data-id="${product.id}">
          <span class="card-select-badge"><i class="fa-solid fa-check"></i></span>
          <img src="${product.image}" alt="${product.name}" data-action="info" />
          <p class="card-brand">${product.brand}</p>
          <h3 data-action="info">${product.name}</h3>
          <div class="card-actions">
            <button class="select-toggle-btn" data-action="toggle">
              ${isSelected ? "Selected" : "Select"}
            </button>
            <button class="info-btn" data-action="info" aria-label="View description">
              <i class="fa-solid fa-info"></i>
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// One click listener on the container handles every card (event delegation),
// instead of adding a separate listener per card.
productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card) return;

  const id = Number(card.dataset.id);
  const action = e.target.closest("[data-action]")?.dataset.action;

  if (action === "info") {
    openDescriptionModal(id);
  } else {
    // Clicking anywhere else on the card also toggles selection.
    toggleSelected(id);
  }
});

categoryFilter.addEventListener("change", renderGrid);
productSearch.addEventListener("input", renderGrid);

/* ---------------------------------------------------------------------
   8) SELECTING / UNSELECTING PRODUCTS
--------------------------------------------------------------------- */
function toggleSelected(id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
  saveSelectedIdsToStorage();
  renderGrid();
  renderSelected();
}

function removeSelected(id) {
  selectedIds.delete(id);
  saveSelectedIdsToStorage();
  renderGrid();
  renderSelected();
}

function clearAllSelected() {
  selectedIds.clear();
  saveSelectedIdsToStorage();
  renderGrid();
  renderSelected();
}

clearAllBtn.addEventListener("click", clearAllSelected);

/* ---------------------------------------------------------------------
   9) RENDER: SELECTED PRODUCTS LIST
--------------------------------------------------------------------- */
function renderSelected() {
  const selectedProducts = allProducts.filter((p) => selectedIds.has(p.id));

  selectedCount.textContent = selectedProducts.length;
  generateBtn.disabled = selectedProducts.length === 0;

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<p class="empty-note">No products selected yet.</p>`;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-chip" data-id="${product.id}">
        <img src="${product.image}" alt="${product.name}" />
        <span>${product.name}</span>
        <button data-action="remove" aria-label="Remove ${product.name}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `
    )
    .join("");
}

selectedProductsList.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="remove"]');
  if (!btn) return;
  const chip = e.target.closest(".selected-chip");
  removeSelected(Number(chip.dataset.id));
});

/* ---------------------------------------------------------------------
   10) DESCRIPTION MODAL (Reveal Product Description)
--------------------------------------------------------------------- */
function openDescriptionModal(id) {
  const product = allProducts.find((p) => p.id === id);
  if (!product) return;

  currentModalProductId = id;
  modalImage.src = product.image;
  modalImage.alt = product.name;
  modalBrand.textContent = product.brand;
  modalProductName.textContent = product.name;
  modalDescription.textContent = product.description;
  updateModalSelectButton();

  modal.hidden = false;
  modalClose.focus();
}

function updateModalSelectButton() {
  const isSelected = selectedIds.has(currentModalProductId);
  modalSelectBtn.textContent = isSelected ? "Remove from Routine" : "Add to Routine";
  modalSelectBtn.classList.toggle("is-selected", isSelected);
}

function closeModal() {
  modal.hidden = true;
  currentModalProductId = null;
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal(); // click outside the card closes it
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});

modalSelectBtn.addEventListener("click", () => {
  toggleSelected(currentModalProductId);
  updateModalSelectButton();
});

/* ---------------------------------------------------------------------
   11) CHAT WINDOW RENDERING
--------------------------------------------------------------------- */
function appendChatMessage(role, text, citations) {
  // Remove the initial placeholder the first time a real message appears.
  const placeholder = chatWindow.querySelector(".placeholder-message");
  if (placeholder) placeholder.remove();

  const bubble = document.createElement("div");
  bubble.className = `chat-message ${role}`;
  bubble.textContent = text;

  // LevelUp: Web Search — if the Worker/model returns citations or links,
  // show them beneath the message so the user can see the sources.
  if (citations && citations.length > 0) {
    const citationsWrap = document.createElement("div");
    citationsWrap.className = "chat-citations";
    citationsWrap.innerHTML =
      "Sources:" +
      citations
        .map((c) => {
          const url = typeof c === "string" ? c : c.url;
          const label = typeof c === "string" ? c : c.title || c.url;
          return `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;
        })
        .join("");
    bubble.appendChild(citationsWrap);
  }

  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

function appendLoadingMessage() {
  const bubble = document.createElement("div");
  bubble.className = "chat-message assistant loading";
  bubble.textContent = "Thinking…";
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

/* ---------------------------------------------------------------------
   12) TALKING TO THE CLOUDFLARE WORKER
--------------------------------------------------------------------- */
async function callWorker(messages) {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`Worker responded with status ${response.status}`);
  }

  const data = await response.json();

  // Different Worker setups shape their response a little differently.
  // This covers the standard OpenAI chat-completions shape, and falls
  // back gracefully if your Worker returns something slightly different.
  const message = data.choices?.[0]?.message;
  const text = message?.content ?? data.reply ?? "Sorry, I couldn't generate a response.";

  // LevelUp: Web Search — adjust this line to match whatever field your
  // web-search-enabled Worker returns (e.g. data.citations, message.citations).
  const citations = data.citations || message?.citations || [];

  return { text, citations };
}

/* ---------------------------------------------------------------------
   13) GENERATE ROUTINE
--------------------------------------------------------------------- */
generateBtn.addEventListener("click", async () => {
  const selectedProducts = allProducts.filter((p) => selectedIds.has(p.id));
  if (selectedProducts.length === 0) return;

  // Only send the fields the AI actually needs — keeps the request small.
  const productData = selectedProducts.map(({ name, brand, category, description }) => ({
    name,
    brand,
    category,
    description,
  }));

  const userMessage = `Please build a personalized routine using these selected products:\n${JSON.stringify(
    productData,
    null,
    2
  )}`;

  // Start (or restart) the conversation history with the system prompt.
  conversationHistory = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  appendChatMessage("user", "Generate my routine from the selected products.");
  const loadingBubble = appendLoadingMessage();
  generateBtn.disabled = true;

  try {
    const { text, citations } = await callWorker(conversationHistory);
    conversationHistory.push({ role: "assistant", content: text });
    loadingBubble.remove();
    appendChatMessage("assistant", text, citations);

    routineGenerated = true;
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.placeholder = "Ask a follow-up question about your routine…";
  } catch (err) {
    loadingBubble.remove();
    appendChatMessage(
      "assistant",
      "Something went wrong reaching the advisor. Please check your Cloudflare Worker URL and try again."
    );
    console.error(err);
  } finally {
    generateBtn.disabled = selectedIds.size === 0;
  }
});

/* ---------------------------------------------------------------------
   14) FOLLOW-UP CHAT
--------------------------------------------------------------------- */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!routineGenerated) return;

  const question = userInput.value.trim();
  if (!question) return;

  appendChatMessage("user", question);
  conversationHistory.push({ role: "user", content: question });
  userInput.value = "";

  const loadingBubble = appendLoadingMessage();
  userInput.disabled = true;
  sendBtn.disabled = true;

  try {
    const { text, citations } = await callWorker(conversationHistory);
    conversationHistory.push({ role: "assistant", content: text });
    loadingBubble.remove();
    appendChatMessage("assistant", text, citations);
  } catch (err) {
    loadingBubble.remove();
    appendChatMessage("assistant", "I had trouble reaching the advisor. Please try again.");
    console.error(err);
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});

/* ---------------------------------------------------------------------
   15) RTL LANGUAGE SUPPORT (LevelUp)
--------------------------------------------------------------------- */
let isRTL = false;

rtlToggle.addEventListener("click", () => {
  isRTL = !isRTL;
  document.documentElement.dir = isRTL ? "rtl" : "ltr";
  rtlToggle.setAttribute("aria-pressed", String(isRTL));
  rtlToggleLabel.textContent = isRTL ? "English" : "العربية";
});

/* ---------------------------------------------------------------------
   16) INIT
--------------------------------------------------------------------- */
loadProducts();
