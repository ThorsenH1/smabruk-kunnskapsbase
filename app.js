// ==========================================
// SMÅBRUK KUNNSKAPSBASE APP v5.0
// Firebase-basert med Google Auth
// Med værmelding, sesong, auto-reset og feedback
// 🔥 EPIC ANIMATIONS EDITION 🔥
// ==========================================

const APP_VERSION = '5.1.0';

// ==========================================
// ATV MODUL - Batteri, Service & Vedlikehold
// ==========================================

// ===== ATV Default Data =====
const DEFAULT_ATV_TOOLS = {
    basis: [
        { id: 'tool-1', name: 'Skrutrekker sett', status: 'ok', category: 'basis' },
        { id: 'tool-2', name: 'Fastnøkler (metrisk)', status: 'ok', category: 'basis' },
        { id: 'tool-3', name: 'Multimeter', status: 'ok', category: 'basis' },
        { id: 'tool-4', name: 'Pumpe', status: 'ok', category: 'basis' },
        { id: 'tool-5', name: 'Jekk', status: 'ok', category: 'basis' },
        { id: 'tool-6', name: 'WD-40', status: 'ok', category: 'basis' },
        { id: 'tool-7', name: 'Oljetrakt', status: 'ok', category: 'basis' },
        { id: 'tool-8', name: 'Hansker', status: 'ok', category: 'basis' }
    ],
    avansert: [
        { id: 'tool-9', name: 'Momentnøkkel', status: 'ok', category: 'avansert' },
        { id: 'tool-10', name: 'Diagnose-verktøy', status: 'ok', category: 'avansert' },
        { id: 'tool-11', name: 'Kompressjonstester', status: 'ok', category: 'avansert' },
        { id: 'tool-12', name: 'Lageruttrekker', status: 'ok', category: 'avansert' },
        { id: 'tool-13', name: 'Slangeklemme-tang', status: 'ok', category: 'avansert' },
        { id: 'tool-14', name: 'Bremsevæske-tapper', status: 'ok', category: 'avansert' }
    ]
};

const DEFAULT_ATV_PARTS = [
    { id: 'part-1', name: 'Motorolje 10W-40', type: 'forbruk', quantity: 4, unit: 'liter', minQuantity: 2 },
    { id: 'part-2', name: 'Oljefilter', type: 'reserve', quantity: 2, unit: 'stk', minQuantity: 1 },
    { id: 'part-3', name: 'Luftfilter', type: 'reserve', quantity: 1, unit: 'stk', minQuantity: 1 },
    { id: 'part-4', name: 'Tennplugg', type: 'reserve', quantity: 4, unit: 'stk', minQuantity: 2 },
    { id: 'part-5', name: 'Bremseklosser (sett)', type: 'reserve', quantity: 1, unit: 'sett', minQuantity: 1 },
    { id: 'part-6', name: 'Kjølervæske', type: 'forbruk', quantity: 2, unit: 'liter', minQuantity: 1 },
    { id: 'part-7', name: 'Drivreim', type: 'reserve', quantity: 1, unit: 'stk', minQuantity: 1 },
    { id: 'part-8', name: 'Sikringer (diverse)', type: 'reserve', quantity: 10, unit: 'stk', minQuantity: 5 }
];

// ===== Batteri Beregning Funksjoner =====
/**
 * Beregner sannsynlighet for start basert på batterispenning
 * Blybatterier: 12.7V = 100%, 12.4V = 75%, 12.2V = 50%, 12.0V = 25%, <11.9V = 0%
 * @param {number} voltage - Batterispenning i volt
 * @param {number} daysAhead - Antall dager frem i tid
 * @param {number} temperature - Temperatur i celsius (valgfritt)
 * @returns {object} - { probability, recommendation, status }
 */
function calculateBatteryStartProbability(voltage, daysAhead = 0, temperature = 20) {
    // Grunnberegning basert på spenning
    let baseProb = 0;
    
    if (voltage >= 12.7) baseProb = 100;
    else if (voltage >= 12.6) baseProb = 95;
    else if (voltage >= 12.5) baseProb = 85;
    else if (voltage >= 12.4) baseProb = 75;
    else if (voltage >= 12.3) baseProb = 60;
    else if (voltage >= 12.2) baseProb = 50;
    else if (voltage >= 12.1) baseProb = 35;
    else if (voltage >= 12.0) baseProb = 25;
    else if (voltage >= 11.9) baseProb = 10;
    else baseProb = 0;
    
    // Temperaturjustering (kulde reduserer batterikapasitet)
    let tempFactor = 1;
    if (temperature < 0) tempFactor = 0.6;
    else if (temperature < 5) tempFactor = 0.7;
    else if (temperature < 10) tempFactor = 0.85;
    else if (temperature > 30) tempFactor = 0.95;
    
    // Tid-justering (batteriet mister lading over tid)
    // Ca. 0.5-1% per dag i selvutlading for blybatteri
    const dailyLoss = 0.8;
    const timeFactor = Math.max(0, 1 - (daysAhead * dailyLoss / 100));
    
    // Endelig beregning
    const probability = Math.round(Math.max(0, Math.min(100, baseProb * tempFactor * timeFactor)));
    
    // Anbefaling
    let recommendation, status;
    if (probability >= 90) {
        recommendation = '✅ Batteriet er bra - ingen lading nødvendig';
        status = 'good';
    } else if (probability >= 70) {
        recommendation = '⚠️ Vurder å lade snart';
        status = 'warning';
    } else if (probability >= 50) {
        recommendation = '🔶 Anbefales å lade før bruk';
        status = 'caution';
    } else {
        recommendation = '🔴 Lad batteriet NÅ!';
        status = 'critical';
    }
    
    return { probability, recommendation, status };
}

/**
 * Estimerer batteritilstand basert på historiske målinger
 * @param {Array} measurements - Array med { voltage, timestamp, temperature }
 * @returns {object} - Analyse av batteriets helse
 */
function analyzeBatteryHealth(measurements) {
    if (!measurements || measurements.length === 0) {
        return { health: 'unknown', trend: 'unknown', message: 'Ingen målinger tilgjengelig' };
    }
    
    // Sorter etter tid
    const sorted = [...measurements].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Beregn gjennomsnitt og trend
    const voltages = sorted.map(m => m.voltage);
    const avgVoltage = voltages.reduce((a, b) => a + b, 0) / voltages.length;
    
    // Trend: sammenlign første halvdel med andre halvdel
    const half = Math.floor(voltages.length / 2);
    const firstHalf = voltages.slice(0, half);
    const secondHalf = voltages.slice(half);
    
    const avgFirst = firstHalf.length ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const avgSecond = secondHalf.length ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
    
    let trend, health, message;
    
    if (avgSecond > avgFirst + 0.1) {
        trend = 'improving';
        message = '📈 Batteriets tilstand forbedres';
    } else if (avgSecond < avgFirst - 0.2) {
        trend = 'declining';
        message = '📉 Batteriets tilstand forverres - vurder utskifting';
    } else {
        trend = 'stable';
        message = '📊 Batteriets tilstand er stabil';
    }
    
    if (avgVoltage >= 12.5) health = 'excellent';
    else if (avgVoltage >= 12.3) health = 'good';
    else if (avgVoltage >= 12.0) health = 'fair';
    else health = 'poor';
    
    return { 
        health, 
        trend, 
        message,
        averageVoltage: avgVoltage.toFixed(2),
        measurementCount: measurements.length,
        lastMeasurement: sorted[sorted.length - 1]
    };
}

// ===== Confetti Effect =====
function launchConfetti() {
    const colors = ['#2d5a27', '#4a8f42', '#f4a460', '#ffd700', '#28a745', '#dc3545'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 3) + 's';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(confetti);
    }
    
    setTimeout(() => container.remove(), 5000);
}

