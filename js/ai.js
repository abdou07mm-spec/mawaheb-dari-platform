// =====================================================================
// مواهب داري: الذكاء الاصطناعي
// - Gemini عبر Firebase AI Logic: الطلبات تمر عبر Firebase بإعدادات المشروع، فلا يوجد أي مفتاح سري في الكود.
//   التفعيل مرة واحدة من Firebase Console ← AI Logic ← Get started ← Gemini Developer API.
// - إن لم يكن مفعلاً، يعمل «المساعد المحلي» من بيانات المنصة نفسها (بدون إنترنت خارجي) ويظهر ذلك بوضوح.
// =====================================================================
const AI_SDK_VERSION = '13.0.0';
const AI_MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
const AI = { state: 'idle', loading: null, mod: null, ai: null, modelName: '', lastError: '' };
let aiHistory = [];      // [{ role: 'user'|'model', text }]
let aiBusy = false;
let aiRecognizer = null;

// ---------- الاتصال بـ Gemini ----------
function aiInit() {
    if (AI.state === 'ready') return Promise.resolve(true);
    if (AI.state === 'off') return Promise.resolve(false);
    if (AI.loading) return AI.loading;
    AI.state = 'loading';
    AI.loading = (async () => {
        try {
            const base = `https://www.gstatic.com/firebasejs/${AI_SDK_VERSION}/`;
            const appMod = await import(base + 'firebase-app.js');
            const aiMod = await import(base + 'firebase-ai.js');
            const app = appMod.getApps().find(a => a.name === 'mawaheb-ai') || appMod.initializeApp(firebaseConfig, 'mawaheb-ai');
            AI.mod = aiMod;
            AI.ai = aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() });
            AI.state = 'ready';
            return true;
        } catch (e) {
            AI.state = 'off';
            AI.lastError = String(e && e.message || e);
            return false;
        } finally { AI.loading = null; updateAiBadge(); }
    })();
    return AI.loading;
}

async function aiGenerate(prompt, { system = '', history = [], temperature = 0.6, maxTokens = 900 } = {}) {
    if (!(await aiInit())) throw new Error('ai-off');
    const names = AI.modelName ? [AI.modelName] : AI_MODELS;
    for (const name of names) {
        try {
            const model = AI.mod.getGenerativeModel(AI.ai, {
                model: name,
                systemInstruction: system || undefined,
                generationConfig: { temperature, maxOutputTokens: maxTokens }
            });
            let res;
            if (history.length) {
                const chat = model.startChat({ history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })) });
                res = await chat.sendMessage(prompt);
            } else {
                res = await model.generateContent(prompt);
            }
            const text = res.response.text();
            AI.modelName = name;
            updateAiBadge();
            return text;
        } catch (e) {
            const msg = String(e && e.message || e);
            AI.lastError = msg;
            if (/not.?found|404|not supported|unsupported model/i.test(msg) && !AI.modelName) continue;
            if (/api.?not.?enabled|has not been used|PERMISSION_DENIED|403|billing|disabled|invalid api key|api key not valid/i.test(msg)) AI.state = 'off';
            updateAiBadge();
            throw e;
        }
    }
    AI.state = 'off';
    updateAiBadge();
    throw new Error('no-model');
}

// نص نظيف لحقول الكتابة (بدون وسوم الأزرار)
async function aiText(prompt, opts) {
    return String(await aiGenerate(prompt, opts)).replace(/\[\[[^\]]*\]\]/g, '').replace(/\*\*(.+?)\*\*/g, '$1').trim();
}

