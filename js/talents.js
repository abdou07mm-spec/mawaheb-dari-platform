// =====================================================================
// مواهب داري: المواهب، التطوع، الأعمال الخيرية، جواز المواهب، الشهادات والحضور
// يُحمَّل قبل السكربت الرئيسي في index.html (نطاق عام مشترك)، ولا يستدعي شيئاً عند التحميل.
// =====================================================================
const TALENT_CATS = {
    art:     { label: 'الفنون التشكيلية', short: 'فنون', icon: 'fa-palette', color: '#ec4899',
               desc: 'الرسم والخط والتصوير والتصميم: لديك عين فنية وحسّ جمالي يحوّل الأفكار إلى أعمال.',
               clubs: /رسم|فن|خط|تصوير|تصميم/, events: ['art'] },
    music:   { label: 'الموسيقى والغناء', short: 'موسيقى', icon: 'fa-music', color: '#8b5cf6',
               desc: 'أذن موسيقية وإحساس بالإيقاع: العزف والغناء والإنشاد طريقك للتعبير.',
               clubs: /موسيق|غناء|إنشاد|أندلس/, events: ['culture', 'art'] },
    tech:    { label: 'التقنية والبرمجة', short: 'تقنية', icon: 'fa-laptop-code', color: '#3b82f6',
               desc: 'فضول علمي وحب للاكتشاف: البرمجة والروبوتيك والإعلام الآلي تنتظر أفكارك.',
               clubs: /إعلام|برمج|روبوت|رقمي|علوم/, events: ['science'] },
    sport:   { label: 'الرياضة', short: 'رياضة', icon: 'fa-futbol', color: '#10b981',
               desc: 'طاقة وحيوية وروح فريق: الملاعب والقاعات الرياضية مكانك الطبيعي.',
               clubs: /كرة|كاراتي|سباحة|رياض|جمباز|ملاكمة/, events: ['sport'] },
    stage:   { label: 'المسرح والإلقاء', short: 'مسرح', icon: 'fa-masks-theater', color: '#f97316',
               desc: 'حضور وثقة أمام الجمهور: المسرح والإلقاء والتنشيط تُبرز شخصيتك.',
               clubs: /مسرح|إلقاء|تنشيط/, events: ['culture', 'art'] },
    writing: { label: 'الكتابة والأدب', short: 'كتابة', icon: 'fa-pen-nib', color: '#0ea5e9',
               desc: 'خيال واسع وحب للكلمة: القصة والشعر والمقال والقراءة عالمك.',
               clubs: /قراءة|كتاب|أدب|شعر/, events: ['culture'] },
    social:  { label: 'التطوع والقيادة', short: 'تطوع', icon: 'fa-hand-holding-heart', color: '#f4b41b',
               desc: 'قلب معطاء وروح مبادرة: التطوع والعمل الجمعوي وتنظيم الفعاليات تصنع أثرك.',
               clubs: /بيئ|كشاف|تخييم|تراث/, events: ['volunteer'] }
};

const QUIZ = [
    { q: 'في وقت فراغك، ماذا تفضّل أن تفعل؟', a: [['الرسم أو التقاط الصور', 'art'], ['العزف أو الغناء', 'music'], ['تجربة برنامج أو لعبة على الحاسوب', 'tech'], ['مباراة أو تمرين رياضي', 'sport']] },
    { q: 'أي نشاط يجذبك أكثر في دار الشباب؟', a: [['عرض مسرحي على الخشبة', 'stage'], ['مسابقة في القراءة أو الكتابة', 'writing'], ['حملة تطوعية في الحي', 'social'], ['ورشة روبوتيك', 'tech']] },
    { q: 'ما أبرز صفة يراها فيك أصدقاؤك؟', a: [['الإبداع والذوق الفني', 'art'], ['الحيوية والنشاط', 'sport'], ['حب مساعدة الآخرين', 'social'], ['حسن الكلام والإقناع', 'stage']] },
    { q: 'ماذا تريد أن تتعلّم هذه السنة؟', a: [['العزف على آلة موسيقية', 'music'], ['لغة برمجة', 'tech'], ['كتابة قصة أو مقال', 'writing'], ['تنظيم فعالية كبيرة', 'social']] },
    { q: 'أين تشعر براحتك أكثر؟', a: [['في الملعب أو القاعة الرياضية', 'sport'], ['في ورشة فنية', 'art'], ['أمام الجمهور', 'stage'], ['بين الكتب', 'writing']] },
    { q: 'بماذا تحب أن يعرفك الناس؟', a: [['بصوتي أو عزفي', 'music'], ['بأعمالي الفنية', 'art'], ['باختراعاتي ومشاريعي', 'tech'], ['بأثري في مجتمعي', 'social']] }
];

// group: في أي قسم من الجواز تظهر الشهادة (مشاركات، تطوع، أعمال خيرية)
const CERT_TYPES = {
    volunteer: { label: 'شهادة تطوع', reason: 'تقديراً للتطوع في', icon: 'fa-hand-holding-heart', color: '#f4b41b', points: 20, group: 'vol' },
    event:     { label: 'شهادة مشاركة', reason: 'نظير المشاركة في', icon: 'fa-calendar-check', color: '#3b82f6', points: 10, group: 'part' },
    club:      { label: 'شهادة انخراط', reason: 'نظير الانخراط في', icon: 'fa-users', color: '#ec4899', points: 15, group: 'part' },
    charity:   { label: 'شهادة عمل خيري', reason: 'تقديراً لمساهمته الخيرية في', icon: 'fa-hand-holding-dollar', color: '#ef4444', points: 25, group: 'charity' },
    honor:     { label: 'شهادة تقدير', reason: 'تقديراً لـ', icon: 'fa-award', color: '#8b5cf6', points: 15, group: 'part' }
};
const CERT_GROUPS = {
    all:     { label: 'الكل', icon: 'fa-layer-group' },
    part:    { label: 'المشاركات', icon: 'fa-calendar-check' },
    vol:     { label: 'التطوع', icon: 'fa-hand-holding-heart' },
    charity: { label: 'الأعمال الخيرية', icon: 'fa-hand-holding-dollar' }
};

// ---------- نظام النجوم ----------
// النجوم تُحسب فقط من الشهادات التي يصدرها مسيّرو دور الشباب ومن الأعمال المقبولة في المعرض،
// لذلك لا يمكن رفعها بالكتابة المباشرة في قاعدة البيانات. السحوبات تعيد حسابها من الشهادات.
const STAR_RULES = { event: 1, club: 2, honor: 2, charity: 3, volunteer: 2, hoursPerStar: 2, talent: 2, featured: 1 };
function certStars(c) {
    if (c.type === 'volunteer') return STAR_RULES.volunteer + Math.floor((Number(c.hours) || 0) / STAR_RULES.hoursPerStar);
    return STAR_RULES[c.type] || 1;
}
function talentStars(t) { return STAR_RULES.talent + (t.featured ? STAR_RULES.featured : 0); }
const TIERS = [
    { id: 'rising',  min: 0,   label: 'نجم صاعد', color: '#94a3b8', icon: 'fa-seedling', perk: 'ابدأ بجمع النجوم من الفعاليات والتطوع والأعمال الخيرية' },
    { id: 'bronze',  min: 10,  label: 'برونزي',   color: '#d08a4a', icon: 'fa-medal',    perk: 'الدخول في سحوبات المكافآت' },
    { id: 'silver',  min: 25,  label: 'فضي',      color: '#cbd5e1', icon: 'fa-medal',    perk: 'أولوية التسجيل في الورشات والدورات' },
    { id: 'gold',    min: 50,  label: 'ذهبي',     color: '#f4b41b', icon: 'fa-crown',    perk: 'أولوية الحجز في بيوت الشباب صيفاً' },
    { id: 'diamond', min: 100, label: 'ماسي',     color: '#38bdf8', icon: 'fa-gem',      perk: 'الترشيح للتبادلات والمخيمات الوطنية' }
];
function tierFor(stars) {
    let t = TIERS[0];
    TIERS.forEach(x => { if (stars >= x.min) t = x; });
    const next = TIERS[TIERS.indexOf(t) + 1] || null;
    return { ...t, next, toNext: next ? next.min - stars : 0, pct: next ? Math.round((stars - t.min) / (next.min - t.min) * 100) : 100 };
}
function tierChip(stars) {
    const t = tierFor(stars);
    return `<span class="tier-chip" style="--c:${t.color}"><i class="fas ${t.icon}"></i> ${t.label}</span>`;
}
function starsLabel(n) { return `<span class="stars-n"><i class="fas fa-star"></i> ${Number(n) || 0}</span>`; }

const BADGES = [
    { id: 'first', icon: 'fa-seedling', label: 'أول خطوة', desc: 'أول شهادة موثّقة', test: st => st.certs >= 1 },
    { id: 'giver', icon: 'fa-hand-holding-heart', label: 'عطاء متواصل', desc: '3 مهام تطوعية موثّقة', test: st => st.volCerts >= 3 },
    { id: 'hours', icon: 'fa-clock', label: '10 ساعات عطاء', desc: '10 ساعات تطوع موثّقة', test: st => st.hours >= 10 },
    { id: 'talent', icon: 'fa-star', label: 'موهبة معروضة', desc: 'عمل منشور في معرض المواهب', test: st => st.talents >= 1 },
    { id: 'club', icon: 'fa-users', label: 'عضو نادٍ', desc: 'انخراط مقبول في نادٍ', test: st => st.clubCerts >= 1 },
    { id: 'explorer', icon: 'fa-map-location-dot', label: 'رحّالة', desc: 'نشاط موثّق في ولايتين أو أكثر', test: st => st.wilayas >= 2 },
    { id: 'quiz', icon: 'fa-compass', label: 'اكتشاف الموهبة', desc: 'إكمال اختبار «اكتشف موهبتك»', test: st => st.quiz },
    { id: 'heart', icon: 'fa-hand-holding-dollar', label: 'قلب كبير', desc: 'عملان خيريان موثّقان', test: st => st.charityCerts >= 2 },
    { id: 'gold', icon: 'fa-crown', label: 'نجم ذهبي', desc: '50 نجمة أو أكثر', test: st => st.stars >= 50 }
];

