// ==========================================
// SMÅBRUK KUNNSKAPSBASE APP v3.0
// Firebase-basert med Google Auth
// ==========================================

const APP_VERSION = '3.0.0';

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

// Configure Firestore with caching
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    merge: true
});

// ===== Default Data =====
const DEFAULT_CATEGORIES = [
    { id: 'vedlikehold', name: 'Vedlikehold', icon: '🔧' },
    { id: 'dyr', name: 'Dyr', icon: '🐑' },
    { id: 'hage', name: 'Hage & Planter', icon: '🌱' },
    { id: 'maskiner', name: 'Maskiner', icon: '🚜' },
    { id: 'bygg', name: 'Bygg & Hus', icon: '🏠' },
    { id: 'tradisjon', name: 'Tradisjoner', icon: '📜' },
    { id: 'mat', name: 'Mat & Oppskrifter', icon: '🍲' },
    { id: 'annet', name: 'Annet', icon: '📝' }
];

const EMOJIS = ['🔧','🐑','🐔','🐄','🐖','🌱','🌳','🍎','🍓','🥕','🚜','🛠️','🏠','🏚️','🪵','📜','📚','📝','🍲','🥛','🧀','⚡','💧','🔥','❄️','🌤️','🌧️','🐝','🦆','🐕','🐈','🐴','🌻','🌿','🪨','⛏️','🪓','🧱','🏗️','🚿','💡','🔌','📞','🗓️','⭐','❤️','✅','🌸','☀️','🍂'];

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

// ===== DOM Elements =====
const $ = id => document.getElementById(id);

// Safe event listener helper
function on(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
}

// ===== Firestore Helpers =====
function userDoc(collection) {
    return db.collection('users').doc(state.user.uid).collection(collection);
}

async function saveToFirestore(collection, id, data) {
    const docData = { ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (id) {
        await userDoc(collection).doc(id).set(docData, { merge: true });
        return id;
    } else {
        docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await userDoc(collection).add(docData);
        return ref.id;
    }
}

async function deleteFromFirestore(collection, id) {
    await userDoc(collection).doc(id).delete();
}

async function loadCollection(collection) {
    const snapshot = await userDoc(collection).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ===== Auth Functions =====
let isLoggingIn = false; // Prevent multiple login attempts

function setupAuth() {
    // Login button
    on('googleLoginBtn', 'click', async () => {
        if (isLoggingIn) return; // Prevent multiple clicks
        isLoggingIn = true;
        
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
        } catch (error) {
            console.error('Login error:', error.code);
            if (error.code !== 'auth/cancelled-popup-request') {
                showToast('Innlogging feilet: ' + error.message, 'error');
            }
        } finally {
            isLoggingIn = false;
        }
    });

    // Auth state listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            state.user = user;
            $('loginScreen').classList.add('hidden');
            await initApp();
        } else {
            state.user = null;
            $('loginScreen').classList.remove('hidden');
            $('splashScreen').classList.add('hidden');
            $('mainApp').classList.add('hidden');
        }
    });
}