function aiIsLive() { return AI.state === 'ready' && !!AI.modelName; }
function updateAiBadge() {
    const b = document.getElementById('ai-mode');
    if (!b) return;
    if (aiIsLive()) { b.className = 'ai-mode live'; b.innerHTML = '<i class="fas fa-bolt"></i> Gemini'; b.title = 'مدعوم بـ Gemini عبر Firebase AI Logic'; }
    else if (AI.state === 'off') { b.className = 'ai-mode local'; b.innerHTML = '<i class="fas fa-microchip"></i> المساعد المحلي'; b.title = 'يجيب من بيانات المنصة. فعّل Firebase AI Logic لتشغيل Gemini'; }
    else { b.className = 'ai-mode'; b.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>'; }
}

// ---------- سياق المنصة للنموذج ----------
function aiUserLine() {
    if (!currentUser) return 'المستخدم زائر لم يسجّل بعد.';
    const u = currentUserData || {};
    const st = window.myStats || {};
    const quiz = u.talentQuiz?.top && TALENT_CATS[u.talentQuiz.top] ? TALENT_CATS[u.talentQuiz.top].label : '';
    return `المستخدم: ${u.name || currentUser.displayName || ''}، ولاية ${getWilayaName(u.wilaya)}، مواهبه: ${u.talents || 'غير محددة'}${quiz ? '، الموهبة المكتشفة: ' + quiz : ''}، نجومه: ${st.stars || 0} (المستوى ${tierFor(st.stars || 0).label})، ساعات تطوعه: ${st.hours || 0}، شهاداته: ${st.certs || 0}.`;
}

function aiPlatformContext() {
    const facs = sortFacilities(getFacilities().slice(), true).slice(0, 45).map(f => {
        const day = typeof WEEKDAYS !== 'undefined' && f.closedDay !== undefined && f.closedDay !== '' ? WEEKDAYS[Number(f.closedDay)] : '';
        return `- [${f.id}] ${f.name} (${(FACILITY_TYPES[f.type] || {}).label || ''}، ${f.commune ? f.commune + '، ' : ''}ولاية ${getWilayaName(f.wilaya)})${f.openTime ? ` يفتح ${f.openTime}-${f.closeTime || ''}` : ''}${day ? ` يغلق يوم ${day}` : ''}${isBookable(f) ? ` · إقامة${f.capacity ? ' ' + f.capacity + ' سرير' : ''}${f.price ? ' بـ ' + f.price + ' دج/ليلة للشخص' : ''}` : ''}${f.clubs ? ' · نوادٍ: ' + splitList(f.clubs).join('، ') : ''}${f.phone ? ' · هاتف ' + f.phone : ''}${userLocated && facilityDistance(f) != null ? ' · يبعد ' + formatDistance(facilityDistance(f)) : ''}`;
    }).join('\n');
    const t = todayStr();
    const evs = getEvents().filter(e => e.status === 'approved' && (e.date || '') >= t).sort(byDateTime).slice(0, 30).map(e =>
        `- [${e.id}] ${e.title} · ${e.date} ${e.time || ''} · ${e.placeName || e.address || ''} (ولاية ${getWilayaName(e.wilaya || findFacility(e.placeId)?.wilaya)}) · ${(EVENT_CATEGORIES[e.category] || {}).label || ''}${Number(e.volunteers) ? ` · يحتاج ${e.volunteers} متطوعين (${Number(e.volunteerHours) || 3} ساعات موثّقة)` : ''}`).join('\n');
    const rws = getRewards().filter(r => r.status !== 'drawn').slice(0, 8).map(r => `- ${r.title} (${r.value || ''}، ${r.minStars}+ نجمة، ${r.winners} فائز، السحب ${r.drawDate})`).join('\n');
    return `اليوم: ${t} (${typeof WEEKDAYS !== 'undefined' ? WEEKDAYS[new Date().getDay()] : ''}).\n${aiUserLine()}\n\nالمرافق:\n${facs || 'لا توجد'}\n\nالفعاليات القادمة:\n${evs || 'لا توجد'}\n\nالمكافآت المفتوحة:\n${rws || 'لا توجد'}`;
}

const AI_GUIDE = `دليل المنصة (للشرح):
- الحجز: صفحة الحجز ← اختيار بيت الشباب والتواريخ وعدد الأشخاص ← إرسال الطلب ← تذكرة QR بعد تأكيد الدار. يُنصح بإحضار بطاقة التعريف.
- الانخراط في نادٍ: صفحة الدار ← «انخرط» ← السن والمستوى والهاتف ← بعد القبول شهادة انخراط و2 نجوم.
- الفعاليات: «سأحضر»، إضافة الموعد للتقويم، وعند الدخول يمسح المسيّر بطاقة الشاب (QR) فتصل شهادة مشاركة ونجمة.
- التطوع: «تطوع الآن» ← الحضور وإظهار البطاقة ← شهادة تطوع و2 نجوم + نجمة لكل ساعتين.
- الأعمال الخيرية (تبرع بالدم، قفة رمضان، تشجير، زيارة المسنين...): من الجواز «سجّل عملاً خيرياً» ← تؤكده الدار ← شهادة و3 نجوم.
- جواز المواهب: يجمع المشاركات والتطوع والأعمال الخيرية والمواهب بشهادات قابلة للتحقق برمز QR، دون إظهار الهاتف أو البريد.
- النجوم: 5 مستويات (نجم صاعد، برونزي 10، فضي 25، ذهبي 50، ماسي 100). كل نجمة موثّقة = فرصة في سحوبات المكافآت، وبعض المكافآت تشترط حداً أدنى. السحب شفاف ببذرة منشورة قابلة لإعادة الحساب.
- معرض المواهب واختبار «اكتشف موهبتك» (6 أسئلة) وخطة تطوير.
- المراسلة: زر «مراسلة» في صفحة أي دار، أو صفحة الرسائل.
- التطبيق يُثبَّت من المتصفح (أندرويد: Chrome ⋮ تثبيت التطبيق، آيفون: Safari مشاركة ← الشاشة الرئيسية) ويعمل دون اتصال.`;

const AI_SYSTEM_YOUTH = `أنت «مساعد داري»، المساعد الذكي لمنصة مواهب داري التي تربط شباب الجزائر بدور الشباب وبيوت الشباب في الولايات الـ58 (المنصة من إعداد آية عابر).

فهم اللغة:
- المستخدم يكتب غالباً بالدارجة الجزائرية، بالحروف العربية أو اللاتينية (عربيزي: 3=ع، 7=ح، 9=ق، 5=خ، 2=ء)، أو بالفرنسية، أو بخليط منها. افهم المقصود جيداً.
- معجم: وين/فين=أين، واش=ماذا/هل، كيفاش=كيف، شحال/بقداش/بشحال=كم، علاش=لماذا، وقتاش=متى، نحب/حاب=أريد، نلقى=أجد، نبات/نرقد=أبيت، نروح=أذهب، ندير=أفعل، نقدر=أستطيع، درك/دروك=الآن، غدوة=غداً، سمانة=أسبوع، ويكاند=نهاية الأسبوع، بزاف=كثيراً، شوية=قليلاً، كاين=يوجد، ماكانش=لا يوجد، جوج/زوج=اثنان، السومة/الدراهم=السعر، بلاصة=مكان، حومة=حي، يحلو=يفتحون، يسكرو/يبلعو=يغلقون، خويا/صاحبي=أخي/صديقي، زعفان/قلقان=متضايق، auberge=بيت الشباب، maison de jeunes/dar chabab=دار الشباب.
- أسماء الولايات بالدارجة واللاتينية: سطايف/stif=سطيف، wahran/oran=وهران، دزاير/العاصمة/alger=الجزائر، qsentina=قسنطينة، bgayet=بجاية، tizi=تيزي وزو، tam=تمنراست.

أسلوب الجواب:
- جاوب بنفس روح المستخدم: إن كتب بالدارجة فأجب بعربية بسيطة مطعّمة بدارجة يفهمها كل الجزائريين (مثل: «مرحبا بيك»، «هاك واش لقيت»، «ما تقلقش»)، وإن كتب بالفصحى أو الفرنسية فأجب بفصحى بسيطة.
- أجب بتفصيل مفيد (بين 6 و16 سطراً): سطر افتتاحي ودود، ثم نقاط تبدأ بـ «- » فيها المعلومات الدقيقة (الاسم، الولاية، الموعد، السعر، الأسرّة المتاحة، النجوم المكتسبة)، ثم «الخطوات» مرقمة عند الحاجة، ثم نصيحة عملية، واختم بسؤال قصير للمتابعة.
- استعمل **للتأكيد** على الأسماء المهمة، وبعض الرموز التعبيرية باعتدال.
- تذكّر سياق المحادثة: «وفي وهران؟» تعني نفس السؤال عن وهران، و«فيها/تماك» تعود على آخر دار أو ولاية ذُكرت.

الدقة والأمان:
- استعمل فقط المعلومات الواردة في سياق المنصة وفي «نتائج محرك المنصة». لا تخترع أماكن أو أرقام هواتف أو مواعيد أو أسعاراً. إن لم تجد المعلومة فقل ذلك بوضوح واقترح مراسلة الدار.
- لا تطلب أبداً كلمة مرور أو معلومات حساسة.

الأزرار (اختياري، في آخر الجواب، 3 على الأكثر): [[facility:المعرف]]، [[event:المعرف]]، [[chat:معرف المرفق]]، [[tab:booking]] [[tab:events-page]] [[tab:volunteer]] [[tab:talents]] [[tab:rewards]] [[tab:messages]] [[tab:profile]] [[tab:houses]]، [[quiz]]، [[do:charity]] لتسجيل عمل خيري، [[do:idcard]] لبطاقة الحضور، [[do:install]] لتثبيت التطبيق.
اقتراحات متابعة (اختياري، 3 على الأكثر، بصيغة سؤال قصير بنفس أسلوب المستخدم): [[ask:نص السؤال]].

${AI_GUIDE}`;

// ---------- الأزرار والاقتراحات داخل الأجوبة ----------
function aiParseActions(text) {
    const actions = [], asks = [];
    const clean = String(text || '').replace(/\[\[(facility|event|tab|chat|quiz|do|ask)(?::([^\]]+))?\]\]/g, (m, kind, arg) => {
        if (kind === 'ask') { if (arg && arg.trim()) asks.push(arg.trim()); }
        else actions.push({ kind, arg: (arg || '').trim() });
        return '';
    }).replace(/[ \t]+([.،,؟?!:])/g, '$1').replace(/[ \t]+$/gm, '').trim();
    return { text: clean, actions: actions.slice(0, 3), asks: asks.slice(0, 3) };
}