// ===== Firebase Initialization =====
// Configuration is loaded from firebase-config.js
// Note: Firebase config is imported from separate file for better organization
// Security is maintained through Firebase Security Rules and API restrictions
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
    tempImages: [],
    // ATV State
    atvProfiles: [],           // Liste over ATV-er
    atvBatteries: [],          // Batterier med målinger
    atvRepairs: [],            // Reparasjoner/service
    atvTools: [],              // Verktøy
    atvParts: [],              // Deler og forbruksvarer
    currentAtv: null,          // Valgt ATV
    currentRepair: null,       // Aktiv reparasjon som vises
    editingAtv: null,          // ATV som redigeres
    editingRepair: null,       // Reparasjon som redigeres
    tempRepairImages: []       // Midlertidige bilder for reparasjon
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
    if (!state.user) return null;
    
    const docData = { ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    
    try {
        if (collection === 'users') {
            // Special case: save to user document directly
            await db.collection('users').doc(id).set(docData, { merge: true });
            return id;
        } else {
            // Normal case: save to user's subcollection
            const col = userDoc(collection);
            if (!col) return null;
            
            if (id) {
                await col.doc(id).set(docData, { merge: true });
                return id;
            } else {
                docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const ref = await col.add(docData);
                return ref.id;
            }
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

async function getFromFirestore(collection, id) {
    if (!state.user) return null;
    
    try {
        if (collection === 'users') {
            // Special case: get user document directly
            const doc = await db.collection('users').doc(id).get();
            return doc.exists ? doc.data() : null;
        } else {
            // Normal case: get from user's subcollection
            const col = userDoc(collection);
            if (!col) return null;
            const doc = await col.doc(id).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        }
    } catch (e) {
        console.error(`Could not load ${collection}/${id}:`, e);
        return null;
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

// ===== Helper: File to Base64 =====
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ===== Helper: Compress and Convert Image =====
async function compressAndConvertImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                
                // Create canvas and compress
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to data URL with compression
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            
            img.onerror = () => reject(new Error('Kunne ikke laste bildet'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('Kunne ikke lese filen'));
        reader.readAsDataURL(file);
    });
}

// ===== Initialize App =====
async function initApp() {
    const splash = $('splashScreen');
    if (splash) splash.classList.remove('hidden');
    
    try {
        await loadAllData();
        await checkSeasonReset();
        setupEventListeners();
        setupAtvEventListeners();  // Legg til ATV event listeners
        setupProfileButton();
        startClock();
        fetchWeather();
        renderDashboard();
        applySettings();
        updateAdminMenuVisibility();
        
        setTimeout(() => {
            if (splash) splash.classList.add('hidden');
            const mainApp = $('mainApp');
            if (mainApp) mainApp.classList.remove('hidden');
        }, 600);
        
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then((reg) => {
                    console.log('✓ Service Worker registered');
                    
                    // Check for updates
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('ℹ️ App update available - refresh page to update');
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.warn('Service Worker registration failed:', error);
                });
        }
        
    } catch (error) {
        console.error('Init error:', error);
        if (splash) splash.classList.add('hidden');
        const mainApp = $('mainApp');
        if (mainApp) mainApp.classList.remove('hidden');
        showToast('Kunne ikke laste data', 'error');
    }
}

function updateAdminMenuVisibility() {
    const adminBtn = $('menuAdminPanel');
    if (adminBtn && state.user?.email === 'halvor.thorsenh@gmail.com') {
        adminBtn.style.display = 'block';
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
    
    // ===== Laste ATV Data =====
    state.atvProfiles = await loadCollection('atvProfiles');
    state.atvBatteries = await loadCollection('atvBatteries');
    state.atvRepairs = await loadCollection('atvRepairs');
    state.atvTools = await loadCollection('atvTools');
    state.atvParts = await loadCollection('atvParts');
    
    // Initialiser standard verktøy hvis tom
    if (state.atvTools.length === 0) {
        const allTools = [...DEFAULT_ATV_TOOLS.basis, ...DEFAULT_ATV_TOOLS.avansert];
        for (const tool of allTools) {
            await saveToFirestore('atvTools', tool.id, tool);
            state.atvTools.push(tool);
        }
    }
    
    // Initialiser standard deler hvis tom
    if (state.atvParts.length === 0) {
        for (const part of DEFAULT_ATV_PARTS) {
            await saveToFirestore('atvParts', part.id, part);
            state.atvParts.push(part);
        }
    }
    
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
    
    // Update farm identity card
    const farmIdentityName = $('farmIdentityName');
    if (farmIdentityName && state.settings?.farmName) {
        farmIdentityName.textContent = state.settings.farmName;
    }
    
    // Update farm image if custom image is set
    const farmImage = $('farmImage');
    if (farmImage && state.settings?.farmImageUrl) {
        farmImage.src = state.settings.farmImageUrl;
    }
    
    // Update version display
    const versionInfo = $('versionInfo');
    if (versionInfo) {
        versionInfo.textContent = 'Versjon ' + APP_VERSION;
    }
    const aboutVersion = $('aboutVersion');
    if (aboutVersion) {
        aboutVersion.textContent = 'Versjon ' + APP_VERSION;
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
    const windMs = (wind / 3.6).toFixed(1);
    
    weatherEl.innerHTML = `
        <div class="weather-main">
            <span class="weather-icon">${icon}</span>
            <span class="weather-temp">${temp}°C</span>
        </div>
        <div class="weather-details">
            <span class="weather-desc">${desc}</span>
            <span class="weather-wind">💨 ${windMs} m/s</span>
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
    
    // Initialize farm images
    initFarmImages();
    
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
    on('backFromGallery', 'click', () => showView('dashboardView'));
    
    on('selectGalleryImageBtn', 'click', () => $('galleryPageImageInput')?.click());
    on('galleryPageImageInput', 'change', handleGalleryPageUpload);
    
    on('closeMenu', 'click', closeMenu);
    on('menuOverlay', 'click', closeMenu);
    on('menuHome', 'click', () => { closeMenu(); showView('dashboardView'); });
    on('menuSettings', 'click', () => { closeMenu(); openSettingsModal(); });
    on('menuCategories', 'click', () => { closeMenu(); openCategoryModal(); });
    on('menuGallery', 'click', () => { closeMenu(); openGalleryPageView(); });
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
    
    on('closeGalleryModal', 'click', closeGalleryModal);
    on('galleryImageInput', 'change', handleGalleryUpload);
    
    on('menuFeedback', 'click', openFeedbackModal);
    on('closeFeedbackModal', 'click', closeFeedbackModal);
    on('feedbackForm', 'submit', submitFeedback);
    
    on('menuAdminPanel', 'click', openAdminPanel);
    on('closeAdminPanelModal', 'click', closeAdminPanel);
    
    // Setup drag and drop for gallery
    setupGalleryDragDrop();
    
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
        
        // 🎉 Celebrate when all items are complete!
        const allDone = items.length > 0 && items.every(item => item.done);
        if (allDone) {
            launchConfetti();
            showToast('🎉 Fantastisk! Alle punkter er fullført!', 4000);
        }
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

// ===== Gallery Modal =====
function openGalleryModal() {
    const modal = $('galleryModal');
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
        loadGalleryImages();
    }
}

function closeGalleryModal() {
    const modal = $('galleryModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
}

async function loadGalleryImages() {
    if (!state.user) return;
    
    const grid = $('galleryGrid');
    if (!grid) return;
    
    try {
        const userData = await getFromFirestore('users', state.user.uid);
        const images = userData?.galleryImages || [];
        
        if (images.length === 0) {
            grid.innerHTML = '<p class="empty-gallery-text">Ingen bilder ennå. Last opp bilder for å komme i gang!</p>';
            return;
        }
        
        grid.innerHTML = images.map((img, index) => `
            <div class="gallery-item" data-index="${index}">
                <img src="${img}" alt="Bilde ${index + 1}" onclick="openLightbox('${img}')">
                <div class="gallery-item-overlay">
                    <button class="gallery-item-delete" onclick="deleteGalleryImage(${index})" title="Slett">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Feil ved lasting av galleri:', error);
        grid.innerHTML = '<p class="empty-gallery-text">Kunne ikke laste bilder</p>';
    }
}

async function handleGalleryUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0 || !state.user) return;
    
    showToast('📷 Laster opp bilder...');
    
    try {
        const userData = await getFromFirestore('users', state.user.uid);
        const existingImages = userData?.galleryImages || [];
        
        const newImages = [];
        for (const file of files) {
            const base64 = await fileToBase64(file);
            newImages.push(base64);
        }
        
        const allImages = [...existingImages, ...newImages];
        
        await saveToFirestore('users', state.user.uid, {
            galleryImages: allImages
        });
        
        showToast(`✅ ${files.length} bilde(r) lastet opp!`);
        loadGalleryImages();
    } catch (error) {
        console.error('Feil ved opplasting:', error);
        showToast('❌ Kunne ikke laste opp bilder');
    }
    
    e.target.value = '';
}

// ===== Gallery Page View =====
function openGalleryPageView() {
    showView('galleryPageView');
    loadGalleryPageImages();
}

async function loadGalleryPageImages() {
    if (!state.user) return;
    
    const grid = $('galleryPageGrid');
    if (!grid) return;
    
    try {
        const userData = await getFromFirestore('users', state.user.uid);
        const images = userData?.galleryImages || [];
        
        if (images.length === 0) {
            grid.innerHTML = '<p class="empty-gallery-text">Ingen bilder ennå. Last opp bilder fra gården!</p>';
            return;
        }
        
        grid.innerHTML = images.map((img, index) => `
            <div class="gallery-page-item" onclick="openLightbox('${img}')">
                <img src="${img}" alt="Bilde ${index + 1}">
                <div class="gallery-page-item-overlay">
                    <button class="gallery-page-btn" onclick="event.stopPropagation(); openLightbox('${img}')" title="Vis fullskjerm">🔍</button>
                    <button class="gallery-page-btn delete" onclick="event.stopPropagation(); deleteGalleryPageImage(${index})" title="Slett">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Feil ved lasting av galleri:', error);
        grid.innerHTML = '<p class="empty-gallery-text">Kunne ikke laste bilder</p>';
    }
}

function setupGalleryDragDrop() {
    const uploadArea = $('galleryUploadArea');
    if (!uploadArea) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight on drag
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('drag-over');
        }, false);
    });
    
    // Handle drop
    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleGalleryDropFiles(files);
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

async function handleGalleryDropFiles(files) {
    if (!files || files.length === 0 || !state.user) return;
    
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showToast('⚠️ Vennligst velg bilder');
        return;
    }
    
    showToast('📷 Laster opp bilder...');
    
    try {
        const userData = await getFromFirestore('users', state.user.uid);
        const existingImages = userData?.galleryImages || [];
        
        const newImages = [];
        for (const file of imageFiles) {
            try {
                const compressed = await compressAndConvertImage(file);
                newImages.push(compressed);
            } catch (err) {
                console.warn(`Kunne ikke komprimere ${file.name}:`, err);
                showToast(`⚠️ Kunne ikke komprimere ${file.name}`);
            }
        }
        
        if (newImages.length === 0) {
            showToast('❌ Ingen bilder kunne behandles');
            return;
        }
        
        const allImages = [...existingImages, ...newImages];
        
        await saveToFirestore('users', state.user.uid, {
            galleryImages: allImages
        });
        
        showToast(`✅ ${newImages.length} bilde(r) lastet opp!`);
        loadGalleryPageImages();
    } catch (error) {
        console.error('Feil ved opplasting:', error);
        showToast('❌ Kunne ikke laste opp bilder');
    }
}

async function handleGalleryPageUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0 || !state.user) return;
    
    showToast('📷 Laster opp bilder...');
    
    try {
        const userData = await getFromFirestore('users', state.user.uid);
        const existingImages = userData?.galleryImages || [];
        
        const newImages = [];
        for (const file of files) {
            try {
                const compressed = await compressAndConvertImage(file);
                newImages.push(compressed);
            } catch (err) {
                console.warn(`Kunne ikke komprimere ${file.name}:`, err);
                showToast(`⚠️ Kunne ikke komprimere ${file.name}`);
            }
        }
        
        if (newImages.length === 0) {
            showToast('❌ Ingen bilder kunne behandles');
            return;
        }
        
        const allImages = [...existingImages, ...newImages];
        
        await saveToFirestore('users', state.user.uid, {
            galleryImages: allImages
        });
        
        showToast(`✅ ${newImages.length} bilde(r) lastet opp!`);
        loadGalleryPageImages();
    } catch (error) {
        console.error('Feil ved opplasting:', error);
        showToast('❌ Kunne ikke laste opp bilder');
    }
    e.target.value = '';
}

async function deleteGalleryPageImage(index) {
    showConfirm('Slett bilde?', 'Er du sikker på at du vil slette dette bildet?', async () => {
        if (!state.user) return;
        
        try {
            const userData = await getFromFirestore('users', state.user.uid);
            const images = userData?.galleryImages || [];
            
            images.splice(index, 1);
            
            await saveToFirestore('users', state.user.uid, {
                galleryImages: images
            });
            
            showToast('🗑️ Bilde slettet');
            loadGalleryPageImages();
        } catch (error) {
            console.error('Feil ved sletting:', error);
            showToast('❌ Kunne ikke slette bilde');
        }
    }, '🗑️');
}

async function deleteGalleryImage(index) {
    if (!state.user) return;
    
    try {
        const userData = await getFromFirestore('users', state.user.uid);
        const images = userData?.galleryImages || [];
        
        images.splice(index, 1);
        
        await saveToFirestore('users', state.user.uid, {
            galleryImages: images
        });
        
        showToast('🗑️ Bilde slettet');
        loadGalleryImages();
    } catch (error) {
        console.error('Feil ved sletting:', error);
        showToast('❌ Kunne ikke slette bilde');
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
    
    const subject = $('feedbackSubject')?.value?.trim() || '';
    const message = $('feedbackMessage')?.value?.trim() || '';
    
    if (!subject || !message) {
        showToast('Fyll ut alle felt', 'error');
        return;
    }
    
    try {
        // Save to Firestore for admin panel (at root level, not user-specific)
        if (state.user) {
            await db.collection('feedback').add({
                userId: state.user.uid,
                userEmail: state.user.email,
                userName: state.user.displayName || 'Anonym',
                subject: subject,
                message: message,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'new'
            });
        }
        
        // Send to Formspree
        const response = await fetch('https://formspree.io/f/xrelqova', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: subject,
                message: message,
                email: state.user?.email || 'anonym@bruker.no',
                name: state.user?.displayName || 'Anonym bruker'
            })
        });
        
        if (response.ok) {
            showToast('Takk for tilbakemeldingen! 💚');
            closeFeedbackModal();
        } else {
            showToast('Kunne ikke sende tilbakemelding', 'error');
        }
    } catch (error) {
        console.error('Feedback error:', error);
        showToast('Kunne ikke sende tilbakemelding', 'error');
    }
}

// ===== Admin Panel =====
function openAdminPanel() {
    const modal = $('adminPanelModal');
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
    loadFeedback();
    closeMenu();
}

function closeAdminPanel() {
    const modal = $('adminPanelModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
}

async function loadFeedback() {
    const list = $('feedbackList');
    if (!list) return;
    
    try {
        list.innerHTML = '<p class="loading">Laster tilbakemeldinger...</p>';
        
        const feedback = await db.collection('feedback')
            .orderBy('createdAt', 'desc')
            .get();
        
        if (feedback.empty) {
            list.innerHTML = '<p class="empty-state">Ingen tilbakemeldinger ennå</p>';
            return;
        }
        
        list.innerHTML = feedback.docs.map(doc => {
            const data = doc.data();
            const date = data.createdAt?.toDate?.() || new Date();
            const dateStr = date.toLocaleString('no-NO');
            
            return `
                <div class="feedback-item">
                    <div class="feedback-header">
                        <h4>${escapeHtml(data.subject)}</h4>
                        <span class="feedback-date">${dateStr}</span>
                    </div>
                    <p class="feedback-user"><strong>${escapeHtml(data.userName)}</strong> (${escapeHtml(data.userEmail)})</p>
                    <p class="feedback-message">${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading feedback:', error);
        list.innerHTML = '<p class="error">Kunne ikke laste tilbakemeldinger</p>';
    }
}

// ===== Farm Image Management =====
async function initFarmImages() {
    const mainContainer = $('farmMainImageContainer');
    const input = $('farmImageInput');
    const galleryBtn = $('farmGalleryUploadBtn');
    const galleryInput = $('farmGalleryInput');
    
    if (mainContainer) {
        mainContainer.addEventListener('click', () => input?.click());
    }
    
    if (input) {
        input.addEventListener('change', (e) => handleFarmMainImageUpload(e));
    }
    
    if (galleryBtn) {
        galleryBtn.addEventListener('click', () => galleryInput?.click());
    }
    
    if (galleryInput) {
        galleryInput.addEventListener('change', (e) => handleFarmGalleryUpload(e));
    }
    
    // Load saved images from Firestore
    await loadFarmImages();
}

async function handleFarmMainImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !state.user) return;
    
    try {
        showToast('📤 Laster opp bilde...', 3000);
        
        // Compress image before uploading
        const imageData = await compressAndConvertImage(file);
        
        // Save to Firestore
        await saveToFirestore('users', state.user.uid, {
            farmMainImage: imageData,
            farmMainImageUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Display image
        const img = $('farmMainImage');
        const placeholder = $('farmPlaceholder');
        if (img && placeholder) {
            img.src = imageData;
            img.classList.add('visible');
            placeholder.classList.add('hidden');
        }
        
        showToast('✅ Gårdsbilde lastet opp!', 'success', 3000);
    } catch (error) {
        console.error('Farm image upload error:', error);
        showToast('❌ Kunne ikke laste opp bilde', 'error');
    }
    
    e.target.value = '';
}

async function handleFarmGalleryUpload(e) {
    const files = e.target.files;
    if (!files || !state.user) return;
    
    try {
        showToast('📤 Laster opp bilder...', 3000);
        
        for (let file of files) {
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                const imageData = event.target?.result;
                if (typeof imageData === 'string') {
                    // Add to gallery array
                    if (!state.farmGallery) {
                        state.farmGallery = [];
                    }
                    
                    state.farmGallery.push({
                        id: Date.now() + Math.random(),
                        image: imageData,
                        uploaded: new Date().toISOString()
                    });
                    
                    // Save to Firestore
                    await saveToFirestore('users', state.user.uid, {
                        farmGallery: state.farmGallery
                    });
                    
                    renderFarmGallery();
                }
            };
            
            reader.readAsDataURL(file);
        }
        
        showToast('✅ Bilder lastet opp!', 'success', 3000);
    } catch (error) {
        console.error('Gallery upload error:', error);
        showToast('❌ Kunne ikke laste opp bilder', 'error');
    }
}

async function loadFarmImages() {
    if (!state.user) return;
    
    try {
        const userData = await getFromFirestore('users', state.user.uid);
        
        if (userData?.farmMainImage) {
            const img = $('farmMainImage');
            const placeholder = $('farmPlaceholder');
            if (img && placeholder) {
                img.src = userData.farmMainImage;
                img.classList.add('visible');
                placeholder.classList.add('hidden');
            }
        }
        
        if (userData?.farmGallery) {
            state.farmGallery = userData.farmGallery;
            renderFarmGallery();
        }
    } catch (error) {
        console.warn('Could not load farm images:', error);
    }
}

function renderFarmGallery() {
    const grid = $('farmGalleryGrid');
    if (!grid) return;
    
    if (!state.farmGallery || state.farmGallery.length === 0) {
        grid.innerHTML = `
            <div class="farm-gallery-empty" style="grid-column: 1 / -1;">
                <div class="farm-gallery-empty-icon">🖼️</div>
                <p>Ingen bilder ennå</p>
                <p class="farm-gallery-empty-hint">Klikk "Legg til bilde" for å starte galleriet</p>
            </div>
        `;
    } else {
        grid.innerHTML = state.farmGallery.map(item => `
            <div class="farm-gallery-item">
                <img src="${item.image}" alt="Galleri bilde">
                <div class="farm-gallery-item-overlay">
                    <div class="farm-gallery-actions">
                        <button class="farm-gallery-btn" onclick="openLightbox('${item.image}')" title="Forstørr">🔍</button>
                        <button class="farm-gallery-btn delete" onclick="deleteFarmGalleryImage(${item.id})" title="Slett">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

async function deleteFarmGalleryImage(id) {
    showConfirm('Slett bilde?', 'Er du sikker på at du vil slette dette bildet?', async () => {
        if (state.farmGallery) {
            state.farmGallery = state.farmGallery.filter(item => item.id !== id);
            
            if (state.user) {
                await saveToFirestore('users', state.user.uid, {
                    farmGallery: state.farmGallery
                });
            }
            
            renderFarmGallery();
            showToast('✅ Bilde slettet', 'success');
        }
    }, '🗑️');
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
function showToast(message, typeOrDuration = 'success', duration = 3000) {
    const toast = $('toast');
    if (!toast) return;
    
    // Support both: showToast('msg', 'error') and showToast('msg', 4000)
    let type = 'success';
    let timeout = 3000;
    
    if (typeof typeOrDuration === 'number') {
        timeout = typeOrDuration;
    } else {
        type = typeOrDuration;
        timeout = duration;
    }
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, timeout);
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
window.openAdminPanel = openAdminPanel;
window.closeAdminPanel = closeAdminPanel;

// ==========================================
// ATV MODUL - FULLSTENDIGE FUNKSJONER
// ==========================================

// ===== ATV View Management =====
function showAtvView(viewId) {
    // Skjul alle andre views først
    $$('.view').forEach(v => v.classList.remove('active'));
    
    const view = $(viewId);
    if (view) {
        view.classList.add('active');
    }
    state.currentView = viewId;
    
    // Render basert på view
    switch(viewId) {
        case 'atvDashboardView':
            renderAtvDashboard();
            break;
        case 'atvProfilesView':
            renderAtvProfiles();
            break;
        case 'atvBatteryView':
            renderAtvBatteryView();
            break;
        case 'atvRepairsView':
            renderAtvRepairs();
            break;
        case 'atvToolsView':
            renderAtvTools();
            break;
        case 'atvPartsView':
            renderAtvParts();
            break;
    }
}

// ===== ATV Dashboard =====
function renderAtvDashboard() {
    const container = $('atvDashboardContent');
    if (!container) return;
    
    const totalAtvs = state.atvProfiles.length;
    const totalRepairs = state.atvRepairs.length;
    const lowParts = state.atvParts.filter(p => p.quantity <= p.minQuantity).length;
    const toolsNeedAttention = state.atvTools.filter(t => t.status !== 'ok').length;
    
    // Finn siste batterimålinger for hver ATV
    const batteryWarnings = [];
    state.atvProfiles.forEach(atv => {
        const batteries = state.atvBatteries.filter(b => b.atvId === atv.id);
        batteries.forEach(battery => {
            if (battery.measurements && battery.measurements.length > 0) {
                const lastMeasurement = battery.measurements[battery.measurements.length - 1];
                const result = calculateBatteryStartProbability(lastMeasurement.voltage, 0, lastMeasurement.temperature || 20);
                if (result.status !== 'good') {
                    batteryWarnings.push({ atv, battery, result, lastMeasurement });
                }
            }
        });
    });
    
    container.innerHTML = `
        <!-- ATV Stats -->
        <div class="atv-stats-row">
            <div class="atv-stat-card" onclick="showAtvView('atvProfilesView')">
                <span class="atv-stat-icon">🏍️</span>
                <span class="atv-stat-number">${totalAtvs}</span>
                <span class="atv-stat-label">ATV-er</span>
            </div>
            <div class="atv-stat-card" onclick="showAtvView('atvRepairsView')">
                <span class="atv-stat-icon">🔧</span>
                <span class="atv-stat-number">${totalRepairs}</span>
                <span class="atv-stat-label">Reparasjoner</span>
            </div>
            <div class="atv-stat-card ${lowParts > 0 ? 'warning' : ''}" onclick="showAtvView('atvPartsView')">
                <span class="atv-stat-icon">📦</span>
                <span class="atv-stat-number">${lowParts}</span>
                <span class="atv-stat-label">Lave lagre</span>
            </div>
            <div class="atv-stat-card ${toolsNeedAttention > 0 ? 'warning' : ''}" onclick="showAtvView('atvToolsView')">
                <span class="atv-stat-icon">🛠️</span>
                <span class="atv-stat-number">${toolsNeedAttention}</span>
                <span class="atv-stat-label">Verktøy-varsler</span>
            </div>
        </div>
        
        <!-- Battery Warnings -->
        ${batteryWarnings.length > 0 ? `
            <div class="atv-section atv-warnings-section">
                <h3>🔋 Batterivarsler</h3>
                <div class="atv-warnings-list">
                    ${batteryWarnings.map(w => `
                        <div class="atv-warning-card ${w.result.status}" onclick="openAtvBatteryDetail('${w.battery.id}')">
                            <div class="atv-warning-icon">🔋</div>
                            <div class="atv-warning-info">
                                <strong>${escapeHtml(w.atv.name)} - ${escapeHtml(w.battery.name)}</strong>
                                <span class="atv-warning-voltage">${w.lastMeasurement.voltage}V</span>
                                <span class="atv-warning-prob">${w.result.probability}% startsannsynlighet</span>
                            </div>
                            <div class="atv-warning-action">${w.result.recommendation}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <!-- Quick Actions -->
        <div class="atv-quick-actions">
            <button class="atv-quick-btn" onclick="openAtvModal()">
                <span>🏍️</span> Ny ATV
            </button>
            <button class="atv-quick-btn" onclick="openBatteryMeasurementModal()">
                <span>🔋</span> Logg batteri
            </button>
            <button class="atv-quick-btn" onclick="openRepairModal()">
                <span>🔧</span> Ny reparasjon
            </button>
            <button class="atv-quick-btn" onclick="showAtvView('atvPartsView')">
                <span>📦</span> Deler
            </button>
        </div>
        
        <!-- Recent Repairs -->
        <div class="atv-section">
            <div class="atv-section-header">
                <h3>🔧 Siste reparasjoner</h3>
                <button class="atv-see-all-btn" onclick="showAtvView('atvRepairsView')">Se alle →</button>
            </div>
            <div class="atv-repairs-preview">
                ${state.atvRepairs.slice(0, 3).map(repair => {
                    const atv = state.atvProfiles.find(a => a.id === repair.atvId);
                    return `
                        <div class="atv-repair-preview-card" onclick="openRepairDetail('${repair.id}')">
                            <div class="atv-repair-date">${formatDate(repair.date || repair.createdAt)}</div>
                            <div class="atv-repair-title">${escapeHtml(repair.title)}</div>
                            <div class="atv-repair-atv">${atv ? escapeHtml(atv.name) : 'Ukjent ATV'}</div>
                        </div>
                    `;
                }).join('') || '<p class="empty-hint">Ingen reparasjoner ennå</p>'}
            </div>
        </div>
        
        <!-- ATV Overview -->
        <div class="atv-section">
            <div class="atv-section-header">
                <h3>🏍️ Mine ATV-er</h3>
                <button class="atv-see-all-btn" onclick="showAtvView('atvProfilesView')">Administrer →</button>
            </div>
            <div class="atv-profiles-preview">
                ${state.atvProfiles.map(atv => `
                    <div class="atv-profile-preview-card" onclick="openAtvDetail('${atv.id}')">
                        <div class="atv-profile-icon">🏍️</div>
                        <div class="atv-profile-info">
                            <strong>${escapeHtml(atv.name)}</strong>
                            <span>${escapeHtml(atv.model || '')} ${atv.year || ''}</span>
                        </div>
                    </div>
                `).join('') || '<p class="empty-hint">Ingen ATV-er registrert</p>'}
            </div>
        </div>
    `;
}

// ===== ATV Profiles =====
function renderAtvProfiles() {
    const list = $('atvProfilesList');
    if (!list) return;
    
    if (state.atvProfiles.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏍️</div>
                <p>Ingen ATV-er registrert</p>
                <button class="btn-primary" onclick="openAtvModal()">+ Legg til ATV</button>
            </div>
        `;
    } else {
        list.innerHTML = state.atvProfiles.map(atv => {
            const repairCount = state.atvRepairs.filter(r => r.atvId === atv.id).length;
            const batteries = state.atvBatteries.filter(b => b.atvId === atv.id);
            
            return `
                <div class="atv-profile-card" onclick="openAtvDetail('${atv.id}')">
                    <div class="atv-profile-header">
                        <span class="atv-profile-icon">🏍️</span>
                        <div class="atv-profile-main">
                            <h3>${escapeHtml(atv.name)}</h3>
                            <span class="atv-profile-model">${escapeHtml(atv.model || 'Ikke angitt')} ${atv.year || ''}</span>
                        </div>
                    </div>
                    <div class="atv-profile-details">
                        <div class="atv-detail-item">
                            <span class="atv-detail-icon">⚙️</span>
                            <span>${escapeHtml(atv.engineType || 'Ikke angitt')}</span>
                        </div>
                        <div class="atv-detail-item">
                            <span class="atv-detail-icon">🔋</span>
                            <span>${batteries.length} batteri${batteries.length !== 1 ? 'er' : ''}</span>
                        </div>
                        <div class="atv-detail-item">
                            <span class="atv-detail-icon">🔧</span>
                            <span>${repairCount} reparasjon${repairCount !== 1 ? 'er' : ''}</span>
                        </div>
                        <div class="atv-detail-item">
                            <span class="atv-detail-icon">📅</span>
                            <span>Service: ${atv.serviceInterval || 'Ikke satt'}${atv.serviceInterval ? ' km/timer' : ''}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ===== ATV Modal =====
function openAtvModal(atv = null) {
    state.editingAtv = atv;
    
    const modal = $('atvModal');
    const title = $('atvModalTitle');
    
    if (title) title.textContent = atv ? 'Rediger ATV' : 'Ny ATV';
    
    // Fyll ut skjema
    $('atvName').value = atv?.name || '';
    $('atvModel').value = atv?.model || '';
    $('atvYear').value = atv?.year || '';
    $('atvEngineType').value = atv?.engineType || '';
    $('atvBatteryType').value = atv?.batteryType || '';
    $('atvServiceInterval').value = atv?.serviceInterval || '';
    $('atvNotes').value = atv?.notes || '';
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeAtvModal() {
    const modal = $('atvModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
    state.editingAtv = null;
}

async function saveAtv(e) {
    e.preventDefault();
    
    const data = {
        name: $('atvName')?.value?.trim() || '',
        model: $('atvModel')?.value?.trim() || '',
        year: $('atvYear')?.value?.trim() || '',
        engineType: $('atvEngineType')?.value?.trim() || '',
        batteryType: $('atvBatteryType')?.value?.trim() || '',
        serviceInterval: $('atvServiceInterval')?.value?.trim() || '',
        notes: $('atvNotes')?.value?.trim() || ''
    };
    
    if (!data.name) {
        showToast('Gi ATV-en et navn', 'error');
        return;
    }
    
    try {
        const id = await saveToFirestore('atvProfiles', state.editingAtv?.id, data);
        
        if (state.editingAtv) {
            const idx = state.atvProfiles.findIndex(a => a.id === state.editingAtv.id);
            if (idx >= 0) state.atvProfiles[idx] = { ...state.atvProfiles[idx], ...data };
        } else {
            state.atvProfiles.push({ id, ...data });
        }
        
        closeAtvModal();
        showToast(state.editingAtv ? 'ATV oppdatert ✓' : 'ATV lagt til ✓');
        
        if (state.currentView === 'atvProfilesView') {
            renderAtvProfiles();
        } else {
            renderAtvDashboard();
        }
    } catch (error) {
        console.error('Save ATV error:', error);
        showToast('Kunne ikke lagre ATV', 'error');
    }
}

function openAtvDetail(atvId) {
    const atv = state.atvProfiles.find(a => a.id === atvId);
    if (!atv) return;
    
    state.currentAtv = atv;
    
    const content = $('atvDetailContent');
    if (!content) return;
    
    const batteries = state.atvBatteries.filter(b => b.atvId === atvId);
    const repairs = state.atvRepairs.filter(r => r.atvId === atvId);
    
    content.innerHTML = `
        <div class="atv-detail-header">
            <div class="atv-detail-icon">🏍️</div>
            <div class="atv-detail-title">
                <h2>${escapeHtml(atv.name)}</h2>
                <span class="atv-detail-subtitle">${escapeHtml(atv.model || '')} ${atv.year || ''}</span>
            </div>
            <div class="atv-detail-actions">
                <button class="action-btn" onclick="openAtvModal(state.currentAtv)">✏️</button>
                <button class="action-btn danger" onclick="confirmDeleteAtv()">🗑️</button>
            </div>
        </div>
        
        <div class="atv-detail-info">
            <div class="atv-info-grid">
                <div class="atv-info-item">
                    <span class="atv-info-label">Motor</span>
                    <span class="atv-info-value">${escapeHtml(atv.engineType || 'Ikke angitt')}</span>
                </div>
                <div class="atv-info-item">
                    <span class="atv-info-label">Batteritype</span>
                    <span class="atv-info-value">${escapeHtml(atv.batteryType || 'Ikke angitt')}</span>
                </div>
                <div class="atv-info-item">
                    <span class="atv-info-label">Serviceintervall</span>
                    <span class="atv-info-value">${atv.serviceInterval ? atv.serviceInterval + ' km/timer' : 'Ikke satt'}</span>
                </div>
                <div class="atv-info-item">
                    <span class="atv-info-label">År</span>
                    <span class="atv-info-value">${atv.year || 'Ikke angitt'}</span>
                </div>
            </div>
            ${atv.notes ? `<div class="atv-notes"><strong>Notater:</strong><p>${escapeHtml(atv.notes)}</p></div>` : ''}
        </div>
        
        <!-- Batterier -->
        <div class="atv-detail-section">
            <div class="atv-section-header">
                <h3>🔋 Batterier</h3>
                <button class="btn-small" onclick="openBatteryModal('${atvId}')">+ Legg til</button>
            </div>
            <div class="atv-batteries-list">
                ${batteries.length === 0 ? '<p class="empty-hint">Ingen batterier registrert</p>' : 
                    batteries.map(battery => {
                        const lastMeasurement = battery.measurements && battery.measurements.length > 0 
                            ? battery.measurements[battery.measurements.length - 1] 
                            : null;
                        const analysis = lastMeasurement 
                            ? calculateBatteryStartProbability(lastMeasurement.voltage, 0, lastMeasurement.temperature || 20)
                            : null;
                        
                        return `
                            <div class="atv-battery-card ${analysis?.status || ''}" onclick="openAtvBatteryDetail('${battery.id}')">
                                <div class="atv-battery-header">
                                    <span class="atv-battery-icon">🔋</span>
                                    <span class="atv-battery-name">${escapeHtml(battery.name)}</span>
                                </div>
                                ${lastMeasurement ? `
                                    <div class="atv-battery-info">
                                        <span class="atv-battery-voltage">${lastMeasurement.voltage}V</span>
                                        <span class="atv-battery-prob">${analysis.probability}%</span>
                                    </div>
                                    <div class="atv-battery-recommendation">${analysis.recommendation}</div>
                                ` : '<p class="empty-hint">Ingen målinger</p>'}
                            </div>
                        `;
                    }).join('')
                }
            </div>
        </div>
        
        <!-- Reparasjoner -->
        <div class="atv-detail-section">
            <div class="atv-section-header">
                <h3>🔧 Reparasjonshistorikk</h3>
                <button class="btn-small" onclick="openRepairModal('${atvId}')">+ Ny reparasjon</button>
            </div>
            <div class="atv-repairs-list">
                ${repairs.length === 0 ? '<p class="empty-hint">Ingen reparasjoner registrert</p>' :
                    repairs.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                        .slice(0, 5)
                        .map(repair => `
                            <div class="atv-repair-card" onclick="openRepairDetail('${repair.id}')">
                                <div class="atv-repair-header">
                                    <span class="atv-repair-date">${formatDate(repair.date || repair.createdAt)}</span>
                                    <span class="atv-repair-cost">${repair.cost ? repair.cost + ' kr' : ''}</span>
                                </div>
                                <div class="atv-repair-title">${escapeHtml(repair.title)}</div>
                                <div class="atv-repair-summary">${escapeHtml((repair.description || '').substring(0, 100))}${(repair.description || '').length > 100 ? '...' : ''}</div>
                                ${repair.images && repair.images.length > 0 ? '<span class="atv-has-images">🖼️ ' + repair.images.length + ' bilder</span>' : ''}
                            </div>
                        `).join('')
                }
            </div>
        </div>
    `;
    
    showAtvView('atvDetailView');
}

function confirmDeleteAtv() {
    if (!state.currentAtv) return;
    showConfirm(
        'Slett ATV?',
        `Er du sikker på at du vil slette "${state.currentAtv.name}"? Alle tilhørende batterier og reparasjoner vil også bli slettet.`,
        deleteCurrentAtv,
        '🗑️'
    );
}

async function deleteCurrentAtv() {
    if (!state.currentAtv) return;
    
    const atvId = state.currentAtv.id;
    
    // Slett tilhørende batterier
    const batteries = state.atvBatteries.filter(b => b.atvId === atvId);
    for (const battery of batteries) {
        await deleteFromFirestore('atvBatteries', battery.id);
    }
    state.atvBatteries = state.atvBatteries.filter(b => b.atvId !== atvId);
    
    // Slett tilhørende reparasjoner
    const repairs = state.atvRepairs.filter(r => r.atvId === atvId);
    for (const repair of repairs) {
        await deleteFromFirestore('atvRepairs', repair.id);
    }
    state.atvRepairs = state.atvRepairs.filter(r => r.atvId !== atvId);
    
    // Slett ATV
    const success = await deleteFromFirestore('atvProfiles', atvId);
    if (success) {
        state.atvProfiles = state.atvProfiles.filter(a => a.id !== atvId);
        state.currentAtv = null;
        showToast('ATV slettet');
        showAtvView('atvProfilesView');
    } else {
        showToast('Kunne ikke slette ATV', 'error');
    }
}

// ===== Batteri Funksjoner =====
function renderAtvBatteryView() {
    const list = $('atvBatteryList');
    if (!list) return;
    
    if (state.atvBatteries.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔋</div>
                <p>Ingen batterier registrert</p>
                <p class="empty-hint">Legg til en ATV først, deretter kan du registrere batterier</p>
            </div>
        `;
        return;
    }
    
    // Grupper batterier per ATV
    const grouped = {};
    state.atvBatteries.forEach(battery => {
        const atv = state.atvProfiles.find(a => a.id === battery.atvId);
        const atvName = atv ? atv.name : 'Ukjent ATV';
        if (!grouped[atvName]) grouped[atvName] = [];
        grouped[atvName].push(battery);
    });
    
    list.innerHTML = Object.entries(grouped).map(([atvName, batteries]) => `
        <div class="atv-battery-group">
            <h3 class="atv-battery-group-title">🏍️ ${escapeHtml(atvName)}</h3>
            ${batteries.map(battery => {
                const lastMeasurement = battery.measurements && battery.measurements.length > 0 
                    ? battery.measurements[battery.measurements.length - 1] 
                    : null;
                const analysis = lastMeasurement 
                    ? calculateBatteryStartProbability(lastMeasurement.voltage, 0, lastMeasurement.temperature || 20)
                    : null;
                const health = battery.measurements && battery.measurements.length >= 2 
                    ? analyzeBatteryHealth(battery.measurements) 
                    : null;
                
                return `
                    <div class="atv-battery-detail-card ${analysis?.status || ''}" onclick="openAtvBatteryDetail('${battery.id}')">
                        <div class="atv-battery-main">
                            <span class="atv-battery-icon">🔋</span>
                            <div class="atv-battery-info">
                                <strong>${escapeHtml(battery.name)}</strong>
                                <span class="atv-battery-type">${escapeHtml(battery.type || 'Standard')}</span>
                            </div>
                        </div>
                        ${lastMeasurement ? `
                            <div class="atv-battery-stats">
                                <div class="atv-battery-voltage-big">${lastMeasurement.voltage}V</div>
                                <div class="atv-battery-prob-bar">
                                    <div class="atv-battery-prob-fill" style="width: ${analysis.probability}%"></div>
                                </div>
                                <span class="atv-battery-prob-text">${analysis.probability}% startsannsynlighet</span>
                            </div>
                            <div class="atv-battery-analysis">
                                ${analysis.recommendation}
                                ${health ? `<br><small>${health.message}</small>` : ''}
                            </div>
                        ` : '<p class="empty-hint">Ingen målinger ennå</p>'}
                        <div class="atv-battery-meta">
                            <span>📊 ${battery.measurements?.length || 0} målinger</span>
                            ${lastMeasurement ? `<span>📅 Sist målt: ${formatDate(lastMeasurement.timestamp)}</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `).join('');
}

function openBatteryModal(atvId = null) {
    const modal = $('batteryModal');
    const atvSelect = $('batteryAtvSelect');
    
    // Populer ATV-valg
    if (atvSelect) {
        atvSelect.innerHTML = state.atvProfiles.map(atv => 
            `<option value="${atv.id}" ${atv.id === atvId ? 'selected' : ''}>${escapeHtml(atv.name)}</option>`
        ).join('');
    }
    
    $('batteryName').value = '';
    $('batteryType').value = '';
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeBatteryModal() {
    const modal = $('batteryModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
}

async function saveBattery(e) {
    e.preventDefault();
    
    const data = {
        atvId: $('batteryAtvSelect')?.value || '',
        name: $('batteryName')?.value?.trim() || 'Hovedbatteri',
        type: $('batteryType')?.value?.trim() || '',
        measurements: []
    };
    
    if (!data.atvId) {
        showToast('Velg en ATV', 'error');
        return;
    }
    
    try {
        const id = await saveToFirestore('atvBatteries', null, data);
        state.atvBatteries.push({ id, ...data });
        
        closeBatteryModal();
        showToast('Batteri lagt til ✓');
        
        if (state.currentView === 'atvDetailView' && state.currentAtv) {
            openAtvDetail(state.currentAtv.id);
        } else {
            renderAtvBatteryView();
        }
    } catch (error) {
        showToast('Kunne ikke lagre batteri', 'error');
    }
}

function openBatteryMeasurementModal(batteryId = null) {
    const modal = $('batteryMeasurementModal');
    const batterySelect = $('measurementBatterySelect');
    
    // Populer batteri-valg
    if (batterySelect) {
        batterySelect.innerHTML = state.atvBatteries.map(battery => {
            const atv = state.atvProfiles.find(a => a.id === battery.atvId);
            return `<option value="${battery.id}" ${battery.id === batteryId ? 'selected' : ''}>
                ${atv ? escapeHtml(atv.name) + ' - ' : ''}${escapeHtml(battery.name)}
            </option>`;
        }).join('');
    }
    
    // Sett standardverdier
    $('measurementVoltage').value = '';
    $('measurementTemperature').value = '';
    $('measurementNotes').value = '';
    
    // Beregn og vis prediksjon
    updateMeasurementPrediction();
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeBatteryMeasurementModal() {
    const modal = $('batteryMeasurementModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
}

function updateMeasurementPrediction() {
    const voltage = parseFloat($('measurementVoltage')?.value) || 0;
    const temperature = parseFloat($('measurementTemperature')?.value) || 20;
    const predictionContainer = $('measurementPrediction');
    
    if (!predictionContainer) return;
    
    if (voltage < 10 || voltage > 15) {
        predictionContainer.innerHTML = '<p class="prediction-hint">Skriv inn spenning for å se prediksjon</p>';
        return;
    }
    
    const today = calculateBatteryStartProbability(voltage, 0, temperature);
    const in7Days = calculateBatteryStartProbability(voltage, 7, temperature);
    
    predictionContainer.innerHTML = `
        <div class="prediction-result ${today.status}">
            <div class="prediction-row">
                <span class="prediction-label">I dag:</span>
                <span class="prediction-value">${today.probability}%</span>
            </div>
            <div class="prediction-row">
                <span class="prediction-label">Om 7 dager:</span>
                <span class="prediction-value">${in7Days.probability}%</span>
            </div>
            <div class="prediction-recommendation">${today.recommendation}</div>
        </div>
    `;
}

async function saveBatteryMeasurement(e) {
    e.preventDefault();
    
    const batteryId = $('measurementBatterySelect')?.value;
    const voltage = parseFloat($('measurementVoltage')?.value);
    const temperature = parseFloat($('measurementTemperature')?.value) || null;
    const notes = $('measurementNotes')?.value?.trim() || '';
    
    if (!batteryId) {
        showToast('Velg et batteri', 'error');
        return;
    }
    
    if (!voltage || voltage < 10 || voltage > 15) {
        showToast('Ugyldig spenningsverdi', 'error');
        return;
    }
    
    const battery = state.atvBatteries.find(b => b.id === batteryId);
    if (!battery) {
        showToast('Batteri ikke funnet', 'error');
        return;
    }
    
    const measurement = {
        voltage,
        temperature,
        notes,
        timestamp: new Date().toISOString()
    };
    
    if (!battery.measurements) battery.measurements = [];
    battery.measurements.push(measurement);
    
    try {
        await saveToFirestore('atvBatteries', batteryId, { measurements: battery.measurements });
        
        closeBatteryMeasurementModal();
        showToast('Måling lagret ✓');
        
        // Oppdater visning
        if (state.currentView === 'atvBatteryView') {
            renderAtvBatteryView();
        } else if (state.currentView === 'atvDashboardView') {
            renderAtvDashboard();
        }
    } catch (error) {
        showToast('Kunne ikke lagre måling', 'error');
    }
}

function openAtvBatteryDetail(batteryId) {
    const battery = state.atvBatteries.find(b => b.id === batteryId);
    if (!battery) return;
    
    const atv = state.atvProfiles.find(a => a.id === battery.atvId);
    const content = $('batteryDetailContent');
    if (!content) return;
    
    const measurements = battery.measurements || [];
    const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
    const analysis = lastMeasurement 
        ? calculateBatteryStartProbability(lastMeasurement.voltage, 0, lastMeasurement.temperature || 20)
        : null;
    const health = measurements.length >= 2 ? analyzeBatteryHealth(measurements) : null;
    
    content.innerHTML = `
        <div class="battery-detail-header">
            <div class="battery-detail-icon ${analysis?.status || ''}">🔋</div>
            <div class="battery-detail-title">
                <h2>${escapeHtml(battery.name)}</h2>
                <span>${atv ? escapeHtml(atv.name) : 'Ukjent ATV'}</span>
            </div>
            <div class="battery-detail-actions">
                <button class="action-btn" onclick="openBatteryMeasurementModal('${batteryId}')">📊 Ny måling</button>
                <button class="action-btn danger" onclick="confirmDeleteBattery('${batteryId}')">🗑️</button>
            </div>
        </div>
        
        ${lastMeasurement ? `
            <div class="battery-current-status ${analysis?.status || ''}">
                <div class="battery-voltage-display">
                    <span class="battery-voltage-value">${lastMeasurement.voltage}</span>
                    <span class="battery-voltage-unit">V</span>
                </div>
                <div class="battery-probability-display">
                    <div class="battery-prob-circle">
                        <svg viewBox="0 0 36 36" class="circular-chart">
                            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                            <path class="circle" stroke-dasharray="${analysis.probability}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                            <text x="18" y="20.35" class="percentage">${analysis.probability}%</text>
                        </svg>
                    </div>
                    <span class="battery-prob-label">Startsannsynlighet</span>
                </div>
                <div class="battery-recommendation">${analysis.recommendation}</div>
            </div>
            
            <div class="battery-predictions">
                <h3>📊 Prediksjon</h3>
                <div class="prediction-grid">
                    <div class="prediction-item">
                        <span class="prediction-time">I morgen</span>
                        <span class="prediction-prob">${calculateBatteryStartProbability(lastMeasurement.voltage, 1, lastMeasurement.temperature || 20).probability}%</span>
                    </div>
                    <div class="prediction-item">
                        <span class="prediction-time">Om 3 dager</span>
                        <span class="prediction-prob">${calculateBatteryStartProbability(lastMeasurement.voltage, 3, lastMeasurement.temperature || 20).probability}%</span>
                    </div>
                    <div class="prediction-item">
                        <span class="prediction-time">Om 7 dager</span>
                        <span class="prediction-prob">${calculateBatteryStartProbability(lastMeasurement.voltage, 7, lastMeasurement.temperature || 20).probability}%</span>
                    </div>
                    <div class="prediction-item">
                        <span class="prediction-time">Om 14 dager</span>
                        <span class="prediction-prob">${calculateBatteryStartProbability(lastMeasurement.voltage, 14, lastMeasurement.temperature || 20).probability}%</span>
                    </div>
                </div>
            </div>
        ` : '<p class="empty-hint">Ingen målinger registrert ennå</p>'}
        
        ${health ? `
            <div class="battery-health">
                <h3>🏥 Batterihelse</h3>
                <div class="health-info">
                    <div class="health-stat">
                        <span class="health-label">Tilstand</span>
                        <span class="health-value ${health.health}">${health.health}</span>
                    </div>
                    <div class="health-stat">
                        <span class="health-label">Trend</span>
                        <span class="health-value">${health.trend === 'improving' ? '📈 Bedre' : health.trend === 'declining' ? '📉 Verre' : '📊 Stabil'}</span>
                    </div>
                    <div class="health-stat">
                        <span class="health-label">Snitt spenning</span>
                        <span class="health-value">${health.averageVoltage}V</span>
                    </div>
                </div>
                <p class="health-message">${health.message}</p>
            </div>
        ` : ''}
        
        <div class="battery-history">
            <h3>📜 Målehistorikk</h3>
            <div class="measurement-list">
                ${measurements.length === 0 ? '<p class="empty-hint">Ingen målinger</p>' :
                    [...measurements].reverse().map(m => `
                        <div class="measurement-item">
                            <span class="measurement-date">${formatDate(m.timestamp)}</span>
                            <span class="measurement-voltage">${m.voltage}V</span>
                            ${m.temperature ? `<span class="measurement-temp">${m.temperature}°C</span>` : ''}
                            ${m.notes ? `<span class="measurement-notes">${escapeHtml(m.notes)}</span>` : ''}
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    
    showAtvView('batteryDetailView');
}

function confirmDeleteBattery(batteryId) {
    showConfirm('Slett batteri?', 'Er du sikker på at du vil slette dette batteriet og alle målinger?', () => deleteBattery(batteryId), '🗑️');
}

async function deleteBattery(batteryId) {
    const success = await deleteFromFirestore('atvBatteries', batteryId);
    if (success) {
        state.atvBatteries = state.atvBatteries.filter(b => b.id !== batteryId);
        showToast('Batteri slettet');
        showAtvView('atvBatteryView');
    } else {
        showToast('Kunne ikke slette batteri', 'error');
    }
}

// ===== Reparasjoner =====
function renderAtvRepairs() {
    const list = $('atvRepairsList');
    if (!list) return;
    
    // Filtrer og sorter
    const filterAtv = $('repairFilterAtv')?.value || 'all';
    const filterType = $('repairFilterType')?.value || 'all';
    
    let repairs = [...state.atvRepairs];
    
    if (filterAtv !== 'all') {
        repairs = repairs.filter(r => r.atvId === filterAtv);
    }
    if (filterType !== 'all') {
        repairs = repairs.filter(r => r.type === filterType);
    }
    
    repairs.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    
    if (repairs.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔧</div>
                <p>Ingen reparasjoner registrert</p>
                <button class="btn-primary" onclick="openRepairModal()">+ Ny reparasjon</button>
            </div>
        `;
    } else {
        list.innerHTML = repairs.map(repair => {
            const atv = state.atvProfiles.find(a => a.id === repair.atvId);
            
            return `
                <div class="atv-repair-list-card" onclick="openRepairDetail('${repair.id}')">
                    <div class="repair-card-header">
                        <span class="repair-date">${formatDate(repair.date || repair.createdAt)}</span>
                        <span class="repair-type-badge ${repair.type || 'service'}">${getRepairTypeLabel(repair.type)}</span>
                    </div>
                    <div class="repair-card-body">
                        <h4>${escapeHtml(repair.title)}</h4>
                        <span class="repair-atv">🏍️ ${atv ? escapeHtml(atv.name) : 'Ukjent ATV'}</span>
                    </div>
                    <div class="repair-card-footer">
                        ${repair.cost ? `<span class="repair-cost">💰 ${repair.cost} kr</span>` : ''}
                        ${repair.workTime ? `<span class="repair-time">⏱️ ${repair.workTime}</span>` : ''}
                        ${repair.images && repair.images.length > 0 ? `<span class="repair-images">🖼️ ${repair.images.length}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

function getRepairTypeLabel(type) {
    const types = {
        service: '🔧 Service',
        repair: '🛠️ Reparasjon',
        upgrade: '⬆️ Oppgradering',
        inspection: '🔍 Inspeksjon',
        emergency: '🆘 Akutt'
    };
    return types[type] || '🔧 Service';
}

function openRepairModal(atvId = null) {
    state.editingRepair = null;
    state.tempRepairImages = [];
    
    const modal = $('repairModal');
    const atvSelect = $('repairAtvSelect');
    
    // Populer ATV-valg
    if (atvSelect) {
        atvSelect.innerHTML = state.atvProfiles.map(atv => 
            `<option value="${atv.id}" ${atv.id === atvId ? 'selected' : ''}>${escapeHtml(atv.name)}</option>`
        ).join('');
    }
    
    // Nullstill skjema
    $('repairTitle').value = '';
    $('repairType').value = 'service';
    $('repairDate').value = new Date().toISOString().split('T')[0];
    $('repairDescription').value = '';
    $('repairParts').value = '';
    $('repairTools').value = '';
    $('repairWorkTime').value = '';
    $('repairCost').value = '';
    
    renderRepairImagePreviews();
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeRepairModal() {
    const modal = $('repairModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
    state.editingRepair = null;
    state.tempRepairImages = [];
}

function renderRepairImagePreviews() {
    const list = $('repairImagePreviewList');
    if (!list) return;
    
    list.innerHTML = state.tempRepairImages.map((img, i) => `
        <div class="image-preview">
            <img src="${img}" alt="Bilde ${i+1}">
            <button type="button" class="remove-img" onclick="removeRepairImage(${i})">✕</button>
        </div>
    `).join('');
}

function removeRepairImage(index) {
    state.tempRepairImages.splice(index, 1);
    renderRepairImagePreviews();
}

function handleRepairImageSelect(e) {
    const files = e.target.files;
    if (!files?.length) return;
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            compressImage(ev.target.result, (compressed) => {
                state.tempRepairImages.push(compressed);
                renderRepairImagePreviews();
            });
        };
        reader.readAsDataURL(file);
    });
    
    e.target.value = '';
}

async function saveRepair(e) {
    e.preventDefault();
    
    const data = {
        atvId: $('repairAtvSelect')?.value || '',
        title: $('repairTitle')?.value?.trim() || '',
        type: $('repairType')?.value || 'service',
        date: $('repairDate')?.value || new Date().toISOString().split('T')[0],
        description: $('repairDescription')?.value?.trim() || '',
        partsUsed: $('repairParts')?.value?.trim() || '',
        toolsUsed: $('repairTools')?.value?.trim() || '',
        workTime: $('repairWorkTime')?.value?.trim() || '',
        cost: $('repairCost')?.value?.trim() || '',
        images: state.tempRepairImages
    };
    
    if (!data.atvId) {
        showToast('Velg en ATV', 'error');
        return;
    }
    if (!data.title) {
        showToast('Gi reparasjonen en tittel', 'error');
        return;
    }
    
    try {
        const id = await saveToFirestore('atvRepairs', state.editingRepair?.id, data);
        
        if (state.editingRepair) {
            const idx = state.atvRepairs.findIndex(r => r.id === state.editingRepair.id);
            if (idx >= 0) state.atvRepairs[idx] = { ...state.atvRepairs[idx], ...data };
        } else {
            state.atvRepairs.push({ id, ...data });
        }
        
        closeRepairModal();
        showToast('Reparasjon lagret ✓');
        
        if (state.currentView === 'atvRepairsView') {
            renderAtvRepairs();
        } else if (state.currentView === 'atvDashboardView') {
            renderAtvDashboard();
        } else if (state.currentView === 'atvDetailView' && state.currentAtv) {
            openAtvDetail(state.currentAtv.id);
        }
    } catch (error) {
        showToast('Kunne ikke lagre reparasjon', 'error');
    }
}

function openRepairDetail(repairId) {
    const repair = state.atvRepairs.find(r => r.id === repairId);
    if (!repair) return;
    
    state.currentRepair = repair;
    const atv = state.atvProfiles.find(a => a.id === repair.atvId);
    
    const content = $('repairDetailContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="repair-detail-header">
            <div class="repair-detail-meta">
                <span class="repair-detail-date">${formatDate(repair.date || repair.createdAt)}</span>
                <span class="repair-type-badge ${repair.type || 'service'}">${getRepairTypeLabel(repair.type)}</span>
            </div>
            <h2>${escapeHtml(repair.title)}</h2>
            <span class="repair-detail-atv">🏍️ ${atv ? escapeHtml(atv.name) : 'Ukjent ATV'}</span>
            <div class="repair-detail-actions">
                <button class="action-btn" onclick="editRepair('${repairId}')">✏️</button>
                <button class="action-btn danger" onclick="confirmDeleteRepair('${repairId}')">🗑️</button>
            </div>
        </div>
        
        <div class="repair-detail-body">
            ${repair.description ? `
                <div class="repair-section">
                    <h3>📝 Beskrivelse</h3>
                    <p>${escapeHtml(repair.description).replace(/\n/g, '<br>')}</p>
                </div>
            ` : ''}
            
            <div class="repair-info-grid">
                ${repair.partsUsed ? `
                    <div class="repair-info-item">
                        <span class="repair-info-icon">📦</span>
                        <div class="repair-info-content">
                            <strong>Deler brukt</strong>
                            <span>${escapeHtml(repair.partsUsed)}</span>
                        </div>
                    </div>
                ` : ''}
                ${repair.toolsUsed ? `
                    <div class="repair-info-item">
                        <span class="repair-info-icon">🛠️</span>
                        <div class="repair-info-content">
                            <strong>Verktøy brukt</strong>
                            <span>${escapeHtml(repair.toolsUsed)}</span>
                        </div>
                    </div>
                ` : ''}
                ${repair.workTime ? `
                    <div class="repair-info-item">
                        <span class="repair-info-icon">⏱️</span>
                        <div class="repair-info-content">
                            <strong>Arbeidstid</strong>
                            <span>${escapeHtml(repair.workTime)}</span>
                        </div>
                    </div>
                ` : ''}
                ${repair.cost ? `
                    <div class="repair-info-item">
                        <span class="repair-info-icon">💰</span>
                        <div class="repair-info-content">
                            <strong>Kostnad</strong>
                            <span>${repair.cost} kr</span>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            ${repair.images && repair.images.length > 0 ? `
                <div class="repair-section">
                    <h3>🖼️ Bilder (${repair.images.length})</h3>
                    <div class="repair-images-grid">
                        ${repair.images.map((img, i) => `
                            <img src="${img}" alt="Bilde ${i+1}" onclick="openLightbox('${img}')" class="repair-image">
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    showAtvView('repairDetailView');
}

function editRepair(repairId) {
    const repair = state.atvRepairs.find(r => r.id === repairId);
    if (!repair) return;
    
    state.editingRepair = repair;
    state.tempRepairImages = repair.images ? [...repair.images] : [];
    
    const modal = $('repairModal');
    const atvSelect = $('repairAtvSelect');
    
    // Populer ATV-valg
    if (atvSelect) {
        atvSelect.innerHTML = state.atvProfiles.map(atv => 
            `<option value="${atv.id}" ${atv.id === repair.atvId ? 'selected' : ''}>${escapeHtml(atv.name)}</option>`
        ).join('');
    }
    
    // Fyll ut skjema
    $('repairTitle').value = repair.title || '';
    $('repairType').value = repair.type || 'service';
    $('repairDate').value = repair.date || '';
    $('repairDescription').value = repair.description || '';
    $('repairParts').value = repair.partsUsed || '';
    $('repairTools').value = repair.toolsUsed || '';
    $('repairWorkTime').value = repair.workTime || '';
    $('repairCost').value = repair.cost || '';
    
    renderRepairImagePreviews();
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function confirmDeleteRepair(repairId) {
    showConfirm('Slett reparasjon?', 'Er du sikker på at du vil slette denne reparasjonen?', () => deleteRepair(repairId), '🗑️');
}

async function deleteRepair(repairId) {
    const success = await deleteFromFirestore('atvRepairs', repairId);
    if (success) {
        state.atvRepairs = state.atvRepairs.filter(r => r.id !== repairId);
        showToast('Reparasjon slettet');
        showAtvView('atvRepairsView');
    } else {
        showToast('Kunne ikke slette reparasjon', 'error');
    }
}

// ===== Verktøy =====
function renderAtvTools() {
    const list = $('atvToolsList');
    if (!list) return;
    
    const basisTools = state.atvTools.filter(t => t.category === 'basis');
    const advancedTools = state.atvTools.filter(t => t.category === 'avansert');
    
    const statusIcon = (status) => {
        switch(status) {
            case 'ok': return '✅';
            case 'mangler': return '❌';
            case 'slitt': return '⚠️';
            case 'byttes': return '🔴';
            default: return '✅';
        }
    };
    
    const statusClass = (status) => {
        switch(status) {
            case 'mangler': return 'missing';
            case 'slitt': return 'worn';
            case 'byttes': return 'replace';
            default: return 'ok';
        }
    };
    
    list.innerHTML = `
        <div class="tools-section">
            <h3>🔧 Basisverktøy</h3>
            <div class="tools-grid">
                ${basisTools.map(tool => `
                    <div class="tool-card ${statusClass(tool.status)}" onclick="openToolModal('${tool.id}')">
                        <span class="tool-status">${statusIcon(tool.status)}</span>
                        <span class="tool-name">${escapeHtml(tool.name)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="tools-section">
            <h3>⚙️ Avansert verktøy</h3>
            <div class="tools-grid">
                ${advancedTools.map(tool => `
                    <div class="tool-card ${statusClass(tool.status)}" onclick="openToolModal('${tool.id}')">
                        <span class="tool-status">${statusIcon(tool.status)}</span>
                        <span class="tool-name">${escapeHtml(tool.name)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <button class="btn-primary full-width" onclick="openNewToolModal()">+ Legg til verktøy</button>
    `;
}

function openToolModal(toolId) {
    const tool = state.atvTools.find(t => t.id === toolId);
    if (!tool) return;
    
    const modal = $('toolModal');
    
    $('toolName').value = tool.name;
    $('toolCategory').value = tool.category;
    $('toolStatus').value = tool.status;
    $('toolModalTitle').textContent = 'Rediger verktøy';
    
    modal.dataset.toolId = toolId;
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function openNewToolModal() {
    const modal = $('toolModal');
    
    $('toolName').value = '';
    $('toolCategory').value = 'basis';
    $('toolStatus').value = 'ok';
    $('toolModalTitle').textContent = 'Nytt verktøy';
    
    delete modal.dataset.toolId;
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closeToolModal() {
    const modal = $('toolModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
}

async function saveTool(e) {
    e.preventDefault();
    
    const modal = $('toolModal');
    const toolId = modal?.dataset.toolId;
    
    const data = {
        name: $('toolName')?.value?.trim() || '',
        category: $('toolCategory')?.value || 'basis',
        status: $('toolStatus')?.value || 'ok'
    };
    
    if (!data.name) {
        showToast('Gi verktøyet et navn', 'error');
        return;
    }
    
    try {
        if (toolId) {
            // Oppdater eksisterende
            await saveToFirestore('atvTools', toolId, data);
            const idx = state.atvTools.findIndex(t => t.id === toolId);
            if (idx >= 0) state.atvTools[idx] = { ...state.atvTools[idx], ...data };
        } else {
            // Nytt verktøy
            const id = 'tool-' + Date.now();
            await saveToFirestore('atvTools', id, { id, ...data });
            state.atvTools.push({ id, ...data });
        }
        
        closeToolModal();
        showToast('Verktøy lagret ✓');
        renderAtvTools();
    } catch (error) {
        showToast('Kunne ikke lagre verktøy', 'error');
    }
}

// ===== Deler & Forbruk =====
function renderAtvParts() {
    const list = $('atvPartsList');
    if (!list) return;
    
    const reserveParts = state.atvParts.filter(p => p.type === 'reserve');
    const consumables = state.atvParts.filter(p => p.type === 'forbruk');
    
    const renderPartCard = (part) => {
        const isLow = part.quantity <= part.minQuantity;
        return `
            <div class="part-card ${isLow ? 'low-stock' : ''}" onclick="openPartModal('${part.id}')">
                <div class="part-info">
                    <span class="part-name">${escapeHtml(part.name)}</span>
                    <span class="part-quantity">${part.quantity} ${part.unit}</span>
                </div>
                ${isLow ? '<span class="part-warning">⚠️ Lavt lager!</span>' : ''}
            </div>
        `;
    };
    
    list.innerHTML = `
        <div class="parts-section">
            <h3>🔩 Reservedeler</h3>
            <div class="parts-grid">
                ${reserveParts.map(renderPartCard).join('') || '<p class="empty-hint">Ingen reservedeler</p>'}
            </div>
        </div>
        
        <div class="parts-section">
            <h3>🛢️ Forbruksvarer</h3>
            <div class="parts-grid">
                ${consumables.map(renderPartCard).join('') || '<p class="empty-hint">Ingen forbruksvarer</p>'}
            </div>
        </div>
        
        <button class="btn-primary full-width" onclick="openNewPartModal()">+ Legg til del/vare</button>
    `;
}

function openPartModal(partId) {
    const part = state.atvParts.find(p => p.id === partId);
    if (!part) return;
    
    const modal = $('partModal');
    
    $('partName').value = part.name;
    $('partType').value = part.type;
    $('partQuantity').value = part.quantity;
    $('partUnit').value = part.unit;
    $('partMinQuantity').value = part.minQuantity;
    $('partModalTitle').textContent = 'Rediger del';
    
    modal.dataset.partId = partId;
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function openNewPartModal() {
    const modal = $('partModal');
    
    $('partName').value = '';
    $('partType').value = 'reserve';
    $('partQuantity').value = '';
    $('partUnit').value = 'stk';
    $('partMinQuantity').value = '1';
    $('partModalTitle').textContent = 'Ny del/vare';
    
    delete modal.dataset.partId;
    
    if (modal) {
        modal.classList.add('active');
        updateBodyOverflow();
    }
}

function closePartModal() {
    const modal = $('partModal');
    if (modal) {
        modal.classList.remove('active');
        updateBodyOverflow();
    }
}

async function savePart(e) {
    e.preventDefault();
    
    const modal = $('partModal');
    const partId = modal?.dataset.partId;
    
    const data = {
        name: $('partName')?.value?.trim() || '',
        type: $('partType')?.value || 'reserve',
        quantity: parseInt($('partQuantity')?.value) || 0,
        unit: $('partUnit')?.value?.trim() || 'stk',
        minQuantity: parseInt($('partMinQuantity')?.value) || 1
    };
    
    if (!data.name) {
        showToast('Gi delen et navn', 'error');
        return;
    }
    
    try {
        if (partId) {
            await saveToFirestore('atvParts', partId, data);
            const idx = state.atvParts.findIndex(p => p.id === partId);
            if (idx >= 0) state.atvParts[idx] = { ...state.atvParts[idx], ...data };
        } else {
            const id = 'part-' + Date.now();
            await saveToFirestore('atvParts', id, { id, ...data });
            state.atvParts.push({ id, ...data });
        }
        
        closePartModal();
        showToast('Del/vare lagret ✓');
        renderAtvParts();
    } catch (error) {
        showToast('Kunne ikke lagre del', 'error');
    }
}

// ===== ATV Event Listeners Setup =====
function setupAtvEventListeners() {
    // ATV navigasjon
    on('atvNavDashboard', 'click', () => showAtvView('atvDashboardView'));
    on('atvNavProfiles', 'click', () => showAtvView('atvProfilesView'));
    on('atvNavBattery', 'click', () => showAtvView('atvBatteryView'));
    on('atvNavRepairs', 'click', () => showAtvView('atvRepairsView'));
    on('atvNavTools', 'click', () => showAtvView('atvToolsView'));
    on('atvNavParts', 'click', () => showAtvView('atvPartsView'));
    
    // ATV tilbake-knapper
    on('backFromAtvProfiles', 'click', () => showAtvView('atvDashboardView'));
    on('backFromAtvDetail', 'click', () => showAtvView('atvProfilesView'));
    on('backFromAtvBattery', 'click', () => showAtvView('atvDashboardView'));
    on('backFromBatteryDetail', 'click', () => showAtvView('atvBatteryView'));
    on('backFromAtvRepairs', 'click', () => showAtvView('atvDashboardView'));
    on('backFromRepairDetail', 'click', () => showAtvView('atvRepairsView'));
    on('backFromAtvTools', 'click', () => showAtvView('atvDashboardView'));
    on('backFromAtvParts', 'click', () => showAtvView('atvDashboardView'));
    
    // ATV knapper
    on('addAtvBtn', 'click', () => openAtvModal());
    on('addBatteryBtn', 'click', () => openBatteryModal());
    on('addRepairBtn', 'click', () => openRepairModal());
    
    // ATV Modaler
    on('closeAtvModal', 'click', closeAtvModal);
    on('atvForm', 'submit', saveAtv);
    
    on('closeBatteryModal', 'click', closeBatteryModal);
    on('batteryForm', 'submit', saveBattery);
    
    on('closeBatteryMeasurementModal', 'click', closeBatteryMeasurementModal);
    on('batteryMeasurementForm', 'submit', saveBatteryMeasurement);
    on('measurementVoltage', 'input', updateMeasurementPrediction);
    on('measurementTemperature', 'input', updateMeasurementPrediction);
    
    on('closeRepairModal', 'click', closeRepairModal);
    on('repairForm', 'submit', saveRepair);
    on('repairAddImageBtn', 'click', () => $('repairImageInput')?.click());
    on('repairCameraBtn', 'click', () => $('repairCameraInput')?.click());
    on('repairImageInput', 'change', handleRepairImageSelect);
    on('repairCameraInput', 'change', handleRepairImageSelect);
    
    on('closeToolModal', 'click', closeToolModal);
    on('toolForm', 'submit', saveTool);
    
    on('closePartModal', 'click', closePartModal);
    on('partForm', 'submit', savePart);
    
    // Filtrering
    on('repairFilterAtv', 'change', renderAtvRepairs);
    on('repairFilterType', 'change', renderAtvRepairs);
}

// ===== Eksporter ATV-funksjoner globalt =====
window.showAtvView = showAtvView;
window.openAtvModal = openAtvModal;
window.openAtvDetail = openAtvDetail;
window.openBatteryModal = openBatteryModal;
window.openBatteryMeasurementModal = openBatteryMeasurementModal;
window.openAtvBatteryDetail = openAtvBatteryDetail;
window.confirmDeleteBattery = confirmDeleteBattery;
window.openRepairModal = openRepairModal;
window.openRepairDetail = openRepairDetail;
window.editRepair = editRepair;
window.confirmDeleteRepair = confirmDeleteRepair;
window.removeRepairImage = removeRepairImage;
window.openToolModal = openToolModal;
window.openNewToolModal = openNewToolModal;
window.openPartModal = openPartModal;
window.openNewPartModal = openNewPartModal;

// ===== Start App =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏡 Småbruk Kunnskapsbase v' + APP_VERSION + ' starting...');
    await setupAuth();
});