async function signOut() {
    try {
        await auth.signOut();
        showToast('Logget ut');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ===== Initialize App =====
async function initApp() {
    try {
        $('splashScreen').classList.remove('hidden');
        
        await loadAllData();
        setupEventListeners();
        renderDashboard();
        updateUserUI();
        
        setTimeout(() => {
            $('splashScreen').classList.add('hidden');
            $('mainApp').classList.remove('hidden');
        }, 1000);
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(console.error);
        }
        
    } catch (error) {
        console.error('Init error:', error.message);
        $('splashScreen').classList.add('hidden');
        $('mainApp').classList.remove('hidden');
        showToast(`Initialisering feilet: ${error.message}`);
    }
}

async function loadAllData() {
    try {
        // Load categories
        state.categories = await loadCollection('categories');
        if (state.categories.length === 0) {
            // Initialize with default categories
            for (const cat of DEFAULT_CATEGORIES) {
                await saveToFirestore('categories', cat.id, cat);
            }
            state.categories = DEFAULT_CATEGORIES;
        }
        
        state.articles = await loadCollection('articles');
        state.contacts = await loadCollection('contacts');
        state.checklists = await loadCollection('checklists');
        
        // Load settings
        try {
            const settingsDoc = await db.collection('users').doc(state.user.uid).get();
            state.settings = settingsDoc.data()?.settings || {};
            state.recentArticles = settingsDoc.data()?.recentArticles || [];
        } catch(e) {
            console.warn('Could not load user settings:', e.code);
            state.settings = {};
            state.recentArticles = [];
        }
    } catch (error) {
        console.error('Load data error:', error.code, error.message);
        throw new Error('Kunne ikke laste data fra database. Sjekk Firestore permissions.');
    }
}

function updateUserUI() {
    // Update sync button to show user avatar
    const syncBtn = $('syncBtn');
    if (syncBtn && state.user?.photoURL) {
        syncBtn.innerHTML = `<img src="${state.user.photoURL}" class="user-avatar" alt="Profil">`;
    }
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Search
    on('searchInput', 'input', handleSearch);
    on('clearSearch', 'click', clearSearch);
    
    // Header
    on('homeBtn', 'click', () => showView('dashboardView'));
    on('menuBtn', 'click', openMenu);
    on('syncBtn', 'click', openUserMenu);
    
    // Side Menu
    on('menuOverlay', 'click', closeMenu);
    on('closeMenu', 'click', closeMenu);
    on('menuHome', 'click', () => { closeMenu(); showView('dashboardView'); });
    on('menuSettings', 'click', () => { closeMenu(); openModal('settingsModal'); });
    on('menuCategories', 'click', () => { closeMenu(); openModal('categoryModal'); renderCategoryList(); });
    on('menuSync', 'click', () => { closeMenu(); openModal('syncModal'); });
    on('menuExport', 'click', () => { closeMenu(); exportData(); });
    on('menuImport', 'click', () => { closeMenu(); triggerImport(); });
    on('menuAbout', 'click', () => { closeMenu(); openModal('aboutModal'); });
    
    // Navigation
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view) showView(view);
        });
    });
    
    // FAB
    on('addBtn', 'click', () => openArticleModal());
    
    // Quick Actions
    on('quickAddBtn', 'click', () => openArticleModal());
    on('quickContactBtn', 'click', () => showView('contactsView'));
    on('quickChecklistBtn', 'click', () => showView('checklistsView'));
    on('quickEmergencyBtn', 'click', () => showView('emergencyView'));
    
    // Dashboard
    on('manageCategoriesBtn', 'click', () => { openModal('categoryModal'); renderCategoryList(); });
    on('seeAllFavorites', 'click', () => showView('favoritesView'));
    on('clearRecent', 'click', clearRecentArticles);
    
    // Back buttons
    on('backToCategories', 'click', () => showView('dashboardView'));
    on('backToArticles', 'click', goBackFromArticle);
    on('backFromSearch', 'click', () => showView('dashboardView'));
    on('backFromContacts', 'click', () => showView('dashboardView'));
    on('backFromChecklists', 'click', () => showView('dashboardView'));
    on('backFromChecklistDetail', 'click', () => showView('checklistsView'));
    on('backFromEmergency', 'click', () => showView('dashboardView'));
    on('backFromFavorites', 'click', () => showView('dashboardView'));
    
    // Article actions
    on('favoriteArticleBtn', 'click', toggleArticleFavorite);
    on('editArticleBtn', 'click', editCurrentArticle);
    on('deleteArticleBtn', 'click', deleteCurrentArticle);
    on('sortSelect', 'change', renderArticlesList);
    
    // Add buttons in views
    on('addContactBtn', 'click', () => openContactModal());
    on('addChecklistBtn', 'click', () => openChecklistModal());
    on('addChecklistItemBtn', 'click', addChecklistItem);
    on('resetChecklistBtn', 'click', resetChecklist);
    on('deleteChecklistBtn', 'click', deleteCurrentChecklist);
    
    // Emergency
    on('editAddressBtn', 'click', editEmergencyAddress);
    
    // Article Modal
    on('closeArticleModal', 'click', () => closeModal('articleModal'));
    on('articleForm', 'submit', saveArticle);
    on('imageInput', 'change', handleImageSelect);
    on('cameraInput', 'change', handleImageSelect);
    on('addImageBtn', 'click', () => $('imageInput')?.click());
    on('cameraBtn', 'click', () => $('cameraInput')?.click());
    
    // Category Modal
    on('closeCategoryModal', 'click', () => closeModal('categoryModal'));
    on('selectEmojiBtn', 'click', openEmojiPicker);
    on('addCategoryBtn', 'click', addNewCategory);
    
    // Contact Modal
    on('closeContactModal', 'click', () => closeModal('contactModal'));
    on('contactForm', 'submit', saveContact);
    
    // Checklist Modal
    on('closeChecklistModal', 'click', () => closeModal('checklistModal'));
    on('checklistForm', 'submit', saveChecklist);
    
    // Sync Modal
    on('closeSyncModal', 'click', () => closeModal('syncModal'));
    on('syncExportBtn', 'click', exportData);
    on('syncImportBtn', 'click', triggerImport);
    
    // Settings Modal
    on('closeSettingsModal', 'click', () => closeModal('settingsModal'));
    on('saveSettingsBtn', 'click', saveSettings);
    on('clearAllDataBtn', 'click', confirmClearAllData);
    
    // About Modal
    on('closeAboutModal', 'click', () => closeModal('aboutModal'));
    
    // Confirm Modal
    on('confirmCancel', 'click', () => closeModal('confirmModal'));
    
    // Lightbox
    const lightbox = $('lightbox');
    if (lightbox) {
        lightbox.querySelector('.lb-close')?.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });
    }
    
    // Hidden file input for import
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.id = 'importFileInput';
    importInput.style.display = 'none';
    importInput.addEventListener('change', handleImport);
    document.body.appendChild(importInput);
}

