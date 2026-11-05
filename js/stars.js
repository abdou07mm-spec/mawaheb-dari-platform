// =====================================================================
// مواهب داري: النجوم والمكافآت (سحوبات شفافة)، الأعمال الخيرية، وأعضاء دور الشباب
// كلما زادت نجوم الشاب زادت فرصته في السحب، وبعض المكافآت القيّمة تتطلب حداً أدنى من النجوم.
// =====================================================================
const REWARD_KINDS = {
    stay:   { label: 'إقامة', icon: 'fa-bed', color: '#3b82f6' },
    trip:   { label: 'رحلة', icon: 'fa-route', color: '#10b981' },
    gear:   { label: 'عتاد', icon: 'fa-box-open', color: '#ec4899' },
    course: { label: 'تكوين', icon: 'fa-graduation-cap', color: '#8b5cf6' },
    ticket: { label: 'تذاكر', icon: 'fa-ticket', color: '#f97316' },
    other:  { label: 'مكافأة', icon: 'fa-gift', color: '#f4b41b' }
};
const CHARITY_KINDS = {
    blood:   { label: 'التبرع بالدم', icon: 'fa-droplet' },
    food:    { label: 'قفة رمضان والإطعام', icon: 'fa-bowl-food' },
    clean:   { label: 'تنظيف وتشجير', icon: 'fa-tree' },
    elderly: { label: 'زيارة المسنين والمرضى', icon: 'fa-person-cane' },
    orphans: { label: 'دعم الأيتام والأطفال', icon: 'fa-hands-holding-child' },
    school:  { label: 'دروس دعم مجانية', icon: 'fa-school' },
    other:   { label: 'عمل خيري آخر', icon: 'fa-hand-holding-heart' }
};

let allRewards = [], rewardsLoaded = false;
let myCharity = [], allCharity = [], charityLoaded = false, adminCharityLoaded = false;
let allCertsAdmin = [], allCertsLoaded = false;
let editingRewardId = null;
let membersFilter = { q: '', place: '', tier: 'all', sort: 'stars' };

// ---------- بيانات نموذجية ----------
function sampleEntries(n, seedNum) {
    const names = ['ياسين ب.', 'مريم ع.', 'أنس م.', 'إكرام س.', 'وليد ر.', 'هاجر ت.', 'أيمن ق.', 'نسرين ل.', 'رياض ف.', 'سلمى د.', 'زكريا ح.', 'شيماء ك.', 'عماد ز.', 'لينا ج.', 'بلال ش.', 'إيناس ن.', 'حمزة و.', 'ريم ي.'];
    const out = {};
    for (let i = 0; i < n; i++) out['sample-u' + (i + 10)] = { name: names[(i + seedNum) % names.length], stars: 6 + ((i * 7 + seedNum * 5) % 38), at: '' };
    return out;
}
function sampleRewards() {
    const t = todayStr();
    return [
        { id: 'sample-rw-1', kind: 'stay', title: 'إقامة مجانية لليلتين في بيت الشباب', value: 'ليلتان لشخصين مع الإفطار', placeName: 'بيت الشباب - غرداية', wilaya: '47', minStars: 10, winners: 2, drawDate: addDays(t, 12), status: 'open', entries: sampleEntries(14, 1) },
        { id: 'sample-rw-2', kind: 'trip', title: 'رحلة استكشافية إلى الأهقار', value: '5 أيام في تمنراست مع مخيم الشباب', placeName: 'دار الشباب - تمنراست', wilaya: '11', minStars: 50, winners: 1, drawDate: addDays(t, 30), status: 'open', entries: sampleEntries(5, 3) },
        { id: 'sample-rw-3', kind: 'gear', title: 'لوحة رسم رقمية للمواهب الفنية', value: 'لوحة رسم رقمية مع قلم', placeName: 'دار الشباب - قسنطينة', wilaya: '25', minStars: 25, winners: 1, drawDate: addDays(t, 20), status: 'open', entries: sampleEntries(9, 5) },
        { id: 'sample-rw-4', kind: 'course', title: 'دورة تكوينية معتمدة في البرمجة', value: 'دورة شهرين بشهادة معتمدة', placeName: 'دار الشباب - الجزائر الوسطى', wilaya: '16', minStars: 15, winners: 3, drawDate: addDays(t, 8), status: 'open', entries: sampleEntries(18, 7) },
        { id: 'sample-rw-5', kind: 'ticket', title: 'تذاكر المهرجان الوطني للموسيقى الأندلسية', value: 'تذكرتان لحفل الافتتاح', placeName: 'دار الشباب - تلمسان', wilaya: '13', minStars: 5, winners: 2, drawDate: addDays(t, -9), status: 'drawn', entries: sampleEntries(11, 9),
          result: { at: addDays(t, -9) + 'T18:00:00.000Z', seed: '4f1c9a7e2b08d35c6e91f0a4b27d58c3e6a90f12d4b7c8e5a3f6019b2c7d4e8a', pool: 245,
                    winners: [{ uid: 'sample-u12', name: 'أنس م.', stars: 31 }, { uid: 'sample-u17', name: 'نسرين ل.', stars: 22 }] } }
    ].map(r => ({ ...r, sample: true, description: 'مكافأة نموذجية لتوضيح طريقة العمل: تظهر المكافآت الحقيقية التي تضيفها دور الشباب هنا.' }));
}
function getRewards() { return allRewards.length ? allRewards : sampleRewards(); }
function findReward(id) { return getRewards().find(r => r.id === id) || null; }