// ---------- بيانات نموذجية للعرض ----------
const DEMO_UID = 'demo';
const DEMO_PASSPORT = {
    name: 'سارة بن يحيى', wilaya: '16', photoURL: '', quiz: 'art', since: '2026-01-15T10:00:00Z',
    bio: 'طالبة في الإعلام الآلي، أحب الرسم والتصوير وأتطوع في حملات البيئة مع دار الشباب.',
    talents: 'الرسم, التصوير الفوتوغرافي, التطوع'
};
function demoCerts() {
    const t = todayStr();
    const base = { uid: DEMO_UID, userName: DEMO_PASSPORT.name, issuedByName: 'إدارة دار الشباب', sample: true };
    return [
        { ...base, id: 'sample-cert-4', type: 'volunteer', title: 'تنظيم المهرجان الولائي للمواهب', placeName: 'دار الشباب - سطيف المركز', wilaya: '19', date: addDays(t, -10), hours: 6 },
        { ...base, id: 'sample-cert-2', type: 'event', title: 'مسابقة الروبوتيك الجهوية', placeName: 'دار الشباب - قسنطينة', wilaya: '25', date: addDays(t, -25), hours: 0 },
        { ...base, id: 'sample-cert-1', type: 'volunteer', title: 'حملة تشجير وتنظيف الحي', placeName: 'دار الشباب - الجزائر الوسطى', wilaya: '16', date: addDays(t, -40), hours: 4 },
        { ...base, id: 'sample-cert-5', type: 'charity', title: 'حملة التبرع بالدم', placeName: 'دار الشباب - الجزائر الوسطى', wilaya: '16', date: addDays(t, -18), hours: 0 },
        { ...base, id: 'sample-cert-6', type: 'charity', title: 'قفة رمضان للعائلات المعوزة', placeName: 'دار الشباب - سطيف المركز', wilaya: '19', date: addDays(t, -33), hours: 0 },
        { ...base, id: 'sample-cert-3', type: 'club', title: 'نادي التصوير', placeName: 'دار الشباب - قسنطينة', wilaya: '25', date: addDays(t, -60), hours: 0 }
    ];
}
const SAMPLE_TALENTS = [
    { id: 'sample-tal-1', uid: DEMO_UID, userName: 'سارة بن يحيى', wilaya: '16', category: 'art', likes: 24, featured: true,
      title: 'لوحة «أزقة القصبة» بالألوان المائية', description: 'لوحة رسمتها في ورشة الرسم بدار الشباب، تصوّر أزقة القصبة العتيقة عند الغروب.' },
    { id: 'sample-tal-2', uid: 'sample-u2', userName: 'أنس م.', wilaya: '13', category: 'music', likes: 18,
      title: 'عزف على العود: تقاسيم أندلسية', description: 'تقاسيم على مقام الحجاز قدّمتها في أمسية نادي الموسيقى الأندلسية.' },
    { id: 'sample-tal-3', uid: 'sample-u3', userName: 'رانية ق.', wilaya: '25', category: 'tech', likes: 15,
      title: 'تطبيق صغير لتنظيم مواعيد المراجعة', description: 'تطبيق ويب بسيط أنجزته في نادي الإعلام الآلي يساعد التلاميذ على تنظيم وقت المراجعة.' },
    { id: 'sample-tal-4', uid: 'sample-u4', userName: 'أمين ع.', wilaya: '31', category: 'sport', likes: 11,
      title: 'تحدي اللياقة: 100 قفزة في دقيقتين', description: 'تحدٍّ رياضي أطلقناه بين شباب الحي في المركب الرياضي الجواري.' },
    { id: 'sample-tal-5', uid: 'sample-u5', userName: 'إكرام س.', wilaya: '19', category: 'stage', likes: 9,
      title: 'مونولوج «حلم شاب» على خشبة دار الشباب', description: 'عرض مسرحي قصير عن أحلام الشباب وطموحاتهم، من إنتاج نادي المسرح.' },
    { id: 'sample-tal-6', uid: DEMO_UID, userName: 'سارة بن يحيى', wilaya: '16', category: 'art', likes: 13,
      title: 'سلسلة صور «ألوان الجنوب»', description: 'صور التقطتها خلال رحلة استكشافية إلى غرداية مع بيت الشباب.' },
    { id: 'sample-tal-7', uid: 'sample-u7', userName: 'يوسف ت.', wilaya: '11', category: 'writing', likes: 7,
      title: 'قصة قصيرة: «رسالة من تمنراست»', description: 'قصة فازت في مسابقة الكتابة بدار الشباب عن صداقة بين شابين من الشمال والجنوب.' }
].map(t => ({ ...t, sample: true, status: 'approved' }));

// ---------- الحالة ----------
let allTalents = [];
let myCerts = [];
let talentsLoaded = false, talentsReady = false;
let myCertsLoaded = false, myCertsReady = false;
let talentFilter = 'all';
let lastCert = null;
let lastPassportJSON = '';
let attendCtx = null;
let scanCtx = null, scanStream = null, scanTimer = null, scanDetector = null, scanBusy = false, lastScan = { text: '', at: 0 };
let quizState = null;
let volTopCache = null;
let certGroupFilter = 'all';

