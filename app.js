// ==========================================
// SMÅBRUK KUNNSKAPSBASE APP v4.0
// Firebase-basert med Google Auth
// Komplett, debugget og profesjonell
// ==========================================

const APP_VERSION = '4.0.0';

// ===== Firebase Configuration =====
const firebaseConfig = {
    apiKey: "AIzaSyDChsgGALPtC9kJ_h9Mh4Co9eP0EadpUlo",
    authDomain: "smabruk-info-8abbe.firebaseapp.com",
    projectId: "smabruk-info-8abbe",
    storageBucket: "smabruk-info-8abbe.firebasestorage.app",
    messagingSenderId: "895619707192",
    appId: "1:895619707192:web:0f4e6acf82a97b656c11cd",
    measurementId: "G-CN2RDYN9L6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ===== Default Data =====
const DEFAULT_CATEGORIES = [
    { id: 'vedlikehold', name: 'Vedlikehold', icon: '🔧' },
    { id: 'dyr', name: 'Dyr & Husdyr', icon: '🐑' },
    { id: 'hage', name: 'Hage & Planter', icon: '🌱' },
    { id: 'maskiner', name: 'Maskiner & Utstyr', icon: '🚜' },
    { id: 'bygg', name: 'Bygg & Hus', icon: '🏠' },
    { id: 'tradisjon', name: 'Tradisjoner', icon: '📜' },
    { id: 'mat', name: 'Mat & Oppskrifter', icon: '🍲' },
    { id: 'skog', name: 'Skog & Ved', icon: '🪵' },
    { id: 'vann', name: 'Vann & Avløp', icon: '💧' },
    { id: 'strom', name: 'Strøm & Elektro', icon: '⚡' },
    { id: 'sesong', name: 'Sesongarbeid', icon: '🗓️' },
    { id: 'annet', name: 'Annet', icon: '📝' }
];

const EMOJIS = ['🔧','🐑','🐔','🐄','🐖','🌱','🌳','🍎','🍓','🥕','🚜','🛠️','🏠','🏚️','🪵','📜','📚','📝','🍲','🥛','🧀','⚡','💧','🔥','❄️','🌤️','🌧️','🐝','🦆','🐕','🐈','🐴','🌻','🌿','🪨','⛏️','🪓','🧱','🏗️','🚿','💡','🔌','📞','🗓️','⭐','❤️','✅','🌸','☀️','🍂','🧹','🪣','🔨','⚙️','🎯'];

// ===== State =====
const state = {
    user: null,
    categories: [],
    articles: [],
    contacts: [],
    checklists: [],
    settings: {},
    recentArticles: [],
    currentView: 'dashboardView',
    currentArticle: null,
    currentChecklist: null,
    currentCategory: null,
    editingArticle: null,
    editingContact: null,
    editingChecklist: null,
    tempImages: []
};

// ===== DOM Helpers =====
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function on(id, event, handler) {
    const el = typeof id === 'string' ? $(id) : id;
    if (el) el.addEventListener(event, handler);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Firestore Helpers =====
function userDoc(collection) {
    if (!state.user) return null;
    return db.collection('users').doc(state.user.uid).collection(collection);
}

async function saveToFirestore(collection, id, data) {
    const col = userDoc(collection);
    if (!col) return null;
    
    const docData = { ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (id) {
        await col.doc(id).set(docData, { merge: true });
        return id;
    } else {
        docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await col.add(docData);
        return ref.id;
    }
}

async function deleteFromFirestore(collection, id) {
    const col = userDoc(collection);
    if (col) await col.doc(id).delete();
}

async function loadCollection(collection) {
    const col = userDoc(collection);
    if (!col) return [];
    try {
        const snapshot = await col.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn(`Could not load ${collection}:`, e.message);
        return [];
    }
}

// ===== Auth Functions =====
let isLoggingIn = false;

function setupAuth() {
    on('googleLoginBtn', 'click', async () => {
        if (isLoggingIn) return;
        isLoggingIn = true;
        
        const btn = $('googleLoginBtn');
        if (btn) btn.disabled = true;
        
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
        } catch (error) {
            if (error.code !== 'auth/cancelled-popup-request' && 
                error.code !== 'auth/popup-closed-by-user') {
                showToast('Innlogging feilet', 'error');
            }
        } finally {
            isLoggingIn = false;
            if (btn) btn.disabled = false;
        }
    });

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            state.user = user;
            const loginScreen = $('loginScreen');
            if (loginScreen) loginScreen.classList.add('hidden');
            await initApp();
        } else {
            state.user = null;
            const loginScreen = $('loginScreen');
            const mainApp = $('mainApp');
            const splashScreen = $('splashScreen');
            
            if (loginScreen) loginScreen.classList.remove('hidden');
            if (mainApp) mainApp.classList.add('hidden');
            if (splashScreen) splashScreen.classList.add('hidden');
        }
    });
}