function aiActionButton(a) {
    const tabs = { booking: ['fa-bed', 'الحجز'], 'events-page': ['fa-calendar-days', 'الفعاليات'], volunteer: ['fa-hand-holding-heart', 'التطوع'], talents: ['fa-palette', 'معرض المواهب'], rewards: ['fa-gift', 'النجوم والمكافآت'], messages: ['fa-comments', 'الرسائل'], profile: ['fa-id-card', 'جوازي'], houses: ['fa-house-chimney-user', 'دور الشباب'], settings: ['fa-cog', 'الإعدادات'] };
    const dos = { charity: ['fa-hand-holding-dollar', 'سجّل عملاً خيرياً', 'openCharityForm()'], idcard: ['fa-qrcode', 'بطاقتي', 'openIdCard()'], newchat: ['fa-pen-to-square', 'راسل دار شباب', 'openNewChat()'], install: ['fa-download', 'ثبّت التطبيق', 'installApp()'], addtalent: ['fa-palette', 'اعرض موهبتك', 'openAddTalent()'], login: ['fa-right-to-bracket', 'سجّل الدخول', 'askLogin()'] };
    if (a.kind === 'facility') { const f = findFacility(a.arg); return f ? `<button class="chip-btn" onclick="closeModal('aiModal'); openFacility('${esc(f.id)}')"><i class="fas ${FACILITY_TYPES[f.type]?.icon || 'fa-house'}"></i> ${esc(f.name)}</button>` : ''; }
    if (a.kind === 'event') { const e = getEvents().find(x => x.id === a.arg); return e ? `<button class="chip-btn" onclick="closeModal('aiModal'); openEventFromHome('${esc(e.id)}')"><i class="fas fa-calendar-check"></i> ${esc(e.title)}</button>` : ''; }
    if (a.kind === 'chat') { const f = findFacility(a.arg); return f ? `<button class="chip-btn" onclick="closeModal('aiModal'); openChatWith('${esc(f.id)}')"><i class="fas fa-comment-dots"></i> راسل ${esc(f.name)}</button>` : ''; }
    if (a.kind === 'quiz') return `<button class="chip-btn" onclick="closeModal('aiModal'); openQuiz()"><i class="fas fa-compass"></i> اكتشف موهبتك</button>`;
    if (a.kind === 'do' && dos[a.arg]) return `<button class="chip-btn" onclick="closeModal('aiModal'); ${dos[a.arg][2]}"><i class="fas ${dos[a.arg][0]}"></i> ${dos[a.arg][1]}</button>`;
    if (a.kind === 'tab' && tabs[a.arg]) return `<button class="chip-btn" onclick="closeModal('aiModal'); switchTab('${a.arg}')"><i class="fas ${tabs[a.arg][0]}"></i> ${tabs[a.arg][1]}</button>`;
    return '';
}