// ===== User Menu =====
function openUserMenu() {
    let menu = $('userMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'userMenu';
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-menu-header">
                <div class="user-menu-name">${state.user?.displayName || 'Bruker'}</div>
                <div class="user-menu-email">${state.user?.email || ''}</div>
            </div>
            <button class="user-menu-item" onclick="showView('dashboardView'); closeUserMenu();">
                <span>🏠</span> Hjem
            </button>
            <button class="user-menu-item" onclick="openModal('syncModal'); closeUserMenu();">
                <span>🔄</span> Synkroniser
            </button>
            <button class="user-menu-item" onclick="openModal('settingsModal'); closeUserMenu();">
                <span>⚙️</span> Innstillinger
            </button>
            <button class="user-menu-item danger" onclick="signOut(); closeUserMenu();">
                <span>🚪</span> Logg ut
            </button>
        `;
        $('syncBtn').parentElement.appendChild(menu);
        $('syncBtn').parentElement.style.position = 'relative';
        
        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#syncBtn') && !e.target.closest('#userMenu')) {
                closeUserMenu();
            }
        });
    }
    menu.classList.toggle('active');
}

function closeUserMenu() {
    $('userMenu')?.classList.remove('active');
}

// ===== Navigation =====
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $(viewId)?.classList.add('active');
    state.currentView = viewId;
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });
    
    // Render view content
    switch(viewId) {
        case 'dashboardView': renderDashboard(); break;
        case 'contactsView': renderContacts(); break;
        case 'checklistsView': renderChecklists(); break;
        case 'emergencyView': renderEmergency(); break;
        case 'favoritesView': renderFavorites(); break;
    }
}

// ===== Dashboard =====
function renderDashboard() {
    // Stats (with null checks)
    const favorites = state.articles.filter(a => a.favorite);
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
    const recentArticles = state.recentArticles
        .map(id => state.articles.find(a => a.id === id))
        .filter(Boolean);
    
    if (recentSection && recentList) {
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
    
    // Categories
    renderCategoriesGrid();
}

function renderCategoriesGrid() {
    const grid = $('categoryGrid');
    if (!grid) {
        console.error('categoryGrid element not found');
        return;
    }
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

// ===== Category & Articles =====
function openCategory(categoryId) {
    state.currentCategory = categoryId;
    const cat = state.categories.find(c => c.id === categoryId);
    $('categoryTitle').textContent = cat ? `${cat.icon} ${cat.name}` : 'Artikler';
    showView('articlesView');
    renderArticlesList();
}

function renderArticlesList() {
    const list = $('articlesList');
    let articles = state.articles.filter(a => a.category === state.currentCategory);
    
    // Sort
    const sort = $('sortSelect')?.value || 'alpha';
    if (sort === 'alpha') articles.sort((a, b) => a.title.localeCompare(b.title, 'nb'));
    else if (sort === 'newest') articles.sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt));
    else if (sort === 'oldest') articles.sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
    
    if (articles.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><h3>Ingen artikler</h3><p>Trykk + for å legge til</p></div>`;
        return;
    }
    
    list.innerHTML = articles.map(a => `
        <div class="article-item" onclick="openArticle('${a.id}')">
            <div class="article-icon">${a.favorite ? '⭐' : getCategoryIcon(a.category)}</div>
            <div class="article-info">
                <div class="article-title">${escapeHtml(a.title)}</div>
                <div class="article-preview">${escapeHtml((a.content || '').substring(0, 60))}${(a.content || '').length > 60 ? '...' : ''}</div>
            </div>
            ${a.images?.length ? '<div class="article-has-image">📷</div>' : ''}
        </div>
    `).join('');
}