async function signOut() {
    try {
        await auth.signOut();
        state.user = null;
        state.categories = [];
        state.articles = [];
        state.contacts = [];
        state.checklists = [];
        showToast('Logget ut');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ===== Initialize App =====
async function initApp() {
    const splash = $('splashScreen');
    if (splash) splash.classList.remove('hidden');
    
    try {
        await loadAllData();
        setupEventListeners();
        renderDashboard();
        updateUserUI();
        
        setTimeout(() => {
            if (splash) splash.classList.add('hidden');
            const mainApp = $('mainApp');
            if (mainApp) mainApp.classList.remove('hidden');
        }, 800);
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
        
    } catch (error) {
        console.error('Init error:', error.message);
        if (splash) splash.classList.add('hidden');
        const mainApp = $('mainApp');
        if (mainApp) mainApp.classList.remove('hidden');
        showToast('Kunne ikke laste data', 'error');
    }
}

async function loadAllData() {
    state.categories = await loadCollection('categories');
    if (state.categories.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
            await saveToFirestore('categories', cat.id, cat);
        }
        state.categories = [...DEFAULT_CATEGORIES];
    }
    
    state.articles = await loadCollection('articles');
    state.contacts = await loadCollection('contacts');
    state.checklists = await loadCollection('checklists');
    
    try {
        const userDocRef = db.collection('users').doc(state.user.uid);
        const settingsDoc = await userDocRef.get();
        if (settingsDoc.exists) {
            state.settings = settingsDoc.data()?.settings || {};
            state.recentArticles = settingsDoc.data()?.recentArticles || [];
        }
    } catch(e) {
        state.settings = {};
        state.recentArticles = [];
    }
}

function updateUserUI() {
    const syncBtn = $('syncBtn');
    if (syncBtn && state.user?.photoURL) {
        syncBtn.innerHTML = `<img src="${state.user.photoURL}" class="user-avatar" alt="Profil" style="width:28px;height:28px;border-radius:50%;">`;
        syncBtn.onclick = openUserMenu;
    }
    
    const farmName = $('farmName');
    if (farmName && state.settings?.farmName) {
        farmName.textContent = state.settings.farmName;
    }
}

function openUserMenu() {
    showConfirm('Logg ut?', 'Vil du logge ut av appen?', () => signOut(), '👋');
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Search
    on('searchInput', 'input', handleSearch);
    on('clearSearch', 'click', clearSearch);
    
    // Header
    on('homeBtn', 'click', () => showView('dashboardView'));
    on('menuBtn', 'click', openMenu);
    
    // Quick actions
    on('quickAddBtn', 'click', () => openArticleModal());
    on('quickContactBtn', 'click', () => showView('contactsView'));
    on('quickChecklistBtn', 'click', () => showView('checklistsView'));
    on('quickEmergencyBtn', 'click', () => showView('emergencyView'));
    
    // Dashboard sections
    on('seeAllFavorites', 'click', () => showView('favoritesView'));
    on('clearRecent', 'click', clearRecentArticles);
    on('manageCategoriesBtn', 'click', openCategoryModal);
    
    // FAB
    on('addBtn', 'click', () => openArticleModal());
    
    // Navigation
    $$('.nav-item[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view) {
                showView(view);
                $$('.nav-item').forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });
    
    // Articles view
    on('backToCategories', 'click', () => showView('dashboardView'));
    on('sortSelect', 'change', renderArticlesList);
    
    // Article detail
    on('backToArticles', 'click', () => {
        if (state.currentCategory) {
            showView('articlesView');
        } else {
            showView('dashboardView');
        }
    });
    on('favoriteArticleBtn', 'click', toggleFavorite);
    on('editArticleBtn', 'click', () => openArticleModal(state.currentArticle));
    on('deleteArticleBtn', 'click', deleteCurrentArticle);
    
    // Search view
    on('backFromSearch', 'click', () => showView('dashboardView'));
    
    // Contacts view
    on('backFromContacts', 'click', () => showView('dashboardView'));
    on('addContactBtn', 'click', () => openContactModal());
    
    // Checklists view
    on('backFromChecklists', 'click', () => showView('dashboardView'));
    on('addChecklistBtn', 'click', () => openChecklistModal());
    
    // Checklist detail
    on('backFromChecklistDetail', 'click', () => showView('checklistsView'));
    on('resetChecklistBtn', 'click', resetChecklist);
    on('deleteChecklistBtn', 'click', deleteCurrentChecklist);
    on('addChecklistItemBtn', 'click', addChecklistItem);
    
    // Emergency view
    on('backFromEmergency', 'click', () => showView('dashboardView'));
    on('editAddressBtn', 'click', openSettingsModal);
    
    // Favorites view
    on('backFromFavorites', 'click', () => showView('dashboardView'));
    
    // Menu
    on('closeMenu', 'click', closeMenu);
    on('menuOverlay', 'click', closeMenu);
    on('menuHome', 'click', () => { closeMenu(); showView('dashboardView'); });
    on('menuSettings', 'click', () => { closeMenu(); openSettingsModal(); });
    on('menuCategories', 'click', () => { closeMenu(); openCategoryModal(); });
    on('menuSync', 'click', () => { closeMenu(); openSyncModal(); });
    on('menuExport', 'click', () => { closeMenu(); exportData(); });
    on('menuImport', 'click', () => { closeMenu(); importData(); });
    on('menuAbout', 'click', () => { closeMenu(); openAboutModal(); });
    
    // Article modal
    on('closeArticleModal', 'click', closeArticleModal);
    on('articleForm', 'submit', saveArticle);
    on('addImageBtn', 'click', () => $('imageInput')?.click());
    on('cameraBtn', 'click', () => $('cameraInput')?.click());
    on('imageInput', 'change', handleImageSelect);
    on('cameraInput', 'change', handleImageSelect);
    
    // Category modal
    on('closeCategoryModal', 'click', closeCategoryModal);
    on('addCategoryBtn', 'click', addCategory);
    on('selectEmojiBtn', 'click', openEmojiPicker);
    on('newCategoryName', 'keypress', e => { if (e.key === 'Enter') addCategory(); });
    
    // Contact modal
    on('closeContactModal', 'click', closeContactModal);
    on('contactForm', 'submit', saveContact);
    
    // Checklist modal
    on('closeChecklistModal', 'click', closeChecklistModal);
    on('checklistForm', 'submit', saveChecklist);
    
    // Sync modal
    on('closeSyncModal', 'click', closeSyncModal);
    on('syncExportBtn', 'click', exportData);
    on('syncImportBtn', 'click', importData);
    
    // Settings modal
    on('closeSettingsModal', 'click', closeSettingsModal);
    on('saveSettingsBtn', 'click', saveSettings);
    on('clearAllDataBtn', 'click', clearAllData);
    
    // About modal
    on('closeAboutModal', 'click', closeAboutModal);
    
    // Confirm modal
    on('confirmCancel', 'click', closeConfirmModal);
    
    // Lightbox
    on('lightbox', 'click', closeLightbox);
    
    // Close modals on overlay click
    $$('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeAllModals();
        });
    });
}

