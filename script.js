/* =====================================================================
   L'ORÉAL PRODUCT-AWARE ROUTINE BUILDER — script.js
   Beginner-friendly comments included throughout so every part of the
   flow is easy to follow.
===================================================================== */

/* ---------------------------------------------------------------------
   1) CONFIG
--------------------------------------------------------------------- */

// TODO: Add your Cloudflare Worker URL here (this is what keeps your
// OpenAI API key hidden from the browser).
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
const LANG_STORAGE_KEY = "lorealLang";

/* ---------------------------------------------------------------------
   1B) TRANSLATIONS (LevelUp: RTL Language Support)
   A real language switch changes both the *text* and the *direction* —
   not just the direction. RTL_LANGS lists which language codes flip the
   page to right-to-left; every other language stays left-to-right.
--------------------------------------------------------------------- */
const RTL_LANGS = ["ar", "he"];

const translations = {
  en: {
    languageLabel: "Language",
    eyebrow: "Personalized Beauty, Powered by AI",
    title: "Your Routine Builder",
    subtitle:
      "Choose real products from our family of brands and let your advisor craft a routine built around them.",
    searchPlaceholder: "Search by product or brand…",
    selectedProductsHeading: "Selected Products",
    clearAll: "Clear All",
    generateBtn: "Generate Routine",
    chatHeading: "Ask Your Advisor",
    clearHistory: "Clear History",
    chatInitialPlaceholder: "Select a few products above and generate your routine to start the conversation.",
    chatInputBefore: "Generate a routine first, then ask a follow-up question…",
    chatInputAfter: "Ask a follow-up question about your routine…",
    selectBtn: "Select",
    selectedBtn: "Selected",
    addToRoutine: "Add to Routine",
    removeFromRoutine: "Remove from Routine",
    noProductsSelected: "No products selected yet.",
    noProductsMatch: "No products match your search. Try a different keyword or category.",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    contact: "Contact",
    generateChatUserMsg: "Generate my routine from the selected products.",
    thinking: "Thinking…",
    footerCopyright: "© 2025 L'Oréal. All rights reserved.",
    categories: {
      all: "All Categories",
      cleanser: "Cleansers",
      moisturizer: "Moisturizers",
      skincare: "Skincare & Treatments",
      haircare: "Haircare",
      "hair color": "Hair Color",
      "hair styling": "Hair Styling",
      makeup: "Makeup",
      suncare: "Suncare",
      "men's grooming": "Men's Grooming",
      fragrance: "Fragrance",
    },
  },
  ar: {
    languageLabel: "اللغة",
    eyebrow: "جمال شخصي، مدعوم بالذكاء الاصطناعي",
    title: "منشئ روتينك الخاص",
    subtitle: "اختر منتجات حقيقية من مجموعة علاماتنا التجارية، ودع مستشارك يصمم لك روتينًا يناسبها.",
    searchPlaceholder: "ابحث عن منتج أو علامة تجارية…",
    selectedProductsHeading: "المنتجات المختارة",
    clearAll: "مسح الكل",
    generateBtn: "إنشاء الروتين",
    chatHeading: "اسأل مستشارك",
    clearHistory: "مسح المحادثة",
    chatInitialPlaceholder: "اختر بعض المنتجات أعلاه وأنشئ روتينك لبدء المحادثة.",
    chatInputBefore: "أنشئ روتينًا أولًا، ثم اطرح سؤال متابعة…",
    chatInputAfter: "اطرح سؤال متابعة حول روتينك…",
    selectBtn: "اختيار",
    selectedBtn: "تم الاختيار",
    addToRoutine: "أضف إلى الروتين",
    removeFromRoutine: "إزالة من الروتين",
    noProductsSelected: "لم يتم اختيار أي منتجات بعد.",
    noProductsMatch: "لا توجد منتجات مطابقة لبحثك. جرّب كلمة أو فئة مختلفة.",
    privacy: "سياسة الخصوصية",
    terms: "شروط الاستخدام",
    contact: "اتصل بنا",
    generateChatUserMsg: "أنشئ روتيني من المنتجات المختارة.",
    thinking: "جارٍ التفكير…",
    footerCopyright: "© 2025 لوريال. جميع الحقوق محفوظة.",
    categories: {
      all: "كل الفئات",
      cleanser: "منظفات",
      moisturizer: "مرطبات",
      skincare: "العناية بالبشرة",
      haircare: "العناية بالشعر",
      "hair color": "صبغة الشعر",
      "hair styling": "تصفيف الشعر",
      makeup: "مكياج",
      suncare: "واقي الشمس",
      "men's grooming": "العناية بالرجال",
      fragrance: "عطور",
    },
  },
  he: {
    languageLabel: "שפה",
    eyebrow: "יופי מותאם אישית, מופעל בבינה מלאכותית",
    title: "בונה השגרה שלך",
    subtitle: "בחרו מוצרים אמיתיים ממשפחת המותגים שלנו, והיועץ שלכם יבנה עבורכם שגרה מותאמת.",
    searchPlaceholder: "חיפוש לפי מוצר או מותג…",
    selectedProductsHeading: "מוצרים נבחרים",
    clearAll: "נקה הכול",
    generateBtn: "צור שגרה",
    chatHeading: "שאלו את היועץ שלכם",
    clearHistory: "נקה היסטוריה",
    chatInitialPlaceholder: "בחרו כמה מוצרים למעלה וצרו שגרה כדי להתחיל בשיחה.",
    chatInputBefore: "צרו שגרה קודם, ואז שאלו שאלת המשך…",
    chatInputAfter: "שאלו שאלת המשך על השגרה שלכם…",
    selectBtn: "בחר",
    selectedBtn: "נבחר",
    addToRoutine: "הוסף לשגרה",
    removeFromRoutine: "הסר מהשגרה",
    noProductsSelected: "עדיין לא נבחרו מוצרים.",
    noProductsMatch: "לא נמצאו מוצרים תואמים. נסו מילת חיפוש או קטגוריה אחרת.",
    privacy: "מדיניות פרטיות",
    terms: "תנאי שימוש",
    contact: "צור קשר",
    generateChatUserMsg: "צור את השגרה שלי מהמוצרים שנבחרו.",
    thinking: "חושב…",
    footerCopyright: "© 2025 לוריאל. כל הזכויות שמורות.",
    categories: {
      all: "כל הקטגוריות",
      cleanser: "מנקים",
      moisturizer: "קרמי לחות",
      skincare: "טיפוח העור",
      haircare: "טיפוח השיער",
      "hair color": "צבע שיער",
      "hair styling": "עיצוב שיער",
      makeup: "איפור",
      suncare: "הגנה מהשמש",
      "men's grooming": "טיפוח לגברים",
      fragrance: "בושם",
    },
  },
  fr: {
    languageLabel: "Langue",
    eyebrow: "Beauté personnalisée, propulsée par l'IA",
    title: "Votre créateur de routine",
    subtitle:
      "Choisissez de vrais produits parmi nos marques et laissez votre conseiller créer une routine sur mesure.",
    searchPlaceholder: "Rechercher un produit ou une marque…",
    selectedProductsHeading: "Produits sélectionnés",
    clearAll: "Tout effacer",
    generateBtn: "Générer la routine",
    chatHeading: "Interrogez votre conseiller",
    clearHistory: "Effacer l'historique",
    chatInitialPlaceholder: "Sélectionnez quelques produits ci-dessus et générez votre routine pour démarrer la conversation.",
    chatInputBefore: "Générez d'abord une routine, puis posez une question…",
    chatInputAfter: "Posez une question sur votre routine…",
    selectBtn: "Sélectionner",
    selectedBtn: "Sélectionné",
    addToRoutine: "Ajouter à la routine",
    removeFromRoutine: "Retirer de la routine",
    noProductsSelected: "Aucun produit sélectionné pour l'instant.",
    noProductsMatch: "Aucun produit ne correspond à votre recherche. Essayez un autre mot-clé ou une autre catégorie.",
    privacy: "Politique de confidentialité",
    terms: "Conditions d'utilisation",
    contact: "Contact",
    generateChatUserMsg: "Génère ma routine à partir des produits sélectionnés.",
    thinking: "Réflexion en cours…",
    footerCopyright: "© 2025 L'Oréal. Tous droits réservés.",
    categories: {
      all: "Toutes les catégories",
      cleanser: "Nettoyants",
      moisturizer: "Hydratants",
      skincare: "Soins de la peau",
      haircare: "Soins capillaires",
      "hair color": "Coloration capillaire",
      "hair styling": "Coiffage",
      makeup: "Maquillage",
      suncare: "Protection solaire",
      "men's grooming": "Soins pour hommes",
      fragrance: "Parfum",
    },
  },
  es: {
    languageLabel: "Idioma",
    eyebrow: "Belleza personalizada, impulsada por IA",
    title: "Tu creador de rutinas",
    subtitle:
      "Elige productos reales de nuestra familia de marcas y deja que tu asesor cree una rutina a tu medida.",
    searchPlaceholder: "Buscar por producto o marca…",
    selectedProductsHeading: "Productos seleccionados",
    clearAll: "Borrar todo",
    generateBtn: "Generar rutina",
    chatHeading: "Consulta a tu asesor",
    clearHistory: "Borrar historial",
    chatInitialPlaceholder: "Selecciona algunos productos arriba y genera tu rutina para comenzar la conversación.",
    chatInputBefore: "Genera primero una rutina y luego haz una pregunta…",
    chatInputAfter: "Haz una pregunta sobre tu rutina…",
    selectBtn: "Seleccionar",
    selectedBtn: "Seleccionado",
    addToRoutine: "Añadir a la rutina",
    removeFromRoutine: "Quitar de la rutina",
    noProductsSelected: "Aún no has seleccionado productos.",
    noProductsMatch: "Ningún producto coincide con tu búsqueda. Prueba otra palabra clave o categoría.",
    privacy: "Política de privacidad",
    terms: "Términos de uso",
    contact: "Contacto",
    generateChatUserMsg: "Genera mi rutina a partir de los productos seleccionados.",
    thinking: "Pensando…",
    footerCopyright: "© 2025 L'Oréal. Todos los derechos reservados.",
    categories: {
      all: "Todas las categorías",
      cleanser: "Limpiadores",
      moisturizer: "Hidratantes",
      skincare: "Cuidado de la piel",
      haircare: "Cuidado del cabello",
      "hair color": "Color de cabello",
      "hair styling": "Peinado",
      makeup: "Maquillaje",
      suncare: "Protección solar",
      "men's grooming": "Cuidado masculino",
      fragrance: "Fragancia",
    },
  },
  de: {
    languageLabel: "Sprache",
    eyebrow: "Personalisierte Schönheit, unterstützt durch KI",
    title: "Dein Routine-Builder",
    subtitle:
      "Wähle echte Produkte aus unserer Markenfamilie und lass deinen Berater eine passende Routine zusammenstellen.",
    searchPlaceholder: "Nach Produkt oder Marke suchen…",
    selectedProductsHeading: "Ausgewählte Produkte",
    clearAll: "Alle löschen",
    generateBtn: "Routine erstellen",
    chatHeading: "Frag deinen Berater",
    clearHistory: "Verlauf löschen",
    chatInitialPlaceholder: "Wähle oben ein paar Produkte aus und erstelle deine Routine, um das Gespräch zu beginnen.",
    chatInputBefore: "Erstelle zuerst eine Routine und stelle dann eine Frage…",
    chatInputAfter: "Stelle eine Frage zu deiner Routine…",
    selectBtn: "Auswählen",
    selectedBtn: "Ausgewählt",
    addToRoutine: "Zur Routine hinzufügen",
    removeFromRoutine: "Aus der Routine entfernen",
    noProductsSelected: "Noch keine Produkte ausgewählt.",
    noProductsMatch: "Keine Produkte entsprechen deiner Suche. Versuche ein anderes Stichwort oder eine andere Kategorie.",
    privacy: "Datenschutzrichtlinie",
    terms: "Nutzungsbedingungen",
    contact: "Kontakt",
    generateChatUserMsg: "Erstelle meine Routine aus den ausgewählten Produkten.",
    thinking: "Denke nach…",
    footerCopyright: "© 2025 L'Oréal. Alle Rechte vorbehalten.",
    categories: {
      all: "Alle Kategorien",
      cleanser: "Reiniger",
      moisturizer: "Feuchtigkeitspflege",
      skincare: "Hautpflege",
      haircare: "Haarpflege",
      "hair color": "Haarfarbe",
      "hair styling": "Styling",
      makeup: "Makeup",
      suncare: "Sonnenschutz",
      "men's grooming": "Herrenpflege",
      fragrance: "Duft",
    },
  },
};

