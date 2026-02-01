// ==========================================
// SMÅBRUK KUNNSKAPSBASE APP v4.2
// Firebase-basert med Google Auth
// Med værmelding, sesong og auto-reset
// ==========================================

const APP_VERSION = '4.3.0';

// ===== Firebase Configuration =====
const firebaseConfig = {
    apiKey: "AIzaSyDChsgGALPtC9kJ_h9Mh4Co9eP0EadpUlo",
    authDomain: "smabruk-info-8abbe.firebaseapp.com",
    projectId: "smabruk-info-8abbe",
    storageBucket: "smabruk-info-8abbe.firebasestorage.app",
    messagingSenderId: "895619707192",
    appId: "1:895619707192:web:0f4e6acf82a97b656c11cd"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ===== Season Definitions =====
const SEASONS = {
    var: { name: 'Vår', icon: '🌸', months: [3, 4, 5] },
    sommer: { name: 'Sommer', icon: '☀️', months: [6, 7, 8] },
    host: { name: 'Høst', icon: '🍂', months: [9, 10, 11] },
    vinter: { name: 'Vinter', icon: '❄️', months: [12, 1, 2] }
};

function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    for (const [key, season] of Object.entries(SEASONS)) {
        if (season.months.includes(month)) {
            return { key, ...season };
        }
    }
    return { key: 'vinter', ...SEASONS.vinter };
}

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

const DEFAULT_CHECKLISTS = [
    {
        id: 'var-sjekkliste',
        name: 'Vårklargjøring',
        icon: '🌸',
        season: 'var',
        items: [
            { text: 'Sjekk taket for vinterskader', done: false },
            { text: 'Rens takrenner og nedløp', done: false },
            { text: 'Inspiser grunnmur for sprekker', done: false },
            { text: 'Service på gressklipper', done: false },
            { text: 'Klargjør hageredskaper', done: false },
            { text: 'Så frø innendørs', done: false },
            { text: 'Beskjær frukttrær', done: false },
            { text: 'Sjekk gjerder og porter', done: false },
            { text: 'Tøm og rens vannrør utendørs', done: false },
            { text: 'Sjekk dreneringen rundt huset', done: false },
            { text: 'Forbered beiter for beitesesong', done: false },
            { text: 'Bestill såkorn og settepoteter', done: false }
        ]
    },
    {
        id: 'sommer-sjekkliste',
        name: 'Sommeroppgaver',
        icon: '☀️',
        season: 'sommer',
        items: [
            { text: 'Vann hage regelmessig', done: false },
            { text: 'Slå gress ukentlig', done: false },
            { text: 'Luke ugress', done: false },
            { text: 'Høst grønnsaker og bær', done: false },
            { text: 'Male og vedlikeholde bygninger', done: false },
            { text: 'Sjekk vannkvalitet i brønn', done: false },
            { text: 'Flytt dyr til sommerbeite', done: false },
            { text: 'Slå og tørk høy', done: false },
            { text: 'Vedlikehold stier og veier', done: false },
            { text: 'Sjekk elektrisk gjerde', done: false },
            { text: 'Rens og vedlikehold utebod', done: false },
            { text: 'Konserver og sylte avlinger', done: false }
        ]
    },
    {
        id: 'host-sjekkliste',
        name: 'Høstklargjøring',
        icon: '🍂',
        season: 'host',
        items: [
            { text: 'Høst inn poteter og rotfrukter', done: false },
            { text: 'Rydd hagen for vinteren', done: false },
            { text: 'Plante løk og stauder', done: false },
            { text: 'Rake løv fra plen', done: false },
            { text: 'Dekk til ømfintlige planter', done: false },
            { text: 'Hent inn dyr fra beite', done: false },
            { text: 'Fyll opp vedlageret', done: false },
            { text: 'Service på snøfreser', done: false },
            { text: 'Tøm vannsystemer utendørs', done: false },
            { text: 'Sjekk isolasjon i bygninger', done: false },
            { text: 'Lagre hagemøbler inne', done: false },
            { text: 'Rens og lagre hageredskaper', done: false },
            { text: 'Bestill strøsand/salt', done: false }
        ]
    },
    {
        id: 'vinter-sjekkliste',
        name: 'Vinteroppgaver',
        icon: '❄️',
        season: 'vinter',
        items: [
            { text: 'Måk snø fra tak ved behov', done: false },
            { text: 'Hold innkjørsel og stier ryddet', done: false },
            { text: 'Sjekk at vannrør ikke fryser', done: false },
            { text: 'Fyr i ovnen regelmessig', done: false },
            { text: 'Sjekk fôrlager for dyr', done: false },
            { text: 'Gi ekstra fôr til dyr i kulde', done: false },
            { text: 'Sjekk at ventilasjonen fungerer', done: false },
            { text: 'Hold vanntilgang åpen for dyr', done: false },
            { text: 'Vedlikehold verktøy og maskiner', done: false },
            { text: 'Planlegg neste års hage', done: false },
            { text: 'Bestill frø til våren', done: false },
            { text: 'Sjekk brannslukker og røykvarsler', done: false }
        ]
    }
];