// ===== View Management =====
function showView(viewId) {
    $$('.view').forEach(v => v.classList.remove('active'));
    const view = $(viewId);
    if (view) view.classList.add('active');
    state.currentView = viewId;
    
    // Render view content
    switch(viewId) {
        case 'dashboardView': renderDashboard(); break;
        case 'contactsView': renderContacts(); break;
        case 'checklistsView': renderChecklists(); break;
        case 'emergencyView': renderEmergency(); break;
        case 'favoritesView': renderFavorites(); break;
    }
    
    // Update nav
    $$('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.view === viewId);
    });
}

// ===== Dashboard =====
function renderDashboard() {
    const favorites = state.articles.filter(a => a.favorite);
    
    // Stats
    const totalArticles = $('totalArticles');
    const totalCategories = $('totalCategories');
    const totalFavorites = $('totalFavorites');
    
    if (totalArticles) totalArticles.textContent = state.articles.length;
    if (totalCategories) totalCategories.textContent = state.categories.length;
    if (totalFavorites) totalFavorites.textContent = favorites.length;
    
    // Favorites section
    const favSection = $('favoritesSection');
    const favList = $('favoritesList');
    if (favSection && favList) {
        if (favorites.length > 0) {
            favSection.style.display = 'block';
            favList.innerHTML = favorites.slice(0, 5).map(a => `
                <div class="card-mini" onclick="openArticle('${a.id}')">
                    <div class="card-mini-icon">${getCategoryIcon(a.category)}</div>
                    <div class="card-mini-title">${escapeHtml(a.title)}</div>
                </div>
            `).join('');
        } else {
            favSection.style.display = 'none';
        }
    }
    
    // Recent section
    const recentSection = $('recentSection');
    const recentList = $('recentList');
    if (recentSection && recentList) {
        const recentArticles = state.recentArticles
            .map(id => state.articles.find(a => a.id === id))
            .filter(Boolean);
        
        if (recentArticles.length > 0) {
            recentSection.style.display = 'block';
            recentList.innerHTML = recentArticles.slice(0, 5).map(a => `
                <div class="card-mini" onclick="openArticle('${a.id}')">
                    <div class="card-mini-icon">${getCategoryIcon(a.category)}</div>
                    <div class="card-mini-title">${escapeHtml(a.title)}</div>
                </div>
            `).join('');
        } else {
            recentSection.style.display = 'none';
        }
    }
    
    renderCategoriesGrid();
}