function openArticle(articleId) {
    const article = state.articles.find(a => a.id === articleId);
    if (!article) return;
    
    state.currentArticle = article;
    $('articleTitle').textContent = article.title;
    $('articleContent').innerHTML = formatContent(article.content);
    
    // Favorite button
    const favBtn = $('favoriteArticleBtn');
    favBtn.classList.toggle('active', article.favorite);
    favBtn.innerHTML = article.favorite 
        ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
    
    // Images
    const gallery = $('articleGallery');
    if (article.images?.length) {
        gallery.innerHTML = article.images.map((img, i) => 
            `<img src="${img}" alt="Bilde ${i+1}" class="gallery-img" onclick="openLightbox('${img}')">`
        ).join('');
        gallery.style.display = 'flex';
    } else {
        gallery.style.display = 'none';
    }
    
    // Add to recent
    addToRecent(articleId);
    
    showView('articleView');
}

async function addToRecent(articleId) {
    state.recentArticles = [articleId, ...state.recentArticles.filter(id => id !== articleId)].slice(0, 10);
    await db.collection('users').doc(state.user.uid).set({ recentArticles: state.recentArticles }, { merge: true });
}

async function clearRecentArticles() {
    state.recentArticles = [];
    await db.collection('users').doc(state.user.uid).set({ recentArticles: [] }, { merge: true });
    renderDashboard();
    showToast('Nylig sett tømt');
}

function goBackFromArticle() {
    if (state.currentCategory) {
        showView('articlesView');
    } else {
        showView('dashboardView');
    }
}

// ===== Article Modal =====
function openArticleModal(article = null) {
    state.editingArticle = article;
    state.tempImages = article?.images || [];
    
    $('modalTitle').textContent = article ? 'Rediger artikkel' : 'Ny artikkel';
    $('articleTitleInput').value = article?.title || '';
    $('articleContentInput').value = article?.content || '';
    $('articleCategorySelect').value = article?.category || state.currentCategory || state.categories[0]?.id || '';
    
    // Populate category select
    $('articleCategorySelect').innerHTML = state.categories.map(c => 
        `<option value="${c.id}">${c.icon} ${c.name}</option>`
    ).join('');
    if (article?.category) $('articleCategorySelect').value = article.category;
    else if (state.currentCategory) $('articleCategorySelect').value = state.currentCategory;
    
    renderTempImages();
    openModal('articleModal');
}

function renderTempImages() {
    const preview = $('imagePreview');
    if (state.tempImages.length === 0) {
        preview.innerHTML = '<p class="no-images">Ingen bilder lagt til</p>';
        return;
    }
    preview.innerHTML = state.tempImages.map((img, i) => `
        <div class="preview-img-wrap">
            <img src="${img}" alt="Bilde ${i+1}">
            <button type="button" class="remove-img" onclick="removeTempImage(${i})">✕</button>
        </div>
    `).join('');
}

function removeTempImage(index) {
    state.tempImages.splice(index, 1);
    renderTempImages();
}

