// =====================================================================
// مواهب داري: وجهان لمنصة واحدة
// - التطبيق (للشباب والجمهور): ?mode=app أو الرابط /app/ أو عند فتحه من الشاشة الرئيسية بعد التثبيت.
// - الموقع (لدور الشباب): بوابة تعريفية للمؤسسات ودخول المسيّرين إلى لوحة القيادة.
// =====================================================================
const MD_MODE = (() => {
    let m = '';
    try {
        const q = new URLSearchParams(location.search).get('mode');
        if (q === 'app' || q === 'portal') { m = q; localStorage.setItem('mdMode', q); }
        else if (window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone) m = 'app';
        else m = localStorage.getItem('mdMode') || '';
    } catch (e) { /* التخزين قد يكون معطلاً */ }
    return m === 'app' ? 'app' : 'portal';
})();
let appMode = MD_MODE;
document.documentElement.classList.add('mode-' + appMode);
let deferredInstall = null;

function isAppMode() { return appMode === 'app'; }
function appUrl() { return new URL('app/', location.href.split('?')[0].split('#')[0]).href; }
function portalUrl() { return location.href.split('?')[0].split('#')[0] + '?mode=portal'; }

function setAppMode(m) {
    appMode = m;
    document.documentElement.classList.remove('mode-app', 'mode-portal');
    document.documentElement.classList.add('mode-' + m);
    try { localStorage.setItem('mdMode', m); } catch (e) {}
    const q = new URLSearchParams(location.search);
    q.set('mode', m);
    q.delete('source');
    history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);
}

function openYouthApp() {
    setAppMode('app');
    document.getElementById('portal-screen').classList.remove('active');
    if (currentUser) return;
    showEntryScreen();
}
function openPortal() { location.href = portalUrl(); }

// الشاشة الأولى لمن لم يسجّل الدخول: البوابة في الموقع، والترحيب في التطبيق
function showEntryScreen() {
    const portal = document.getElementById('portal-screen');
    const role = document.getElementById('role-screen');
    document.getElementById('auth-screen').classList.remove('active');
    if (!isAppMode()) {
        role.style.display = 'none';
        portal.classList.add('active');
        portal.scrollTop = 0;
        renderPortal();
    } else {
        portal.classList.remove('active');
        role.style.display = 'flex';
        role.style.opacity = '1';
    }
}
function hideEntryScreens() {
    document.getElementById('portal-screen').classList.remove('active');
    document.getElementById('role-screen').style.display = 'none';
}

function portalStaffLogin() {
    document.getElementById('portal-screen').classList.remove('active');
    selectRole('admin');
}
function portalStaffSignup() {
    portalStaffLogin();
    setTimeout(() => switchAuthTab('signup'), 550);
}

// بعد الدخول: الشاب في الموقع ينتقل إلى التطبيق، والمسيّر يبقى في لوحة القيادة
function applyModeForRole(role) {
    if (role !== 'admin' && !isAppMode()) {
        setAppMode('app');
        if (!document.querySelector('.toast')) showToast('👋 أهلاً بك في تطبيق الشباب', 'info');
    }
}

// ---------- محتوى البوابة ----------
function renderPortal() {
    const facs = getFacilities();
    const stats = [
        ['58', 'ولاية', 'fa-map-location-dot'],
        [facs.length, usingSampleFacilities() ? 'مرفقاً نموذجياً' : 'مرفق شباب', 'fa-house-chimney-user'],
        [Object.keys(TALENT_CATS).length, 'مجالات مواهب', 'fa-palette'],
        ['24/7', 'تطبيق للشباب', 'fa-mobile-screen-button']
    ];
    const pv = document.getElementById('pt-stats');
    if (pv) pv.innerHTML = stats.map(([n, l, i]) => `<div class="pt-stat"><i class="fas ${i}"></i><b>${n}</b><span>${l}</span></div>`).join('');
    const qr = document.getElementById('pt-qr');
    if (qr && !qr.dataset.done) { qrInto(qr, appUrl(), 150); qr.dataset.done = '1'; }
    const link = document.getElementById('pt-app-link');
    if (link) link.textContent = appUrl().replace(/^https?:\/\//, '');
    loadPortalImpact();
}

let portalImpactLoaded = false;
function loadPortalImpact() {
    if (portalImpactLoaded) return;
    portalImpactLoaded = true;
    Promise.all([database.ref('certificates').once('value'), database.ref('talents').once('value')]).then(([c, t]) => {
        const certs = snapToList(c), tals = snapToList(t).filter(x => x.status === 'approved');
        const hours = certs.reduce((s, x) => s + (x.type === 'volunteer' ? Number(x.hours) || 0 : 0), 0);
        const rows = [[certs.length, 'شهادة موثّقة'], [hours, 'ساعة تطوع'], [certs.filter(x => x.type === 'charity').length, 'عمل خيري'], [tals.length, 'موهبة معروضة']].filter(r => r[0] > 0);
        const box = document.getElementById('pt-impact');
        if (box && rows.length) box.innerHTML = `<p class="pt-kicker">أثر حقيقي، موثّق بالشهادات</p><div class="pt-impact-row">${rows.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>`;
    }).catch(() => { portalImpactLoaded = false; });
}

function portalVerify() {
    const v = document.getElementById('pt-verify').value.trim().toUpperCase().replace(/\s+/g, '');
    if (!v) return showToast('أدخل رمز التحقق المكتوب على الشهادة', 'info');
    const m = v.match(/VERIFY=([A-Z0-9_-]+)/i);
    openVerifyView(m ? m[1] : v);
}

// ---------- التثبيت كتطبيق ----------
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
    document.documentElement.classList.add('can-install');
});
window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    document.documentElement.classList.remove('can-install');
    showToast('📲 ثُبّت تطبيق مواهب داري على جهازك');
});

function installApp() {
    if (deferredInstall) {
        deferredInstall.prompt();
        deferredInstall.userChoice.finally(() => { deferredInstall = null; document.documentElement.classList.remove('can-install'); });
        return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    document.getElementById('install-body').innerHTML = `
        <div class="install-steps">
            ${ios ? `
                <div class="step"><span>1</span>افتح الرابط في Safari</div>
                <div class="step"><span>2</span>اضغط زر المشاركة <i class="fas fa-arrow-up-from-bracket"></i></div>
                <div class="step"><span>3</span>اختر «إضافة إلى الشاشة الرئيسية»</div>` : `
                <div class="step"><span>1</span>افتح الرابط في Chrome على هاتفك</div>
                <div class="step"><span>2</span>اضغط القائمة <i class="fas fa-ellipsis-vertical"></i></div>
                <div class="step"><span>3</span>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</div>`}
        </div>
        <div class="install-qr"><div id="install-qr"></div><div><b>أو امسح الرمز بهاتفك</b><small dir="ltr">${esc(appUrl().replace(/^https?:\/\//, ''))}</small></div></div>`;
    document.getElementById('installModal').classList.add('active');
    qrInto(document.getElementById('install-qr'), appUrl(), 140);
}

// ---------- العمل دون اتصال ----------
function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) || location.hostname === 'localhost') return;
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('sw:', err.message));
}
function updateOnlineState() {
    document.documentElement.classList.toggle('is-offline', !navigator.onLine);
}
window.addEventListener('online', () => { updateOnlineState(); showToast('✅ عاد الاتصال بالإنترنت'); });
window.addEventListener('offline', updateOnlineState);

function initAppShell() {
    registerServiceWorker();
    updateOnlineState();
    const q = new URLSearchParams(location.search);
    if (q.get('open') === 'assistant') setTimeout(() => openAssistant(), 2600);
}