// تنسيق بسيط: فقرات، قوائم نقطية ومرقمة، وخط عريض
function aiFormat(text) {
    let html = '', list = '';
    const close = () => { if (list) { html += `</${list}>`; list = ''; } };
    esc(text).split('\n').forEach(line => {
        const b = line.match(/^\s*[-•*]\s+(.*)$/);
        const n = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (b) { if (list !== 'ul') { close(); html += '<ul class="ai-ul">'; list = 'ul'; } html += `<li>${b[1]}</li>`; }
        else if (n) { if (list !== 'ol') { close(); html += '<ol class="ai-ol">'; list = 'ol'; } html += `<li>${n[2]}</li>`; }
        else { close(); if (line.trim()) html += `<p>${line.replace(/^#+\s*/, '')}</p>`; }
    });
    close();
    return html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

// المساعد المحلي: محرّك الفهم في js/ai-brain.js
function aiLocalAnswer(q) { return nlAnswer(q).text; }

// ---------- واجهة المساعد ----------
function aiWelcome() {
    const name = nlFirstName();
    return `أهلاً${name ? ' ' + name : ''} 👋 أنا «مساعد داري»، نفهم الدارجة والفرنسية والعربية، وتقدر تهدر معايا بالصوت 🎙️\nسقسيني على دور الشباب في ولايتك، المبيت والأسعار، الفعاليات، التطوع، ولا كيفاش تجمع النجوم.` +
        `[[tab:houses]][[quiz]][[tab:rewards]]`;
}

function openAssistant(prefill) {
    document.getElementById('aiModal').classList.add('active');
    if (!aiHistory.length) aiHistory.push({ role: 'model', text: aiWelcome() });
    renderAssistant();
    aiInit();
    const inp = document.getElementById('ai-input');
    if (prefill) { inp.value = prefill; aiSend(); } else setTimeout(() => inp.focus(), 150);
}

function aiResetChat() {
    aiHistory = [];
    nlReset();
    aiHistory.push({ role: 'model', text: aiWelcome() });
    renderAssistant();
}

function renderAssistant() {
    const box = document.getElementById('ai-msgs');
    const lastModel = aiHistory.map(m => m.role).lastIndexOf('model');
    box.innerHTML = aiHistory.map((m, i) => {
        if (m.role === 'user') return `<div class="bubble me"><p>${esc(m.text)}</p></div>`;
        const { text, actions } = aiParseActions(m.text);
        return `<div class="bubble them ai"><div class="ai-text">${aiFormat(text)}</div>
            ${actions.length ? `<div class="ai-acts">${actions.map(aiActionButton).join('')}</div>` : ''}
            <div class="b-tools"><button class="link-btn" onclick="aiSpeak(${i})" title="استمع"><i class="fas fa-volume-high"></i></button>${m.local ? '<small class="muted">المساعد المحلي</small>' : ''}</div></div>`;
    }).join('') + (aiBusy ? '<div class="bubble them ai typing"><span></span><span></span><span></span></div>' : '');
    box.scrollTop = box.scrollHeight;
    let sugg = [];
    if (!aiBusy && lastModel >= 0) sugg = aiParseActions(aiHistory[lastModel].text).asks;
    if (!sugg.length && aiHistory.length < 3) sugg = currentUser
        ? ['واش كاين فعاليات هاد السمانة؟', 'كيفاش نزيد النجوم تاعي؟', 'نحب نادي رسم في ولايتي', 'وين نبات إذا رحت لغرداية؟']
        : ['واش هي مواهب داري؟', 'بيت شباب في وهران بشحال؟', 'كيفاش نتطوع؟', 'nheb nt3alem la guitare'];
    document.getElementById('ai-sugg').innerHTML = sugg.map(s => `<button class="chip-btn" onclick="document.getElementById('ai-input').value=this.textContent; aiSend()">${esc(s)}</button>`).join('');
    updateAiBadge();
}

async function aiSend() {
    const inp = document.getElementById('ai-input');
    const q = inp.value.trim();
    if (!q || aiBusy) return;
    inp.value = '';
    aiHistory.push({ role: 'user', text: q });
    aiBusy = true;
    renderAssistant();
    // محرّك المنصة يفهم السؤال ويجمع المعلومات أولاً (ويحفظ السياق)
    const local = nlAnswer(q);
    let answer, isLocal = false;
    try {
        const hist = aiHistory.slice(-11, -1).filter((m, i) => !(i === 0 && m.role === 'model'));
        const facts = `\n\nنتائج محرك المنصة لهذا السؤال (معلومات موثوقة من قاعدة البيانات، اعتمد عليها ووسّعها بأسلوبك، واحتفظ بأزرارها المفيدة):\nالنية: ${local.intent} · الولاية: ${local.parsed.wilaya ? getWilayaName(local.parsed.wilaya) : 'غير محددة'} · المجال: ${local.parsed.cat ? TALENT_CATS[local.parsed.cat].label : 'غير محدد'} · الوقت: ${local.parsed.time || 'غير محدد'} · الأسلوب: ${local.parsed.darija ? 'دارجة' : 'فصحى'}\n${local.text}`;
        answer = await aiGenerate(q, { system: AI_SYSTEM_YOUTH + '\n\nسياق المنصة:\n' + aiPlatformContext() + facts, history: hist, temperature: 0.65, maxTokens: 1400 });
        if (!/\[\[ask:/.test(answer)) answer += aiParseActions(local.text).asks.map(a => `[[ask:${a}]]`).join('');
    } catch (e) {
        answer = local.text;
        isLocal = true;
        await new Promise(r => setTimeout(r, 350)); // إيقاع طبيعي للرد
    }
    aiBusy = false;
    aiHistory.push({ role: 'model', text: answer, local: isLocal });
    renderAssistant();
}

function aiSpeak(i) {
    if (!('speechSynthesis' in window)) return showToast('القراءة الصوتية غير مدعومة في هذا المتصفح', 'info');
    const { text } = aiParseActions(aiHistory[i]?.text || '');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, '').replace(/^\s*[-•]\s*/gm, ''));
    u.lang = 'ar-SA';
    const v = speechSynthesis.getVoices().find(x => /^ar/i.test(x.lang));
    if (v) u.voice = v;
    u.rate = 1;
    speechSynthesis.speak(u);
}

function aiVoice(inputId, btn) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return showToast('🎙️ الإدخال الصوتي غير مدعوم في هذا المتصفح، جرّب Chrome', 'info');
    if (aiRecognizer) { aiRecognizer.stop(); return; }
    const r = new SR();
    r.lang = 'ar-DZ';
    r.interimResults = true;
    r.maxAlternatives = 1;
    const inp = document.getElementById(inputId);
    btn.classList.add('rec');
    r.onresult = e => { inp.value = Array.from(e.results).map(x => x[0].transcript).join(' '); };
    r.onerror = () => showToast('تعذّر الاستماع، تحقق من إذن الميكروفون', 'info');
    r.onend = () => { btn.classList.remove('rec'); aiRecognizer = null; if (inputId === 'ai-input' && inp.value.trim()) aiSend(); };
    aiRecognizer = r;
    r.start();
}