function handleImageSelect(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            // Compress image
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 800;
                let w = img.width, h = img.height;
                if (w > maxSize || h > maxSize) {
                    if (w > h) { h = h * maxSize / w; w = maxSize; }
                    else { w = w * maxSize / h; h = maxSize; }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                state.tempImages.push(canvas.toDataURL('image/jpeg', 0.7));
                renderTempImages();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
    e.target.value = '';
}

async function saveArticle(e) {
    e.preventDefault();
    
    const title = $('articleTitleInput').value.trim();
    const content = $('articleContentInput').value.trim();
    const category = $('articleCategorySelect').value;
    
    if (!title) {
        showToast('Skriv inn en tittel');
        return;
    }
    
    const articleData = {
        title,
        content,
        category,
        images: state.tempImages,
        favorite: state.editingArticle?.favorite || false
    };
    
    try {
        const id = await saveToFirestore('articles', state.editingArticle?.id, articleData);
        
        // Update local state
        if (state.editingArticle) {
            const idx = state.articles.findIndex(a => a.id === state.editingArticle.id);
            if (idx >= 0) state.articles[idx] = { ...state.articles[idx], ...articleData };
        } else {
            state.articles.push({ id, ...articleData });
        }
        
        closeModal('articleModal');
        showToast(state.editingArticle ? 'Artikkel oppdatert' : 'Artikkel lagret');
        
        if (state.currentView === 'articlesView') renderArticlesList();
        else if (state.currentView === 'dashboardView') renderDashboard();
        
    } catch (error) {
        console.error('Save error:', error);
        showToast('Kunne ikke lagre');
    }
}

function editCurrentArticle() {
    if (state.currentArticle) openArticleModal(state.currentArticle);
}

async function deleteCurrentArticle() {
    if (!state.currentArticle) return;
    
    openConfirmModal('Slett artikkel?', 'Artikkelen vil bli permanent slettet.', async () => {
        try {
            await deleteFromFirestore('articles', state.currentArticle.id);
            state.articles = state.articles.filter(a => a.id !== state.currentArticle.id);
            state.currentArticle = null;
            closeModal('confirmModal');
            showView('articlesView');
            renderArticlesList();
            showToast('Artikkel slettet');
        } catch (error) {
            showToast('Kunne ikke slette');
        }
    });
}

async function toggleArticleFavorite() {
    if (!state.currentArticle) return;
    
    state.currentArticle.favorite = !state.currentArticle.favorite;
    
    try {
        await saveToFirestore('articles', state.currentArticle.id, { favorite: state.currentArticle.favorite });
        
        const idx = state.articles.findIndex(a => a.id === state.currentArticle.id);
        if (idx >= 0) state.articles[idx].favorite = state.currentArticle.favorite;
        
        openArticle(state.currentArticle.id);
        showToast(state.currentArticle.favorite ? 'Lagt til i favoritter' : 'Fjernet fra favoritter');
    } catch (error) {
        showToast('Kunne ikke oppdatere');
    }
}

// ===== Contacts =====
function renderContacts() {
    const list = $('contactsList');
    
    if (state.contacts.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">📞</div><h3>Ingen kontakter ennå</h3><p>Legg til håndverkere, leverandører m.m.</p></div>`;
        return;
    }
    
    const sorted = [...state.contacts].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    list.innerHTML = sorted.map(c => `
        <div class="contact-card" onclick="editContact('${c.id}')">
            <div class="contact-avatar">${c.name.charAt(0).toUpperCase()}</div>
            <div class="contact-info">
                <div class="contact-name">${escapeHtml(c.name)}</div>
                <div class="contact-role">${escapeHtml(c.role || '')}</div>
            </div>
            <div class="contact-actions">
                ${c.phone ? `<a href="tel:${c.phone}" class="contact-btn" onclick="event.stopPropagation()">📞</a>` : ''}
                ${c.email ? `<a href="mailto:${c.email}" class="contact-btn" onclick="event.stopPropagation()">✉️</a>` : ''}
            </div>
        </div>
    `).join('');
}

function openContactModal(contact = null) {
    state.editingContact = contact;
    $('contactModalTitle').textContent = contact ? 'Rediger kontakt' : 'Ny kontakt';
    $('contactNameInput').value = contact?.name || '';
    $('contactRoleInput').value = contact?.role || '';
    $('contactPhoneInput').value = contact?.phone || '';
    $('contactEmailInput').value = contact?.email || '';
    $('contactNotesInput').value = contact?.notes || '';
    
    // Show/hide delete button
    const deleteBtn = $('deleteContactBtn');
    if (deleteBtn) deleteBtn.style.display = contact ? 'block' : 'none';
    
    openModal('contactModal');
}

function editContact(contactId) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (contact) openContactModal(contact);
}

async function saveContact(e) {
    e.preventDefault();
    
    const name = $('contactNameInput').value.trim();
    if (!name) {
        showToast('Skriv inn et navn');
        return;
    }
    
    const contactData = {
        name,
        role: $('contactRoleInput').value.trim(),
        phone: $('contactPhoneInput').value.trim(),
        email: $('contactEmailInput').value.trim(),
        notes: $('contactNotesInput').value.trim()
    };
    
    try {
        const id = await saveToFirestore('contacts', state.editingContact?.id, contactData);
        
        if (state.editingContact) {
            const idx = state.contacts.findIndex(c => c.id === state.editingContact.id);
            if (idx >= 0) state.contacts[idx] = { ...state.contacts[idx], ...contactData };
        } else {
            state.contacts.push({ id, ...contactData });
        }
        
        closeModal('contactModal');
        renderContacts();
        showToast(state.editingContact ? 'Kontakt oppdatert' : 'Kontakt lagret');
    } catch (error) {
        showToast('Kunne ikke lagre');
    }
}