// ---------- أدوات ----------
function appBase() { return location.href.split('?')[0].split('#')[0]; }
function passportUrl(uid) { return appBase() + '?passport=' + encodeURIComponent(uid); }
function verifyUrl(id) { return appBase() + '?verify=' + encodeURIComponent(id); }
function genId(prefix) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const r = new Uint32Array(8);
    (window.crypto || window.msCrypto).getRandomValues(r);
    return prefix + Array.from(r, n => chars[n % chars.length]).join('');
}
function qrInto(el, text, size) {
    if (!el || !window.QRCode) return;
    el.innerHTML = '';
    new QRCode(el, { text, width: size, height: size, colorDark: '#0b1220', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
}
function avatarHTML(name, photo, cls = '') {
    return photo
        ? `<img class="av ${cls}" src="${esc(photo)}" alt="">`
        : `<span class="av av-txt ${cls}">${esc((name || '؟').trim().charAt(0))}</span>`;
}
function getTalents() {
    const approved = allTalents.filter(t => t.status === 'approved');
    return approved.length ? approved : SAMPLE_TALENTS;
}
function findTalent(id) {
    return allTalents.find(t => t.id === id) || SAMPLE_TALENTS.find(t => t.id === id) || null;
}

// ---------- التحميل ----------
function initTalentFeatures() {
    renderTalentTabs();
    loadTalents();
    const q = new URLSearchParams(location.search);
    if (q.get('passport')) openPassportView(q.get('passport'));
    else if (q.get('verify')) openVerifyView(q.get('verify'));
}

function loadTalents() {
    if (talentsLoaded) return;
    talentsLoaded = true;
    database.ref('talents').on('value', s => {
        allTalents = snapToList(s).sort(byNewest);
        talentsReady = true;
        refreshYouthViews();
        recomputeMyStats();
    }, err => { talentsLoaded = false; talentsReady = true; console.warn('talents:', err.message); });
}

function loadMyCerts() {
    if (!currentUser || myCertsLoaded) return;
    myCertsLoaded = true;
    database.ref('certificates').orderByChild('uid').equalTo(currentUser.uid).on('value', s => {
        myCerts = snapToList(s).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        myCertsReady = true;
        recomputeMyStats();
        refreshYouthViews();
    }, err => { myCertsReady = true; console.warn('certificates:', err.message); });
}

// يُستدعى بعد معرفة بيانات المستخدم (من applyUserRole)
function afterUserReady() {
    loadTalents();
    loadMyCerts();
    syncPassport();
}

// ---------- الإحصائيات والشارات ----------
function statsFrom(certs, talents, quiz) {
    const vol = certs.filter(c => c.type === 'volunteer');
    return {
        hours: vol.reduce((s, c) => s + (Number(c.hours) || 0), 0),
        certs: certs.length,
        volCerts: vol.length,
        clubCerts: certs.filter(c => c.type === 'club').length,
        talents: talents.length,
        wilayas: new Set(certs.map(c => c.wilaya).filter(Boolean)).size,
        quiz: !!quiz,
        charityCerts: certs.filter(c => c.type === 'charity').length,
        partCerts: certs.filter(c => (CERT_TYPES[c.type] || {}).group === 'part').length,
        points: certs.reduce((s, c) => s + ((CERT_TYPES[c.type] || {}).points || 0), 0) + talents.length * 10,
        stars: certs.reduce((s, c) => s + certStars(c), 0) + talents.reduce((s, t) => s + talentStars(t), 0)
    };
}

function badgesHTML(st, withLocked = true) {
    const list = BADGES.filter(b => withLocked || b.test(st));
    if (!list.length) return '<p class="muted small">لا توجد شارات بعد</p>';
    return list.map(b => {
        const on = b.test(st);
        return `<div class="badge-item ${on ? 'on' : ''}" title="${esc(b.desc)}">
            <span class="badge-ico"><i class="fas ${b.icon}"></i></span>
            <b>${esc(b.label)}</b><small>${on ? esc(b.desc) : 'لم تُكتسب بعد'}</small></div>`;
    }).join('');
}

// النقاط والساعات تُحسب من الشهادات الموثّقة والأعمال المنشورة فقط
function recomputeMyStats() {
    if (!currentUser || !myCertsReady || !talentsReady) return;
    const mine = allTalents.filter(t => t.uid === currentUser.uid && t.status === 'approved');
    const st = statsFrom(myCerts, mine, currentUserData?.talentQuiz);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('stat-hours', st.hours);
    set('stat-events', st.certs);
    set('stat-points', st.stars);
    const badges = document.getElementById('my-badges');
    if (badges) badges.innerHTML = badgesHTML(st);
    const tierBox = document.getElementById('my-tier');
    if (tierBox) tierBox.innerHTML = tierMeterHTML(st.stars);
    const u = currentUserData || {};
    if (u.points !== st.points || u.hours !== st.hours || u.events !== st.certs || u.stars !== st.stars) {
        Object.assign(u, { points: st.points, hours: st.hours, events: st.certs, stars: st.stars });
        database.ref('users/' + currentUser.uid).update({ points: st.points, hours: st.hours, events: st.certs, stars: st.stars })
            .catch(err => console.warn('stats:', err.message));
    }
    window.myStats = st;
    if (typeof updateStarsBadges === 'function') updateStarsBadges(st);
    return st;
}

function tierMeterHTML(stars) {
    const t = tierFor(stars);
    return `
        <div class="tier-meter" style="--c:${t.color}">
            <div class="tm-top">
                <span class="tm-ico"><i class="fas ${t.icon}"></i></span>
                <div class="tm-txt"><b>المستوى ${t.label}</b><small>${t.next ? `بقي ${t.toNext} ${t.toNext === 1 ? 'نجمة' : 'نجوم'} للمستوى ${t.next.label}` : 'أعلى مستوى في المنصة'}</small></div>
                ${starsLabel(stars)}
            </div>
            <div class="tm-bar"><span style="width:${t.pct}%"></span></div>
            <small class="tm-perk"><i class="fas fa-gift"></i> ${t.next ? 'في المستوى التالي: ' + t.next.perk : t.perk}</small>
        </div>`;
}

// شهادات مقسّمة حسب الأقسام: المشاركات، التطوع، الأعمال الخيرية
function certGroupsHTML(certs, scope) {
    const counts = { all: certs.length };
    certs.forEach(c => { const g = (CERT_TYPES[c.type] || CERT_TYPES.event).group; counts[g] = (counts[g] || 0) + 1; });
    const f = certGroupFilter;
    const list = f === 'all' ? certs : certs.filter(c => (CERT_TYPES[c.type] || CERT_TYPES.event).group === f);
    return `<div class="filter-tabs cert-tabs">${Object.entries(CERT_GROUPS).map(([k, g]) =>
        `<span class="filter-tab ${f === k ? 'active' : ''}" onclick="certGroupFilter='${k}'; ${scope === 'public' ? 'rerenderPublicCerts()' : 'renderMyPassport()'}"><i class="fas ${g.icon}"></i> ${g.label} <em>${counts[k] || 0}</em></span>`).join('')}</div>
        <div class="req-list">${list.length ? list.map(certRow).join('') : `<p class="muted small cert-empty">${f === 'charity' ? 'لا توجد أعمال خيرية موثّقة بعد' : f === 'vol' ? 'لا توجد شهادات تطوع بعد' : 'لا توجد شهادات هنا بعد'}</p>`}</div>`;
}

// نسخة عامة من الملف (بدون الهاتف أو البريد) يقرؤها رابط الجواز
function syncPassport() {
    if (!currentUser || !currentUserData) return;
    const u = currentUserData;
    const pp = {
        name: u.name || currentUser.displayName || '', wilaya: u.wilaya || '', bio: u.bio || '',
        talents: u.talents || '', photoURL: u.photoURL || '', quiz: u.talentQuiz?.top || '', since: u.createdAt || ''
    };
    const json = JSON.stringify(pp);
    if (json === lastPassportJSON) return;
    lastPassportJSON = json;
    database.ref('passports/' + currentUser.uid).set({ ...pp, updatedAt: new Date().toISOString() })
        .catch(err => console.warn('passport:', err.message));
}

// ---------- الملف الشخصي = جواز المواهب ----------
function renderMyPassport() {
    if (!currentUser) return;
    recomputeMyStats();
    const certBox = document.getElementById('my-certs');
    if (certBox) certBox.innerHTML = myCerts.length ? certGroupsHTML(myCerts, 'mine')
        : emptyState('fa-certificate', 'لا توجد شهادات بعد',
            '<small>سجّل في فرصة تطوع أو فعالية، وبعد تأكيد حضورك تصلك شهادتك هنا.</small><button class="btn btn-primary btn-small" onclick="switchTab(\'volunteer\')"><i class="fas fa-hand-holding-heart"></i> فرص التطوع</button>');
    if (typeof renderMyCharity === 'function') renderMyCharity();
    const mine = allTalents.filter(t => t.uid === currentUser.uid);
    const talBox = document.getElementById('my-talents');
    if (talBox) talBox.innerHTML = mine.length ? mine.map(t => talentCard(t, { status: true })).join('')
        : emptyState('fa-palette', 'لم تعرض أي موهبة بعد',
            '<button class="btn btn-primary btn-small" onclick="openAddTalent()"><i class="fas fa-plus"></i> اعرض موهبتك</button>');
}

function certRow(c) {
    const t = CERT_TYPES[c.type] || CERT_TYPES.event;
    return `
        <div class="req-card cert-row" onclick="showCertificate('${esc(c.id)}')">
            <span class="cert-ico" style="--c:${t.color}"><i class="fas ${t.icon}"></i></span>
            <div class="cert-info">
                <b>${esc(c.title)}</b>
                <small>${t.label} · ${esc(c.placeName || '')} · ${esc(formatDateAr(c.date))}${c.type === 'volunteer' && c.hours ? ` · ${esc(c.hours)} ساعات` : ''}</small>
            </div>
            <span class="cert-stars" dir="ltr">+${certStars(c)} <i class="fas fa-star"></i></span>
        </div>`;
}

function shareMyPassport() {
    if (!requireLogin()) return;
    shareText('جواز مواهبي', `جواز مواهبي على منصة مواهب داري: شهاداتي الموثّقة وساعات تطوعي وأعمالي\n${passportUrl(currentUser.uid)}`);
}

function openIdCard() {
    if (!requireLogin()) return;
    const u = currentUserData || {};
    document.getElementById('idcard-body').innerHTML = `
        <div class="idcard">
            <div class="idcard-head">
                ${avatarHTML(u.name || currentUser.displayName, u.photoURL, 'lg')}
                <div><b>${esc(u.name || currentUser.displayName || '')}</b><small>${esc(u.wilaya ? 'ولاية ' + getWilayaName(u.wilaya) : '')}</small></div>
                <span class="idcard-brand"><span>مواهب</span> داري</span>
            </div>
            <div class="idcard-qr" id="idcard-qr"></div>
            <p class="idcard-note"><i class="fas fa-circle-info"></i> أظهر هذا الرمز لمسيّر دار الشباب لتسجيل حضورك أو تطوعك، فتصلك الشهادة في جوازك.</p>
        </div>
        <div class="row-actions">
            <button class="btn btn-primary" onclick="openPassportView(currentUser.uid)"><i class="fas fa-id-card"></i> معاينة جوازي العام</button>
            <button class="btn btn-outline" onclick="shareMyPassport()"><i class="fas fa-share-nodes"></i> مشاركة</button>
        </div>`;
    document.getElementById('idcardModal').classList.add('active');
    qrInto(document.getElementById('idcard-qr'), passportUrl(currentUser.uid), 200);
}

// ---------- الجواز العام وصفحة التحقق ----------
function showPublicView(html) {
    const v = document.getElementById('publicView');
    document.getElementById('public-body').innerHTML = html;
    v.classList.add('active');
    v.scrollTop = 0;
}
function closePublicView() {
    document.getElementById('publicView').classList.remove('active');
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
}

async function openPassportView(uid) {
    certGroupFilter = 'all';
    document.querySelectorAll('.modal.active').forEach(m => m.id ? closeModal(m.id) : m.remove());
    showPublicView('<div class="pv-loading"><div class="loading-spinner"></div><p>جارٍ تحميل جواز المواهب...</p></div>');
    if (uid === DEMO_UID) {
        return renderPassportPublic(uid, DEMO_PASSPORT, demoCerts(), SAMPLE_TALENTS.filter(t => t.uid === DEMO_UID), true);
    }
    try {
        const [pp, certs, tals] = await Promise.all([
            database.ref('passports/' + uid).once('value'),
            database.ref('certificates').orderByChild('uid').equalTo(uid).once('value'),
            database.ref('talents').orderByChild('uid').equalTo(uid).once('value')
        ]);
        if (!pp.val()) throw new Error('not-found');
        renderPassportPublic(uid, pp.val(), snapToList(certs).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
            snapToList(tals).filter(t => t.status === 'approved'), false);
    } catch (e) {
        showPublicView(emptyState('fa-id-card', 'تعذّر عرض هذا الجواز',
            '<small>قد يكون الرابط غير صحيح، أو أن صاحب الجواز لم يفعّله بعد.</small>'));
    }
}

function renderPassportPublic(uid, pp, certs, tals, isSample) {
    const st = statsFrom(certs, tals, pp.quiz);
    const quizCat = TALENT_CATS[pp.quiz];
    const talentsList = splitList(pp.talents);
    showPublicView(`
        <article class="pv-passport">
            <div class="pp-cover"><span class="pp-label"><i class="fas fa-id-card"></i> جواز المواهب</span>${isSample ? '<span class="fac-sample">نموذج للعرض</span>' : ''}</div>
            <div class="pp-head">
                ${avatarHTML(pp.name, pp.photoURL, 'xl')}
                <div class="pp-id">
                    <h2>${esc(pp.name)} <i class="fas fa-circle-check pv-verified" title="بيانات موثّقة من دور الشباب"></i></h2>
                    <p class="pp-sub"><i class="fas fa-location-dot"></i> ${esc(pp.wilaya ? 'ولاية ' + getWilayaName(pp.wilaya) : 'الجزائر')}${pp.since ? ' · عضو منذ ' + esc(formatDateAr(String(pp.since).slice(0, 10))) : ''}</p>
                </div>
            </div>
            ${pp.bio ? `<p class="pp-bio">${esc(pp.bio)}</p>` : ''}
            <div class="pp-talents">
                ${quizCat ? `<span class="chip" style="--c:${quizCat.color}"><i class="fas fa-compass"></i> موهبة مكتشفة: ${quizCat.label}</span>` : ''}
                ${talentsList.map(t => `<span class="talent-tag">${esc(t)}</span>`).join('')}
            </div>
            <div class="pv-tier">${tierChip(st.stars)} ${starsLabel(st.stars)}</div>
            <div class="profile-stats four">
                <div class="stat-item"><div class="stat-value">${st.partCerts}</div><div class="stat-label">مشاركات</div></div>
                <div class="stat-item"><div class="stat-value">${st.hours}</div><div class="stat-label">ساعات تطوع</div></div>
                <div class="stat-item"><div class="stat-value">${st.charityCerts}</div><div class="stat-label">أعمال خيرية</div></div>
                <div class="stat-item"><div class="stat-value">${st.talents}</div><div class="stat-label">أعمال معروضة</div></div>
            </div>
            <h4 class="sub-title"><i class="fas fa-award"></i> الشارات</h4>
            <div class="badges">${badgesHTML(st, false)}</div>
            ${tals.length ? `<h4 class="sub-title"><i class="fas fa-palette"></i> أعمال ومواهب</h4>
                <div class="tal-grid compact">${tals.map(t => talentCard(t)).join('')}</div>` : ''}
            <h4 class="sub-title"><i class="fas fa-certificate"></i> السجل الموثّق: المشاركات والتطوع والأعمال الخيرية</h4>
            <div id="pv-certs">${certs.length ? certGroupsHTML(certs, 'public') : '<p class="muted small">لا توجد شهادات بعد</p>'}</div>
            <div class="pv-qr-box">
                <div id="pv-qr"></div>
                <div><b>تحقّق من هذا الجواز</b><small>امسح الرمز أو افتح الرابط: كل الشهادات صادرة عن مسيّري دور الشباب ويمكن التحقق منها واحدة واحدة.</small></div>
            </div>
        </article>`);
    window._pvCerts = certs;
    window._pvRender = () => renderPassportPublic(uid, pp, certs, tals, isSample);
    qrInto(document.getElementById('pv-qr'), passportUrl(uid), 120);
}

function rerenderPublicCerts() {
    const box = document.getElementById('pv-certs');
    if (box && window._pvCerts) box.innerHTML = certGroupsHTML(window._pvCerts, 'public');
}

async function openVerifyView(id) {
    showPublicView('<div class="pv-loading"><div class="loading-spinner"></div><p>جارٍ التحقق من الشهادة...</p></div>');
    let c = id.startsWith('sample-cert-') ? demoCerts().find(x => x.id === id) : null;
    if (!c) {
        try {
            const s = await database.ref('certificates/' + id).once('value');
            if (s.val()) c = { id, ...s.val() };
        } catch (e) { /* القواعد قد ترفض القراءة */ }
    }
    if (!c) {
        return showPublicView(`<div class="verify-box bad"><i class="fas fa-circle-xmark"></i><h3>لم يُعثر على شهادة بهذا الرمز</h3><p>تأكد من رمز التحقق: <b dir="ltr">${esc(id)}</b></p></div>`);
    }
    showPublicView(`<div class="verify-box ok"><i class="fas fa-circle-check"></i><h3>شهادة صحيحة${c.sample ? ' (نموذج للعرض)' : ''}</h3><p>صادرة عن ${esc(c.placeName || 'منصة مواهب داري')} بتاريخ ${esc(formatDateAr(c.date))}</p></div>
        ${certificateHTML(c)}
        <div class="row-actions"><button class="btn btn-outline" onclick="openPassportView('${esc(c.uid)}')"><i class="fas fa-id-card"></i> جواز صاحب الشهادة</button></div>`);
    qrInto(document.getElementById('cert-qr'), verifyUrl(c.id), 110);
}

// ---------- الشهادة ----------
function certificateHTML(c) {
    const t = CERT_TYPES[c.type] || CERT_TYPES.event;
    return `
        <div class="certificate">
            <div class="cert-inner">
                <div class="cert-top">
                    <div class="cert-brand"><img src="icons/icon.svg" alt=""><span><b>مواهب</b> داري</span></div>
                    <span class="cert-type"><i class="fas ${t.icon}"></i> ${t.label}</span>
                </div>
                <p class="cert-lead">تُمنح هذه الشهادة إلى</p>
                <h2 class="cert-name">${esc(c.userName)}</h2>
                <p class="cert-reason">${t.reason} <b>${esc(c.title)}</b></p>
                <div class="cert-meta">
                    <span><i class="fas fa-calendar"></i> ${esc(formatDateAr(c.date))} ${esc(String(c.date || '').slice(0, 4))}</span>
                    <span><i class="fas fa-location-dot"></i> ${esc(c.placeName || '')}${c.wilaya ? ' · ولاية ' + esc(getWilayaName(c.wilaya)) : ''}</span>
                    ${c.type === 'volunteer' && c.hours ? `<span><i class="fas fa-clock"></i> ${esc(c.hours)} ساعات تطوع</span>` : ''}
                    <span><i class="fas fa-star"></i> ${certStars(c)} ${certStars(c) === 1 ? 'نجمة' : 'نجوم'}</span>
                </div>
                <div class="cert-foot">
                    <div class="cert-sign"><small>الجهة المانحة</small><b>${esc(c.placeName || 'منصة مواهب داري')}</b><small>${esc(c.issuedByName || '')}</small></div>
                    <div class="cert-qr" id="cert-qr"></div>
                    <div class="cert-id"><small>رمز التحقق</small><b dir="ltr">${esc(c.id)}</b><small>امسح الرمز للتحقق من صحة الشهادة</small></div>
                </div>
            </div>
        </div>`;
}

function showCertificate(id) {
    const c = myCerts.find(x => x.id === id) || (window._pvCerts || []).find(x => x.id === id)
        || (attendCtx ? Object.values(attendCtx.certs).find(x => x.id === id) : null);
    if (!c) return;
    lastCert = c;
    document.getElementById('cert-print').innerHTML = certificateHTML(c);
    document.getElementById('certModal').classList.add('active');
    qrInto(document.getElementById('cert-qr'), verifyUrl(c.id), 110);
}
function printCertificate() {
    document.body.classList.add('print-cert');
    window.print();
    setTimeout(() => document.body.classList.remove('print-cert'), 500);
}
function shareCertificate() {
    if (!lastCert) return;
    shareText('شهادة موثّقة', `${(CERT_TYPES[lastCert.type] || CERT_TYPES.event).label}: ${lastCert.title}\nتحقق منها: ${verifyUrl(lastCert.id)}`);
}

// ---------- معرض المواهب ----------
function renderTalentTabs() {
    const tabs = [['all', 'الكل', 'fa-layer-group']].concat(Object.entries(TALENT_CATS).map(([k, c]) => [k, c.short, c.icon]));
    const el = document.getElementById('tal-cat-tabs');
    if (!el) return;
    el.innerHTML = tabs.map(([k, l, i]) =>
        `<span class="filter-tab ${talentFilter === k ? 'active' : ''}" onclick="talentFilter='${k}'; renderTalentTabs(); renderTalents()"><i class="fas ${i}"></i> ${l}</span>`).join('');
}

function renderTalents() {
    const list = getTalents().filter(t => talentFilter === 'all' || t.category === talentFilter)
        .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.likes || 0) - (a.likes || 0));
    document.getElementById('tal-grid').innerHTML = list.length ? list.map(t => talentCard(t)).join('')
        : emptyState('fa-palette', 'لا توجد أعمال في هذا المجال بعد', '<button class="btn btn-primary btn-small" onclick="openAddTalent()">كن أول من يعرض موهبته</button>');
}