// ---------- التحميل ----------
function loadRewards() {
    if (rewardsLoaded) return;
    rewardsLoaded = true;
    database.ref('rewards').on('value', s => {
        allRewards = snapToList(s).sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || String(a.drawDate || '').localeCompare(String(b.drawDate || '')));
        refreshYouthViews();
    }, err => { rewardsLoaded = false; console.warn('rewards:', err.message); });
}
function loadMyCharity() {
    if (!currentUser || charityLoaded) return;
    charityLoaded = true;
    database.ref('charity').orderByChild('uid').equalTo(currentUser.uid).on('value', s => {
        myCharity = snapToList(s).sort(byNewest);
        refreshYouthViews();
    }, err => { charityLoaded = false; console.warn('charity:', err.message); });
}
function loadAdminStarsData() {
    if (selectedRole !== 'admin') return;
    if (!adminCharityLoaded) {
        adminCharityLoaded = true;
        database.ref('charity').on('value', s => { allCharity = snapToList(s).sort(byNewest); refreshYouthViews(); },
            err => { adminCharityLoaded = false; console.warn('charity(admin):', err.message); });
    }
    if (!allCertsLoaded) {
        allCertsLoaded = true;
        database.ref('certificates').on('value', s => { allCertsAdmin = snapToList(s); refreshYouthViews(); },
            err => { allCertsLoaded = false; console.warn('certificates(admin):', err.message); });
    }
}

// ---------- النجوم في الهيدر ----------
function updateStarsBadges(st) {
    const n = st ? st.stars : 0;
    document.querySelectorAll('.js-my-stars').forEach(el => { el.textContent = n; });
}

// ---------- صفحة النجوم والمكافآت ----------
function myStarsNow() { return window.myStats ? window.myStats.stars : (Number(currentUserData?.stars) || 0); }

function rewardChance(r, stars) {
    const entries = Object.entries(r.entries || {});
    const mine = currentUser && r.entries && r.entries[currentUser.uid];
    const others = entries.filter(([uid]) => !currentUser || uid !== currentUser.uid).reduce((s, [, e]) => s + (Number(e.stars) || 0), 0);
    const me = mine ? Number(mine.stars) || stars : stars;
    if (!me) return 0;
    const total = others + me;
    return Math.min(100, Math.round(me / total * (Number(r.winners) || 1) * 100));
}

function countdownLabel(date) {
    const d = nightsBetween(todayStr(), date);
    if (d < 0) return 'انتهى';
    if (d === 0) return 'السحب اليوم';
    if (d === 1) return 'السحب غداً';
    return `بعد ${d} ${d <= 10 ? 'أيام' : 'يوماً'}`;
}

function rewardCard(r) {
    const k = REWARD_KINDS[r.kind] || REWARD_KINDS.other;
    const stars = currentUser ? myStarsNow() : 0;
    const entries = Object.keys(r.entries || {}).length;
    const mine = currentUser && r.entries && r.entries[currentUser.uid];
    const drawn = r.status === 'drawn';
    const enough = stars >= (Number(r.minStars) || 0);
    const chance = rewardChance(r, stars);
    const isWinner = drawn && currentUser && (r.result?.winners || []).some(w => w.uid === currentUser.uid);
    let action;
    if (drawn) action = `<button class="btn btn-outline btn-small" onclick="openDrawProof('${esc(r.id)}')"><i class="fas fa-scale-balanced"></i> الفائزون ونزاهة السحب</button>`;
    else if (selectedRole === 'admin' && !r.sample) action = `<button class="btn btn-primary btn-small" onclick="runDraw('${esc(r.id)}')"><i class="fas fa-shuffle"></i> إجراء السحب (${entries})</button>
        <button class="icon-btn" title="تعديل" onclick="openRewardForm('${esc(r.id)}')"><i class="fas fa-pen"></i></button>`;
    else if (mine) action = `<button class="btn btn-success btn-small" disabled><i class="fas fa-circle-check"></i> أنت في السحب</button>`;
    else if (!currentUser) action = `<button class="btn btn-primary btn-small" onclick="enterDraw('${esc(r.id)}')"><i class="fas fa-ticket"></i> ادخل السحب</button>`;
    else if (!enough) action = `<button class="btn btn-outline btn-small" onclick="showStarsGuide()"><i class="fas fa-lock"></i> تحتاج ${Number(r.minStars) - stars} نجوم أخرى</button>`;
    else action = `<button class="btn btn-primary btn-small" onclick="enterDraw('${esc(r.id)}')"><i class="fas fa-ticket"></i> ادخل السحب</button>`;
    return `
        <article class="rw-card ${drawn ? 'drawn' : ''} ${isWinner ? 'won' : ''}" style="--c:${k.color}">
            <div class="rw-cover">
                <span class="rw-ico"><i class="fas ${k.icon}"></i></span>
                <span class="rw-kind">${k.label}</span>
                ${r.sample ? '<span class="tal-flag">نموذج</span>' : ''}
                <span class="rw-min" title="الحد الأدنى من النجوم" dir="ltr">${Number(r.minStars) || 0}+ <i class="fas fa-star"></i></span>
            </div>
            <div class="rw-body">
                <h4>${esc(r.title)}</h4>
                <p class="muted small">${esc(r.value || '')}</p>
                <p class="muted small"><i class="fas fa-location-dot"></i> ${esc(r.placeName || 'كل دور الشباب')}</p>
                <div class="rw-meta">
                    <span><i class="fas fa-trophy"></i> ${Number(r.winners) || 1} ${Number(r.winners) > 1 ? 'فائزين' : 'فائز'}</span>
                    <span><i class="fas fa-users"></i> ${entries} مشارك</span>
                    <span><i class="fas fa-calendar"></i> ${drawn ? 'تم السحب' : countdownLabel(r.drawDate)}</span>
                </div>
                ${isWinner ? '<p class="rw-won"><i class="fas fa-crown"></i> مبروك! أنت من الفائزين، ستتواصل معك الدار.</p>' : ''}
                ${!drawn && currentUser && selectedRole !== 'admin' ? `
                    <div class="rw-chance"><span>فرصتك ${mine ? '' : 'إن دخلت '}≈ <b>${enough || mine ? chance : 0}%</b></span><div class="tm-bar"><span style="width:${enough || mine ? chance : 0}%"></span></div></div>` : ''}
                ${drawn && r.result ? `<p class="rw-winners"><i class="fas fa-crown"></i> ${(r.result.winners || []).map(w => esc(w.name)).join('، ') || 'لا فائز'}</p>` : ''}
                <div class="rw-actions">${action}</div>
            </div>
        </article>`;
}