// ---------- مساعدات الكتابة ----------
async function aiWriteInto(btn, fn) {
    const old = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> جارٍ الكتابة...';
    try { await fn(); } finally { btn.disabled = false; btn.innerHTML = old; }
}

function aiImproveTalent(btn) {
    const title = document.getElementById('tl-title').value.trim();
    const cat = TALENT_CATS[document.getElementById('tl-cat').value] || TALENT_CATS.art;
    const desc = document.getElementById('tl-desc').value.trim();
    if (title.length < 3) return showToast('اكتب عنوان العمل أولاً', 'info');
    aiWriteInto(btn, async () => {
        let out;
        try {
            out = await aiText(`اكتب وصفاً جذاباً وصادقاً (3 جمل، أقل من 350 حرفاً) لعمل شاب جزائري يُعرض في معرض المواهب.\nالعنوان: ${title}\nالمجال: ${cat.label}\nملاحظات صاحب العمل: ${desc || 'لا شيء'}\nلا تضف معلومات غير مذكورة، ولا تستعمل الرموز التعبيرية بكثرة. أعد الوصف فقط.`, { temperature: 0.7, maxTokens: 300 });
            showToast('✨ اقترح الذكاء الاصطناعي وصفاً، راجعه قبل الإرسال', 'info');
        } catch (e) {
            out = `«${title}»: عمل في مجال ${cat.label}.\nالفكرة: ${desc || '...'}\nالأدوات أو الطريقة: ...\nما تعلّمته منه: ...`;
            showToast('📝 أضفنا هيكلاً للوصف: أكمل النقاط', 'info');
        }
        document.getElementById('tl-desc').value = out.trim().slice(0, 400);
    });
}

