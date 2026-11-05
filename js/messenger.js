// =====================================================================
// مواهب داري: المراسلة بين الشباب ودور الشباب
// conversations/{uid_placeId}: ملخص المحادثة · messages/{cid}/{id}: الرسائل
// الشاب يرى محادثاته فقط، ومسيّرو دور الشباب يرون محادثات الدور.
// =====================================================================
const CHAT_QUICK_USER = ['ما هي أوقات العمل؟', 'كيف أنخرط في نادٍ؟', 'هل توجد أماكن شاغرة للإقامة؟', 'هل تحتاجون متطوعين هذا الأسبوع؟'];

let myConvs = [], allConvs = [], convsLoaded = false;
let chatCtx = null; // { cid, uid, placeId, side, ref }
let chatMsgs = [];
let msgPlaceFilter = '';

function convId(uid, placeId) { return `${uid}_${placeId}`; }
function convList() { return selectedRole === 'admin' ? allConvs : myConvs; }
function findConv(cid) { return convList().find(c => c.id === cid) || null; }

function loadConversations() {
    if (!currentUser || convsLoaded) return;
    convsLoaded = true;
    const q = selectedRole === 'admin' ? database.ref('conversations') : database.ref('conversations').orderByChild('uid').equalTo(currentUser.uid);
    q.on('value', s => {
        const list = snapToList(s).sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
        if (selectedRole === 'admin') allConvs = list; else myConvs = list;
        updateMsgBadges();
        if (document.querySelector('.section.active')?.id === 'messages') renderConvList();
    }, err => { convsLoaded = false; console.warn('conversations:', err.message); });
}

function unreadTotal() {
    const key = selectedRole === 'admin' ? 'unreadHouse' : 'unreadUser';
    return convList().reduce((s, c) => s + (Number(c[key]) || 0), 0);
}

function updateMsgBadges() {
    const n = unreadTotal();
    ['msg-count', 'nav-msg-count', 'admin-nav-msg-count', 'dash-msg-count'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = n;
        el.style.display = n > 0 ? 'flex' : 'none';
    });
}

function timeShort(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const today = todayStr();
    const ds = toDateStr(d);
    if (ds === today) return d.toTimeString().slice(0, 5);
    if (ds === addDays(today, -1)) return 'أمس';
    return formatDateAr(ds);
}

// ---------- قائمة المحادثات ----------
function renderMessagesPage() {
    if (!currentUser) return;
    const admin = selectedRole === 'admin';
    document.getElementById('msg-title').textContent = admin ? 'رسائل الشباب' : 'الرسائل';
    document.getElementById('msg-sub').textContent = admin ? 'أسئلة الشباب وطلباتهم لدور الشباب، مع اقتراح ردود بالذكاء الاصطناعي' : 'تواصل مباشرة مع دور وبيوت الشباب';
    document.getElementById('msg-admin-tools').style.display = admin ? '' : 'none';
    document.getElementById('msg-new-lbl').textContent = admin ? 'رسالة جماعية' : 'محادثة جديدة';
    const sel = document.getElementById('msg-place');
    if (admin && sel && !sel.dataset.filled) { sel.innerHTML = '<option value="">كل دور الشباب</option>' + facilityOptions(sortFacilities(getFacilities().slice(), false)); sel.dataset.filled = '1'; }
    renderConvList();
    renderChat();
}

function renderConvList() {
    const admin = selectedRole === 'admin';
    const box = document.getElementById('conv-list');
    if (!box) return;
    let list = convList();
    if (admin && msgPlaceFilter) list = list.filter(c => c.placeId === msgPlaceFilter);
    const key = admin ? 'unreadHouse' : 'unreadUser';
    box.innerHTML = list.length ? list.map(c => {
        const f = findFacility(c.placeId);
        const t = FACILITY_TYPES[f?.type] || FACILITY_TYPES.youth;
        const unread = Number(c[key]) || 0;
        const title = admin ? (c.userName || 'شاب') : (c.placeName || f?.name || 'دار الشباب');
        const sub = admin ? (c.placeName || '') : wilayaLabel(f || {});
        return `<div class="conv-row ${chatCtx && chatCtx.cid === c.id ? 'active' : ''} ${unread ? 'unread' : ''}" onclick="openChat('${esc(c.id)}')">
            ${admin ? avatarHTML(c.userName, c.userPhoto) : `<span class="mini-ico" style="--c:${t.color}"><i class="fas ${t.icon}"></i></span>`}
            <div class="conv-info">
                <div class="conv-top"><b>${esc(title)}</b><small>${esc(timeShort(c.lastAt))}</small></div>
                <div class="conv-last"><span>${c.lastSide === (admin ? 'house' : 'user') ? '<i class="fas fa-reply"></i> ' : ''}${esc(c.lastText || '')}</span>${unread ? `<em>${unread}</em>` : ''}</div>
                ${sub ? `<small class="conv-sub">${esc(sub)}</small>` : ''}
            </div>
        </div>`;
    }).join('') : emptyState('fa-comments', admin ? 'لا توجد رسائل بعد' : 'لا توجد محادثات بعد',
        admin ? '<small>تصل هنا رسائل الشباب من التطبيق.</small>' : '<small>اسأل أي دار شباب عن النوادي والإقامة والفعاليات.</small><button class="btn btn-primary btn-small" onclick="openNewChat()"><i class="fas fa-pen-to-square"></i> محادثة جديدة</button>');
}