function renderRewardsPage() {
    const me = document.getElementById('rw-me');
    if (!me) return;
    if (currentUser && selectedRole !== 'admin') {
        const st = window.myStats || statsFrom(myCerts, [], null);
        me.innerHTML = tierMeterHTML(st.stars) + `
            <div class="rw-earned">
                <div><b>${st.partCerts}</b><span>مشاركات</span></div>
                <div><b>${st.hours}</b><span>ساعات تطوع</span></div>
                <div><b>${st.charityCerts}</b><span>أعمال خيرية</span></div>
                <div><b>${st.talents}</b><span>مواهب</span></div>
            </div>`;
    } else if (selectedRole === 'admin') {
        me.innerHTML = `<div class="notice"><i class="fas fa-gift"></i><div><b>مكافآت دور الشباب</b> أضف مكافأة (إقامة، رحلة، عتاد، تكوين...) وحدّد الحد الأدنى من النجوم وتاريخ السحب. عند السحب تُحسب نجوم كل مشارك من شهاداته الموثّقة، وكل نجمة تساوي فرصة.</div></div>`;
    } else {
        me.innerHTML = `<div class="vol-hero"><div class="vh-guest"><b>اجمع النجوم واربح مكافآت قيّمة</b><span>كل مشاركة وكل ساعة تطوع وكل عمل خيري موثّق يمنحك نجوماً. كلما زادت نجومك زادت فرصتك في السحب.</span></div>
            <div class="vh-actions"><button class="btn hero-btn" onclick="askLogin()"><i class="fas fa-right-to-bracket"></i> سجّل وابدأ</button></div></div>`;
    }
    const list = getRewards();
    const open = list.filter(r => r.status !== 'drawn');
    const done = list.filter(r => r.status === 'drawn');
    document.getElementById('rw-add').style.display = selectedRole === 'admin' ? '' : 'none';
    document.getElementById('rw-list').innerHTML = open.length ? open.map(rewardCard).join('')
        : emptyState('fa-gift', 'لا توجد سحوبات مفتوحة حالياً', selectedRole === 'admin' ? '<button class="btn btn-primary btn-small" onclick="openRewardForm()"><i class="fas fa-plus"></i> أضف مكافأة</button>' : '');
    document.getElementById('rw-done').innerHTML = done.length ? done.map(rewardCard).join('') : emptyState('fa-trophy', 'لم يُجرَ أي سحب بعد');
    document.getElementById('rw-rules').innerHTML = starsRulesHTML();
}

function starsRulesHTML() {
    const rows = [
        ['fa-calendar-check', 'حضور فعالية', STAR_RULES.event],
        ['fa-users', 'الانخراط في نادٍ', STAR_RULES.club],
        ['fa-hand-holding-heart', 'مهمة تطوع (ونجمة إضافية لكل ساعتين)', STAR_RULES.volunteer],
        ['fa-hand-holding-dollar', 'عمل خيري موثّق', STAR_RULES.charity],
        ['fa-palette', 'موهبة منشورة في المعرض (ونجمة إن مُيّزت)', STAR_RULES.talent],
        ['fa-award', 'شهادة تقدير من الدار', STAR_RULES.honor]
    ];
    return `<div class="rules-list">${rows.map(([i, l, n]) => `<div class="rule-row"><span class="mini-ico" style="--c:#f4b41b"><i class="fas ${i}"></i></span><span>${l}</span><b dir="ltr">+${n} <i class="fas fa-star"></i></b></div>`).join('')}</div>
        <div class="tiers-row">${TIERS.map(t => `<div class="tier-box" style="--c:${t.color}"><i class="fas ${t.icon}"></i><b>${t.label}</b><small>${t.min}+ نجمة</small><span>${t.perk}</span></div>`).join('')}</div>
        <p class="muted small fair-note"><i class="fas fa-shield-halved"></i> النجوم تُحسب فقط من الشهادات التي يصدرها مسيّرو دور الشباب، والسحب يعيد حسابها من الشهادات، ثم ينشر بذرة السحب وقائمة المشاركين ليتحقق منها الجميع.</p>`;
}

// بطاقة الرئيسية: المستوى وأقرب السحوبات
function renderHomeRewards() {
    const box = document.getElementById('home-rewards');
    if (!box) return;
    const st = currentUser && selectedRole !== 'admin' ? (window.myStats || null) : null;
    const open = getRewards().filter(r => r.status !== 'drawn').slice(0, 3);
    box.innerHTML = (st ? tierMeterHTML(st.stars) : '') + `<div class="mini-list">${open.map(r => {
        const k = REWARD_KINDS[r.kind] || REWARD_KINDS.other;
        const ok = st && st.stars >= (Number(r.minStars) || 0);
        return `<div class="mini-row" onclick="switchTab('rewards')">
            <span class="mini-ico" style="--c:${k.color}"><i class="fas ${k.icon}"></i></span>
            <div class="mini-info"><b>${esc(r.title)}</b><small>${Number(r.minStars) || 0}+ نجمة · ${esc(countdownLabel(r.drawDate))}${r.sample ? ' · نموذج' : ''}</small></div>
            <span class="mini-side">${!st ? '<i class="fas fa-chevron-left"></i>' : ok ? `≈ ${rewardChance(r, st.stars)}%` : '<i class="fas fa-lock"></i>'}</span></div>`;
    }).join('') || emptyState('fa-gift', 'لا توجد سحوبات مفتوحة حالياً')}</div>`;
}