function aiWriteEvent(btn) {
    const title = document.getElementById('eventTitle').value.trim();
    if (title.length < 3) return showToast('اكتب عنوان الفعالية أولاً', 'info');
    const cat = EVENT_CATEGORIES[document.getElementById('eventCategory').value] || {};
    const f = findFacility(document.getElementById('eventFacility').value);
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const vols = document.getElementById('eventVolunteers').value;
    aiWriteInto(btn, async () => {
        let desc, req;
        try {
            const out = await aiText(`أنت مسؤول إعلام في دار شباب جزائرية. اكتب لفعالية:\nالعنوان: ${title}\nالتصنيف: ${cat.label || ''}\nالمكان: ${f?.name || ''}\nالتاريخ: ${date} ${time}\nعدد المتطوعين المطلوب: ${vols}\nأعد سطرين فقط بهذه الصيغة:\nوصف: (3 جمل جذابة للشباب، أقل من 400 حرف)\nمتطلبات: (ما يحضره المشارك، جملة واحدة)`, { temperature: 0.7, maxTokens: 400 });
            desc = (out.match(/وصف\s*[:：]\s*([\s\S]*?)(?:\n\s*متطلبات|$)/) || [])[1] || out;
            req = (out.match(/متطلبات\s*[:：]\s*(.*)/) || [])[1] || '';
            showToast('✨ كتب الذكاء الاصطناعي الوصف، راجعه قبل النشر', 'info');
        } catch (e) {
            desc = `${f ? f.name + ' تدعو' : 'ندعو'} شباب ${f && f.wilaya ? 'ولاية ' + getWilayaName(f.wilaya) : 'المنطقة'} إلى «${title}»${date ? ' يوم ' + formatDateAr(date) : ''}${time ? ' على الساعة ' + time : ''}. الفعالية مفتوحة للشباب من 15 إلى 30 سنة، في جو من التعلم والمشاركة. المشاركون يحصلون على شهادة موثّقة ونجوم في جواز المواهب.`;
            req = 'إحضار بطاقة مواهب داري (رمز QR) للتسجيل عند الدخول.';
            showToast('📝 اقترحنا نصاً جاهزاً يمكنك تعديله', 'info');
        }
        document.getElementById('eventDescription').value = desc.trim();
        if (req && !document.getElementById('eventRequirements').value.trim()) document.getElementById('eventRequirements').value = req.trim();
    });
}