// ---------- فتح محادثة ----------
function openChatWith(placeId, draft) {
    if (!requireLogin()) return;
    if (selectedRole === 'admin') return showToast('ℹ️ هذه الخاصية للشباب: المسيّرون يردّون من صفحة «الرسائل»', 'info');
    const f = findFacility(placeId);
    if (!f) return;
    document.querySelectorAll('.modal.active').forEach(m => m.id ? closeModal(m.id) : m.remove());
    const cid = convId(currentUser.uid, placeId);
    switchTab('messages');
    openChat(cid, { uid: currentUser.uid, placeId, placeName: f.name });
    if (draft) { const inp = document.getElementById('chat-input'); inp.value = draft; inp.focus(); }
}

function openChat(cid, meta) {
    const c = findConv(cid);
    const admin = selectedRole === 'admin';
    if (chatCtx && chatCtx.ref) chatCtx.ref.off();
    const base = c || meta;
    if (!base) return;
    chatCtx = { cid, uid: base.uid, placeId: base.placeId, placeName: base.placeName || findFacility(base.placeId)?.name || '', userName: base.userName || '', side: admin ? 'house' : 'user' };
    chatMsgs = [];
    document.getElementById('msg-layout').classList.add('chat-open');
    chatCtx.ref = database.ref('messages/' + cid).limitToLast(200);
    chatCtx.ref.on('value', s => {
        if (!chatCtx || chatCtx.cid !== cid) return;
        chatMsgs = snapToList(s).sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
        renderChat();
        markConvRead();
    }, err => { chatMsgs = []; renderChat(); console.warn('messages:', err.message); });
    renderChat();
    renderConvList();
}

function closeChat() {
    if (chatCtx && chatCtx.ref) chatCtx.ref.off();
    chatCtx = null;
    document.getElementById('msg-layout').classList.remove('chat-open');
    renderConvList();
}

function markConvRead() {
    if (!chatCtx) return;
    const c = findConv(chatCtx.cid);
    const key = chatCtx.side === 'house' ? 'unreadHouse' : 'unreadUser';
    if (c && Number(c[key])) database.ref('conversations/' + chatCtx.cid).update({ [key]: 0 }).catch(() => {});
}