function talentCard(t, opts = {}) {
    const c = TALENT_CATS[t.category] || TALENT_CATS.art;
    const liked = currentUser && t.likedBy && t.likedBy[currentUser.uid];
    return `
        <article class="tal-card" onclick="openTalent('${esc(t.id)}')">
            <div class="tal-cover" style="--c:${c.color}">
                ${t.imageUrl ? `<img src="${esc(t.imageUrl)}" alt="${esc(t.title)}" loading="lazy">` : `<i class="fas ${c.icon} tal-big"></i>`}
                <span class="tal-cat"><i class="fas ${c.icon}"></i> ${c.short}</span>
                ${t.sample ? '<span class="tal-flag">نموذج</span>' : t.featured ? '<span class="tal-flag star"><i class="fas fa-star"></i> مميز</span>' : ''}
                ${opts.status && t.status !== 'approved' ? `<span class="tal-state">${statusChip(t.status === 'rejected' ? 'rejected' : 'pending')}</span>` : ''}
            </div>
            <div class="tal-body">
                <h4>${esc(t.title)}</h4>
                <p class="muted small"><span class="tal-author" onclick="event.stopPropagation(); openAuthor('${esc(t.id)}')">${esc(t.userName)}</span>${t.wilaya ? ' · ' + esc(getWilayaName(t.wilaya)) : ''}</p>
                <div class="tal-foot">
                    <button class="like-btn ${liked ? 'on' : ''}" onclick="event.stopPropagation(); toggleLike('${esc(t.id)}')"><i class="fas fa-heart"></i> ${Number(t.likes) || 0}</button>
                    ${t.link ? '<span class="muted small"><i class="fas fa-link"></i> رابط</span>' : ''}
                </div>
            </div>
        </article>`;
}

function openAuthor(id) {
    const t = findTalent(id);
    if (!t) return;
    if (t.sample && t.uid !== DEMO_UID) return showToast('🎯 هذا عمل نموذجي للعرض', 'info');
    openPassportView(t.uid);
}