async function aiSuggestReply() {
    if (!chatCtx) return;
    const btn = document.querySelector('.chip-btn.ai');
    const f = findFacility(chatCtx.placeId);
    const lastUser = chatMsgs.filter(m => m.side === 'user').slice(-1)[0];
    const convo = chatMsgs.slice(-8).map(m => `${m.side === 'user' ? 'الشاب' : 'الدار'}: ${m.text}`).join('\n');
    const facInfo = f ? `${f.name}، ${wilayaLabel(f)}، أوقات العمل ${f.openTime || '؟'}-${f.closeTime || '؟'}${f.closedDay ? '، الغلق ' + f.closedDay : ''}، النوادي: ${splitList(f.clubs).join('، ') || 'غير محددة'}${isBookable(f) ? `، إقامة بسعة ${f.capacity || '؟'} سرير بـ ${f.price || '؟'} دج لليلة` : ''}` : '';
    const evs = getEvents().filter(e => e.placeId === chatCtx.placeId && e.status === 'approved' && (e.date || '') >= todayStr()).slice(0, 4).map(e => `${e.title} (${e.date})`).join('، ');
    const run = async () => {
        let out;
        try {
            out = await aiText(`اقترح رداً واحداً قصيراً ولطيفاً (جملتان أو ثلاث) من مسيّر الدار على آخر رسالة للشاب. استعمل فقط هذه المعلومات:\nالدار: ${facInfo}\nفعاليات قادمة: ${evs || 'لا شيء'}\n\nالمحادثة:\n${convo || '(لا توجد رسائل)'}\nأعد نص الرد فقط.`, { temperature: 0.5, maxTokens: 250 });
        } catch (e) {
            out = localReply(lastUser?.text || '', f, evs);
        }
        const inp = document.getElementById('chat-input');
        inp.value = out.trim();
        inp.focus();
    };
    if (btn) aiWriteInto(btn, run); else run();
}

function localReply(q, f, evs) {
    const t = String(q);
    const closed = f && f.closedDay !== undefined && f.closedDay !== '' && typeof WEEKDAYS !== 'undefined' ? WEEKDAYS[Number(f.closedDay)] : '';
    if (/وقت|توقيت|ساعة|مواعيد|تفتح|يفتح|يحلو|وقتاش|horaire/.test(t)) return f && f.openTime ? `مرحباً! الدار مفتوحة من ${f.openTime} إلى ${f.closeTime || ''}${closed ? '، وتغلق يوم ' + closed : ''}. نرحب بك في أي وقت.` : 'مرحباً! الدار مفتوحة من الأحد إلى الخميس من 08:30 إلى 17:00.';
    if (/نادي|انخراط|نخرط|ورش|club/.test(t)) return `مرحباً! نوادينا: ${f ? splitList(f.clubs).join('، ') || 'متنوعة' : 'متنوعة'}. يمكنك إرسال طلب الانخراط من صفحة الدار في التطبيق، ونؤكد لك موعد أول حصة.`;
    if (/حجز|إقامة|اقامة|سرير|مبيت|شاغر/.test(t)) return f && isBookable(f) ? `مرحباً! يمكنك التحقق من الأسرّة المتاحة وطلب الحجز من صفحة الحجز في التطبيق${f.price ? '، والسعر ' + f.price + ' دج لليلة' : ''}. نؤكد الطلب في أقرب وقت.` : 'مرحباً! الإقامة متوفرة في بيوت الشباب، ويمكنك الحجز من صفحة الحجز في التطبيق.';
    if (/تطوع|متطوع/.test(t)) return evs ? `شكراً على روح المبادرة! لدينا: ${evs}. سجّل من صفحة التطوع وأظهر بطاقتك يوم الفعالية لتصلك الشهادة.` : 'شكراً على روح المبادرة! سنعلن قريباً عن فرص تطوع، تابع صفحة التطوع في التطبيق.';
    return 'مرحباً بك، شكراً على رسالتك. كيف يمكننا مساعدتك أكثر؟';
}