const EMOJIS = ['🔧','🐑','🐔','🐄','🐖','🌱','🌳','🍎','🍓','🥕','🚜','🛠️','🏠','🏚️','🪵','📜','📚','📝','🍲','🥛','🧀','⚡','💧','🔥','❄️','🌤️','🌧️','🐝','🦆','🐕','🐈','🐴','🌻','🌿','🪨','⛏️','🪓','🧱','🏗️','🚿','💡','🔌','📞','🗓️','⭐','❤️','✅','🌸','☀️','🍂','🧹','🪣','🔨','⚙️','🎯'];

// ===== State =====
const state = {
    user: null,
    categories: [],
    articles: [],
    contacts: [],
    checklists: [],
    settings: {
        farmName: '',
        address: '',
        darkMode: false,
        notifications: true,
        fontSize: 'normal',
        latitude: 60.39,
        longitude: 5.32,
        lastSeasonReset: null
    },
    weather: null,
    recentArticles: [],
    currentView: 'dashboardView',
    currentArticle: null,
    currentChecklist: null,
    currentCategory: null,
    editingArticle: null,
    editingContact: null,
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
    try {
        if (id) {
            await col.doc(id).set(docData, { merge: true });
            return id;
        } else {
            docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const ref = await col.add(docData);
            return ref.id;
        }
    } catch (e) {
        console.error('Save error:', e);
        throw e;
    }
}