// ===== Checklists =====
function renderChecklists() {
    const list = $('checklistsList');
    
    if (state.checklists.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><h3>Ingen sjekklister</h3><p>Lag sjekklister for gjentakende oppgaver</p></div>`;
        return;
    }
    
    list.innerHTML = state.checklists.map(cl => {
        const total = cl.items?.length || 0;
        const done = cl.items?.filter(i => i.checked).length || 0;
        const pct = total > 0 ? Math.round(done / total * 100) : 0;
        return `
            <div class="checklist-card" onclick="openChecklist('${cl.id}')">
                <div class="checklist-icon">📋</div>
                <div class="checklist-info">
                    <div class="checklist-name">${escapeHtml(cl.name)}</div>
                    <div class="checklist-progress">
                        <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
                        <span>${done}/${total}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openChecklist(checklistId) {
    const checklist = state.checklists.find(c => c.id === checklistId);
    if (!checklist) return;
    
    state.currentChecklist = checklist;
    $('checklistDetailTitle').textContent = checklist.name;
    renderChecklistItems();
    showView('checklistDetailView');
}

function renderChecklistItems() {
    const list = $('checklistItems');
    const items = state.currentChecklist?.items || [];
    
    if (items.length === 0) {
        list.innerHTML = '<p class="empty-text">Ingen punkter ennå</p>';
        return;
    }
    
    list.innerHTML = items.map((item, i) => `
        <div class="checklist-item ${item.checked ? 'checked' : ''}">
            <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleChecklistItem(${i})">
            <span>${escapeHtml(item.text)}</span>
            <button class="remove-item" onclick="removeChecklistItem(${i})">✕</button>
        </div>
    `).join('');
}

async function toggleChecklistItem(index) {
    if (!state.currentChecklist) return;
    
    state.currentChecklist.items[index].checked = !state.currentChecklist.items[index].checked;
    
    try {
        await saveToFirestore('checklists', state.currentChecklist.id, { items: state.currentChecklist.items });
        renderChecklistItems();
    } catch (error) {
        showToast('Kunne ikke oppdatere');
    }
}

async function removeChecklistItem(index) {
    if (!state.currentChecklist) return;
    
    state.currentChecklist.items.splice(index, 1);
    
    try {
        await saveToFirestore('checklists', state.currentChecklist.id, { items: state.currentChecklist.items });
        renderChecklistItems();
    } catch (error) {
        showToast('Kunne ikke slette');
    }
}

async function addChecklistItem() {
    if (!state.currentChecklist) return;
    
    const text = prompt('Nytt punkt:');
    if (!text?.trim()) return;
    
    if (!state.currentChecklist.items) state.currentChecklist.items = [];
    state.currentChecklist.items.push({ text: text.trim(), checked: false });
    
    try {
        await saveToFirestore('checklists', state.currentChecklist.id, { items: state.currentChecklist.items });
        renderChecklistItems();
    } catch (error) {
        showToast('Kunne ikke legge til');
    }
}

async function resetChecklist() {
    if (!state.currentChecklist) return;
    
    state.currentChecklist.items.forEach(item => item.checked = false);
    
    try {
        await saveToFirestore('checklists', state.currentChecklist.id, { items: state.currentChecklist.items });
        renderChecklistItems();
        showToast('Sjekkliste nullstilt');
    } catch (error) {
        showToast('Kunne ikke nullstille');
    }
}

async function deleteCurrentChecklist() {
    if (!state.currentChecklist) return;
    
    openConfirmModal('Slett sjekkliste?', 'Sjekklisten vil bli permanent slettet.', async () => {
        try {
            await deleteFromFirestore('checklists', state.currentChecklist.id);
            state.checklists = state.checklists.filter(c => c.id !== state.currentChecklist.id);
            state.currentChecklist = null;
            closeModal('confirmModal');
            showView('checklistsView');
            renderChecklists();
            showToast('Sjekkliste slettet');
        } catch (error) {
            showToast('Kunne ikke slette');
        }
    });
}

function openChecklistModal(checklist = null) {
    state.editingChecklist = checklist;
    $('checklistModalTitle').textContent = checklist ? 'Rediger sjekkliste' : 'Ny sjekkliste';
    $('checklistNameInput').value = checklist?.name || '';
    openModal('checklistModal');
}

async function saveChecklist(e) {
    e.preventDefault();
    
    const name = $('checklistNameInput').value.trim();
    if (!name) {
        showToast('Skriv inn et navn');
        return;
    }
    
    const checklistData = {
        name,
        items: state.editingChecklist?.items || []
    };
    
    try {
        const id = await saveToFirestore('checklists', state.editingChecklist?.id, checklistData);
        
        if (state.editingChecklist) {
            const idx = state.checklists.findIndex(c => c.id === state.editingChecklist.id);
            if (idx >= 0) state.checklists[idx] = { ...state.checklists[idx], ...checklistData };
        } else {
            state.checklists.push({ id, ...checklistData });
        }
        
        closeModal('checklistModal');
        renderChecklists();
        showToast(state.editingChecklist ? 'Sjekkliste oppdatert' : 'Sjekkliste opprettet');
    } catch (error) {
        showToast('Kunne ikke lagre');
    }
}

// ===== Emergency =====
function renderEmergency() {
    const address = state.settings.farmAddress || 'Ikke satt opp ennå';
    $('farmAddress').innerHTML = `<p>${escapeHtml(address)}</p><button id="editAddressBtn" class="edit-btn" onclick="editEmergencyAddress()">Rediger</button>`;
}

function editEmergencyAddress() {
    const current = state.settings.farmAddress || '';
    const newAddress = prompt('Gårdens adresse (for nødetater):', current);
    if (newAddress !== null) {
        state.settings.farmAddress = newAddress.trim();
        db.collection('users').doc(state.user.uid).set({ settings: state.settings }, { merge: true });
        renderEmergency();
        showToast('Adresse oppdatert');
    }
}

// ===== Favorites =====
function renderFavorites() {
    const list = $('favoritesList2');
    const favorites = state.articles.filter(a => a.favorite);
    
    if (favorites.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">⭐</div><h3>Ingen favoritter</h3><p>Marker artikler som favoritter</p></div>`;
        return;
    }
    
    list.innerHTML = favorites.map(a => `
        <div class="article-item" onclick="openArticle('${a.id}')">
            <div class="article-icon">⭐</div>
            <div class="article-info">
                <div class="article-title">${escapeHtml(a.title)}</div>
                <div class="article-preview">${escapeHtml((a.content || '').substring(0, 60))}</div>
            </div>
        </div>
    `).join('');
}

// ===== Search =====
function handleSearch() {
    const query = $('searchInput').value.toLowerCase().trim();
    const clearBtn = $('clearSearch');
    
    clearBtn.classList.toggle('hidden', !query);
    
    if (!query) {
        showView('dashboardView');
        return;
    }
    
    const results = state.articles.filter(a => 
        a.title.toLowerCase().includes(query) || 
        (a.content || '').toLowerCase().includes(query)
    );
    
    showView('searchView');
    $('searchQuery').textContent = query;
    $('searchCount').textContent = `${results.length} resultat${results.length !== 1 ? 'er' : ''}`;
    
    const list = $('searchResults');
    if (results.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>Ingen treff</h3><p>Prøv andre søkeord</p></div>`;
    } else {
        list.innerHTML = results.map(a => `
            <div class="article-item" onclick="openArticle('${a.id}')">
                <div class="article-icon">${getCategoryIcon(a.category)}</div>
                <div class="article-info">
                    <div class="article-title">${escapeHtml(a.title)}</div>
                    <div class="article-preview">${escapeHtml((a.content || '').substring(0, 80))}</div>
                </div>
            </div>
        `).join('');
    }
}

function clearSearch() {
    $('searchInput').value = '';
    $('clearSearch').classList.add('hidden');
    showView('dashboardView');
}

// ===== Categories =====
function renderCategoryList() {
    const list = $('categoryList');
    list.innerHTML = state.categories.map(c => `
        <div class="category-list-item">
            <span class="cat-icon">${c.icon}</span>
            <span class="cat-name">${escapeHtml(c.name)}</span>
            <button class="cat-delete" onclick="deleteCategory('${c.id}')">🗑️</button>
        </div>
    `).join('');
}

function openEmojiPicker() {
    const picker = $('emojiPicker');
    picker.innerHTML = EMOJIS.map(e => `<span class="emoji-option" onclick="selectEmoji('${e}')">${e}</span>`).join('');
    picker.classList.toggle('hidden');
}

function selectEmoji(emoji) {
    $('selectedEmoji').textContent = emoji;
    $('emojiPicker').classList.add('hidden');
}

async function addNewCategory() {
    const name = $('newCategoryName').value.trim();
    const icon = $('selectedEmoji').textContent;
    
    if (!name) {
        showToast('Skriv inn et kategorinavn');
        return;
    }
    
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zæøå0-9-]/g, '');
    
    if (state.categories.find(c => c.id === id)) {
        showToast('Kategorien finnes allerede');
        return;
    }
    
    const categoryData = { id, name, icon };
    
    try {
        await saveToFirestore('categories', id, categoryData);
        state.categories.push(categoryData);
        
        $('newCategoryName').value = '';
        $('selectedEmoji').textContent = '📁';
        
        renderCategoryList();
        renderCategoriesGrid();
        showToast('Kategori opprettet');
    } catch (error) {
        showToast('Kunne ikke opprette');
    }
}

async function deleteCategory(categoryId) {
    const articlesInCategory = state.articles.filter(a => a.category === categoryId).length;
    
    if (articlesInCategory > 0) {
        showToast(`Kan ikke slette: ${articlesInCategory} artikler i kategorien`);
        return;
    }
    
    try {
        await deleteFromFirestore('categories', categoryId);
        state.categories = state.categories.filter(c => c.id !== categoryId);
        renderCategoryList();
        renderCategoriesGrid();
        showToast('Kategori slettet');
    } catch (error) {
        showToast('Kunne ikke slette');
    }
}

// ===== Menu =====
function openMenu() {
    $('sideMenu')?.classList.add('open');
    $('menuOverlay')?.classList.add('active');
}

function closeMenu() {
    $('sideMenu')?.classList.remove('open');
    $('menuOverlay')?.classList.remove('active');
}

// ===== Modal =====
function openModal(modalId) {
    $(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    $(modalId)?.classList.remove('active');
}

function openConfirmModal(title, message, callback, icon = '⚠️') {
    $('confirmIcon').textContent = icon;
    $('confirmTitle').textContent = title;
    $('confirmMessage').textContent = message;
    
    const okBtn = $('confirmOk');
    const newBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newBtn, okBtn);
    newBtn.addEventListener('click', callback);
    
    openModal('confirmModal');
}

// ===== Lightbox =====
function openLightbox(src) {
    const lb = $('lightbox');
    lb.querySelector('img').src = src;
    lb.classList.add('active');
}

function closeLightbox() {
    $('lightbox')?.classList.remove('active');
}

// ===== Toast =====
function showToast(message, duration = 3000) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== Settings =====
async function saveSettings() {
    try {
        await db.collection('users').doc(state.user.uid).set({ settings: state.settings }, { merge: true });
        closeModal('settingsModal');
        showToast('Innstillinger lagret');
    } catch (error) {
        showToast('Kunne ikke lagre');
    }
}

function confirmClearAllData() {
    openConfirmModal('Slett all data?', 'Dette vil slette alle artikler, kontakter og sjekklister permanent. Denne handlingen kan ikke angres!', async () => {
        try {
            // Delete all user data
            const batch = db.batch();
            
            for (const a of state.articles) batch.delete(userDoc('articles').doc(a.id));
            for (const c of state.contacts) batch.delete(userDoc('contacts').doc(c.id));
            for (const c of state.checklists) batch.delete(userDoc('checklists').doc(c.id));
            for (const c of state.categories) batch.delete(userDoc('categories').doc(c.id));
            
            await batch.commit();
            
            state.articles = [];
            state.contacts = [];
            state.checklists = [];
            state.categories = [...DEFAULT_CATEGORIES];
            
            for (const cat of DEFAULT_CATEGORIES) {
                await saveToFirestore('categories', cat.id, cat);
            }
            
            closeModal('confirmModal');
            closeModal('settingsModal');
            showView('dashboardView');
            renderDashboard();
            showToast('All data slettet');
        } catch (error) {
            showToast('Kunne ikke slette');
        }
    }, '🗑️');
}

// ===== Export/Import =====
async function exportData() {
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
    a.download = `smabruk-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data eksportert');
}

function triggerImport() {
    $('importFileInput')?.click();
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        openConfirmModal('Importer data?', 'Eksisterende data vil bli erstattet med importert data.', async () => {
            try {
                // Import categories
                if (data.categories) {
                    for (const cat of data.categories) {
                        await saveToFirestore('categories', cat.id, cat);
                    }
                    state.categories = data.categories;
                }
                
                // Import articles
                if (data.articles) {
                    for (const article of data.articles) {
                        const id = article.id;
                        delete article.id;
                        await saveToFirestore('articles', id, article);
                    }
                    state.articles = data.articles;
                }
                
                // Import contacts
                if (data.contacts) {
                    for (const contact of data.contacts) {
                        const id = contact.id;
                        delete contact.id;
                        await saveToFirestore('contacts', id, contact);
                    }
                    state.contacts = data.contacts;
                }
                
                // Import checklists
                if (data.checklists) {
                    for (const checklist of data.checklists) {
                        const id = checklist.id;
                        delete checklist.id;
                        await saveToFirestore('checklists', id, checklist);
                    }
                    state.checklists = data.checklists;
                }
                
                closeModal('confirmModal');
                showView('dashboardView');
                renderDashboard();
                showToast('Data importert!');
            } catch (error) {
                console.error('Import error:', error);
                showToast('Importering feilet');
            }
        });
    } catch (error) {
        showToast('Kunne ikke lese fil');
    }
    
    e.target.value = '';
}

// ===== Helpers =====
function getCategoryIcon(categoryId) {
    const cat = state.categories.find(c => c.id === categoryId);
    return cat?.icon || '📄';
}

function formatContent(text) {
    if (!text) return '';
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// ===== Start App =====
document.addEventListener('DOMContentLoaded', setupAuth);