let currentLang = localStorage.getItem(LANG_STORAGE_KEY) || "en";

// t() looks up a UI string in the current language, falling back to English
// if a key is ever missing so the app never shows "undefined".
function t(key) {
  return translations[currentLang]?.[key] ?? translations.en[key];
}

function tCategory(categoryValue) {
  const key = categoryValue === "" ? "all" : categoryValue;
  return translations[currentLang]?.categories?.[key] ?? translations.en.categories[key];
}

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
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const modal = document.getElementById("descriptionModal");
const modalImage = document.getElementById("modalImage");
const modalBrand = document.getElementById("modalBrand");
const modalProductName = document.getElementById("modalProductName");
const modalDescription = document.getElementById("modalDescription");
const modalSelectBtn = document.getElementById("modalSelectBtn");
const modalClose = document.getElementById("modalClose");

const langSelect = document.getElementById("langSelect");

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
        ${t("noProductsMatch")}
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
              ${isSelected ? t("selectedBtn") : t("selectBtn")}
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
    selectedProductsList.innerHTML = `<p class="empty-note">${t("noProductsSelected")}</p>`;
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
  modalSelectBtn.textContent = isSelected ? t("removeFromRoutine") : t("addToRoutine");
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
  bubble.textContent = t("thinking");
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

  appendChatMessage("user", t("generateChatUserMsg"));
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
    userInput.placeholder = t("chatInputAfter");
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
   14B) CLEAR CHAT HISTORY
   Resets the conversation completely: wipes the visible messages, the
   conversationHistory array sent to the Worker, and locks the input
   again until a new routine is generated.