// ---------- خطة تطوير الموهبة (بعد الاختبار) ----------
const LOCAL_PLANS = {
    art: ['انخرط في ورشة رسم أو تصوير بدار الشباب', 'أنجز عملاً صغيراً كل أسبوع واحفظه في ملف', 'اعرض أفضل عمل في معرض المواهب واطلب الآراء', 'شارك في مسابقة أو معرض جماعي للدار'],
    music: ['انخرط في نادي الموسيقى وتعلّم أساسيات آلة واحدة', 'تمرّن 20 دقيقة يومياً وسجّل تقدمك', 'شارك بمقطع في معرض المواهب', 'قدّم فقرة في أمسية فنية بالدار'],
    tech: ['انخرط في نادي الإعلام الآلي أو الروبوتيك', 'أنجز مشروعاً صغيراً يحل مشكلة في حيّك', 'انشر رابط المشروع في معرض المواهب', 'شارك في مسابقة علمية أو هاكاثون شبابي'],
    sport: ['اختر رياضة وانضم إلى فريق في المركب الجواري', 'ضع برنامج تمرين أسبوعي ثابت', 'شارك في دورة أو تحدٍّ رياضي للدار', 'تطوع في تنظيم تظاهرة رياضية لتكسب نجوماً إضافية'],
    stage: ['انخرط في نادي المسرح أو الإلقاء', 'احفظ نصاً قصيراً وقدّمه أمام أصدقائك', 'صوّر أداءك واعرضه في المعرض', 'شارك في عرض أو مسابقة إلقاء بالدار'],
    writing: ['انضم إلى نادي القراءة في الدار', 'اكتب نصاً قصيراً كل أسبوع', 'انشر أفضل نص في معرض المواهب', 'شارك في مسابقة الكتابة الولائية'],
    social: ['سجّل في أول فرصة تطوع قريبة', 'شارك في عمل خيري وسجّله في جوازك', 'اقترح مبادرة لحيّك على دار الشباب', 'قُد فريقاً صغيراً من المتطوعين في فعالية']
};

async function aiTalentPlan(cat, btn) {
    const box = document.getElementById('quiz-plan');
    if (!box) return;
    const c = TALENT_CATS[cat];
    const run = async () => {
        let html;
        try {
            const clubs = clubsForCategory(cat).map(x => `${x.club} (${x.f.name})`).join('، ');
            const out = await aiText(`اقترح خطة من 4 خطوات (خطوة لكل أسبوع، سطر واحد لكل خطوة، بدون مقدمة) لشاب جزائري موهبته الأقرب «${c.label}» ليطوّرها عبر دار الشباب ومنصة مواهب داري (نوادٍ، معرض المواهب، تطوع، نجوم). النوادي المتاحة: ${clubs || 'غير محددة'}.`, { temperature: 0.7, maxTokens: 350 });
            const steps = out.split('\n').map(s => s.replace(/^[\s\-•*\d.)]+/, '').trim()).filter(Boolean).slice(0, 4);
            html = steps.map((s, i) => `<li><b>الأسبوع ${i + 1}</b>${esc(s)}</li>`).join('');
        } catch (e) {
            html = LOCAL_PLANS[cat].map((s, i) => `<li><b>الأسبوع ${i + 1}</b>${esc(s)}</li>`).join('');
        }
        box.innerHTML = `<h4><i class="fas fa-route"></i> خطة شهر لتطوير موهبتك</h4><ol class="plan-list">${html}</ol>`;
    };
    if (btn) aiWriteInto(btn, run); else run();
}