function renderChat() {
    const main = document.getElementById('chat-main');
    if (!main) return;
    if (!chatCtx) { main.innerHTML = `<div class="chat-empty"><i class="fas fa-comments"></i><p>اختر محادثة لعرضها</p></div>`; return; }
    const admin = chatCtx.side === 'house';
    const f = findFacility(chatCtx.placeId);
    const t = FACILITY_TYPES[f?.type] || FACILITY_TYPES.youth;
    let lastDay = '';
    const msgs = chatMsgs.map(m => {
        const day = String(m.at || '').slice(0, 10);
        const sep = day !== lastDay ? `<div class="chat-day">${esc(relativeDay(day) || formatDateAr(day))}</div>` : '';
        lastDay = day;
        const mine = m.side === chatCtx.side;
        return `${sep}<div class="bubble ${mine ? 'me' : 'them'}">
            ${!mine && admin ? '' : !mine ? `<small class="b-name">${esc(m.name || chatCtx.placeName)}</small>` : ''}
            <p>${esc(m.text).replace(/\n/g, '<br>')}</p><small class="b-time">${esc(String(m.at || '').slice(11, 16))}${m.broadcast ? ' · <i class="fas fa-bullhorn"></i> رسالة جماعية' : ''}</small></div>`;
    }).join('');
    const chips = admin ? houseQuickReplies(f) : CHAT_QUICK_USER;
    main.innerHTML = `
        <div class="chat-head">
            <button class="icon-btn chat-back" onclick="closeChat()" title="رجوع"><i class="fas fa-arrow-right"></i></button>
            ${admin ? avatarHTML(chatCtx.userName) : `<span class="mini-ico" style="--c:${t.color}"><i class="fas ${t.icon}"></i></span>`}
            <div class="chat-who"><b>${esc(admin ? chatCtx.userName || 'شاب' : chatCtx.placeName)}</b><small>${esc(admin ? chatCtx.placeName : (f ? wilayaLabel(f) + (f.phone ? ' · ' + f.phone : '') : ''))}</small></div>
            <button class="icon-btn" title="${admin ? 'ملف العضو' : 'صفحة الدار'}" onclick="${admin ? `openMemberProfile('${esc(chatCtx.uid)}')` : `openFacility('${esc(chatCtx.placeId)}')`}"><i class="fas ${admin ? 'fa-id-card' : 'fa-circle-info'}"></i></button>
        </div>
        <div class="chat-msgs" id="chat-msgs">${msgs || `<div class="chat-hello"><i class="fas fa-hand-sparkles"></i><p>${admin ? 'ابدأ المحادثة مع هذا الشاب' : `اكتب سؤالك إلى ${esc(chatCtx.placeName)}، وسيردّ عليك المسيّرون هنا.`}</p></div>`}</div>
        <div class="chat-chips">
            ${admin ? `<button class="chip-btn ai" onclick="aiSuggestReply()"><i class="fas fa-wand-magic-sparkles"></i> اقترح رداً</button>` : ''}
            ${chips.map(q => `<button class="chip-btn" onclick="useChatChip(this)">${esc(q)}</button>`).join('')}
        </div>
        <div class="chat-input">
            <textarea id="chat-input" rows="1" maxlength="1000" placeholder="اكتب رسالة..." onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendChat();}" oninput="this.style.height='auto'; this.style.height=Math.min(this.scrollHeight, 120)+'px'"></textarea>
            <button class="send-btn" onclick="sendChat()" title="إرسال"><i class="fas fa-paper-plane"></i></button>
        </div>`;
    const box = document.getElementById('chat-msgs');
    box.scrollTop = box.scrollHeight;
}

function houseQuickReplies(f) {
    const hours = f && f.openTime ? `أوقات العمل من ${f.openTime} إلى ${f.closeTime || ''}${f.closedDay ? '، والغلق يوم ' + f.closedDay : ''}.` : 'أوقات العمل من 08:30 إلى 17:00.';
    return ['مرحباً بك! كيف يمكننا مساعدتك؟', hours, 'يمكنك طلب الانخراط من صفحة الدار في التطبيق، ثم نؤكد لك المواعيد.', 'تم استلام طلبك، ننتظرك في الدار.'];
}

function useChatChip(btn) {
    const inp = document.getElementById('chat-input');
    inp.value = btn.textContent;
    inp.focus();
}

async function sendChat(textArg, opts = {}) {
    if (!chatCtx || !currentUser) return;
    const inp = document.getElementById('chat-input');
    const text = String(textArg ?? inp.value).trim();
    if (!text) return;
    if (!textArg) inp.value = '';
    try {
        await deliverMessage(chatCtx.uid, chatCtx.placeId, text, chatCtx.side, opts);
    } catch (err) {
        if (!textArg) inp.value = text;
        showToast('❌ ' + err.message, 'error');
    }
}

// يُنشئ المحادثة عند أول رسالة، ثم يضيف الرسالة ويحدّث الملخص
async function deliverMessage(uid, placeId, text, side, opts = {}) {
    const cid = convId(uid, placeId);
    const existing = findConv(cid);
    const f = findFacility(placeId);
    const now = new Date().toISOString();
    if (!existing) {
        let userName = '', userPhoto = '';
        if (side === 'user') { userName = currentUserData?.name || currentUser.displayName || ''; userPhoto = currentUserData?.photoURL || ''; }
        else {
            const u = allUsersAdmin.find(x => x.id === uid);
            userName = u?.name || opts.userName || ''; userPhoto = u?.photoURL || '';
        }
        await database.ref('conversations/' + cid).update({ uid, userName, userPhoto, placeId, placeName: f?.name || '', createdAt: now, unreadUser: 0, unreadHouse: 0 });
    }
    const name = side === 'user' ? (currentUserData?.name || currentUser.displayName || '') : (f?.name || 'دار الشباب');
    await database.ref('messages/' + cid).push({ side, from: currentUser.uid, name, text, at: now, ...(opts.broadcast ? { broadcast: true } : {}) });
    const key = side === 'user' ? 'unreadHouse' : 'unreadUser';
    await database.ref('conversations/' + cid).update({ lastText: text.slice(0, 140), lastAt: now, lastSide: side, [key]: (Number(existing?.[key]) || 0) + 1 });
    if (side === 'user' && !existing) sendNotificationToAdmins('💬 رسالة جديدة من شاب', `${name} يراسل ${f?.name || 'دار الشباب'}: «${text.slice(0, 80)}»`);
}