function showStarsGuide() {
    switchTab('rewards');
    setTimeout(() => document.getElementById('rw-rules')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
}

function enterDraw(id) {
    const r = findReward(id);
    if (!r) return;
    if (r.sample) return showToast('🎯 هذه مكافأة نموذجية للعرض، ستُفعَّل السحوبات مع مكافآت دور الشباب الحقيقية', 'info');
    if (!requireLogin()) return;
    const stars = myStarsNow();
    if (stars < (Number(r.minStars) || 0)) return showToast(`⭐ تحتاج ${r.minStars} نجمة على الأقل لدخول هذا السحب`, 'info');
    if (!stars) return showToast('⭐ اجمع أول نجمة من فعالية أو تطوع لتدخل السحب', 'info');
    database.ref(`rewards/${id}/entries/${currentUser.uid}`).set({
        name: currentUserData?.name || currentUser.displayName || '', stars, at: new Date().toISOString()
    }).then(() => showToast(`🎟️ دخلت السحب بـ ${stars} نجمة. بالتوفيق!`))
      .catch(err => showToast('❌ ' + err.message, 'error'));
}

// ---------- إدارة المكافآت (المدير) ----------
function openRewardForm(id) {
    if (selectedRole !== 'admin') return;
    editingRewardId = id || null;
    const r = id ? allRewards.find(x => x.id === id) : null;
    document.getElementById('rw-form-title').textContent = r ? 'تعديل المكافأة' : 'مكافأة جديدة';
    document.getElementById('rwf-kind').innerHTML = Object.entries(REWARD_KINDS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    document.getElementById('rwf-place').innerHTML = '<option value="">كل دور الشباب (وطنية)</option>' + facilityOptions(sortFacilities(getFacilities().slice(), false));
    document.getElementById('rwf-kind').value = r?.kind || 'stay';
    document.getElementById('rwf-title').value = r?.title || '';
    document.getElementById('rwf-value').value = r?.value || '';
    document.getElementById('rwf-desc').value = r?.description || '';
    document.getElementById('rwf-min').value = r?.minStars ?? 10;
    document.getElementById('rwf-winners').value = r?.winners ?? 1;
    document.getElementById('rwf-date').value = r?.drawDate || addDays(todayStr(), 14);
    document.getElementById('rwf-place').value = r?.placeId || '';
    document.getElementById('rwf-delete').style.display = r ? '' : 'none';
    document.getElementById('rewardFormModal').classList.add('active');
}

function saveReward() {
    if (selectedRole !== 'admin') return;
    const title = document.getElementById('rwf-title').value.trim();
    if (title.length < 3) return showToast('❌ أدخل اسم المكافأة', 'error');
    const placeId = document.getElementById('rwf-place').value;
    const f = findFacility(placeId);
    const data = {
        kind: document.getElementById('rwf-kind').value,
        title, value: document.getElementById('rwf-value').value.trim(),
        description: document.getElementById('rwf-desc').value.trim(),
        minStars: Math.max(0, parseInt(document.getElementById('rwf-min').value) || 0),
        winners: Math.max(1, Math.min(20, parseInt(document.getElementById('rwf-winners').value) || 1)),
        drawDate: document.getElementById('rwf-date').value || addDays(todayStr(), 14),
        placeId: placeId || '', placeName: f ? f.name : '', wilaya: f ? (f.wilaya || '') : ''
    };
    const ref = editingRewardId ? database.ref('rewards/' + editingRewardId) : database.ref('rewards').push();
    const full = editingRewardId ? data : { ...data, status: 'open', createdBy: currentUser.uid, createdAt: new Date().toISOString() };
    showLoading();
    (editingRewardId ? ref.update(full) : ref.set(full)).then(() => {
        hideLoading();
        closeModal('rewardFormModal');
        showToast(editingRewardId ? '✅ حُدّثت المكافأة' : '🎁 أُضيفت المكافأة وفُتح السحب');
    }).catch(err => { hideLoading(); showToast('❌ ' + err.message, 'error'); });
}

function deleteReward() {
    if (selectedRole !== 'admin' || !editingRewardId || !confirm('⚠️ حذف هذه المكافأة وكل المشاركات فيها؟')) return;
    database.ref('rewards/' + editingRewardId).remove().then(() => { closeModal('rewardFormModal'); showToast('✅ حُذفت المكافأة'); })
        .catch(err => showToast('❌ ' + err.message, 'error'));
}

// ---------- السحب الشفاف ----------
async function sha256Hex(str) {
    if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
    }
    // احتياطي في المتصفحات القديمة (FNV-1a مكرر)
    let out = '';
    for (let k = 0; k < 8; k++) {
        let h = 0x811c9dc5 ^ k;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
        out += h.toString(16).padStart(8, '0');
    }
    return out;
}

// اختيار موزون حسب النجوم بدون تكرار، قابل لإعادة الحساب من البذرة وقائمة المشاركين
async function pickWinners(entrants, seed, n) {
    const pool = entrants.filter(e => e.stars > 0).sort((a, b) => a.uid.localeCompare(b.uid)).map(e => ({ ...e }));
    const winners = [];
    for (let k = 0; k < n && pool.length; k++) {
        const h = await sha256Hex(seed + ':' + k);
        const r = parseInt(h.slice(0, 12), 16) / 281474976710656; // 2^48
        const total = pool.reduce((s, e) => s + e.stars, 0);
        let x = r * total, idx = 0;
        for (; idx < pool.length - 1; idx++) { x -= pool[idx].stars; if (x < 0) break; }
        winners.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return winners;
}

async function verifiedStars(uid) {
    const s = await database.ref('certificates').orderByChild('uid').equalTo(uid).once('value');
    const certs = snapToList(s);
    const tals = allTalents.filter(t => t.uid === uid && t.status === 'approved');
    return certs.reduce((n, c) => n + certStars(c), 0) + tals.reduce((n, t) => n + talentStars(t), 0);
}

async function runDraw(id) {
    if (selectedRole !== 'admin') return;
    const r = allRewards.find(x => x.id === id);
    if (!r || r.status === 'drawn') return;
    const raw = Object.entries(r.entries || {});
    if (!raw.length) return showToast('لا يوجد مشاركون في هذا السحب بعد', 'info');
    if (!confirm(`إجراء سحب «${r.title}» بين ${raw.length} مشارك؟ لا يمكن إعادة السحب بعد ذلك.`)) return;
    openDrawStage(r, raw.map(([uid, e]) => e.name || uid));
    try {
        const entrants = [];
        for (const [uid, e] of raw) {
            const stars = await verifiedStars(uid);
            if (stars >= (Number(r.minStars) || 0) && stars > 0) entrants.push({ uid, name: e.name || '', stars });
        }
        const at = new Date().toISOString();
        const basis = `${id}|${at}|` + entrants.slice().sort((a, b) => a.uid.localeCompare(b.uid)).map(e => `${e.uid}:${e.stars}`).join(',');
        const seed = await sha256Hex(basis);
        const winners = await pickWinners(entrants, seed, Number(r.winners) || 1);
        const result = { at, seed, pool: entrants.reduce((s, e) => s + e.stars, 0), entrants, winners };
        await database.ref('rewards/' + id).update({ status: 'drawn', result });
        winners.forEach(w => sendNotification(w.uid, '🏆 مبروك! ربحت في السحب', `فزت بـ «${r.title}»${r.placeName ? ' من ' + r.placeName : ''}. ستتواصل معك الدار لتسليم المكافأة.`));
        setTimeout(() => revealDraw({ ...r, status: 'drawn', result }), 1800);
    } catch (err) {
        closeModal('drawModal');
        showToast('❌ ' + err.message, 'error');
    }
}

function openDrawStage(r, names) {
    const body = document.getElementById('draw-body');
    body.innerHTML = `
        <div class="draw-stage">
            <span class="rw-ico big"><i class="fas ${(REWARD_KINDS[r.kind] || REWARD_KINDS.other).icon}"></i></span>
            <h3>${esc(r.title)}</h3>
            <div class="draw-roller" id="draw-roller">...</div>
            <p class="muted small">جارٍ التحقق من نجوم المشاركين من الشهادات الموثّقة ثم السحب...</p>
        </div>`;
    document.getElementById('drawModal').classList.add('active');
    let i = 0;
    clearInterval(window._drawTimer);
    window._drawTimer = setInterval(() => {
        const el = document.getElementById('draw-roller');
        if (!el) return clearInterval(window._drawTimer);
        el.textContent = names[i++ % names.length] || '...';
    }, 90);
}

function revealDraw(r) {
    clearInterval(window._drawTimer);
    renderDrawProof(r, true);
}

function openDrawProof(id) {
    const r = findReward(id);
    if (!r || !r.result) return;
    renderDrawProof(r, false);
    document.getElementById('drawModal').classList.add('active');
}

function renderDrawProof(r, celebrate) {
    const res = r.result;
    const entrants = res.entrants || Object.entries(r.entries || {}).map(([uid, e]) => ({ uid, name: e.name, stars: Number(e.stars) || 0 }));
    const pool = res.pool || entrants.reduce((s, e) => s + e.stars, 0) || 1;
    const winIds = new Set((res.winners || []).map(w => w.uid));
    document.getElementById('draw-body').innerHTML = `
        <div class="draw-stage ${celebrate ? 'celebrate' : ''}">
            <span class="rw-ico big"><i class="fas fa-crown"></i></span>
            <h3>${esc(r.title)}</h3>
            <div class="draw-winners">${(res.winners || []).map(w => `<div class="dw"><i class="fas fa-trophy"></i><b>${esc(w.name)}</b><small>${w.stars} نجمة · فرصة ${Math.round(w.stars / pool * 100)}%</small></div>`).join('') || '<p class="muted">لا يوجد مشارك مؤهل</p>'}</div>
        </div>
        <div class="fd-section">
            <h4><i class="fas fa-scale-balanced"></i> نزاهة السحب</h4>
            <p class="muted small">كل نجمة موثّقة تساوي فرصة واحدة. البذرة = SHA-256 لـ (رقم المكافأة | وقت السحب | قائمة المشاركين ونجومهم)، ثم يُختار الفائز بالترتيب حسب البذرة. يمكن لأي أحد إعادة الحساب والتأكد.</p>
            <div class="proof-box"><small>وقت السحب</small><b dir="ltr">${esc(res.at || '')}</b><small>البذرة</small><b dir="ltr" class="seed">${esc(res.seed || '')}</b></div>
            <div class="proof-list">${entrants.sort((a, b) => b.stars - a.stars).map(e => `
                <div class="proof-row ${winIds.has(e.uid) ? 'win' : ''}"><span>${esc(e.name || '')}</span><span>${e.stars} <i class="fas fa-star"></i></span><span>${Math.round(e.stars / pool * 100)}%</span></div>`).join('')}</div>
            ${!r.sample && res.entrants ? `<button class="btn btn-outline btn-small" onclick="recheckDraw('${esc(r.id)}')"><i class="fas fa-rotate"></i> أعد الحساب للتحقق</button><span id="recheck-out" class="muted small"></span>` : ''}
        </div>`;
}

async function recheckDraw(id) {
    const r = findReward(id);
    if (!r || !r.result || !r.result.entrants) return;
    const res = r.result;
    const basis = `${id}|${res.at}|` + res.entrants.slice().sort((a, b) => a.uid.localeCompare(b.uid)).map(e => `${e.uid}:${e.stars}`).join(',');
    const seed = await sha256Hex(basis);
    const winners = await pickWinners(res.entrants, seed, (res.winners || []).length || Number(r.winners) || 1);
    const ok = seed === res.seed && winners.map(w => w.uid).join() === (res.winners || []).map(w => w.uid).join();
    document.getElementById('recheck-out').innerHTML = ok ? ' <span class="txt-ok"><i class="fas fa-circle-check"></i> النتيجة مطابقة</span>' : ' <span class="txt-off"><i class="fas fa-circle-xmark"></i> النتيجة غير مطابقة</span>';
}

// ---------- الأعمال الخيرية ----------
function openCharityForm() {
    if (!requireLogin()) return;
    document.getElementById('ch-kind').innerHTML = Object.entries(CHARITY_KINDS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    document.getElementById('ch-place').innerHTML = '<option value="">اختر دار الشباب التي تؤكد العمل</option>' + facilityOptions(sortFacilities(getFacilities().slice(), false));
    ['ch-title', 'ch-desc'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('ch-date').value = todayStr();
    document.getElementById('ch-date').max = todayStr();
    document.getElementById('ch-file').value = '';
    document.getElementById('charityModal').classList.add('active');
}

async function submitCharity() {
    if (!requireLogin()) return;
    const kind = document.getElementById('ch-kind').value;
    const title = document.getElementById('ch-title').value.trim() || CHARITY_KINDS[kind].label;
    const placeId = document.getElementById('ch-place').value;
    const date = document.getElementById('ch-date').value;
    const description = document.getElementById('ch-desc').value.trim();
    const file = document.getElementById('ch-file').files[0];
    if (!placeId) return showToast('❌ اختر دار الشباب التي يمكنها تأكيد هذا العمل', 'error');
    if (!date) return showToast('❌ حدّد تاريخ العمل', 'error');
    if (description.length < 10) return showToast('❌ صف العمل الخيري في سطر على الأقل', 'error');
    if (file && (!/^image\//.test(file.type) || file.size > 5 * 1024 * 1024)) return showToast('❌ اختر صورة أقل من 5 ميغابايت', 'error');
    const f = findFacility(placeId);
    showLoading();
    try {
        let proofUrl = '';
        if (file) {
            const snap = await storage.ref(`charity/${currentUser.uid}/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`).put(file);
            proofUrl = await snap.ref.getDownloadURL();
        }
        await database.ref('charity').push({
            uid: currentUser.uid, userName: currentUserData?.name || currentUser.displayName || '', kind, title, date, description, proofUrl,
            placeId, placeName: f?.name || '', wilaya: f?.wilaya || '', status: 'pending', createdAt: new Date().toISOString()
        });
        hideLoading();
        closeModal('charityModal');
        showToast('💚 أُرسل عملك الخيري لتأكيده من الدار، وستصلك شهادة و3 نجوم بعد التأكيد');
        sendNotificationToAdmins('💚 عمل خيري للتأكيد', `${currentUserData?.name || ''}: «${title}» (${f?.name || ''})`);
    } catch (err) { hideLoading(); showToast('❌ ' + err.message, 'error'); }
}

function renderMyCharity() {
    const box = document.getElementById('my-charity');
    if (!box) return;
    box.innerHTML = myCharity.length ? myCharity.map(c => {
        const k = CHARITY_KINDS[c.kind] || CHARITY_KINDS.other;
        return `<div class="req-card compact">
            <div class="req-top"><div><b><i class="fas ${k.icon}"></i> ${esc(c.title)}</b><small>${esc(c.placeName || '')} · ${esc(formatDateAr(c.date))}</small></div>
            ${statusChip(c.status === 'approved' ? 'accepted' : c.status)}</div>
            ${c.rejectReason ? `<p class="req-notes bad">${esc(c.rejectReason)}</p>` : ''}
            ${c.certId ? `<button class="link-btn" onclick="showCertificate('${esc(c.certId)}')"><i class="fas fa-certificate"></i> الشهادة</button>` : ''}
        </div>`;
    }).join('') : emptyState('fa-hand-holding-dollar', 'لم تسجّل أي عمل خيري بعد', '<small>تبرعت بالدم؟ شاركت في قفة رمضان أو حملة تشجير؟ سجّله لتؤكده الدار.</small>');
}

function adminCharityCard(c) {
    const k = CHARITY_KINDS[c.kind] || CHARITY_KINDS.other;
    return `
        <div class="req-card">
            <div class="req-top">
                <div class="tal-admin-head">
                    ${c.proofUrl ? `<img class="tal-thumb" src="${esc(c.proofUrl)}" alt="">` : `<span class="tal-thumb" style="--c:#ef4444"><i class="fas ${k.icon}"></i></span>`}
                    <div><b>${esc(c.title)}</b><small>${esc(c.userName)} · ${k.label}</small></div>
                </div>
                ${statusChip(c.status === 'approved' ? 'accepted' : c.status)}
            </div>
            <div class="req-meta">
                <span><i class="fas fa-calendar"></i> ${esc(formatDateAr(c.date))}</span>
                <span><i class="fas fa-house-chimney-user"></i> ${esc(c.placeName || '')}</span>
            </div>
            ${c.description ? `<p class="req-notes">${esc(c.description)}</p>` : ''}
            ${c.rejectReason ? `<p class="req-notes bad">${esc(c.rejectReason)}</p>` : ''}
            <div class="req-actions">
                ${c.status === 'pending' ? `
                    <button class="btn btn-success btn-small" onclick="decideCharity('${c.id}', 'approved')"><i class="fas fa-check"></i> تأكيد ومنح الشهادة</button>
                    <button class="btn btn-danger btn-small" onclick="decideCharity('${c.id}', 'rejected')"><i class="fas fa-times"></i> رفض</button>` : ''}
                ${c.certId ? `<button class="btn btn-outline btn-small" onclick="openVerifyView('${esc(c.certId)}')"><i class="fas fa-certificate"></i></button>` : ''}
                <button class="btn btn-outline btn-small" title="ملف العضو" onclick="openMemberProfile('${esc(c.uid)}')"><i class="fas fa-id-card"></i></button>
            </div>
        </div>`;
}

function decideCharity(id, status) {
    if (selectedRole !== 'admin') return;
    const c = allCharity.find(x => x.id === id);
    if (!c) return;
    let reason = '';
    if (status === 'rejected') {
        reason = prompt('سبب الرفض (سيصل إلى صاحب الطلب):');
        if (reason === null) return;
        reason = reason.trim();
    }
    showLoading();
    const done = certId => database.ref('charity/' + id).update({ status, decidedAt: new Date().toISOString(), decidedBy: currentUser.uid, ...(reason ? { rejectReason: reason } : {}), ...(certId ? { certId } : {}) });
    const p = status === 'approved'
        ? issueSingleCertificate({ uid: c.uid, userName: c.userName, type: 'charity', title: c.title, placeId: c.placeId, placeName: c.placeName, wilaya: c.wilaya, date: c.date, charityId: id }).then(cert => done(cert.id))
        : done().then(() => sendNotification(c.uid, 'ℹ️ لم يُؤكَّد العمل الخيري', `«${c.title}»${reason ? ': ' + reason : ''}`));
    p.then(() => { hideLoading(); showToast(status === 'approved' ? '💚 أُكّد العمل وصدرت الشهادة' : 'تم الرفض', status === 'approved' ? 'success' : 'info'); })
     .catch(err => { hideLoading(); showToast('❌ ' + err.message, 'error'); });
}

// ---------- أعضاء دور الشباب (المدير) ----------
function memberStats(uid) {
    const certs = allCertsAdmin.filter(c => c.uid === uid);
    const tals = allTalents.filter(t => t.uid === uid && t.status === 'approved');
    return { certs, tals, st: statsFrom(certs, tals, null) };
}

function memberPlaces(uid) {
    const ids = new Set();
    allMemberships.filter(m => m.userId === uid && m.status === 'accepted').forEach(m => ids.add(m.placeId));
    allCertsAdmin.filter(c => c.uid === uid).forEach(c => c.placeId && ids.add(c.placeId));
    return ids;
}

function renderMembers() {
    if (selectedRole !== 'admin') return;
    const sel = document.getElementById('mb-place');
    if (sel && !sel.dataset.filled) { sel.innerHTML = '<option value="">كل دور الشباب</option>' + facilityOptions(sortFacilities(getFacilities().slice(), false)); sel.dataset.filled = '1'; sel.value = membersFilter.place; }
    const q = membersFilter.q.trim().toLowerCase();
    let list = allUsersAdmin.filter(u => u.role !== 'admin').map(u => ({ u, ...memberStats(u.id) }));
    if (membersFilter.place) list = list.filter(x => memberPlaces(x.u.id).has(membersFilter.place));
    if (q) list = list.filter(x => [x.u.name, x.u.email, x.u.phone, x.u.talents].some(v => String(v || '').toLowerCase().includes(q)));
    if (membersFilter.tier !== 'all') list = list.filter(x => tierFor(x.st.stars).id === membersFilter.tier);
    const sorters = {
        stars: (a, b) => b.st.stars - a.st.stars,
        hours: (a, b) => b.st.hours - a.st.hours,
        charity: (a, b) => b.st.charityCerts - a.st.charityCerts,
        newest: (a, b) => String(b.u.createdAt || '').localeCompare(String(a.u.createdAt || ''))
    };
    list.sort(sorters[membersFilter.sort] || sorters.stars);
    const all = allUsersAdmin.filter(u => u.role !== 'admin').map(u => memberStats(u.id).st);
    document.getElementById('mb-stats').innerHTML = [
        [all.length, 'عضو', 'fa-users', '#3b82f6'],
        [all.reduce((s, x) => s + x.stars, 0), 'نجمة موثّقة', 'fa-star', '#f4b41b'],
        [all.reduce((s, x) => s + x.hours, 0), 'ساعة تطوع', 'fa-hand-holding-heart', '#10b981'],
        [all.reduce((s, x) => s + x.charityCerts, 0), 'عمل خيري', 'fa-hand-holding-dollar', '#ef4444']
    ].map(([n, l, i, c]) => `<div class="stat-tile" style="--c:${c}"><i class="fas ${i}"></i><b>${n}</b><span>${l}</span></div>`).join('');
    document.getElementById('mb-tier-tabs').innerHTML = [['all', 'كل المستويات']].concat(TIERS.map(t => [t.id, t.label])).map(([k, l]) =>
        `<span class="filter-tab ${membersFilter.tier === k ? 'active' : ''}" onclick="membersFilter.tier='${k}'; renderMembers()">${l}</span>`).join('');
    document.getElementById('mb-list').innerHTML = list.length ? list.map(({ u, st }) => `
        <div class="member-card" onclick="openMemberProfile('${esc(u.id)}')">
            ${avatarHTML(u.name, u.photoURL, 'lg')}
            <div class="mb-info">
                <b>${esc(u.name || 'بدون اسم')}</b>
                <small>${esc(u.wilaya ? 'ولاية ' + getWilayaName(u.wilaya) : '')}</small>
                <div class="mb-line">${tierChip(st.stars)} ${starsLabel(st.stars)}</div>
            </div>
            <div class="mb-nums">
                <span title="مشاركات"><i class="fas fa-calendar-check"></i> ${st.partCerts}</span>
                <span title="ساعات تطوع"><i class="fas fa-hand-holding-heart"></i> ${st.hours}</span>
                <span title="أعمال خيرية"><i class="fas fa-hand-holding-dollar"></i> ${st.charityCerts}</span>
            </div>
        </div>`).join('') : emptyState('fa-users', 'لا يوجد أعضاء بهذه المواصفات');
}

function openMemberProfile(uid) {
    if (selectedRole !== 'admin') return openPassportView(uid);
    const u = allUsersAdmin.find(x => x.id === uid) || { id: uid, name: '' };
    const { certs, tals, st } = memberStats(uid);
    const clubs = allMemberships.filter(m => m.userId === uid);
    const books = allBookings.filter(b => b.userId === uid);
    const charity = allCharity.filter(c => c.uid === uid);
    certGroupFilter = 'all';
    window._pvCerts = certs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    document.getElementById('member-body').innerHTML = `
        <div class="mp-head">
            ${avatarHTML(u.name, u.photoURL, 'xl')}
            <div class="pp-id">
                <h2>${esc(u.name || 'بدون اسم')}</h2>
                <p class="pp-sub"><i class="fas fa-location-dot"></i> ${esc(u.wilaya ? 'ولاية ' + getWilayaName(u.wilaya) : 'غير محدد')}${u.createdAt ? ' · عضو منذ ' + esc(formatDateAr(String(u.createdAt).slice(0, 10))) : ''}</p>
                <p class="pp-sub">${u.phone ? `<a href="tel:${esc(u.phone)}" dir="ltr"><i class="fas fa-phone"></i> ${esc(u.phone)}</a>` : ''} ${u.email ? `<span dir="ltr"><i class="fas fa-envelope"></i> ${esc(u.email)}</span>` : ''}</p>
            </div>
        </div>
        ${tierMeterHTML(st.stars)}
        <div class="profile-stats four">
            <div class="stat-item"><div class="stat-value">${st.partCerts}</div><div class="stat-label">مشاركات</div></div>
            <div class="stat-item"><div class="stat-value">${st.hours}</div><div class="stat-label">ساعات تطوع</div></div>
            <div class="stat-item"><div class="stat-value">${st.charityCerts}</div><div class="stat-label">أعمال خيرية</div></div>
            <div class="stat-item"><div class="stat-value">${st.talents}</div><div class="stat-label">مواهب</div></div>
        </div>
        <div class="row-actions wrap">
            <button class="btn btn-primary" onclick="messageMember('${esc(uid)}')"><i class="fas fa-comment-dots"></i> مراسلة</button>
            <button class="btn btn-outline" onclick="openGrantCert('${esc(uid)}')"><i class="fas fa-award"></i> منح شهادة</button>
            <button class="btn btn-outline" onclick="openPassportView('${esc(uid)}')"><i class="fas fa-id-card"></i> الجواز العام</button>
        </div>
        ${u.talents ? `<div class="pp-talents">${splitList(u.talents).map(t => `<span class="talent-tag">${esc(t)}</span>`).join('')}</div>` : ''}
        <h4 class="sub-title"><i class="fas fa-certificate"></i> المشاركات والتطوع والأعمال الخيرية</h4>
        <div id="pv-certs">${certs.length ? certGroupsHTML(certs, 'public') : '<p class="muted small">لا توجد شهادات بعد</p>'}</div>
        ${charity.filter(c => c.status === 'pending').length ? `<p class="notice small"><i class="fas fa-hourglass-half"></i> ${charity.filter(c => c.status === 'pending').length} عمل خيري ينتظر التأكيد في «الطلبات».</p>` : ''}
        <h4 class="sub-title"><i class="fas fa-masks-theater"></i> النوادي</h4>
        <div class="req-list">${clubs.length ? clubs.map(m => `<div class="req-card compact"><div class="req-top"><div><b>${esc(m.club)}</b><small>${esc(m.placeName)}</small></div>${statusChip(m.status)}</div></div>`).join('') : '<p class="muted small">لا انخراطات</p>'}</div>
        <h4 class="sub-title"><i class="fas fa-bed"></i> الإقامات</h4>
        <p class="muted small">${books.length ? `${books.length} طلب حجز، منها ${books.filter(b => b.status === 'confirmed').length} مؤكدة` : 'لا حجوزات'}</p>
        ${tals.length ? `<h4 class="sub-title"><i class="fas fa-palette"></i> المواهب المنشورة</h4><div class="tal-grid compact">${tals.map(t => talentCard(t)).join('')}</div>` : ''}`;
    document.getElementById('memberModal').classList.add('active');
}

function openGrantCert(uid) {
    if (selectedRole !== 'admin') return;
    const u = allUsersAdmin.find(x => x.id === uid);
    document.getElementById('gc-uid').value = uid;
    document.getElementById('gc-name').textContent = u?.name || '';
    document.getElementById('gc-type').innerHTML = ['honor', 'volunteer', 'charity', 'event'].map(k => `<option value="${k}">${CERT_TYPES[k].label}</option>`).join('');
    document.getElementById('gc-place').innerHTML = facilityOptions(sortFacilities(getFacilities().slice(), false));
    const home = Array.from(memberPlaces(uid))[0];
    if (home) document.getElementById('gc-place').value = home;
    document.getElementById('gc-title').value = '';
    document.getElementById('gc-hours').value = 3;
    document.getElementById('gc-date').value = todayStr();
    toggleGrantHours();
    document.getElementById('grantCertModal').classList.add('active');
}
function toggleGrantHours() {
    document.getElementById('gc-hours-wrap').style.display = document.getElementById('gc-type').value === 'volunteer' ? '' : 'none';
}
function grantCertificate() {
    if (selectedRole !== 'admin') return;
    const uid = document.getElementById('gc-uid').value;
    const u = allUsersAdmin.find(x => x.id === uid) || {};
    const type = document.getElementById('gc-type').value;
    const title = document.getElementById('gc-title').value.trim();
    if (title.length < 3) return showToast('❌ أدخل عنوان النشاط', 'error');
    const f = findFacility(document.getElementById('gc-place').value);
    showLoading();
    issueSingleCertificate({
        uid, userName: u.name || '', type, title, date: document.getElementById('gc-date').value || todayStr(),
        hours: type === 'volunteer' ? Math.max(1, Math.min(24, parseInt(document.getElementById('gc-hours').value) || 1)) : 0,
        placeId: f?.id || '', placeName: f?.name || '', wilaya: f?.wilaya || ''
    }).then(c => {
        hideLoading();
        closeModal('grantCertModal');
        showToast(`🎓 صدرت الشهادة (+${certStars(c)} ⭐)`);
        setTimeout(() => openMemberProfile(uid), 400);
    }).catch(err => { hideLoading(); showToast('❌ ' + err.message, 'error'); });
}