function openTalent(id) {
    const t = findTalent(id);
    if (!t) return;
    const c = TALENT_CATS[t.category] || TALENT_CATS.art;
    const liked = currentUser && t.likedBy && t.likedBy[currentUser.uid];
    const safeLink = /^https?:\/\//i.test(t.link || '') ? t.link : '';
    document.getElementById('talent-detail').innerHTML = `
        <div class="sheet-handle"></div>
        <div class="tal-cover big" style="--c:${c.color}">
            ${t.imageUrl ? `<img src="${esc(t.imageUrl)}" alt="${esc(t.title)}">` : `<i class="fas ${c.icon} tal-big"></i>`}
            <button class="close-modal fd-close" onclick="closeModal('talentModal')"><i class="fas fa-times"></i></button>
            <span class="tal-cat"><i class="fas ${c.icon}"></i> ${c.label}</span>
            ${t.sample ? '<span class="tal-flag">نموذج</span>' : t.featured ? '<span class="tal-flag star"><i class="fas fa-star"></i> مميز</span>' : ''}
        </div>
        <h3 class="fd-title">${esc(t.title)}</h3>
        <p class="muted"><span class="tal-author" onclick="openAuthor('${esc(t.id)}')"><i class="fas fa-id-card"></i> ${esc(t.userName)}</span>${t.wilaya ? ' · ولاية ' + esc(getWilayaName(t.wilaya)) : ''}${t.createdAt ? ' · ' + esc(formatDateAr(String(t.createdAt).slice(0, 10))) : ''}</p>
        ${t.description ? `<p class="fd-desc">${esc(t.description)}</p>` : ''}
        <div class="fd-actions">
            <button class="btn ${liked ? 'btn-primary' : 'btn-outline'}" onclick="toggleLike('${esc(t.id)}', true)"><i class="fas fa-heart"></i> ${liked ? 'أعجبني' : 'إعجاب'} (${Number(t.likes) || 0})</button>
            ${safeLink ? `<a class="btn btn-outline" href="${esc(safeLink)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-up-right-from-square"></i> فتح الرابط</a>` : ''}
            <button class="btn btn-outline" onclick="shareText('${esc(t.title).replace(/'/g, '')}', '${esc(t.title).replace(/'/g, '')} - ${esc(t.userName).replace(/'/g, '')}\\n' + appBase())"><i class="fas fa-share-nodes"></i></button>
        </div>
        ${selectedRole === 'admin' && !t.sample ? `<div class="fd-admin">
            <button class="btn btn-outline btn-small" onclick="toggleFeatureTalent('${esc(t.id)}')"><i class="fas fa-star"></i> ${t.featured ? 'إلغاء التمييز' : 'تمييز'}</button>
            <button class="btn btn-danger btn-small" onclick="deleteTalent('${esc(t.id)}')"><i class="fas fa-trash"></i> حذف</button></div>` : ''}`;
    document.getElementById('talentModal').classList.add('active');
}

function toggleLike(id, fromDetail) {
    const t = findTalent(id);
    if (!t) return;
    if (t.sample) return showToast('🎯 هذا عمل نموذجي للعرض، سيُفعَّل الإعجاب مع الأعمال الحقيقية', 'info');
    if (!requireLogin()) return;
    const had = !!(t.likedBy && t.likedBy[currentUser.uid]);
    Promise.all([
        database.ref(`talents/${id}/likedBy/${currentUser.uid}`)[had ? 'remove' : 'set'](had ? undefined : true),
        database.ref(`talents/${id}/likes`).transaction(n => Math.max(0, (Number(n) || 0) + (had ? -1 : 1)))
    ]).then(() => { if (fromDetail) setTimeout(() => openTalent(id), 150); })
      .catch(err => showToast('❌ ' + err.message, 'error'));
}

