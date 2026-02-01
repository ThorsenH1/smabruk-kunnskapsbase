// ==========================================
// SMÅBRUK KUNNSKAPSBASE APP v2.0
// IndexedDB-basert med PWA-støtte
// ==========================================

const APP_VERSION = '2.0.0';

// ===== IndexedDB Setup =====
const DB_NAME = 'smabruk_kunnskapsbase';
const DB_VERSION = 2;
let db;

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

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { db = request.result; resolve(db); };
        
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            
            if (!database.objectStoreNames.contains('articles')) {
                const articlesStore = database.createObjectStore('articles', { keyPath: 'id' });
                articlesStore.createIndex('category', 'category', { unique: false });
                articlesStore.createIndex('favorite', 'favorite', { unique: false });
                articlesStore.createIndex('updated', 'updated', { unique: false });
            }
            
            if (!database.objectStoreNames.contains('categories')) {
                database.createObjectStore('categories', { keyPath: 'id' });
            }
            
            if (!database.objectStoreNames.contains('contacts')) {
                database.createObjectStore('contacts', { keyPath: 'id' });
            }
            
            if (!database.objectStoreNames.contains('checklists')) {
                database.createObjectStore('checklists', { keyPath: 'id' });
            }
            
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
}

// ===== DB Operations =====
const dbOps = {
    getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    get(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    put(storeName, item) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    clear(storeName) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

// ===== App State =====
const state = {
    categories: [],
    articles: [],
    contacts: [],
    checklists: [],
    settings: {},
    currentView: 'dashboardView',
    currentCategory: null,
    currentArticle: null,
    currentChecklist: null,
    editingArticle: null,
    editingContact: null,
    selectedEmoji: '📁',
    tempImages: [],
    recentArticles: []
};

// ===== DOM Elements =====
const $ = id => document.getElementById(id);

// Safe event listener helper - won't crash if element doesn't exist
function on(id, event, handler) {
    const el = $(id);
    if (el) {
        el.addEventListener(event, handler);
    } else {
        console.warn(`Element #${id} not found`);
    }
}

// ===== Initialize App =====
async function initApp() {
    try {
        await initDB();
        await loadAllData();
        setupEventListeners();
        renderDashboard();
        
        // Hide splash after load
        setTimeout(() => {
            $('splashScreen').classList.add('hidden');
            $('mainApp').classList.remove('hidden');
        }, 1500);
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(console.error);
        }
        
    } catch (error) {
        console.error('Init error:', error);
        showToast('Feil ved oppstart');
    }
}

async function loadAllData() {
    state.categories = await dbOps.getAll('categories');
    if (state.categories.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
            await dbOps.put('categories', cat);
        }
        state.categories = DEFAULT_CATEGORIES;
    }
    
    state.articles = await dbOps.getAll('articles');
    state.contacts = await dbOps.getAll('contacts');
    state.checklists = await dbOps.getAll('checklists');
    
    const settings = await dbOps.getAll('settings');
    settings.forEach(s => state.settings[s.key] = s.value);
    
    // Load recent from localStorage
    try {
        state.recentArticles = JSON.parse(localStorage.getItem('recentArticles') || '[]');
    } catch(e) {
        state.recentArticles = [];
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
    on('syncBtn', 'click', () => openModal('syncModal'));
    
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
    on('backFromFavorites', 'click', () => showView('favoritesView'));
    
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

// ===== Navigation =====
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $(viewId)?.classList.add('active');
    state.currentView = viewId;
    
    // Update nav
    document.querySelectorAll('.nav-item[data-view]').forEach(n => {
        n.classList.toggle('active', n.dataset.view === viewId);
    });
    
    // Render view content
    switch(viewId) {
        case 'dashboardView': renderDashboard(); break;
        case 'articlesView': renderArticlesList(); break;
        case 'contactsView': renderContacts(); break;
        case 'checklistsView': renderChecklists(); break;
        case 'emergencyView': renderEmergency(); break;
        case 'favoritesView': renderFavorites(); break;
    }
    
    // Show/hide FAB
    $('addBtn').classList.toggle('hidden', ['articleView', 'checklistDetailView', 'emergencyView', 'searchView'].includes(viewId));
}

function goBackFromArticle() {
    if (state.currentCategory) {
        showView('articlesView');
    } else {
        showView('dashboardView');
    }
}

// ===== Render Functions =====
function renderDashboard() {
    // Stats
    $('totalArticles').textContent = state.articles.length;
    $('totalCategories').textContent = state.categories.length;
    $('totalFavorites').textContent = state.articles.filter(a => a.favorite).length;
    
    // Favorites section
    const favorites = state.articles.filter(a => a.favorite);
    const favSection = $('favoritesSection');
    if (favorites.length > 0) {
        favSection.style.display = 'block';
        $('favoritesList').innerHTML = favorites.slice(0, 6).map(a => renderHCard(a)).join('');
    } else {
        favSection.style.display = 'none';
    }
    
    // Recent section
    const recentSection = $('recentSection');
    const validRecent = state.recentArticles.filter(id => state.articles.find(a => a.id === id));
    if (validRecent.length > 0) {
        recentSection.style.display = 'block';
        $('recentList').innerHTML = validRecent.slice(0, 6).map(id => {
            const article = state.articles.find(a => a.id === id);
            return article ? renderHCard(article) : '';
        }).join('');
    } else {
        recentSection.style.display = 'none';
    }
    
    // Categories
    $('categoryGrid').innerHTML = state.categories.map(cat => {
        const count = state.articles.filter(a => a.category === cat.id).length;
        return `
            <div class="category-card" onclick="openCategory('${cat.id}')">
                <div class="cat-icon">${cat.icon}</div>
                <div class="cat-name">${escapeHtml(cat.name)}</div>
                <div class="cat-count">${count} artikler</div>
            </div>
        `;
    }).join('');
}

function renderHCard(article) {
    const cat = state.categories.find(c => c.id === article.category);
    return `
        <div class="h-card" onclick="openArticle('${article.id}')">
            <div class="h-card-title">${escapeHtml(article.title)}</div>
            <div class="h-card-cat">${cat ? cat.icon + ' ' + cat.name : ''}</div>
        </div>
    `;
}

function renderArticlesList() {
    const cat = state.categories.find(c => c.id === state.currentCategory);
    if (cat) {
        $('categoryIcon').textContent = cat.icon;
        $('categoryTitle').textContent = cat.name;
    }
    
    let articles = state.articles.filter(a => a.category === state.currentCategory);
    const sortBy = $('sortSelect').value;
    
    articles.sort((a, b) => {
        if (sortBy === 'alpha') return a.title.localeCompare(b.title, 'nb');
        if (sortBy === 'newest') return new Date(b.updated) - new Date(a.updated);
        if (sortBy === 'oldest') return new Date(a.updated) - new Date(b.updated);
        return 0;
    });
    
    $('articleCount').textContent = articles.length;
    
    if (articles.length === 0) {
        $('articlesList').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>Ingen artikler ennå</h3>
                <p>Trykk + for å legge til den første</p>
            </div>
        `;
        return;
    }
    
    $('articlesList').innerHTML = articles.map(art => renderArticleCard(art)).join('');
}

function renderArticleCard(art) {
    const cat = state.categories.find(c => c.id === art.category);
    return `
        <div class="article-card ${art.favorite ? 'important' : ''}" onclick="openArticle('${art.id}')">
            <div class="article-card-title">${escapeHtml(art.title)}</div>
            <div class="article-card-preview">${escapeHtml((art.content || '').substring(0, 100))}...</div>
            <div class="article-card-meta">
                <span class="tag tag-cat">${cat ? cat.icon + ' ' + cat.name : ''}</span>
                ${art.favorite ? '<span class="tag">⭐</span>' : ''}
            </div>
        </div>
    `;
}

function renderContacts() {
    if (state.contacts.length === 0) {
        $('contactsList').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📞</div>
                <h3>Ingen kontakter ennå</h3>
                <p>Legg til håndverkere, leverandører m.m.</p>
            </div>
        `;
        return;
    }
    
    $('contactsList').innerHTML = state.contacts.map(c => `
        <div class="contact-card">
            <div class="contact-avatar">${getContactIcon(c.category)}</div>
            <div class="contact-info">
                <div class="contact-name">${escapeHtml(c.name)}</div>
                <div class="contact-type">${escapeHtml(c.phone)}</div>
            </div>
            <div class="contact-actions">
                <a href="tel:${c.phone}" class="contact-call">📞</a>
                <button class="contact-edit" onclick="event.stopPropagation(); editContact('${c.id}')">✏️</button>
            </div>
        </div>
    `).join('');
}

function getContactIcon(category) {
    const icons = { handverker: '🔧', leverandor: '📦', nabo: '🏠', veterinar: '🐄', offentlig: '🏛️', annet: '📝' };
    return icons[category] || '👤';
}

function renderChecklists() {
    if (state.checklists.length === 0) {
        $('checklistsList').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h3>Ingen sjekklister ennå</h3>
                <p>Lag sjekklister for sesongoppgaver</p>
            </div>
        `;
        return;
    }
    
    $('checklistsList').innerHTML = state.checklists.map(list => {
        const items = list.items || [];
        const checked = items.filter(i => i.checked).length;
        const progress = items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
        return `
            <div class="checklist-card" onclick="openChecklist('${list.id}')">
                <div class="checklist-icon">${list.icon || '📋'}</div>
                <div class="checklist-info">
                    <div class="checklist-name">${escapeHtml(list.name)}</div>
                    <div class="checklist-count">${checked}/${items.length} fullført</div>
                </div>
                <div class="checklist-mini-progress">
                    <div class="checklist-mini-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderEmergency() {
    // Address
    const address = state.settings.address || 'Ikke satt opp';
    $('farmAddress').querySelector('p').textContent = address;
    
    // Emergency contacts
    const emergencyContacts = state.contacts.filter(c => c.isEmergency);
    const list = $('emergencyContactList');
    
    if (emergencyContacts.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary);">Ingen nødkontakter. Merk kontakter med 🆘 for å vise dem her.</p>';
    } else {
        list.innerHTML = emergencyContacts.map(c => `
            <div class="emergency-contact-card">
                <div class="contact-avatar">${getContactIcon(c.category)}</div>
                <div class="contact-info">
                    <div class="contact-name">${escapeHtml(c.name)}</div>
                    <div class="contact-type">${escapeHtml(c.phone)}</div>
                </div>
                <a href="tel:${c.phone}">📞 Ring</a>
            </div>
        `).join('');
    }
}

function renderFavorites() {
    const favorites = state.articles.filter(a => a.favorite);
    
    if (favorites.length === 0) {
        $('allFavoritesList').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⭐</div>
                <h3>Ingen favoritter ennå</h3>
                <p>Merk artikler som favoritt</p>
            </div>
        `;
        return;
    }
    
    $('allFavoritesList').innerHTML = favorites.map(art => renderArticleCard(art)).join('');
}

// ===== Article Functions =====
function openCategory(catId) {
    state.currentCategory = catId;
    showView('articlesView');
}
window.openCategory = openCategory;

function openArticle(id) {
    const article = state.articles.find(a => a.id === id);
    if (!article) return;
    
    state.currentArticle = article;
    
    // Add to recent
    state.recentArticles = [id, ...state.recentArticles.filter(rid => rid !== id)].slice(0, 10);
    localStorage.setItem('recentArticles', JSON.stringify(state.recentArticles));
    
    const cat = state.categories.find(c => c.id === article.category);
    
    $('articleContent').innerHTML = `
        <h1>${escapeHtml(article.title)}</h1>
        <div class="article-meta">${cat ? cat.icon + ' ' + cat.name : ''} • ${formatDate(article.updated)}</div>
        ${article.tags ? `<div class="article-tags">${article.tags.split(',').map(t => `<span class="tag">${escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
        <div class="article-body">${escapeHtml(article.content || '')}</div>
        ${article.images?.length ? `
            <div class="article-images">
                ${article.images.map(img => `<img src="${img}" onclick="openLightbox(this.src)" alt="Bilde">`).join('')}
            </div>
        ` : ''}
    `;
    
    // Update favorite button
    $('favoriteArticleBtn').classList.toggle('active', article.favorite);
    
    showView('articleView');
}
window.openArticle = openArticle;

function openArticleModal(article = null) {
    state.editingArticle = article;
    state.tempImages = article?.images ? [...article.images] : [];
    
    $('modalTitle').textContent = article ? 'Rediger artikkel' : 'Ny artikkel';
    $('articleTitleInput').value = article?.title || '';
    $('articleText').value = article?.content || '';
    $('articleTags').value = article?.tags || '';
    
    // Populate categories
    $('articleCategory').innerHTML = state.categories.map(c => 
        `<option value="${c.id}" ${article?.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`
    ).join('');
    
    renderImagePreviews();
    openModal('articleModal');
}

async function saveArticle(e) {
    e.preventDefault();
    
    const article = {
        id: state.editingArticle?.id || generateId(),
        title: $('articleTitleInput').value.trim(),
        content: $('articleText').value.trim(),
        category: $('articleCategory').value,
        tags: $('articleTags').value.trim(),
        images: state.tempImages,
        favorite: state.editingArticle?.favorite || false,
        created: state.editingArticle?.created || new Date().toISOString(),
        updated: new Date().toISOString()
    };
    
    await dbOps.put('articles', article);
    state.articles = await dbOps.getAll('articles');
    
    closeModal('articleModal');
    
    if (state.editingArticle) {
        state.currentArticle = article;
        openArticle(article.id);
    } else if (state.currentCategory === article.category) {
        renderArticlesList();
    } else {
        showView('dashboardView');
    }
    
    showToast(state.editingArticle ? 'Artikkel oppdatert' : 'Artikkel lagret');
}

function editCurrentArticle() {
    if (state.currentArticle) openArticleModal(state.currentArticle);
}

async function toggleArticleFavorite() {
    if (!state.currentArticle) return;
    
    state.currentArticle.favorite = !state.currentArticle.favorite;
    await dbOps.put('articles', state.currentArticle);
    state.articles = await dbOps.getAll('articles');
    
    $('favoriteArticleBtn').classList.toggle('active', state.currentArticle.favorite);
    showToast(state.currentArticle.favorite ? 'Lagt til i favoritter' : 'Fjernet fra favoritter');
}

function deleteCurrentArticle() {
    if (!state.currentArticle) return;
    openConfirmModal('Slett artikkel?', 'Denne handlingen kan ikke angres.', async () => {
        await dbOps.delete('articles', state.currentArticle.id);
        state.articles = await dbOps.getAll('articles');
        goBackFromArticle();
        showToast('Artikkel slettet');
    });
}

// ===== Image Handling =====
function handleImageSelect(e) {
    const files = e.target.files;
    for (const file of files) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            state.tempImages.push(ev.target.result);
            renderImagePreviews();
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
}

function renderImagePreviews() {
    $('imagePreviewList').innerHTML = state.tempImages.map((img, i) => `
        <div class="image-preview">
            <img src="${img}" alt="Bilde ${i + 1}">
            <button type="button" class="remove-img" onclick="removeImage(${i})">×</button>
        </div>
    `).join('');
}

function removeImage(index) {
    state.tempImages.splice(index, 1);
    renderImagePreviews();
}
window.removeImage = removeImage;

// ===== Category Functions =====
function renderCategoryList() {
    $('manageCategoryList').innerHTML = state.categories.map(cat => {
        const count = state.articles.filter(a => a.category === cat.id).length;
        const isDefault = DEFAULT_CATEGORIES.some(d => d.id === cat.id);
        return `
            <div class="cat-list-item">
                <span class="cat-list-icon">${cat.icon}</span>
                <span class="cat-list-name">${escapeHtml(cat.name)}</span>
                <span class="cat-list-count">${count}</span>
                ${!isDefault ? `<button class="cat-list-delete" onclick="deleteCategory('${cat.id}')">🗑️</button>` : ''}
            </div>
        `;
    }).join('');
}

async function addNewCategory() {
    const name = $('newCategoryName').value.trim();
    if (!name) { showToast('Skriv inn et navn'); return; }
    
    const category = { id: generateId(), name, icon: state.selectedEmoji };
    await dbOps.put('categories', category);
    state.categories = await dbOps.getAll('categories');
    
    $('newCategoryName').value = '';
    renderCategoryList();
    renderDashboard();
    showToast('Kategori opprettet');
}

async function deleteCategory(id) {
    const articlesInCat = state.articles.filter(a => a.category === id);
    if (articlesInCat.length > 0) {
        showToast('Kan ikke slette - kategorien har artikler');
        return;
    }
    
    await dbOps.delete('categories', id);
    state.categories = await dbOps.getAll('categories');
    renderCategoryList();
    renderDashboard();
    showToast('Kategori slettet');
}
window.deleteCategory = deleteCategory;

// ===== Emoji Picker =====
function openEmojiPicker() {
    $('emojiGrid').innerHTML = EMOJIS.map(e => 
        `<button type="button" class="emoji-option" onclick="selectEmoji('${e}')">${e}</button>`
    ).join('');
    openModal('emojiModal');
}

function selectEmoji(emoji) {
    state.selectedEmoji = emoji;
    $('selectEmojiBtn').textContent = emoji;
    closeModal('emojiModal');
}
window.selectEmoji = selectEmoji;

// ===== Contact Functions =====
function openContactModal(contact = null) {
    state.editingContact = contact;
    $('contactModalTitle').textContent = contact ? 'Rediger kontakt' : 'Ny kontakt';
    $('contactName').value = contact?.name || '';
    $('contactPhone').value = contact?.phone || '';
    $('contactCategory').value = contact?.category || 'handverker';
    $('contactNote').value = contact?.note || '';
    $('contactEmergency').checked = contact?.isEmergency || false;
    openModal('contactModal');
}

function editContact(id) {
    const contact = state.contacts.find(c => c.id === id);
    if (contact) openContactModal(contact);
}
window.editContact = editContact;

async function saveContact(e) {
    e.preventDefault();
    
    const contact = {
        id: state.editingContact?.id || generateId(),
        name: $('contactName').value.trim(),
        phone: $('contactPhone').value.trim(),
        category: $('contactCategory').value,
        note: $('contactNote').value.trim(),
        isEmergency: $('contactEmergency').checked
    };
    
    await dbOps.put('contacts', contact);
    state.contacts = await dbOps.getAll('contacts');
    
    closeModal('contactModal');
    renderContacts();
    showToast(state.editingContact ? 'Kontakt oppdatert' : 'Kontakt lagret');
}

// ===== Checklist Functions =====
function openChecklistModal(checklist = null) {
    $('checklistName').value = checklist?.name || '';
    $('checklistIcon').value = checklist?.icon || '📋';
    openModal('checklistModal');
}

async function saveChecklist(e) {
    e.preventDefault();
    
    const checklist = {
        id: generateId(),
        name: $('checklistName').value.trim(),
        icon: $('checklistIcon').value,
        items: []
    };
    
    await dbOps.put('checklists', checklist);
    state.checklists = await dbOps.getAll('checklists');
    
    closeModal('checklistModal');
    renderChecklists();
    showToast('Sjekkliste opprettet');
}

function openChecklist(id) {
    const checklist = state.checklists.find(c => c.id === id);
    if (!checklist) return;
    
    state.currentChecklist = checklist;
    renderChecklistDetail();
    showView('checklistDetailView');
}
window.openChecklist = openChecklist;

function renderChecklistDetail() {
    const list = state.currentChecklist;
    if (!list) return;
    
    $('checklistTitle').textContent = list.name;
    
    const items = list.items || [];
    const checked = items.filter(i => i.checked).length;
    const progress = items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
    
    $('checklistProgress').style.width = progress + '%';
    $('checklistProgressText').textContent = items.length > 0 ? `${checked}/${items.length}` : '0/0';
    
    if (items.length === 0) {
        $('checklistItems').innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Ingen oppgaver ennå</p>';
    } else {
        $('checklistItems').innerHTML = items.map((item, i) => `
            <div class="checklist-item ${item.checked ? 'checked' : ''}" onclick="toggleChecklistItem(${i})">
                <div class="item-checkbox">${item.checked ? '✓' : ''}</div>
                <span class="item-text">${escapeHtml(item.text)}</span>
                <button class="item-delete" onclick="event.stopPropagation(); deleteChecklistItem(${i})">🗑️</button>
            </div>
        `).join('');
    }
}

async function toggleChecklistItem(index) {
    if (!state.currentChecklist) return;
    state.currentChecklist.items[index].checked = !state.currentChecklist.items[index].checked;
    await dbOps.put('checklists', state.currentChecklist);
    state.checklists = await dbOps.getAll('checklists');
    renderChecklistDetail();
}
window.toggleChecklistItem = toggleChecklistItem;

async function deleteChecklistItem(index) {
    if (!state.currentChecklist) return;
    state.currentChecklist.items.splice(index, 1);
    await dbOps.put('checklists', state.currentChecklist);
    state.checklists = await dbOps.getAll('checklists');
    renderChecklistDetail();
}
window.deleteChecklistItem = deleteChecklistItem;

async function addChecklistItem() {
    const text = prompt('Skriv inn ny oppgave:');
    if (!text?.trim()) return;
    
    if (!state.currentChecklist.items) state.currentChecklist.items = [];
    state.currentChecklist.items.push({ text: text.trim(), checked: false });
    
    await dbOps.put('checklists', state.currentChecklist);
    state.checklists = await dbOps.getAll('checklists');
    renderChecklistDetail();
    showToast('Oppgave lagt til');
}

async function resetChecklist() {
    if (!state.currentChecklist) return;
    state.currentChecklist.items.forEach(i => i.checked = false);
    await dbOps.put('checklists', state.currentChecklist);
    state.checklists = await dbOps.getAll('checklists');
    renderChecklistDetail();
    showToast('Sjekkliste nullstilt');
}

function deleteCurrentChecklist() {
    if (!state.currentChecklist) return;
    openConfirmModal('Slett sjekkliste?', 'Denne handlingen kan ikke angres.', async () => {
        await dbOps.delete('checklists', state.currentChecklist.id);
        state.checklists = await dbOps.getAll('checklists');
        showView('checklistsView');
        showToast('Sjekkliste slettet');
    });
}

// ===== Search =====
function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    $('clearSearch').classList.toggle('hidden', !query);
    
    if (!query) {
        if (state.currentView === 'searchView') showView('dashboardView');
        return;
    }
    
    const results = state.articles.filter(a => 
        a.title.toLowerCase().includes(query) || 
        (a.content || '').toLowerCase().includes(query) ||
        (a.tags || '').toLowerCase().includes(query)
    );
    
    $('searchCount').textContent = results.length;
    $('searchResults').innerHTML = results.length === 0 
        ? `<div class="empty-state"><div class="empty-icon">🔍</div><h3>Ingen treff</h3></div>`
        : results.map(art => renderArticleCard(art)).join('');
    
    showView('searchView');
}

function clearSearch() {
    $('searchInput').value = '';
    $('clearSearch').classList.add('hidden');
    showView('dashboardView');
}

function clearRecentArticles() {
    state.recentArticles = [];
    localStorage.setItem('recentArticles', '[]');
    renderDashboard();
    showToast('Nylig sett tømt');
}

// ===== Settings =====
async function saveSettings() {
    const farmName = $('settingsFarmName').value.trim();
    const address = $('settingsAddress').value.trim();
    
    if (farmName) {
        await dbOps.put('settings', { key: 'farmName', value: farmName });
        state.settings.farmName = farmName;
        $('farmName').textContent = farmName;
    }
    if (address) {
        await dbOps.put('settings', { key: 'address', value: address });
        state.settings.address = address;
    }
    
    closeModal('settingsModal');
    showToast('Innstillinger lagret');
}

function editEmergencyAddress() {
    const current = state.settings.address || '';
    const newAddress = prompt('Skriv inn gårdens adresse:', current);
    if (newAddress !== null) {
        dbOps.put('settings', { key: 'address', value: newAddress });
        state.settings.address = newAddress;
        renderEmergency();
        showToast('Adresse oppdatert');
    }
}

function confirmClearAllData() {
    openConfirmModal('Slett ALL data?', 'Dette vil fjerne alle artikler, kontakter og sjekklister. Kan ikke angres!', async () => {
        await dbOps.clear('articles');
        await dbOps.clear('contacts');
        await dbOps.clear('checklists');
        await dbOps.clear('settings');
        await dbOps.clear('categories');
        
        for (const cat of DEFAULT_CATEGORIES) {
            await dbOps.put('categories', cat);
        }
        
        state.articles = [];
        state.contacts = [];
        state.checklists = [];
        state.settings = {};
        state.categories = DEFAULT_CATEGORIES;
        state.recentArticles = [];
        localStorage.removeItem('recentArticles');
        
        closeModal('settingsModal');
        showView('dashboardView');
        showToast('All data slettet');
    });
}

// ===== Import/Export =====
async function exportData() {
    const data = {
        version: APP_VERSION,
        exported: new Date().toISOString(),
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
    
    await dbOps.put('settings', { key: 'lastExport', value: new Date().toISOString() });
    $('lastExportDate').textContent = formatDate(new Date().toISOString());
    
    showToast('Data eksportert');
}

function triggerImport() {
    $('importFileInput').click();
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.articles && !data.categories) throw new Error('Invalid file');
        
        if (data.categories) {
            await dbOps.clear('categories');
            for (const cat of data.categories) await dbOps.put('categories', cat);
        }
        if (data.articles) {
            await dbOps.clear('articles');
            for (const art of data.articles) await dbOps.put('articles', art);
        }
        if (data.contacts) {
            await dbOps.clear('contacts');
            for (const con of data.contacts) await dbOps.put('contacts', con);
        }
        if (data.checklists) {
            await dbOps.clear('checklists');
            for (const list of data.checklists) await dbOps.put('checklists', list);
        }
        
        await loadAllData();
        
        await dbOps.put('settings', { key: 'lastImport', value: new Date().toISOString() });
        $('lastImportDate').textContent = formatDate(new Date().toISOString());
        
        closeModal('syncModal');
        renderDashboard();
        showToast('Data importert');
        
    } catch (error) {
        console.error('Import error:', error);
        showToast('Feil ved import');
    }
    
    e.target.value = '';
}

// ===== Modals =====
function openModal(id) {
    $(id).classList.add('open');
}

function closeModal(id) {
    $(id).classList.remove('open');
}

let confirmCallback = null;
function openConfirmModal(title, message, callback) {
    $('confirmTitle').textContent = title;
    $('confirmMessage').textContent = message;
    confirmCallback = callback;
    $('confirmOk').onclick = () => { closeModal('confirmModal'); if (confirmCallback) confirmCallback(); };
    openModal('confirmModal');
}

function openMenu() {
    $('sideMenu').classList.add('open');
    $('menuOverlay').classList.add('show');
}

function closeMenu() {
    $('sideMenu').classList.remove('open');
    $('menuOverlay').classList.remove('show');
}

// ===== Lightbox =====
function openLightbox(src) {
    $('lightbox').querySelector('img').src = src;
    $('lightbox').classList.add('open');
}
window.openLightbox = openLightbox;

function closeLightbox() {
    $('lightbox').classList.remove('open');
}

// ===== Toast =====
function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== Utilities =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== Start App =====
document.addEventListener('DOMContentLoaded', initApp);