--------------------------------------------------------------------- */
function clearChatHistory() {
  conversationHistory = [];
  routineGenerated = false;

  chatWindow.innerHTML = `<p class="placeholder-message" data-i18n="chatInitialPlaceholder">${t(
    "chatInitialPlaceholder"
  )}</p>`;

  userInput.value = "";
  userInput.disabled = true;
  sendBtn.disabled = true;
  updateChatInputPlaceholder();
}

clearHistoryBtn.addEventListener("click", clearChatHistory);

/* ---------------------------------------------------------------------
   15) LANGUAGE + RTL SUPPORT (LevelUp)
   Switching languages does three things together:
   1. Sets <html lang="…"> and flips dir="rtl"/"ltr" (Arabic + Hebrew are
      RTL; French, Spanish, German stay LTR) — this is what reflows the
      product grid, selected-products strip, and chat bubbles.
   2. Replaces every static UI string (every element with [data-i18n] or
      [data-i18n-placeholder]) with the translated text.
   3. Re-renders the dynamic pieces (grid, selected list, category
      options, chat input placeholder) so their button/option text is
      translated too — those aren't static, so a plain textContent swap
      wouldn't reach them.
--------------------------------------------------------------------- */
function updateStaticText() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("#categoryFilter option[data-i18n-cat]").forEach((opt) => {
    opt.textContent = tCategory(opt.dataset.i18nCat === "all" ? "" : opt.dataset.i18nCat);
  });
}

function updateChatInputPlaceholder() {
  userInput.placeholder = routineGenerated ? t("chatInputAfter") : t("chatInputBefore");
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);

  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  updateStaticText();
  updateChatInputPlaceholder();
  if (!modal.hidden) updateModalSelectButton();

  // Re-render dynamic sections so Select/Selected buttons, the "no
  // results" message, etc. pick up the new language too.
  if (allProducts.length > 0) {
    renderGrid();
    renderSelected();
  }
}

langSelect.addEventListener("change", (e) => applyLanguage(e.target.value));

/* ---------------------------------------------------------------------
   16) INIT
--------------------------------------------------------------------- */
langSelect.value = currentLang;
applyLanguage(currentLang);
loadProducts();