async function deleteFromFirestore(collection, id) {
    const col = userDoc(collection);
    if (!col) return false;
    
    try {
        await col.doc(id).delete();
        console.log(`Deleted ${id} from ${collection}`);
        return true;
    } catch (e) {
        console.error('Delete error:', e);
        return false;
    }
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
async function setupAuth() {
    console.log('🔐 Setting up auth...');
    
    // Set persistence to LOCAL - keeps user logged in even after browser close
    try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log('✓ Auth persistence set to LOCAL');
    } catch (e) {
        console.warn('Could not set persistence:', e);
    }
    
    // Check if we're returning from a redirect
    try {
        const result = await auth.getRedirectResult();
        if (result && result.user) {
            console.log('✓ Redirect login successful for:', result.user.email);
            state.user = result.user;
        } else {
            console.log('ℹ️ No redirect result (normal page load)');
        }
    } catch (error) {
        console.error('❌ Redirect result error:', error.code, error.message);
    }
    
    // Set up login button - use POPUP (works better with ad-blockers)
    on('googleLoginBtn', 'click', async () => {
        const btn = $('googleLoginBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-small"></span> Logger inn...';
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        // Try popup first, fallback to redirect
        try {
            console.log('🚀 Starting Google popup login...');
            const result = await auth.signInWithPopup(provider);
            console.log('✓ Popup login successful:', result.user.email);
        } catch (popupError) {
            console.warn('Popup failed, trying redirect...', popupError.code);
            
            // If popup blocked or failed, try redirect
            if (popupError.code === 'auth/popup-blocked' || 
                popupError.code === 'auth/popup-closed-by-user' ||
                popupError.code === 'auth/cancelled-popup-request') {
                try {
                    await auth.signInWithRedirect(provider);
                } catch (redirectError) {
                    console.error('Redirect also failed:', redirectError);
                    showToast('Innlogging feilet. Sjekk at popup ikke er blokkert.', 'error');
                    resetLoginButton(btn);
                }
            } else {
                console.error('Login error:', popupError);
                showToast('Innlogging feilet: ' + popupError.message, 'error');
                resetLoginButton(btn);
            }
        }
    });

    // Set up auth state listener - THIS is what handles the actual login
    auth.onAuthStateChanged(async (user) => {
        console.log('🔄 Auth state changed:', user ? user.email : 'null');
        
        const loginScreen = $('loginScreen');
        const mainApp = $('mainApp');
        const splashScreen = $('splashScreen');
        
        if (user) {
            console.log('✓ User is logged in:', user.email);
            state.user = user;
            
            // Hide login, show app
            if (loginScreen) loginScreen.classList.add('hidden');
            if (splashScreen) splashScreen.classList.remove('hidden');
            
            await initApp();
        } else {
            console.log('✗ User is logged out');
            state.user = null;
            
            // Show login, hide app
            if (loginScreen) loginScreen.classList.remove('hidden');
            if (mainApp) mainApp.classList.add('hidden');
            if (splashScreen) splashScreen.classList.add('hidden');
        }
    });
    
    console.log('✓ Auth setup complete');
}

function resetLoginButton(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Logg inn med Google`;
    }
}

async function doSignOut() {
    console.log('Signing out...');
    try {
        await auth.signOut();
        state.user = null;
        state.categories = [];
        state.articles = [];
        state.contacts = [];
        state.checklists = [];
        state.recentArticles = [];
        showToast('Logget ut');
        setTimeout(() => window.location.reload(), 300);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Kunne ikke logge ut', 'error');
    }
}

// ===== Initialize App =====
async function initApp() {
    const splash = $('splashScreen');
    if (splash) splash.classList.remove('hidden');
    
    try {
        await loadAllData();
        await checkSeasonReset();
        setupEventListeners();
        setupProfileButton();
        startClock();
        fetchWeather();
        renderDashboard();
        applySettings();
        
        setTimeout(() => {
            if (splash) splash.classList.add('hidden');
            const mainApp = $('mainApp');
            if (mainApp) mainApp.classList.remove('hidden');
        }, 600);
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
        
    } catch (error) {
        console.error('Init error:', error);
        if (splash) splash.classList.add('hidden');
        const mainApp = $('mainApp');
        if (mainApp) mainApp.classList.remove('hidden');
        showToast('Kunne ikke laste data', 'error');
    }
}

async function loadAllData() {
    state.categories = await loadCollection('categories');
    
    const existingCatIds = state.categories.map(c => c.id);
    for (const cat of DEFAULT_CATEGORIES) {
        if (!existingCatIds.includes(cat.id)) {
            await saveToFirestore('categories', cat.id, cat);
            state.categories.push(cat);
        }
    }
    
    state.articles = await loadCollection('articles');
    state.contacts = await loadCollection('contacts');
    state.checklists = await loadCollection('checklists');
    
    const existingChecklistIds = state.checklists.map(c => c.id);
    for (const checklist of DEFAULT_CHECKLISTS) {
        if (!existingChecklistIds.includes(checklist.id)) {
            await saveToFirestore('checklists', checklist.id, checklist);
            state.checklists.push({ ...checklist });
        }
    }
    
    try {
        const userDocRef = db.collection('users').doc(state.user.uid);
        const settingsDoc = await userDocRef.get();
        if (settingsDoc.exists) {
            const data = settingsDoc.data();
            state.settings = { ...state.settings, ...(data?.settings || {}) };
            state.recentArticles = data?.recentArticles || [];
        }
    } catch(e) {
        console.warn('Could not load settings:', e.message);
    }
}

async function checkSeasonReset() {
    const currentSeason = getCurrentSeason();
    const lastReset = state.settings.lastSeasonReset;
    
    if (lastReset !== currentSeason.key) {
        console.log(`New season detected: ${currentSeason.name}. Resetting checklist.`);
        
        const seasonChecklistId = `${currentSeason.key}-sjekkliste`;
        const checklist = state.checklists.find(c => c.id === seasonChecklistId);
        
        if (checklist) {
            const resetItems = (checklist.items || []).map(item => ({ ...item, done: false }));
            checklist.items = resetItems;
            
            await saveToFirestore('checklists', checklist.id, { items: resetItems });
            showToast(`${currentSeason.icon} ${currentSeason.name} har begynt! Sjekkliste nullstilt.`);
        }
        
        state.settings.lastSeasonReset = currentSeason.key;
        await db.collection('users').doc(state.user.uid).set({
            settings: state.settings
        }, { merge: true });
    }
}

function setupProfileButton() {
    const syncBtn = $('syncBtn');
    if (!syncBtn) return;
    
    if (state.user?.photoURL) {
        syncBtn.innerHTML = `<img src="${state.user.photoURL}" class="user-avatar" alt="Profil">`;
    }
    
    syncBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showConfirm('Logg ut?', 'Vil du logge ut av appen?', doSignOut, '👋');
    };
}

function applySettings() {
    const farmName = $('farmName');
    if (farmName && state.settings?.farmName) {
        farmName.textContent = state.settings.farmName;
    }
    
    if (state.settings?.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    document.body.classList.remove('font-small', 'font-large');
    if (state.settings?.fontSize === 'small') {
        document.body.classList.add('font-small');
    } else if (state.settings?.fontSize === 'large') {
        document.body.classList.add('font-large');
    }
}

// ===== Clock & Date =====
function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const clockEl = $('clock');
    const dateEl = $('dateDisplay');
    const seasonEl = $('seasonDisplay');
    
    const now = new Date();
    
    if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('no-NO', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('no-NO', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        });
    }
    
    if (seasonEl) {
        const season = getCurrentSeason();
        seasonEl.innerHTML = `${season.icon} ${season.name}`;
    }
}

// ===== Weather =====
async function fetchWeather() {
    const lat = state.settings?.latitude || 60.39;
    const lon = state.settings?.longitude || 5.32;
    
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.current) {
            state.weather = {
                temp: Math.round(data.current.temperature_2m),
                code: data.current.weather_code,
                wind: Math.round(data.current.wind_speed_10m)
            };
            renderWeather();
        }
    } catch (e) {
        console.warn('Could not fetch weather:', e);
    }
    
    setTimeout(fetchWeather, 30 * 60 * 1000);
}

function getWeatherIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 49) return '🌫️';
    if (code <= 59) return '🌧️';
    if (code <= 69) return '🌨️';
    if (code <= 79) return '❄️';
    if (code <= 84) return '🌧️';
    if (code <= 94) return '⛈️';
    if (code <= 99) return '🌩️';
    return '🌤️';
}

function getWeatherDesc(code) {
    if (code === 0) return 'Klart';
    if (code <= 3) return 'Delvis skyet';
    if (code <= 49) return 'Tåke';
    if (code <= 59) return 'Yr';
    if (code <= 69) return 'Regn';
    if (code <= 79) return 'Snø';
    if (code <= 84) return 'Regnbyger';
    if (code <= 94) return 'Torden';
    return 'Varierende';
}

function renderWeather() {
    const weatherEl = $('weatherWidget');
    if (!weatherEl || !state.weather) return;
    
    const { temp, code, wind } = state.weather;
    const icon = getWeatherIcon(code);
    const desc = getWeatherDesc(code);
    
    weatherEl.innerHTML = `
        <div class="weather-main">
            <span class="weather-icon">${icon}</span>
            <span class="weather-temp">${temp}°C</span>
        </div>
        <div class="weather-details">
            <span class="weather-desc">${desc}</span>
            <span class="weather-wind">💨 ${wind} km/t</span>
        </div>
    `;
}

// ===== Event Listeners =====
function setupEventListeners() {
    on('searchInput', 'input', handleSearch);
    on('clearSearch', 'click', clearSearch);
    
    on('homeBtn', 'click', () => showView('dashboardView'));
    on('menuBtn', 'click', openMenu);
    
    on('quickAddBtn', 'click', () => openArticleModal());
    on('quickContactBtn', 'click', () => showView('contactsView'));
    on('quickChecklistBtn', 'click', () => showView('checklistsView'));
    on('quickEmergencyBtn', 'click', () => showView('emergencyView'));
    
    on('seeAllFavorites', 'click', () => showView('favoritesView'));
    on('clearRecent', 'click', clearRecentArticles);
    on('manageCategoriesBtn', 'click', openCategoryModal);
    
    on('addBtn', 'click', () => openArticleModal());
    
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
    
    on('backToCategories', 'click', () => showView('dashboardView'));
    on('sortSelect', 'change', renderArticlesList);
    
    on('backToArticles', 'click', () => {
        if (state.currentCategory) {
            showView('articlesView');
        } else {
            showView('dashboardView');
        }
    });
    on('favoriteArticleBtn', 'click', toggleFavorite);
    on('editArticleBtn', 'click', () => openArticleModal(state.currentArticle));
    on('deleteArticleBtn', 'click', confirmDeleteArticle);
    
    on('backFromSearch', 'click', () => showView('dashboardView'));
    
    on('backFromContacts', 'click', () => showView('dashboardView'));
    on('addContactBtn', 'click', () => openContactModal());
    
    on('backFromChecklists', 'click', () => showView('dashboardView'));
    on('addChecklistBtn', 'click', () => openChecklistModal());
    
    on('backFromChecklistDetail', 'click', () => showView('checklistsView'));
    on('resetChecklistBtn', 'click', confirmResetChecklist);
    on('deleteChecklistBtn', 'click', confirmDeleteChecklist);
    on('addChecklistItemBtn', 'click', addChecklistItem);
    
    on('backFromEmergency', 'click', () => showView('dashboardView'));
    on('backFromFavorites', 'click', () => showView('dashboardView'));
    
    on('closeMenu', 'click', closeMenu);
    on('menuOverlay', 'click', closeMenu);
    on('menuHome', 'click', () => { closeMenu(); showView('dashboardView'); });
    on('menuSettings', 'click', () => { closeMenu(); openSettingsModal(); });
    on('menuCategories', 'click', () => { closeMenu(); openCategoryModal(); });
    on('menuSync', 'click', () => { closeMenu(); openSyncModal(); });
    on('menuExport', 'click', () => { closeMenu(); exportData(); });
    on('menuImport', 'click', () => { closeMenu(); importData(); });
    on('menuAbout', 'click', () => { closeMenu(); openAboutModal(); });
    on('menuLogout', 'click', () => { closeMenu(); showConfirm('Logg ut?', 'Vil du logge ut av appen?', doSignOut, '👋'); });
    
    on('closeArticleModal', 'click', closeArticleModal);
    on('articleForm', 'submit', saveArticle);
    on('addImageBtn', 'click', () => $('imageInput')?.click());
    on('cameraBtn', 'click', () => $('cameraInput')?.click());
    on('imageInput', 'change', handleImageSelect);
    on('cameraInput', 'change', handleImageSelect);
    
    on('closeCategoryModal', 'click', closeCategoryModal);
    on('addCategoryBtn', 'click', addCategory);
    on('selectEmojiBtn', 'click', openEmojiPicker);
    on('newCategoryName', 'keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } });
    
    on('closeContactModal', 'click', closeContactModal);
    on('contactForm', 'submit', saveContact);
    on('deleteContactBtn', 'click', confirmDeleteContact);
    
    on('closeChecklistModal', 'click', closeChecklistModal);
    on('checklistForm', 'submit', saveChecklist);
    
    on('closeSyncModal', 'click', closeSyncModal);
    on('syncExportBtn', 'click', exportData);
    on('syncImportBtn', 'click', importData);
    
    on('closeSettingsModal', 'click', closeSettingsModal);
    on('saveSettingsBtn', 'click', saveSettings);
    on('clearAllDataBtn', 'click', confirmClearAllData);
    on('getLocationBtn', 'click', getGeoLocation);
    
    on('closeAboutModal', 'click', closeAboutModal);
    
    on('menuFeedback', 'click', openFeedbackModal);
    on('closeFeedbackModal', 'click', closeFeedbackModal);
    on('feedbackForm', 'submit', submitFeedback);
    
    on('confirmCancel', 'click', closeConfirmModal);
    on('confirmOk', 'click', executeConfirm);
    
    on('lightbox', 'click', closeLightbox);
    
    $$('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeAllModals();
        });
    });
}

// ===== View Management =====
// ===== View Management =====
function updateBodyOverflow() {
    const hasActiveModal = $$('.modal.active').length > 0;
    document.body.style.overflow = hasActiveModal ? 'hidden' : 'auto';
}

function showView(viewId) {
    $$('.view').forEach(v => v.classList.remove('active'));
    const view = $(viewId);
    if (view) view.classList.add('active');
    state.currentView = viewId;
    
    switch(viewId) {
        case 'dashboardView': renderDashboard(); break;
        case 'contactsView': renderContacts(); break;
        case 'checklistsView': renderChecklists(); break;
        case 'emergencyView': renderEmergency(); break;
        case 'favoritesView': renderFavorites(); break;
    }
    
    $$('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.view === viewId);
    });
}

// ===== Dashboard =====
function renderDashboard() {
    const favorites = state.articles.filter(a => a.favorite);
    const season = getCurrentSeason();
    
    const totalArticles = $('totalArticles');
    const totalCategories = $('totalCategories');
    const totalFavorites = $('totalFavorites');
    
    if (totalArticles) totalArticles.textContent = state.articles.length;
    if (totalCategories) totalCategories.textContent = state.categories.length;
    if (totalFavorites) totalFavorites.textContent = favorites.length;
    
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
    
    const seasonProgress = $('seasonProgress');
    if (seasonProgress) {
        const seasonChecklistId = `${season.key}-sjekkliste`;
        const checklist = state.checklists.find(c => c.id === seasonChecklistId);
        
        if (checklist) {
            const items = checklist.items || [];
            const done = items.filter(i => i.done).length;
            const pct = items.length ? Math.round(done / items.length * 100) : 0;
            
            seasonProgress.innerHTML = `
                <div class="season-checklist-card" onclick="openChecklist('${checklist.id}')">
                    <div class="season-info">
                        <span class="season-icon">${season.icon}</span>
                        <div>
                            <strong>${checklist.name}</strong>
                            <div class="mini-progress">
                                <div class="mini-bar"><div class="mini-fill" style="width:${pct}%"></div></div>
                                <span>${done}/${items.length}</span>
                            </div>
                        </div>
                    </div>
                    <span class="arrow">→</span>
                </div>
            `;
        }
    }
    
    renderCategoriesGrid();
    renderWeather();
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
    if (favBtn) favBtn.classList.toggle('active', article.favorite);
    
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

function confirmDeleteArticle() {
    if (!state.currentArticle) return;
    showConfirm(
        'Slett artikkel?', 
        `Er du sikker på at du vil slette "${state.currentArticle.title}"?`, 
        deleteCurrentArticle, 
        '🗑️'
    );
}

async function deleteCurrentArticle() {
    if (!state.currentArticle) return;
    
    const success = await deleteFromFirestore('articles', state.currentArticle.id);
    if (success) {
        state.articles = state.articles.filter(a => a.id !== state.currentArticle.id);
        state.currentArticle = null;
        showToast('Artikkel slettet');
        showView('dashboardView');
    } else {
        showToast('Kunne ikke slette artikkel', 'error');
    }
}

// ===== Article Modal =====
function openArticleModal(article = null) {
    state.editingArticle = article;
    state.tempImages = article?.images ? [...article.images] : [];
    
    const modal = $('articleModal');
    const title = $('modalTitle');
    const titleInput = $('articleTitleInput');
    const categorySelect = $('articleCategory');
    const tagsInput = $('articleTags');
    const textInput = $('articleText');
    
    if (title) title.textContent = article ? 'Rediger artikkel' : 'Ny artikkel';
    
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
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeArticleModal() {
    const modal = $('articleModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
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
    
    const data = {
        title: $('articleTitleInput')?.value?.trim() || '',
        category: $('articleCategory')?.value || '',
        tags: $('articleTags')?.value?.trim() || '',
        content: $('articleText')?.value?.trim() || '',
        images: state.tempImages,
        favorite: state.editingArticle?.favorite || false
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
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
    renderCategoryList();
    renderEmojiGrid();
}

function closeCategoryModal() {
    const modal = $('categoryModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
}

function renderCategoryList() {
    const list = $('manageCategoryList');
    if (!list) return;
    
    list.innerHTML = state.categories.map(cat => {
        const count = state.articles.filter(a => a.category === cat.id).length;
        const isDefault = DEFAULT_CATEGORIES.some(d => d.id === cat.id);
        
        return `
            <div class="category-item">
                <span class="cat-icon">${cat.icon}</span>
                <span class="cat-name">${escapeHtml(cat.name)}</span>
                <span class="cat-count">${count}</span>
                <button class="delete-cat-btn" onclick="confirmDeleteCategory('${cat.id}', ${count}, ${isDefault})" ${isDefault ? 'title="Standard kategori"' : ''}>
                    ${isDefault ? '🔒' : '✕'}
                </button>
            </div>
        `;
    }).join('');
}

function confirmDeleteCategory(categoryId, articleCount, isDefault) {
    if (isDefault) {
        showToast('Kan ikke slette standard kategorier', 'error');
        return;
    }
    
    if (articleCount > 0) {
        showToast(`Kan ikke slette - ${articleCount} artikler bruker denne kategorien`, 'error');
        return;
    }
    
    showConfirm('Slett kategori?', 'Er du sikker på at du vil slette denne kategorien?', () => deleteCategory(categoryId), '🗑️');
}

async function deleteCategory(categoryId) {
    const success = await deleteFromFirestore('categories', categoryId);
    if (success) {
        state.categories = state.categories.filter(c => c.id !== categoryId);
        renderCategoryList();
        renderDashboard();
        showToast('Kategori slettet ✓');
    } else {
        showToast('Kunne ikke slette kategori', 'error');
    }
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
    
    const id = name.toLowerCase().replace(/[^a-zæøå0-9]/g, '-').replace(/-+/g, '-');
    
    if (state.categories.some(c => c.id === id)) {
        showToast('Kategori finnes allerede', 'error');
        return;
    }
    
    try {
        const newCat = { id, name, icon };
        await saveToFirestore('categories', id, newCat);
        state.categories.push(newCat);
        
        if (nameInput) nameInput.value = '';
        if (emojiBtn) emojiBtn.textContent = '📁';
        
        renderCategoryList();
        renderDashboard();
        showToast('Kategori lagt til ✓');
    } catch (error) {
        showToast('Kunne ikke legge til kategori', 'error');
    }
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
                    <div class="contact-card" onclick="editContact('${c.id}')">
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

function editContact(contactId) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (contact) openContactModal(contact);
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
    const deleteBtn = $('deleteContactBtn');
    
    if (title) title.textContent = contact ? 'Rediger kontakt' : 'Ny kontakt';
    if (nameInput) nameInput.value = contact?.name || '';
    if (phoneInput) phoneInput.value = contact?.phone || '';
    if (categorySelect) categorySelect.value = contact?.category || 'annet';
    if (noteInput) noteInput.value = contact?.note || '';
    if (emergencyCheck) emergencyCheck.checked = contact?.emergency || false;
    if (deleteBtn) deleteBtn.style.display = contact ? 'block' : 'none';
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeContactModal() {
    const modal = $('contactModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
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

function confirmDeleteContact() {
    if (!state.editingContact) return;
    showConfirm('Slett kontakt?', `Er du sikker på at du vil slette "${state.editingContact.name}"?`, deleteContact, '🗑️');
}

async function deleteContact() {
    if (!state.editingContact) return;
    
    const success = await deleteFromFirestore('contacts', state.editingContact.id);
    if (success) {
        state.contacts = state.contacts.filter(c => c.id !== state.editingContact.id);
        closeContactModal();
        showToast('Kontakt slettet');
        renderContacts();
    } else {
        showToast('Kunne ikke slette kontakt', 'error');
    }
}

// ===== Checklists =====
function renderChecklists() {
    const list = $('checklistsList');
    if (!list) return;
    
    const seasonalOrder = ['var-sjekkliste', 'sommer-sjekkliste', 'host-sjekkliste', 'vinter-sjekkliste'];
    const currentSeason = getCurrentSeason();
    
    const sorted = [...state.checklists].sort((a, b) => {
        const aIdx = seasonalOrder.indexOf(a.id);
        const bIdx = seasonalOrder.indexOf(b.id);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return (a.name || '').localeCompare(b.name || '', 'no');
    });
    
    if (sorted.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <p>Ingen sjekklister ennå</p>
                <button class="btn-primary" onclick="openChecklistModal()">+ Lag sjekkliste</button>
            </div>
        `;
    } else {
        list.innerHTML = sorted.map(cl => {
            const items = cl.items || [];
            const done = items.filter(i => i.done).length;
            const pct = items.length ? Math.round(done / items.length * 100) : 0;
            const isSeasonal = seasonalOrder.includes(cl.id);
            const isCurrentSeason = cl.season === currentSeason.key;
            
            return `
                <div class="checklist-card ${isSeasonal ? 'seasonal' : ''} ${isCurrentSeason ? 'current-season' : ''}" onclick="openChecklist('${cl.id}')">
                    <div class="checklist-icon">${cl.icon || '📋'}</div>
                    <div class="checklist-info">
                        <h3>${escapeHtml(cl.name)} ${isCurrentSeason ? '<span class="current-badge">Nå</span>' : ''}</h3>
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
    const deleteBtn = $('deleteChecklistBtn');
    
    if (title) title.textContent = `${checklist.icon || '📋'} ${checklist.name}`;
    
    const isSeasonal = DEFAULT_CHECKLISTS.some(d => d.id === checklist.id);
    if (deleteBtn) deleteBtn.style.display = isSeasonal ? 'none' : 'flex';
    
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
            <button class="delete-item-btn" onclick="event.stopPropagation(); confirmDeleteChecklistItem(${i})">✕</button>
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

function confirmDeleteChecklistItem(index) {
    showConfirm('Slett punkt?', 'Er du sikker på at du vil slette dette punktet?', () => deleteChecklistItem(index), '🗑️');
}

async function deleteChecklistItem(index) {
    if (!state.currentChecklist) return;
    
    const items = state.currentChecklist.items || [];
    items.splice(index, 1);
    state.currentChecklist.items = items;
    
    await saveToFirestore('checklists', state.currentChecklist.id, { items });
    renderChecklistItems();
    showToast('Punkt slettet');
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

function confirmResetChecklist() {
    showConfirm('Tilbakestill?', 'Alle punkter vil bli satt som ikke fullført.', resetChecklist, '🔄');
}

async function resetChecklist() {
    if (!state.currentChecklist) return;
    
    const items = (state.currentChecklist.items || []).map(i => ({ ...i, done: false }));
    state.currentChecklist.items = items;
    
    await saveToFirestore('checklists', state.currentChecklist.id, { items });
    renderChecklistItems();
    showToast('Sjekkliste tilbakestilt');
}

function confirmDeleteChecklist() {
    if (!state.currentChecklist) return;
    
    const isSeasonal = DEFAULT_CHECKLISTS.some(d => d.id === state.currentChecklist.id);
    if (isSeasonal) {
        showToast('Kan ikke slette sesong-sjekklister', 'error');
        return;
    }
    
    showConfirm('Slett sjekkliste?', `Er du sikker på at du vil slette "${state.currentChecklist.name}"?`, deleteChecklist, '🗑️');
}

async function deleteChecklist() {
    if (!state.currentChecklist) return;
    
    const success = await deleteFromFirestore('checklists', state.currentChecklist.id);
    if (success) {
        state.checklists = state.checklists.filter(c => c.id !== state.currentChecklist.id);
        state.currentChecklist = null;
        showToast('Sjekkliste slettet');
        showView('checklistsView');
    } else {
        showToast('Kunne ikke slette sjekkliste', 'error');
    }
}

function openChecklistModal() {
    const modal = $('checklistModal');
    const nameInput = $('checklistName');
    const iconSelect = $('checklistIcon');
    
    if (nameInput) nameInput.value = '';
    if (iconSelect) iconSelect.value = '📋';
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeChecklistModal() {
    const modal = $('checklistModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
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
            ? `<p>${escapeHtml(address).replace(/\n/g, '<br>')}</p><button class="edit-btn" onclick="openSettingsModal()">Rediger</button>`
            : `<p class="no-address">Ikke satt opp</p><button class="edit-btn" onclick="openSettingsModal()">Legg til</button>`;
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
    const darkModeCheck = $('settingsDarkMode');
    const notificationsCheck = $('settingsNotifications');
    const fontSizeSelect = $('settingsFontSize');
    const latInput = $('settingsLatitude');
    const lonInput = $('settingsLongitude');
    
    if (farmNameInput) farmNameInput.value = state.settings?.farmName || '';
    if (addressInput) addressInput.value = state.settings?.address || '';
    if (darkModeCheck) darkModeCheck.checked = state.settings?.darkMode || false;
    if (notificationsCheck) notificationsCheck.checked = state.settings?.notifications !== false;
    if (fontSizeSelect) fontSizeSelect.value = state.settings?.fontSize || 'normal';
    if (latInput) latInput.value = state.settings?.latitude || '60.39';
    if (lonInput) lonInput.value = state.settings?.longitude || '5.32';
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeSettingsModal() {
    const modal = $('settingsModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
}

function getGeoLocation() {
    if (!navigator.geolocation) {
        showToast('Geolokasjon støttes ikke', 'error');
        return;
    }
    
    showToast('Henter posisjon...');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latInput = $('settingsLatitude');
            const lonInput = $('settingsLongitude');
            
            if (latInput) latInput.value = position.coords.latitude.toFixed(4);
            if (lonInput) lonInput.value = position.coords.longitude.toFixed(4);
            
            showToast('Posisjon hentet ✓');
        },
        (error) => {
            showToast('Kunne ikke hente posisjon', 'error');
        }
    );
}

async function saveSettings() {
    const settings = {
        farmName: $('settingsFarmName')?.value?.trim() || '',
        address: $('settingsAddress')?.value?.trim() || '',
        darkMode: $('settingsDarkMode')?.checked || false,
        notifications: $('settingsNotifications')?.checked !== false,
        fontSize: $('settingsFontSize')?.value || 'normal',
        latitude: parseFloat($('settingsLatitude')?.value) || 60.39,
        longitude: parseFloat($('settingsLongitude')?.value) || 5.32,
        lastSeasonReset: state.settings.lastSeasonReset
    };
    
    state.settings = settings;
    
    try {
        await db.collection('users').doc(state.user.uid).set({
            settings: settings
        }, { merge: true });
        
        applySettings();
        closeSettingsModal();
        showToast('Innstillinger lagret ✓');
        
        fetchWeather();
    } catch (error) {
        showToast('Kunne ikke lagre innstillinger', 'error');
    }
}

function confirmClearAllData() {
    showConfirm('Slett all data?', 'Dette kan ikke angres! Alle artikler, kontakter og sjekklister vil bli slettet.', clearAllData, '⚠️');
}

async function clearAllData() {
    try {
        for (const article of state.articles) {
            await deleteFromFirestore('articles', article.id);
        }
        for (const contact of state.contacts) {
            await deleteFromFirestore('contacts', contact.id);
        }
        for (const checklist of state.checklists) {
            if (!DEFAULT_CHECKLISTS.some(d => d.id === checklist.id)) {
                await deleteFromFirestore('checklists', checklist.id);
            }
        }
        for (const category of state.categories) {
            if (!DEFAULT_CATEGORIES.some(d => d.id === category.id)) {
                await deleteFromFirestore('categories', category.id);
            }
        }
        
        state.articles = [];
        state.contacts = [];
        state.checklists = [...DEFAULT_CHECKLISTS];
        state.categories = [...DEFAULT_CATEGORIES];
        state.recentArticles = [];
        
        for (const checklist of DEFAULT_CHECKLISTS) {
            await saveToFirestore('checklists', checklist.id, checklist);
        }
        
        closeSettingsModal();
        showToast('Data slettet');
        renderDashboard();
    } catch (error) {
        showToast('Kunne ikke slette data', 'error');
    }
}

// ===== Sync/Export/Import =====
function openSyncModal() {
    const modal = $('syncModal');
    const userEmail = $('syncUserEmail');
    
    if (userEmail && state.user?.email) {
        userEmail.textContent = state.user.email;
    }
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeSyncModal() {
    const modal = $('syncModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
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
                
                applySettings();
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
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeAboutModal() {
    const modal = $('aboutModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
}

// ===== Feedback Modal =====
function openFeedbackModal() {
    const modal = $('feedbackModal');
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
    closeMenu();
}

function closeFeedbackModal() {
    const modal = $('feedbackModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
    const form = $('feedbackForm');
    if (form) form.reset();
}

async function submitFeedback(e) {
    e.preventDefault();
    
    if (!state.user) {
        showToast('Du må være logget inn', 'error');
        return;
    }
    
    const subject = $('feedbackSubject')?.value?.trim() || '';
    const message = $('feedbackMessage')?.value?.trim() || '';
    
    if (!subject || !message) {
        showToast('Fyll ut alle felt', 'error');
        return;
    }
    
    try {
        const feedback = {
            userId: state.user.uid,
            userEmail: state.user.email,
            userName: state.user.displayName || 'Anonym',
            subject,
            message,
            createdAt: new Date(),
            status: 'new'
        };
        
        await saveToFirestore('feedback', null, feedback);
        showToast('Takk for tilbakemeldingen! 💚');
        closeFeedbackModal();
    } catch (error) {
        console.error('Feedback error:', error);
        showToast('Kunne ikke sende tilbakemelding', 'error');
    }
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
let pendingConfirmAction = null;

function showConfirm(title, message, callback, icon = '⚠️') {
    const modal = $('confirmModal');
    const iconEl = $('confirmIcon');
    const titleEl = $('confirmTitle');
    const messageEl = $('confirmMessage');
    
    if (iconEl) iconEl.textContent = icon;
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    pendingConfirmAction = callback;
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function executeConfirm() {
    closeConfirmModal();
    if (pendingConfirmAction) {
        pendingConfirmAction();
        pendingConfirmAction = null;
    }
}

function closeConfirmModal() {
    const modal = $('confirmModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
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
    pendingConfirmAction = null;
    updateBodyOverflow();
}

// ===== Global Functions =====
window.openArticle = openArticle;
window.openCategory = openCategory;
window.openArticleModal = openArticleModal;
window.openContactModal = openContactModal;
window.openChecklistModal = openChecklistModal;
window.openChecklist = openChecklist;
window.openLightbox = openLightbox;
window.removeImage = removeImage;
window.selectEmoji = selectEmoji;
window.confirmDeleteCategory = confirmDeleteCategory;
window.toggleChecklistItem = toggleChecklistItem;
window.confirmDeleteChecklistItem = confirmDeleteChecklistItem;
window.openSettingsModal = openSettingsModal;
window.editContact = editContact;
window.openFeedbackModal = openFeedbackModal;
window.closeFeedbackModal = closeFeedbackModal;

// ===== Start App =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏡 Småbruk Kunnskapsbase v' + APP_VERSION + ' starting...');
    await setupAuth();
});