// ---------- محادثة جديدة ----------
function openNewChat() {
    if (!requireLogin()) return;
    if (selectedRole === 'admin') return openBroadcast();
    const sel = document.getElementById('nc-place');
    sel.innerHTML = facilityOptions(sortFacilities(getFacilities().slice(), false));
    const nearest = sortFacilities(getFacilities().slice(), true)[0];
    if (nearest) sel.value = nearest.id;
    document.getElementById('nc-text').value = '';
    document.getElementById('nc-quick').innerHTML = CHAT_QUICK_USER.map(q => `<button class="chip-btn" onclick="document.getElementById('nc-text').value=this.textContent">${esc(q)}</button>`).join('');
    document.getElementById('newChatModal').classList.add('active');
}

function startNewChat() {
    const placeId = document.getElementById('nc-place').value;
    const text = document.getElementById('nc-text').value.trim();
    if (!placeId) return showToast('❌ اختر دار الشباب', 'error');
    closeModal('newChatModal');
    openChatWith(placeId);
    if (text) sendChat(text);
}

// المسيّر يراسل عضواً
function messageMember(uid) {
    if (selectedRole !== 'admin') return;
    closeModal('memberModal');
    const existing = allConvs.filter(c => c.uid === uid);
    const places = typeof memberPlaces === 'function' ? Array.from(memberPlaces(uid)) : [];
    const placeId = msgPlaceFilter || existing[0]?.placeId || places[0] || getFacilities()[0]?.id;
    if (!placeId) return showToast('أضف مرفقاً أولاً', 'info');
    const u = allUsersAdmin.find(x => x.id === uid) || {};
    switchTab('messages');
    openChat(convId(uid, placeId), { uid, placeId, placeName: findFacility(placeId)?.name || '', userName: u.name || '' });
}

// ---------- رسالة جماعية لأعضاء دار ----------
function openBroadcast() {
    if (selectedRole !== 'admin') return;
    const sel = document.getElementById('bc-place');
    sel.innerHTML = facilityOptions(sortFacilities(getFacilities().slice(), false));
    if (msgPlaceFilter) sel.value = msgPlaceFilter;
    document.getElementById('bc-text').value = '';
    updateBroadcastCount();
    document.getElementById('broadcastModal').classList.add('active');
}

function broadcastTargets(placeId) {
    const ids = new Set();
    allMemberships.filter(m => m.placeId === placeId && m.status === 'accepted' && m.userId).forEach(m => ids.add(m.userId));
    allConvs.filter(c => c.placeId === placeId).forEach(c => ids.add(c.uid));
    if (typeof allCertsAdmin !== 'undefined') allCertsAdmin.filter(c => c.placeId === placeId && c.uid).forEach(c => ids.add(c.uid));
    return Array.from(ids);
}

function updateBroadcastCount() {
    const n = broadcastTargets(document.getElementById('bc-place').value).length;
    document.getElementById('bc-count').textContent = n ? `ستصل الرسالة إلى ${n} ${n > 10 ? 'عضواً' : 'أعضاء'} (المنخرطون، من راسلوا الدار، وأصحاب الشهادات منها)` : 'لا يوجد أعضاء لهذه الدار بعد';
}

async function sendBroadcast() {
    if (selectedRole !== 'admin') return;
    const placeId = document.getElementById('bc-place').value;
    const text = document.getElementById('bc-text').value.trim();
    const targets = broadcastTargets(placeId);
    if (!text) return showToast('❌ اكتب نص الرسالة', 'error');
    if (!targets.length) return showToast('لا يوجد أعضاء لهذه الدار بعد', 'info');
    if (!confirm(`إرسال الرسالة إلى ${targets.length} عضو؟`)) return;
    showLoading();
    try {
        for (const uid of targets) await deliverMessage(uid, placeId, text, 'house', { broadcast: true });
        hideLoading();
        closeModal('broadcastModal');
        showToast(`📢 أُرسلت الرسالة إلى ${targets.length} عضو`);
    } catch (err) { hideLoading(); showToast('❌ ' + err.message, 'error'); }
}