function openAddTalent(cat) {
    if (!requireLogin()) return;
    closeModal('quizModal');
    const sel = document.getElementById('tl-cat');
    sel.innerHTML = Object.entries(TALENT_CATS).map(([k, c]) => `<option value="${k}">${c.label}</option>`).join('');
    sel.value = cat && TALENT_CATS[cat] ? cat : (currentUserData?.talentQuiz?.top || 'art');
    ['tl-title', 'tl-desc', 'tl-link'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('tl-file').value = '';
    document.getElementById('tl-agree').checked = false;
    document.getElementById('addTalentModal').classList.add('active');
}

async function submitTalent() {
    if (!requireLogin()) return;
    const title = document.getElementById('tl-title').value.trim();
    const category = document.getElementById('tl-cat').value;
    const description = document.getElementById('tl-desc').value.trim();
    const link = document.getElementById('tl-link').value.trim();
    const file = document.getElementById('tl-file').files[0];
    if (title.length < 3) return showToast('❌ أدخل عنواناً للعمل', 'error');
    if (link && !/^https?:\/\/\S+\.\S+/i.test(link)) return showToast('❌ الرابط غير صحيح، يجب أن يبدأ بـ https://', 'error');
    if (file && !/^image\//.test(file.type)) return showToast('❌ اختر صورة فقط', 'error');
    if (file && file.size > 5 * 1024 * 1024) return showToast('❌ حجم الصورة أكبر من 5 ميغابايت', 'error');
    if (!file && !link && description.length < 10) return showToast('❌ أضف صورة أو رابطاً أو وصفاً للعمل', 'error');
    if (!document.getElementById('tl-agree').checked) return showToast('❌ يجب تأكيد شروط النشر', 'error');
    showLoading();
    try {
        let imageUrl = '';
        if (file) {
            const ref = storage.ref(`talents/${currentUser.uid}/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`);
            const snap = await ref.put(file);
            imageUrl = await snap.ref.getDownloadURL();
        }
        const u = currentUserData || {};
        await database.ref('talents').push({
            uid: currentUser.uid, userName: u.name || currentUser.displayName || '', wilaya: u.wilaya || '',
            category, title, description, imageUrl, link, status: 'pending', likes: 0, createdAt: new Date().toISOString()
        });
        hideLoading();
        closeModal('addTalentModal');
        showToast('✅ أُرسل عملك للمراجعة، وسيظهر في المعرض فور قبوله');
        sendNotificationToAdmins('🎨 موهبة جديدة للمراجعة', `${u.name || ''}: «${title}» (${TALENT_CATS[category].label})`);
    } catch (err) {
        hideLoading();
        showToast('❌ ' + err.message, 'error');
    }
}

// ---------- مراجعة المواهب (للمدير) ----------
function adminTalentCard(t) {
    const c = TALENT_CATS[t.category] || TALENT_CATS.art;
    const safeLink = /^https?:\/\//i.test(t.link || '') ? t.link : '';
    return `
        <div class="req-card">
            <div class="req-top">
                <div class="tal-admin-head">
                    ${t.imageUrl ? `<img class="tal-thumb" src="${esc(t.imageUrl)}" alt="">` : `<span class="tal-thumb" style="--c:${c.color}"><i class="fas ${c.icon}"></i></span>`}
                    <div><b>${esc(t.title)}</b><small>${esc(t.userName)} · ${c.label}${t.wilaya ? ' · ' + esc(getWilayaName(t.wilaya)) : ''}</small></div>
                </div>
                ${statusChip(t.status === 'approved' ? 'accepted' : t.status)}
            </div>
            ${t.description ? `<p class="req-notes">${esc(t.description)}</p>` : ''}
            ${safeLink ? `<p class="req-notes"><i class="fas fa-link"></i> <a href="${esc(safeLink)}" target="_blank" rel="noopener noreferrer" dir="ltr">${esc(safeLink)}</a></p>` : ''}
            <div class="req-actions">
                ${t.status === 'pending' ? `
                    <button class="btn btn-success btn-small" onclick="decideTalent('${t.id}', 'approved')"><i class="fas fa-check"></i> نشر</button>
                    <button class="btn btn-danger btn-small" onclick="decideTalent('${t.id}', 'rejected')"><i class="fas fa-times"></i> رفض</button>` : ''}
                ${t.status === 'approved' ? `<button class="btn btn-outline btn-small" onclick="toggleFeatureTalent('${t.id}')"><i class="fas fa-star"></i> ${t.featured ? 'إلغاء التمييز' : 'تمييز'}</button>` : ''}
                <button class="btn btn-outline btn-small" onclick="openTalent('${t.id}')"><i class="fas fa-eye"></i></button>
                <button class="btn btn-outline btn-small" title="حذف" onclick="deleteTalent('${t.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
}

function decideTalent(id, status) {
    if (selectedRole !== 'admin') return;
    const t = allTalents.find(x => x.id === id);
    if (!t) return;
    let reason = '';
    if (status === 'rejected') {
        reason = prompt('سبب الرفض (سيصل إلى صاحب العمل):');
        if (reason === null) return;
        reason = reason.trim();
    }
    const upd = { status, decidedAt: new Date().toISOString() };
    if (reason) upd.rejectReason = reason;
    database.ref('talents/' + id).update(upd).then(() => {
        showToast(status === 'approved' ? '✅ نُشر العمل في المعرض' : 'تم رفض العمل', status === 'approved' ? 'success' : 'info');
        sendNotification(t.uid, status === 'approved' ? '🌟 نُشرت موهبتك' : 'ℹ️ عملك لم يُنشر',
            status === 'approved' ? `عملك «${t.title}» ظاهر الآن في معرض المواهب وفي جوازك.` : `عملك «${t.title}» لم يُقبل${reason ? ': ' + reason : ''}`);
    }).catch(err => showToast('❌ ' + err.message, 'error'));
}

function toggleFeatureTalent(id) {
    if (selectedRole !== 'admin') return;
    const t = allTalents.find(x => x.id === id);
    if (!t) return;
    database.ref('talents/' + id).update({ featured: !t.featured })
        .then(() => { showToast(t.featured ? 'أُلغي التمييز' : '⭐ أصبح العمل مميزاً', 'info'); if (document.getElementById('talentModal').classList.contains('active')) setTimeout(() => openTalent(id), 150); })
        .catch(err => showToast('❌ ' + err.message, 'error'));
}

function deleteTalent(id) {
    const t = allTalents.find(x => x.id === id);
    if (!t || !(selectedRole === 'admin' || (currentUser && t.uid === currentUser.uid))) return;
    if (!confirm('⚠️ حذف هذا العمل نهائياً؟')) return;
    database.ref('talents/' + id).remove().then(() => { closeModal('talentModal'); showToast('✅ تم الحذف'); })
        .catch(err => showToast('❌ ' + err.message, 'error'));
}

// ---------- اكتشف موهبتك ----------
function openQuiz() {
    document.querySelectorAll('.modal.active').forEach(m => m.id && m.id !== 'quizModal' && closeModal(m.id));
    quizState = { i: 0, answers: [] };
    renderQuiz();
    document.getElementById('quizModal').classList.add('active');
}

function renderQuiz() {
    const body = document.getElementById('quiz-body');
    if (quizState.i >= QUIZ.length) return renderQuizResult();
    const q = QUIZ[quizState.i];
    body.innerHTML = `
        <div class="quiz-progress"><span style="width:${Math.round(quizState.i / QUIZ.length * 100)}%"></span></div>
        <p class="muted small">السؤال ${quizState.i + 1} من ${QUIZ.length}</p>
        <h3 class="quiz-q">${esc(q.q)}</h3>
        <div class="quiz-opts">${q.a.map(([txt, cat], k) => `<button class="quiz-opt" onclick="answerQuiz(${k})"><span>${k + 1}</span>${esc(txt)}</button>`).join('')}</div>
        ${quizState.i > 0 ? '<button class="link-btn" onclick="quizBack()"><i class="fas fa-chevron-right"></i> السؤال السابق</button>' : ''}`;
}
function answerQuiz(k) { quizState.answers.push(QUIZ[quizState.i].a[k][1]); quizState.i++; renderQuiz(); }
function quizBack() { quizState.answers.pop(); quizState.i = Math.max(0, quizState.i - 1); renderQuiz(); }

function quizRanking(answers) {
    const sc = {};
    answers.forEach((c, i) => { sc[c] = (sc[c] || 0) + 1 + (answers.length - i) * 0.01; }); // تعادل: الأسبق يرجح
    return Object.entries(sc).sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

function clubsForCategory(cat) {
    const re = TALENT_CATS[cat].clubs;
    const out = [];
    sortFacilities(getFacilities().slice(), true).forEach(f => splitList(f.clubs).forEach((club, i) => { if (re.test(club)) out.push({ f, club, i }); }));
    return out.slice(0, 4);
}

function renderQuizResult() {
    const ranked = quizRanking(quizState.answers);
    const top = ranked[0], second = ranked[1];
    const c = TALENT_CATS[top];
    const clubs = clubsForCategory(top);
    const t = todayStr();
    const evs = getEvents().filter(e => e.status === 'approved' && (e.date || '') >= t && c.events.includes(e.category)).sort(byDateTime).slice(0, 3);
    const result = { top, second: second || '', at: new Date().toISOString() };
    try { localStorage.setItem('talentQuiz', JSON.stringify(result)); } catch (e) {}
    if (currentUser) {
        database.ref('users/' + currentUser.uid + '/talentQuiz').set(result).catch(() => {});
        if (currentUserData) { currentUserData.talentQuiz = result; syncPassport(); recomputeMyStats(); }
    }
    document.getElementById('quiz-body').innerHTML = `
        <div class="quiz-result" style="--c:${c.color}">
            <span class="qr-ico"><i class="fas ${c.icon}"></i></span>
            <small>موهبتك الأقرب</small>
            <h3>${c.label}</h3>
            <p>${c.desc}</p>
            ${second ? `<span class="chip" style="--c:${TALENT_CATS[second].color}"><i class="fas ${TALENT_CATS[second].icon}"></i> وتميل أيضاً إلى: ${TALENT_CATS[second].label}</span>` : ''}
        </div>
        <div class="fd-section">
            <h4><i class="fas fa-masks-theater"></i> نوادٍ تناسبك</h4>
            ${clubs.length ? `<div class="club-list">${clubs.map(({ f, club, i }) => `
                <div class="club-row">
                    <span class="club-ico"><i class="fas ${clubIcon(club)}"></i></span>
                    <span class="club-name">${esc(club)}<small>${esc(f.name)}</small></span>
                    <button class="btn btn-primary btn-small" onclick="closeModal('quizModal'); openClubModal('${f.id}', ${i})"><i class="fas fa-user-plus"></i> انخرط</button>
                </div>`).join('')}</div>` : '<p class="muted small">لا توجد نوادٍ مسجلة في هذا المجال بعد.</p>'}
        </div>
        <div class="fd-section">
            <h4><i class="fas fa-calendar-check"></i> فعاليات تناسبك</h4>
            ${evs.length ? evs.map(e => `<div class="mini-row" onclick="closeModal('quizModal'); openEventFromHome('${e.id}')">
                <div class="date-badge small"><b>${parseDateStr(e.date).d}</b><span>${MONTHS_DZ[parseDateStr(e.date).m - 1]}</span></div>
                <div class="mini-info"><b>${esc(e.title)}</b><small>${esc(e.placeName || e.address || '')}</small></div>
                <span class="mini-side"><i class="fas fa-chevron-left"></i></span></div>`).join('') : '<p class="muted small">لا توجد فعاليات قادمة في هذا المجال حالياً.</p>'}
        </div>
        <div class="fd-section" id="quiz-plan">
            <button class="btn btn-outline btn-block" onclick="aiTalentPlan('${top}', this)"><i class="fas fa-wand-magic-sparkles"></i> اقترح لي خطة شهر لتطوير موهبتي</button>
        </div>
        <div class="row-actions wrap">
            <button class="btn btn-primary" onclick="addQuizTalent('${top}')"><i class="fas fa-plus"></i> أضفها إلى مواهبي</button>
            <button class="btn btn-outline" onclick="openAddTalent('${top}')"><i class="fas fa-palette"></i> اعرض عملاً</button>
            <button class="btn btn-outline" onclick="openQuiz()"><i class="fas fa-rotate-left"></i> أعد الاختبار</button>
        </div>`;
}

function addQuizTalent(cat) {
    if (!requireLogin()) return;
    const label = TALENT_CATS[cat].label;
    const list = splitList(currentUserData?.talents);
    if (list.includes(label)) return showToast('هذه الموهبة موجودة في ملفك', 'info');
    const talents = list.concat(label).join(', ');
    database.ref('users/' + currentUser.uid).update({ talents }).then(() => {
        if (currentUserData) currentUserData.talents = talents;
        document.getElementById('edit-talents').value = talents;
        document.getElementById('display-talents').innerHTML = splitList(talents).map(t => `<span class="talent-tag">${esc(t)}</span>`).join('');
        syncPassport();
        showToast('✅ أُضيفت إلى مواهبك في جوازك');
    }).catch(err => showToast('❌ ' + err.message, 'error'));
}

// ---------- التطوع ----------
function volunteerEvents() {
    const t = todayStr();
    return getEvents().filter(e => e.status === 'approved' && (e.date || '') >= t && Number(e.volunteers) > 0).sort(byDateTime);
}

function volCard(e) {
    const cat = EVENT_CATEGORIES[e.category];
    const p = parseDateStr(e.date);
    const reg = e.participants ? Object.keys(e.participants).length : 0;
    const need = Number(e.volunteers) || 0;
    const pct = need ? Math.min(100, Math.round(reg / need * 100)) : 0;
    const mine = currentUser && e.participants && e.participants[currentUser.uid];
    const hours = Number(e.volunteerHours) || 3;
    return `
        <article class="ev-card vol-card">
            <div class="date-badge"><b>${p ? p.d : ''}</b><span>${p ? MONTHS_DZ[p.m - 1] : ''}</span></div>
            <div class="ev-body">
                <div class="ev-top">
                    <span class="chips-inline">${cat ? `<span class="chip" style="--c:${cat.color}"><i class="fas ${cat.icon}"></i> ${cat.label}</span>` : ''}${e.sample ? '<span class="chip warn">نموذج</span>' : ''}</span>
                    <span class="chip ok"><i class="fas fa-certificate"></i> ${hours} ساعات موثّقة</span>
                </div>
                <h4>${esc(e.title)}</h4>
                <p class="muted"><i class="fas fa-location-dot"></i> ${esc(e.placeName || e.address || '')}${e.time ? ' · ' + esc(e.time) : ''}</p>
                <div class="vol-progress"><span style="width:${pct}%"></span></div>
                <p class="muted small">${reg} من ${need} متطوعين مسجّلين${need > reg ? ` · بقي ${need - reg}` : ' · اكتمل العدد'}</p>
                <div class="ev-actions">
                    <button class="btn ${mine ? 'btn-success' : 'btn-primary'} btn-small" ${mine ? 'disabled' : ''} onclick="volunteerForEvent('${e.id}')"><i class="fas ${mine ? 'fa-circle-check' : 'fa-hand-holding-heart'}"></i> ${mine ? 'مسجّل للتطوع' : 'تطوع الآن'}</button>
                    <button class="icon-btn" title="أضف إلى التقويم" onclick="downloadICS('${e.id}')"><i class="fas fa-calendar-plus"></i></button>
                    <button class="icon-btn" title="مشاركة" onclick="shareEvent('${e.id}')"><i class="fas fa-share-nodes"></i></button>
                </div>
            </div>
        </article>`;
}

function renderVolunteer() {
    const hero = document.getElementById('vol-hero');
    if (currentUser) {
        const mine = allTalents.filter(t => t.uid === currentUser.uid && t.status === 'approved');
        const st = statsFrom(myCerts, mine, currentUserData?.talentQuiz);
        hero.innerHTML = `
            <div class="vh-stats">
                <div><b>${st.hours}</b><span>ساعات تطوع موثّقة</span></div>
                <div><b>${st.volCerts}</b><span>شهادات تطوع</span></div>
                <div><b>${st.stars} <i class="fas fa-star"></i></b><span>نجوم</span></div>
            </div>
            <div class="vh-actions">
                <button class="btn hero-btn" onclick="openIdCard()"><i class="fas fa-qrcode"></i> بطاقتي للحضور</button>
                <button class="btn hero-btn ghost" onclick="switchTab('profile')"><i class="fas fa-id-card"></i> جوازي</button>
            </div>`;
    } else {
        hero.innerHTML = `
            <div class="vh-guest">
                <b>كل ساعة تطوع تُحتسب</b>
                <span>سجّل في فرصة، احضر وأظهر بطاقتك، فتصلك شهادة موثّقة تُضاف إلى جواز مواهبك.</span>
            </div>
            <div class="vh-actions">
                <button class="btn hero-btn" onclick="askLogin()"><i class="fas fa-right-to-bracket"></i> سجّل وابدأ</button>
                <button class="btn hero-btn ghost" onclick="openPassportView('demo')"><i class="fas fa-eye"></i> جواز نموذجي</button>
            </div>`;
    }
    const list = volunteerEvents();
    document.getElementById('vol-list').innerHTML = list.length ? list.map(volCard).join('')
        : emptyState('fa-hand-holding-heart', 'لا توجد فرص تطوع قادمة حالياً', '<button class="btn btn-primary btn-small" onclick="showAddEventModal()"><i class="fas fa-plus"></i> اقترح مبادرة تطوعية</button>');
    renderVolTop();
}

function renderVolTop() {
    const box = document.getElementById('vol-top');
    if (!currentUser) {
        box.innerHTML = emptyState('fa-trophy', 'سجّل الدخول لترى أبطال التطوع في المنصة');
        return;
    }
    const draw = users => {
        const top = users.filter(u => (u.hours || 0) > 0 || (u.stars || 0) > 0)
            .sort((a, b) => (b.hours || 0) - (a.hours || 0) || (b.stars || 0) - (a.stars || 0)).slice(0, 5);
        box.innerHTML = top.length ? top.map((u, i) => `
            <div class="mini-row" onclick="openPassportView('${esc(u.id)}')">
                <span class="rank-dot r${i}">${i + 1}</span>
                <div class="mini-info"><b>${esc(u.name || '')}</b><small>${esc(u.wilaya ? 'ولاية ' + getWilayaName(u.wilaya) : '')}</small></div>
                <span class="mini-side">${u.hours || 0} ساعة · ${starsLabel(u.stars)}</span>
            </div>`).join('') : emptyState('fa-trophy', 'لم تُسجَّل ساعات تطوع بعد: كن الأول!');
    };
    if (volTopCache) draw(volTopCache);
    if (volTopCache && Date.now() - volTopCache.at < 60000) return;
    database.ref('users').orderByChild('stars').limitToLast(30).once('value')
        .then(s => { volTopCache = snapToList(s); volTopCache.at = Date.now(); draw(volTopCache); })
        .catch(() => { if (!volTopCache) box.innerHTML = emptyState('fa-trophy', 'تعذّر تحميل الترتيب'); });
}

// ---------- الرئيسية: المواهب والتطوع ----------
function renderHomeTalentVol() {
    const tals = getTalents().slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.likes || 0) - (a.likes || 0)).slice(0, 8);
    const ht = document.getElementById('home-talents');
    if (ht) ht.innerHTML = tals.map(t => talentCard(t)).join('');
    const hv = document.getElementById('home-vol');
    const vols = volunteerEvents().slice(0, 3);
    if (hv) hv.innerHTML = vols.length ? vols.map(e => {
        const p = parseDateStr(e.date);
        const reg = e.participants ? Object.keys(e.participants).length : 0;
        return `<div class="mini-row" onclick="switchTab('volunteer')">
            <div class="date-badge small"><b>${p ? p.d : ''}</b><span>${p ? MONTHS_DZ[p.m - 1] : ''}</span></div>
            <div class="mini-info"><b>${esc(e.title)}</b><small>${esc(e.placeName || e.address || '')}</small></div>
            <span class="mini-side">${reg}/${Number(e.volunteers) || 0} <i class="fas fa-users"></i></span></div>`;
    }).join('') : emptyState('fa-hand-holding-heart', 'لا توجد فرص تطوع قادمة حالياً');
}

// ---------- الحضور والشهادات (للمدير) ----------
function openAttendance(eventId) {
    if (selectedRole !== 'admin') return;
    const e = allEvents.find(x => x.id === eventId);
    if (!e) return;
    if (attendCtx) { attendCtx.r1.off(); attendCtx.r2.off(); }
    attendCtx = { eventId, checkins: {}, certs: {}, r1: database.ref('checkins/' + eventId), r2: database.ref('certificates').orderByChild('eventId').equalTo(eventId) };
    attendCtx.r1.on('value', s => { attendCtx.checkins = s.val() || {}; renderAttendance(); });
    attendCtx.r2.on('value', s => { attendCtx.certs = {}; s.forEach(c => { attendCtx.certs[c.val().uid] = { id: c.key, ...c.val() }; }); renderAttendance(); });
    renderAttendance();
    document.getElementById('attendModal').classList.add('active');
}

function attendancePeople(e) {
    const people = {};
    Object.entries(e.attendees || {}).forEach(([uid, v]) => { people[uid] = { uid, name: v.name || '', role: 'attendee' }; });
    Object.entries(e.participants || {}).forEach(([uid, v]) => { people[uid] = { uid, name: v.userName || v.name || '', role: 'volunteer' }; });
    Object.entries(attendCtx.checkins).forEach(([uid, v]) => { if (!people[uid]) people[uid] = { uid, name: v.name || '', role: v.role || 'attendee', walkIn: true }; });
    return Object.values(people).sort((a, b) => (a.role === 'volunteer' ? 0 : 1) - (b.role === 'volunteer' ? 0 : 1) || a.name.localeCompare(b.name, 'ar'));
}

function renderAttendance() {
    if (!attendCtx) return;
    const e = allEvents.find(x => x.id === attendCtx.eventId);
    if (!e) return;
    const people = attendancePeople(e);
    const present = people.filter(p => attendCtx.checkins[p.uid]);
    const pending = present.filter(p => !attendCtx.certs[p.uid]);
    const hoursEl = document.getElementById('att-hours');
    const hours = hoursEl ? hoursEl.value : (Number(e.volunteerHours) || 3);
    document.getElementById('attend-body').innerHTML = `
        <div class="att-head">
            <b>${esc(e.title)}</b>
            <small>${esc(formatDateAr(e.date))} · ${esc(e.time || '')} · ${esc(e.placeName || e.address || '')}</small>
            <div class="att-count"><span>${people.length} مسجّلون</span><span>${present.length} حضروا</span><span>${Object.keys(attendCtx.certs).length} شهادات</span></div>
        </div>
        <div class="att-tools">
            <button class="btn btn-primary" onclick="openScanner({ eventId: '${e.id}' })"><i class="fas fa-qrcode"></i> مسح بطاقات الحضور</button>
            <label class="att-hours">ساعات التطوع <input type="number" id="att-hours" min="1" max="24" value="${esc(hours)}"></label>
        </div>
        <div class="att-list">${people.length ? people.map(p => {
            const ck = attendCtx.checkins[p.uid];
            const cert = attendCtx.certs[p.uid];
            return `<div class="att-row ${ck ? 'on' : ''}">
                <label class="att-check"><input type="checkbox" ${ck ? 'checked' : ''} ${cert ? 'disabled' : ''} onchange="toggleCheckin('${esc(p.uid)}', this.checked)"><span></span></label>
                <div class="att-info"><b>${esc(p.name || 'بدون اسم')}</b><small>${p.role === 'volunteer' ? 'متطوع' : 'حضور'}${p.walkIn ? ' · مسجّل بالمسح' : ''}${ck ? ' · ' + esc(String(ck.at || '').slice(11, 16)) : ''}</small></div>
                ${cert ? `<button class="btn btn-outline btn-small" onclick="showCertificate('${esc(cert.id)}')"><i class="fas fa-certificate"></i> الشهادة</button>` : ''}
            </div>`;
        }).join('') : emptyState('fa-users', 'لم يسجّل أحد بعد', '<small>يظهر هنا المسجّلون في «سأحضر» و«تطوع»، ومن يُمسح رمزه عند الدخول.</small>')}</div>
        <button class="btn-save" ${pending.length ? '' : 'disabled'} onclick="issueCertificates()"><i class="fas fa-certificate"></i> إصدار الشهادات (${pending.length})</button>`;
}

function toggleCheckin(uid, on, roleHint, nameHint) {
    if (selectedRole !== 'admin' || !attendCtx) return Promise.resolve();
    const e = allEvents.find(x => x.id === attendCtx.eventId);
    const p = attendancePeople(e).find(x => x.uid === uid) || { uid, name: nameHint || '', role: roleHint || 'attendee' };
    const ref = database.ref(`checkins/${attendCtx.eventId}/${uid}`);
    return (on ? ref.set({ name: p.name || nameHint || '', role: p.role, at: new Date().toISOString(), by: currentUser.uid }) : ref.remove())
        .catch(err => showToast('❌ ' + err.message, 'error'));
}

function issueCertificates() {
    if (selectedRole !== 'admin' || !attendCtx) return;
    const e = allEvents.find(x => x.id === attendCtx.eventId);
    const fac = findFacility(e.placeId);
    const hours = Math.max(1, Math.min(24, parseInt(document.getElementById('att-hours').value) || 3));
    const todo = attendancePeople(e).filter(p => attendCtx.checkins[p.uid] && !attendCtx.certs[p.uid]);
    if (!todo.length) return;
    if (!confirm(`إصدار ${todo.length} شهادة لفعالية «${e.title}»؟`)) return;
    const updates = {};
    const issued = [];
    todo.forEach(p => {
        const id = genId('MD');
        const type = p.role === 'volunteer' ? 'volunteer' : 'event';
        const cert = {
            uid: p.uid, userName: p.name, type, title: e.title, eventId: e.id,
            placeId: e.placeId || '', placeName: e.placeName || fac?.name || e.address || '',
            wilaya: e.wilaya || fac?.wilaya || '', date: e.date, hours: type === 'volunteer' ? hours : 0,
            issuedBy: currentUser.uid, issuedByName: currentUserData?.name || '', issuedAt: new Date().toISOString()
        };
        updates['certificates/' + id] = cert;
        issued.push(cert);
    });
    showLoading();
    database.ref().update(updates).then(() => {
        hideLoading();
        showToast(`🎓 صدرت ${issued.length} شهادة`);
        issued.forEach(c => {
            sendNotification(c.uid, '🎓 شهادة جديدة في جوازك', `${CERT_TYPES[c.type].label}: «${c.title}»${c.hours ? ` (${c.hours} ساعات تطوع)` : ''} · +${certStars(c)} ⭐`);
            bumpUserStats(c);
        });
    }).catch(err => { hideLoading(); showToast('❌ ' + err.message, 'error'); });
}

// يحدّث الأرقام المعروضة في لوحة الشرف فوراً (النجوم الرسمية تُعاد حسابها من الشهادات)
function bumpUserStats(c) {
    database.ref('users/' + c.uid).transaction(u => {
        if (!u) return u;
        u.points = (Number(u.points) || 0) + ((CERT_TYPES[c.type] || {}).points || 0);
        u.hours = (Number(u.hours) || 0) + (Number(c.hours) || 0);
        u.events = (Number(u.events) || 0) + 1;
        u.stars = (Number(u.stars) || 0) + certStars(c);
        return u;
    }).catch(() => {});
}

// إصدار شهادة واحدة (انخراط، عمل خيري، تقدير...)
function issueSingleCertificate(data) {
    const id = genId('MD');
    const cert = {
        hours: 0, date: todayStr(), placeId: '', placeName: '', wilaya: '', ...data,
        issuedBy: currentUser.uid, issuedByName: currentUserData?.name || '', issuedAt: new Date().toISOString()
    };
    return database.ref('certificates/' + id).set(cert).then(() => {
        bumpUserStats(cert);
        sendNotification(cert.uid, '🎓 شهادة جديدة في جوازك', `${CERT_TYPES[cert.type].label}: «${cert.title}» · +${certStars(cert)} ⭐`);
        return { id, ...cert };
    });
}

function issueClubCertificate(m) {
    const fac = findFacility(m.placeId);
    return issueSingleCertificate({
        uid: m.userId, userName: m.userName, type: 'club', title: m.club, placeId: m.placeId || '',
        placeName: m.placeName || '', wilaya: fac?.wilaya || ''
    }).catch(err => console.warn('club cert:', err.message));
}

// ---------- ماسح رمز QR ----------
function openScanner(ctx) {
    if (selectedRole !== 'admin') return;
    scanCtx = ctx || null;
    const e = scanCtx ? allEvents.find(x => x.id === scanCtx.eventId) : null;
    document.getElementById('scan-context').textContent = e ? `تسجيل الحضور في: ${e.title}` : 'امسح بطاقة شاب (جواز المواهب) أو تذكرة حجز.';
    document.getElementById('scan-result').innerHTML = '';
    document.getElementById('scanModal').classList.add('active');
    startCamera();
}

function loadJsQR() {
    return new Promise((res, rej) => {
        if (window.jsQR) return res();
        const sc = document.createElement('script');
        sc.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
        sc.onload = () => res();
        sc.onerror = () => rej(new Error('jsQR'));
        document.head.appendChild(sc);
    });
}

async function startCamera() {
    const status = document.getElementById('scan-status');
    const video = document.getElementById('scan-video');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = 'الكاميرا غير متاحة في هذا المتصفح. استعمل قائمة الحضور لتأشير الحاضرين يدوياً.';
        return;
    }
    status.textContent = 'جارٍ تشغيل الكاميرا...';
    try {
        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.srcObject = scanStream;
        await video.play();
    } catch (err) {
        status.textContent = 'تعذّر تشغيل الكاميرا. اسمح للمتصفح باستعمالها، أو أشّر الحاضرين يدوياً من القائمة.';
        return;
    }
    scanDetector = null;
    if ('BarcodeDetector' in window) {
        try { scanDetector = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { scanDetector = null; }
    }
    if (!scanDetector) {
        try { await loadJsQR(); } catch (e) { status.textContent = 'تعذّر تحميل قارئ الرموز. تحقق من الاتصال بالإنترنت.'; return; }
    }
    status.textContent = 'وجّه الكاميرا نحو الرمز...';
    const canvas = document.getElementById('scan-canvas');
    const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
    clearInterval(scanTimer);
    scanTimer = setInterval(async () => {
        if (!video.videoWidth || scanBusy) return;
        try {
            let text = '';
            if (scanDetector) {
                const codes = await scanDetector.detect(video);
                if (codes.length) text = codes[0].rawValue;
            } else if (window.jsQR) {
                canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                ctx2d.drawImage(video, 0, 0);
                const img = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
                if (code) text = code.data;
            }
            if (text) handleScan(text);
        } catch (e) { /* إطار غير صالح */ }
    }, 300);
}

function stopScanner() {
    clearInterval(scanTimer);
    scanTimer = null;
    if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
    closeModal('scanModal');
}

function parseScan(text) {
    let m = String(text).match(/[?&]passport=([A-Za-z0-9_-]+)/);
    if (m) return { kind: 'person', uid: m[1] };
    m = String(text).match(/[?&]verify=([A-Za-z0-9_-]+)/);
    if (m) return { kind: 'cert', id: m[1] };
    if (String(text).startsWith('MAWAHEB-DARI|')) {
        const parts = String(text).split('|');
        return { kind: 'booking', code: parts[1], placeId: parts[2] };
    }
    return null;
}

async function handleScan(text) {
    const now = Date.now();
    if (scanBusy || (text === lastScan.text && now - lastScan.at < 4000)) return;
    lastScan = { text, at: now };
    scanBusy = true;
    const out = document.getElementById('scan-result');
    const status = document.getElementById('scan-status');
    const r = parseScan(text);
    try {
        if (!r) {
            status.textContent = '⚠️ رمز غير معروف: امسح بطاقة الشاب أو تذكرة الحجز.';
        } else if (r.kind === 'person') {
            let pp = null;
            try { pp = (await database.ref('passports/' + r.uid).once('value')).val(); } catch (e) {}
            const name = pp?.name || '';
            if (scanCtx && attendCtx && attendCtx.eventId === scanCtx.eventId) {
                const e = allEvents.find(x => x.id === scanCtx.eventId);
                const role = e && e.participants && e.participants[r.uid] ? 'volunteer' : 'attendee';
                await toggleCheckin(r.uid, true, role, name);
                if (navigator.vibrate) navigator.vibrate(120);
                status.textContent = `✅ سُجّل حضور ${name || 'المشارك'} (${role === 'volunteer' ? 'متطوع' : 'حضور'})`;
                out.innerHTML = `<div class="scan-ok"><i class="fas fa-circle-check"></i> ${esc(name || r.uid)}</div>` + out.innerHTML;
            } else {
                status.textContent = name ? `بطاقة: ${name}` : 'بطاقة شاب';
                out.innerHTML = `<div class="scan-card">${avatarHTML(name, pp?.photoURL)}<div><b>${esc(name || 'مشارك')}</b><small>${esc(pp?.wilaya ? 'ولاية ' + getWilayaName(pp.wilaya) : '')}</small></div>
                    <button class="btn btn-outline btn-small" onclick="stopScanner(); openPassportView('${esc(r.uid)}')"><i class="fas fa-id-card"></i> الجواز</button></div>`;
            }
        } else if (r.kind === 'booking') {
            const b = allBookings.find(x => x.code === r.code);
            if (!b) {
                status.textContent = `⚠️ لم يُعثر على الحجز ${r.code}`;
            } else {
                status.textContent = `تذكرة ${b.code}: ${(REQUEST_STATUS[b.status] || REQUEST_STATUS.pending).label}`;
                out.innerHTML = `<div class="scan-card"><span class="mini-ico" style="--c:#3b82f6"><i class="fas fa-bed"></i></span>
                    <div><b>${esc(b.userName)}</b><small>${esc(b.placeName)} · ${esc(formatDateAr(b.checkIn))} ← ${esc(formatDateAr(b.checkOut))} · ${personsLabel(Number(b.guests) || 1)}</small></div>
                    ${b.status === 'confirmed' && !b.arrivedAt ? `<button class="btn btn-success btn-small" onclick="markArrived('${b.id}')"><i class="fas fa-check"></i> تأكيد الوصول</button>`
                      : b.arrivedAt ? '<span class="chip ok">وصل</span>' : statusChip(b.status)}</div>`;
            }
        } else if (r.kind === 'cert') {
            stopScanner();
            openVerifyView(r.id);
        }
    } finally {
        setTimeout(() => { scanBusy = false; }, 1200);
    }
}

function markArrived(id) {
    database.ref('bookings/' + id).update({ arrivedAt: new Date().toISOString() })
        .then(() => { showToast('✅ سُجّل وصول النزيل'); document.getElementById('scan-result').innerHTML = ''; })
        .catch(err => showToast('❌ ' + err.message, 'error'));
}