function renderCategoriesGrid() {
    const grid = $('categoryGrid');
    if (!grid) return;
    
    grid.innerHTML = state.categories.map(cat => {
        const count = state.articles.filter(a => a.category === cat.id).length;
        return `
            <div class="category-card" onclick="openCategory('${cat.id}')">
                <div class="category-icon">${cat.icon}</div>
                <div class="category-info">
                    <div class="category-name">${escapeHtml(cat.name)}</div>
                    <div class="category-count">${count} artikkel${count !== 1 ? 'er' : ''}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getCategoryIcon(categoryId) {
    const cat = state.categories.find(c => c.id === categoryId);
    return cat?.icon || '📝';
}

function getCategoryName(categoryId) {
    const cat = state.categories.find(c => c.id === categoryId);
    return cat?.name || 'Ukjent';
}

// ===== Categories =====
function openCategory(categoryId) {
    state.currentCategory = categoryId;
    const cat = state.categories.find(c => c.id === categoryId);
    
    const icon = $('categoryIcon');
    const title = $('categoryTitle');
    
    if (icon) icon.textContent = cat?.icon || '📁';
    if (title) title.textContent = cat?.name || 'Kategori';
    
    renderArticlesList();
    showView('articlesView');
}

function renderArticlesList() {
    const list = $('articlesList');
    const countBadge = $('articleCount');
    if (!list) return;
    
    let articles = state.articles.filter(a => a.category === state.currentCategory);
    
    // Sort
    const sortSelect = $('sortSelect');
    const sortBy = sortSelect?.value || 'alpha';
    
    if (sortBy === 'alpha') {
        articles.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'no'));
    } else if (sortBy === 'newest') {
        articles.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    } else if (sortBy === 'oldest') {
        articles.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
    }
    
    if (countBadge) countBadge.textContent = articles.length;
    
    if (articles.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <p>Ingen artikler ennå</p>
                <button class="btn-primary" onclick="openArticleModal()">+ Legg til artikkel</button>
            </div>
        `;
    } else {
        list.innerHTML = articles.map(a => `
            <div class="article-card" onclick="openArticle('${a.id}')">
                <div class="article-icon">${a.favorite ? '⭐' : getCategoryIcon(a.category)}</div>
                <div class="article-info">
                    <h3>${escapeHtml(a.title)}</h3>
                    <p>${escapeHtml((a.content || '').substring(0, 80))}${(a.content || '').length > 80 ? '...' : ''}</p>
                    ${a.tags ? `<div class="article-tags">${a.tags.split(',').slice(0,3).map(t => `<span class="tag">${escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
                </div>
                ${a.images?.length ? '<div class="article-has-image">🖼️</div>' : ''}
            </div>
        `).join('');
    }
}

// ===== Article Detail =====
function openArticle(articleId) {
    const article = state.articles.find(a => a.id === articleId);
    if (!article) return;
    
    state.currentArticle = article;
    addToRecent(articleId);
    
    const content = $('articleContent');
    if (!content) return;
    
    const favBtn = $('favoriteArticleBtn');
    if (favBtn) {
        favBtn.classList.toggle('active', article.favorite);
    }
    
    content.innerHTML = `
        <div class="article-header">
            <span class="article-category-badge">${getCategoryIcon(article.category)} ${getCategoryName(article.category)}</span>
            ${article.favorite ? '<span class="fav-badge">⭐ Favoritt</span>' : ''}
        </div>
        <h1>${escapeHtml(article.title)}</h1>
        ${article.tags ? `<div class="article-tags">${article.tags.split(',').map(t => `<span class="tag">${escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
        <div class="article-body">${formatContent(article.content)}</div>
        ${article.images?.length ? `
            <div class="article-images">
                ${article.images.map((img, i) => `<img src="${img}" alt="Bilde ${i+1}" onclick="openLightbox('${img}')">`).join('')}
            </div>
        ` : ''}
        <div class="article-meta">
            <span>Opprettet: ${formatDate(article.createdAt)}</span>
            ${article.updatedAt ? `<span>Oppdatert: ${formatDate(article.updatedAt)}</span>` : ''}
        </div>
    `;
    
    showView('articleView');
}

function formatContent(text) {
    if (!text) return '';
    return escapeHtml(text)
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

function formatDate(timestamp) {
    if (!timestamp) return 'Ukjent';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function addToRecent(articleId) {
    state.recentArticles = state.recentArticles.filter(id => id !== articleId);
    state.recentArticles.unshift(articleId);
    state.recentArticles = state.recentArticles.slice(0, 10);
    
    try {
        await db.collection('users').doc(state.user.uid).set({
            recentArticles: state.recentArticles
        }, { merge: true });
    } catch(e) {}
}

async function clearRecentArticles() {
    state.recentArticles = [];
    try {
        await db.collection('users').doc(state.user.uid).set({
            recentArticles: []
        }, { merge: true });
    } catch(e) {}
    renderDashboard();
    showToast('Historikk tømt');
}

async function toggleFavorite() {
    if (!state.currentArticle) return;
    
    state.currentArticle.favorite = !state.currentArticle.favorite;
    await saveToFirestore('articles', state.currentArticle.id, { favorite: state.currentArticle.favorite });
    
    const favBtn = $('favoriteArticleBtn');
    if (favBtn) favBtn.classList.toggle('active', state.currentArticle.favorite);
    
    showToast(state.currentArticle.favorite ? 'Lagt til i favoritter ⭐' : 'Fjernet fra favoritter');
}

function deleteCurrentArticle() {
    if (!state.currentArticle) return;
    
    showConfirm('Slett artikkel?', `Er du sikker på at du vil slette "${state.currentArticle.title}"?`, async () => {
        await deleteFromFirestore('articles', state.currentArticle.id);
        state.articles = state.articles.filter(a => a.id !== state.currentArticle.id);
        state.currentArticle = null;
        showToast('Artikkel slettet');
        showView('dashboardView');
    }, '🗑️');
}

// ===== Article Modal =====
function openArticleModal(article = null) {
    state.editingArticle = article;
    state.tempImages = article?.images || [];
    
    const modal = $('articleModal');
    const title = $('modalTitle');
    const titleInput = $('articleTitleInput');
    const categorySelect = $('articleCategory');
    const tagsInput = $('articleTags');
    const textInput = $('articleText');
    const previewList = $('imagePreviewList');
    
    if (title) title.textContent = article ? 'Rediger artikkel' : 'Ny artikkel';
    
    // Populate category dropdown
    if (categorySelect) {
        categorySelect.innerHTML = state.categories.map(c => 
            `<option value="${c.id}">${c.icon} ${c.name}</option>`
        ).join('');
    }
    
    if (titleInput) titleInput.value = article?.title || '';
    if (categorySelect) categorySelect.value = article?.category || state.currentCategory || state.categories[0]?.id || '';
    if (tagsInput) tagsInput.value = article?.tags || '';
    if (textInput) textInput.value = article?.content || '';
    
    renderImagePreviews();
    
    if (modal) modal.classList.add('active');
}

function closeArticleModal() {
    const modal = $('articleModal');
    if (modal) modal.classList.remove('active');
    state.editingArticle = null;
    state.tempImages = [];
}

function renderImagePreviews() {
    const list = $('imagePreviewList');
    if (!list) return;
    
    list.innerHTML = state.tempImages.map((img, i) => `
        <div class="image-preview">
            <img src="${img}" alt="Bilde ${i+1}">
            <button type="button" class="remove-img" onclick="removeImage(${i})">✕</button>
        </div>
    `).join('');
}

function removeImage(index) {
    state.tempImages.splice(index, 1);
    renderImagePreviews();
}

function handleImageSelect(e) {
    const files = e.target.files;
    if (!files?.length) return;
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            compressImage(ev.target.result, (compressed) => {
                state.tempImages.push(compressed);
                renderImagePreviews();
            });
        };
        reader.readAsDataURL(file);
    });
    
    e.target.value = '';
}

function compressImage(dataUrl, callback) {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1200;
        let w = img.width, h = img.height;
        
        if (w > maxSize || h > maxSize) {
            if (w > h) { h = h * maxSize / w; w = maxSize; }
            else { w = w * maxSize / h; h = maxSize; }
        }
        
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
}

async function saveArticle(e) {
    e.preventDefault();
    
    const titleInput = $('articleTitleInput');
    const categorySelect = $('articleCategory');
    const tagsInput = $('articleTags');
    const textInput = $('articleText');
    
    const data = {
        title: titleInput?.value?.trim() || '',
        category: categorySelect?.value || '',
        tags: tagsInput?.value?.trim() || '',
        content: textInput?.value?.trim() || '',
        images: state.tempImages
    };
    
    if (!data.title || !data.category || !data.content) {
        showToast('Fyll ut alle påkrevde felt', 'error');
        return;
    }
    
    try {
        const id = await saveToFirestore('articles', state.editingArticle?.id, data);
        
        if (state.editingArticle) {
            const idx = state.articles.findIndex(a => a.id === state.editingArticle.id);
            if (idx >= 0) state.articles[idx] = { ...state.articles[idx], ...data };
        } else {
            state.articles.push({ id, ...data });
        }
        
        closeArticleModal();
        showToast(state.editingArticle ? 'Artikkel oppdatert ✓' : 'Artikkel lagret ✓');
        
        if (state.currentView === 'articlesView') {
            renderArticlesList();
        } else {
            renderDashboard();
        }
    } catch (error) {
        showToast('Kunne ikke lagre artikkel', 'error');
    }
}

// ===== Category Modal =====
function openCategoryModal() {
    const modal = $('categoryModal');
    if (modal) modal.classList.add('active');
    renderCategoryList();
    renderEmojiGrid();
}

function closeCategoryModal() {
    const modal = $('categoryModal');
    if (modal) modal.classList.remove('active');
}

function renderCategoryList() {
    const list = $('manageCategoryList');
    if (!list) return;
    
    list.innerHTML = state.categories.map(cat => `
        <div class="category-item">
            <span class="cat-icon">${cat.icon}</span>
            <span class="cat-name">${escapeHtml(cat.name)}</span>
            <span class="cat-count">${state.articles.filter(a => a.category === cat.id).length}</span>
            <button class="delete-cat-btn" onclick="deleteCategory('${cat.id}')" ${DEFAULT_CATEGORIES.some(d => d.id === cat.id) ? 'disabled title="Standard kategori"' : ''}>✕</button>
        </div>
    `).join('');
}

async function addCategory() {
    const nameInput = $('newCategoryName');
    const emojiBtn = $('selectEmojiBtn');
    
    const name = nameInput?.value?.trim();
    const icon = emojiBtn?.textContent || '📁';
    
    if (!name) {
        showToast('Skriv inn et navn', 'error');
        return;
    }
    
    const id = name.toLowerCase().replace(/[^a-zæøå0-9]/g, '-');
    
    if (state.categories.some(c => c.id === id)) {
        showToast('Kategori finnes allerede', 'error');
        return;
    }
    
    const newCat = { id, name, icon };
    await saveToFirestore('categories', id, newCat);
    state.categories.push(newCat);
    
    if (nameInput) nameInput.value = '';
    if (emojiBtn) emojiBtn.textContent = '📁';
    
    renderCategoryList();
    renderDashboard();
    showToast('Kategori lagt til ✓');
}

async function deleteCategory(categoryId) {
    const articles = state.articles.filter(a => a.category === categoryId);
    
    if (articles.length > 0) {
        showToast(`Kan ikke slette - ${articles.length} artikler bruker denne kategorien`, 'error');
        return;
    }
    
    showConfirm('Slett kategori?', 'Er du sikker?', async () => {
        await deleteFromFirestore('categories', categoryId);
        state.categories = state.categories.filter(c => c.id !== categoryId);
        renderCategoryList();
        renderDashboard();
        showToast('Kategori slettet');
    });
}

function openEmojiPicker() {
    const modal = $('emojiModal');
    if (modal) modal.classList.add('active');
}

function renderEmojiGrid() {
    const grid = $('emojiGrid');
    if (!grid) return;
    
    grid.innerHTML = EMOJIS.map(e => 
        `<button type="button" class="emoji-option" onclick="selectEmoji('${e}')">${e}</button>`
    ).join('');
}

function selectEmoji(emoji) {
    const btn = $('selectEmojiBtn');
    if (btn) btn.textContent = emoji;
    
    const modal = $('emojiModal');
    if (modal) modal.classList.remove('active');
}

// ===== Contacts =====
function renderContacts() {
    const list = $('contactsList');
    if (!list) return;
    
    if (state.contacts.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📞</div>
                <p>Ingen kontakter ennå</p>
                <button class="btn-primary" onclick="openContactModal()">+ Legg til kontakt</button>
            </div>
        `;
    } else {
        const grouped = {};
        state.contacts.forEach(c => {
            const type = c.category || 'annet';
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(c);
        });
        
        const typeNames = {
            handverker: '🔧 Håndverkere',
            leverandor: '📦 Leverandører',
            nabo: '🏠 Naboer',
            veterinar: '🐄 Veterinærer',
            offentlig: '🏛️ Offentlig',
            annet: '📝 Andre'
        };
        
        list.innerHTML = Object.entries(grouped).map(([type, contacts]) => `
            <div class="contact-group">
                <h3 class="contact-group-title">${typeNames[type] || type}</h3>
                ${contacts.map(c => `
                    <div class="contact-card" onclick="openContactModal(state.contacts.find(x => x.id === '${c.id}'))">
                        <div class="contact-info">
                            <h4>${escapeHtml(c.name)} ${c.emergency ? '🆘' : ''}</h4>
                            <a href="tel:${c.phone}" class="contact-phone" onclick="event.stopPropagation()">${c.phone}</a>
                            ${c.note ? `<p class="contact-note">${escapeHtml(c.note)}</p>` : ''}
                        </div>
                        <a href="tel:${c.phone}" class="call-btn" onclick="event.stopPropagation()">📞</a>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }
}

function openContactModal(contact = null) {
    state.editingContact = contact;
    
    const modal = $('contactModal');
    const title = $('contactModalTitle');
    const nameInput = $('contactName');
    const phoneInput = $('contactPhone');
    const categorySelect = $('contactCategory');
    const noteInput = $('contactNote');
    const emergencyCheck = $('contactEmergency');
    
    if (title) title.textContent = contact ? 'Rediger kontakt' : 'Ny kontakt';
    if (nameInput) nameInput.value = contact?.name || '';
    if (phoneInput) phoneInput.value = contact?.phone || '';
    if (categorySelect) categorySelect.value = contact?.category || 'annet';
    if (noteInput) noteInput.value = contact?.note || '';
    if (emergencyCheck) emergencyCheck.checked = contact?.emergency || false;
    
    if (modal) modal.classList.add('active');
}

function closeContactModal() {
    const modal = $('contactModal');
    if (modal) modal.classList.remove('active');
    state.editingContact = null;
}

async function saveContact(e) {
    e.preventDefault();
    
    const data = {
        name: $('contactName')?.value?.trim() || '',
        phone: $('contactPhone')?.value?.trim() || '',
        category: $('contactCategory')?.value || 'annet',
        note: $('contactNote')?.value?.trim() || '',
        emergency: $('contactEmergency')?.checked || false
    };
    
    if (!data.name || !data.phone) {
        showToast('Fyll ut navn og telefon', 'error');
        return;
    }
    
    try {
        const id = await saveToFirestore('contacts', state.editingContact?.id, data);
        
        if (state.editingContact) {
            const idx = state.contacts.findIndex(c => c.id === state.editingContact.id);
            if (idx >= 0) state.contacts[idx] = { ...state.contacts[idx], ...data };
        } else {
            state.contacts.push({ id, ...data });
        }
        
        closeContactModal();
        showToast('Kontakt lagret ✓');
        renderContacts();
    } catch (error) {
        showToast('Kunne ikke lagre kontakt', 'error');
    }
}

// ===== Checklists =====
function renderChecklists() {
    const list = $('checklistsList');
    if (!list) return;
    
    if (state.checklists.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <p>Ingen sjekklister ennå</p>
                <button class="btn-primary" onclick="openChecklistModal()">+ Lag sjekkliste</button>
            </div>
        `;
    } else {
        list.innerHTML = state.checklists.map(cl => {
            const items = cl.items || [];
            const done = items.filter(i => i.done).length;
            const pct = items.length ? Math.round(done / items.length * 100) : 0;
            
            return `
                <div class="checklist-card" onclick="openChecklist('${cl.id}')">
                    <div class="checklist-icon">${cl.icon || '📋'}</div>
                    <div class="checklist-info">
                        <h3>${escapeHtml(cl.name)}</h3>
                        <div class="checklist-mini-progress">
                            <div class="mini-bar"><div class="mini-fill" style="width:${pct}%"></div></div>
                            <span>${done}/${items.length}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function openChecklist(checklistId) {
    const checklist = state.checklists.find(c => c.id === checklistId);
    if (!checklist) return;
    
    state.currentChecklist = checklist;
    
    const title = $('checklistTitle');
    if (title) title.textContent = `${checklist.icon || '📋'} ${checklist.name}`;
    
    renderChecklistItems();
    showView('checklistDetailView');
}

function renderChecklistItems() {
    const list = $('checklistItems');
    const progress = $('checklistProgress');
    const progressText = $('checklistProgressText');
    
    if (!state.currentChecklist || !list) return;
    
    const items = state.currentChecklist.items || [];
    const done = items.filter(i => i.done).length;
    const pct = items.length ? Math.round(done / items.length * 100) : 0;
    
    if (progress) progress.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${done}/${items.length}`;
    
    list.innerHTML = items.map((item, i) => `
        <div class="checklist-item ${item.done ? 'done' : ''}" onclick="toggleChecklistItem(${i})">
            <span class="check-box">${item.done ? '✓' : ''}</span>
            <span class="check-text">${escapeHtml(item.text)}</span>
            <button class="delete-item-btn" onclick="event.stopPropagation(); deleteChecklistItem(${i})">✕</button>
        </div>
    `).join('');
}

async function toggleChecklistItem(index) {
    if (!state.currentChecklist) return;
    
    const items = state.currentChecklist.items || [];
    if (items[index]) {
        items[index].done = !items[index].done;
        await saveToFirestore('checklists', state.currentChecklist.id, { items });
        renderChecklistItems();
    }
}

async function deleteChecklistItem(index) {
    if (!state.currentChecklist) return;
    
    const items = state.currentChecklist.items || [];
    items.splice(index, 1);
    state.currentChecklist.items = items;
    
    await saveToFirestore('checklists', state.currentChecklist.id, { items });
    renderChecklistItems();
}

async function addChecklistItem() {
    if (!state.currentChecklist) return;
    
    const text = prompt('Nytt punkt:');
    if (!text?.trim()) return;
    
    const items = state.currentChecklist.items || [];
    items.push({ text: text.trim(), done: false });
    state.currentChecklist.items = items;
    
    await saveToFirestore('checklists', state.currentChecklist.id, { items });
    renderChecklistItems();
}

async function resetChecklist() {
    if (!state.currentChecklist) return;
    
    const items = (state.currentChecklist.items || []).map(i => ({ ...i, done: false }));
    state.currentChecklist.items = items;
    
    await saveToFirestore('checklists', state.currentChecklist.id, { items });
    renderChecklistItems();
    showToast('Sjekkliste tilbakestilt');
}

function deleteCurrentChecklist() {
    if (!state.currentChecklist) return;
    
    showConfirm('Slett sjekkliste?', `Er du sikker på at du vil slette "${state.currentChecklist.name}"?`, async () => {
        await deleteFromFirestore('checklists', state.currentChecklist.id);
        state.checklists = state.checklists.filter(c => c.id !== state.currentChecklist.id);
        state.currentChecklist = null;
        showToast('Sjekkliste slettet');
        showView('checklistsView');
    }, '🗑️');
}

function openChecklistModal() {
    const modal = $('checklistModal');
    const nameInput = $('checklistName');
    const iconSelect = $('checklistIcon');
    
    if (nameInput) nameInput.value = '';
    if (iconSelect) iconSelect.value = '📋';
    if (modal) modal.classList.add('active');
}

function closeChecklistModal() {
    const modal = $('checklistModal');
    if (modal) modal.classList.remove('active');
}

async function saveChecklist(e) {
    e.preventDefault();
    
    const name = $('checklistName')?.value?.trim();
    const icon = $('checklistIcon')?.value || '📋';
    
    if (!name) {
        showToast('Skriv inn et navn', 'error');
        return;
    }
    
    try {
        const data = { name, icon, items: [] };
        const id = await saveToFirestore('checklists', null, data);
        state.checklists.push({ id, ...data });
        
        closeChecklistModal();
        showToast('Sjekkliste opprettet ✓');
        renderChecklists();
    } catch (error) {
        showToast('Kunne ikke lagre sjekkliste', 'error');
    }
}

// ===== Favorites =====
function renderFavorites() {
    const list = $('allFavoritesList');
    if (!list) return;
    
    const favorites = state.articles.filter(a => a.favorite);
    
    if (favorites.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⭐</div>
                <p>Ingen favoritter ennå</p>
                <p class="empty-hint">Trykk på ⭐ i en artikkel for å legge til</p>
            </div>
        `;
    } else {
        list.innerHTML = favorites.map(a => `
            <div class="article-card" onclick="openArticle('${a.id}')">
                <div class="article-icon">⭐</div>
                <div class="article-info">
                    <h3>${escapeHtml(a.title)}</h3>
                    <p class="article-category">${getCategoryIcon(a.category)} ${getCategoryName(a.category)}</p>
                </div>
            </div>
        `).join('');
    }
}

// ===== Emergency =====
function renderEmergency() {
    const addressCard = $('farmAddress');
    const contactList = $('emergencyContactList');
    
    if (addressCard) {
        const address = state.settings?.address;
        addressCard.innerHTML = address 
            ? `<p>${escapeHtml(address).replace(/\n/g, '<br>')}</p><button id="editAddressBtn" class="edit-btn" onclick="openSettingsModal()">Rediger</button>`
            : `<p class="no-address">Ikke satt opp</p><button id="editAddressBtn" class="edit-btn" onclick="openSettingsModal()">Legg til</button>`;
    }
    
    if (contactList) {
        const emergencyContacts = state.contacts.filter(c => c.emergency);
        
        if (emergencyContacts.length === 0) {
            contactList.innerHTML = `<p class="no-contacts">Ingen nødkontakter lagt til</p>`;
        } else {
            contactList.innerHTML = emergencyContacts.map(c => `
                <a href="tel:${c.phone}" class="emergency-contact">
                    <span class="ec-name">${escapeHtml(c.name)}</span>
                    <span class="ec-phone">${c.phone}</span>
                </a>
            `).join('');
        }
    }
}

// ===== Search =====
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const clearBtn = $('clearSearch');
    
    if (clearBtn) clearBtn.classList.toggle('hidden', !query);
    
    if (query.length < 2) {
        if (state.currentView === 'searchView') {
            showView('dashboardView');
        }
        return;
    }
    
    const results = state.articles.filter(a => 
        a.title?.toLowerCase().includes(query) ||
        a.content?.toLowerCase().includes(query) ||
        a.tags?.toLowerCase().includes(query)
    );
    
    renderSearchResults(results, query);
    showView('searchView');
}

function renderSearchResults(results, query) {
    const list = $('searchResults');
    const count = $('searchCount');
    
    if (count) count.textContent = results.length;
    
    if (!list) return;
    
    if (results.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>Ingen treff for "${escapeHtml(query)}"</p>
            </div>
        `;
    } else {
        list.innerHTML = results.map(a => `
            <div class="article-card" onclick="openArticle('${a.id}')">
                <div class="article-icon">${getCategoryIcon(a.category)}</div>
                <div class="article-info">
                    <h3>${highlightMatch(a.title, query)}</h3>
                    <p class="article-category">${getCategoryIcon(a.category)} ${getCategoryName(a.category)}</p>
                </div>
            </div>
        `).join('');
    }
}

function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${query})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
}

function clearSearch() {
    const input = $('searchInput');
    const clearBtn = $('clearSearch');
    
    if (input) input.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    showView('dashboardView');
}

// ===== Menu =====
function openMenu() {
    const menu = $('sideMenu');
    const overlay = $('menuOverlay');
    if (menu) menu.classList.add('open');
    if (overlay) overlay.classList.add('active');
}

function closeMenu() {
    const menu = $('sideMenu');
    const overlay = $('menuOverlay');
    if (menu) menu.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// ===== Settings Modal =====
function openSettingsModal() {
    const modal = $('settingsModal');
    const farmNameInput = $('settingsFarmName');
    const addressInput = $('settingsAddress');
    
    if (farmNameInput) farmNameInput.value = state.settings?.farmName || '';
    if (addressInput) addressInput.value = state.settings?.address || '';
    if (modal) modal.classList.add('active');
}

function closeSettingsModal() {
    const modal = $('settingsModal');
    if (modal) modal.classList.remove('active');
}

async function saveSettings() {
    const farmName = $('settingsFarmName')?.value?.trim() || '';
    const address = $('settingsAddress')?.value?.trim() || '';
    
    state.settings = { ...state.settings, farmName, address };
    
    try {
        await db.collection('users').doc(state.user.uid).set({
            settings: state.settings
        }, { merge: true });
        
        updateUserUI();
        closeSettingsModal();
        showToast('Innstillinger lagret ✓');
    } catch (error) {
        showToast('Kunne ikke lagre innstillinger', 'error');
    }
}

function clearAllData() {
    showConfirm('Slett all data?', 'Dette kan ikke angres! All data vil bli permanent slettet.', async () => {
        try {
            // Delete all collections
            for (const article of state.articles) {
                await deleteFromFirestore('articles', article.id);
            }
            for (const contact of state.contacts) {
                await deleteFromFirestore('contacts', contact.id);
            }
            for (const checklist of state.checklists) {
                await deleteFromFirestore('checklists', checklist.id);
            }
            for (const category of state.categories) {
                if (!DEFAULT_CATEGORIES.some(d => d.id === category.id)) {
                    await deleteFromFirestore('categories', category.id);
                }
            }
            
            state.articles = [];
            state.contacts = [];
            state.checklists = [];
            state.categories = [...DEFAULT_CATEGORIES];
            state.settings = {};
            state.recentArticles = [];
            
            closeSettingsModal();
            showToast('All data slettet');
            renderDashboard();
        } catch (error) {
            showToast('Kunne ikke slette data', 'error');
        }
    }, '⚠️');
}

// ===== Sync/Export/Import =====
function openSyncModal() {
    const modal = $('syncModal');
    if (modal) modal.classList.add('active');
}

function closeSyncModal() {
    const modal = $('syncModal');
    if (modal) modal.classList.remove('active');
}

function exportData() {
    const data = {
        version: APP_VERSION,
        exportDate: new Date().toISOString(),
        categories: state.categories,
        articles: state.articles,
        contacts: state.contacts,
        checklists: state.checklists,
        settings: state.settings
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smabruk-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Data eksportert ✓');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.categories || !data.articles) {
                throw new Error('Invalid format');
            }
            
            showConfirm('Importer data?', 'Eksisterende data vil bli overskrevet.', async () => {
                // Save all data to Firestore
                for (const cat of data.categories) {
                    await saveToFirestore('categories', cat.id, cat);
                }
                for (const article of data.articles) {
                    await saveToFirestore('articles', article.id, article);
                }
                for (const contact of data.contacts || []) {
                    await saveToFirestore('contacts', contact.id, contact);
                }
                for (const checklist of data.checklists || []) {
                    await saveToFirestore('checklists', checklist.id, checklist);
                }
                
                state.categories = data.categories;
                state.articles = data.articles;
                state.contacts = data.contacts || [];
                state.checklists = data.checklists || [];
                state.settings = data.settings || {};
                
                renderDashboard();
                showToast('Data importert ✓');
            });
        } catch (error) {
            showToast('Ugyldig backup-fil', 'error');
        }
    };
    
    input.click();
}

// ===== About Modal =====
function openAboutModal() {
    const modal = $('aboutModal');
    if (modal) modal.classList.add('active');
}

function closeAboutModal() {
    const modal = $('aboutModal');
    if (modal) modal.classList.remove('active');
}

// ===== Lightbox =====
function openLightbox(src) {
    const lightbox = $('lightbox');
    if (!lightbox) return;
    
    const img = lightbox.querySelector('img');
    if (img) img.src = src;
    lightbox.classList.add('active');
}

function closeLightbox() {
    const lightbox = $('lightbox');
    if (lightbox) lightbox.classList.remove('active');
}

// ===== Confirm Modal =====
let confirmCallback = null;

function showConfirm(title, message, callback, icon = '⚠️') {
    const modal = $('confirmModal');
    const iconEl = $('confirmIcon');
    const titleEl = $('confirmTitle');
    const messageEl = $('confirmMessage');
    const okBtn = $('confirmOk');
    
    if (iconEl) iconEl.textContent = icon;
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    confirmCallback = callback;
    
    if (okBtn) {
        okBtn.onclick = () => {
            closeConfirmModal();
            if (confirmCallback) confirmCallback();
        };
    }
    
    if (modal) modal.classList.add('active');
}

function closeConfirmModal() {
    const modal = $('confirmModal');
    if (modal) modal.classList.remove('active');
    confirmCallback = null;
}

// ===== Toast =====
function showToast(message, type = 'success') {
    const toast = $('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Close All Modals =====
function closeAllModals() {
    $$('.modal').forEach(m => m.classList.remove('active'));
}

// ===== Global Functions (for onclick handlers) =====
window.openArticle = openArticle;
window.openCategory = openCategory;
window.openArticleModal = openArticleModal;
window.openContactModal = openContactModal;
window.openChecklistModal = openChecklistModal;
window.openChecklist = openChecklist;
window.openLightbox = openLightbox;
window.removeImage = removeImage;
window.selectEmoji = selectEmoji;
window.deleteCategory = deleteCategory;
window.toggleChecklistItem = toggleChecklistItem;
window.deleteChecklistItem = deleteChecklistItem;
window.openSettingsModal = openSettingsModal;

// ===== Start App =====
document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
});
