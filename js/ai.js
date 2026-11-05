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
    return `المستخدم: ${u.name || currentUser.displayName || ''}، ولاية ${getWilayaName(u.wilaya)}، مواهبه: ${u.talents || 'غير محددة'}${quiz ? '، الموهبة المكتشفة: ' + quiz : ''}، نجومه: ${st.stars || 0} (المستوى ${tierFor(st.stars || 0).label})، ساعات تطوعه: ${st.hours || 0}.`;
}

function aiPlatformContext() {
    const facs = sortFacilities(getFacilities().slice(), true).slice(0, 40).map(f =>
        `- [${f.id}] ${f.name} (${(FACILITY_TYPES[f.type] || {}).label || ''}، ${f.commune ? f.commune + '، ' : ''}ولاية ${getWilayaName(f.wilaya)})${f.openTime ? ` يفتح ${f.openTime}-${f.closeTime || ''}` : ''}${f.closedDay ? ` يغلق ${f.closedDay}` : ''}${isBookable(f) ? ` · إقامة${f.price ? ' ' + f.price + ' دج/ليلة' : ''}` : ''}${f.clubs ? ' · نوادٍ: ' + splitList(f.clubs).join('، ') : ''}${userLocated && facilityDistance(f) != null ? ' · يبعد ' + formatDistance(facilityDistance(f)) : ''}`).join('\n');
    const t = todayStr();
    const evs = getEvents().filter(e => e.status === 'approved' && (e.date || '') >= t).sort(byDateTime).slice(0, 25).map(e =>
        `- [${e.id}] ${e.title} · ${e.date} ${e.time || ''} · ${e.placeName || e.address || ''} · ${(EVENT_CATEGORIES[e.category] || {}).label || ''}${Number(e.volunteers) ? ` · يحتاج ${e.volunteers} متطوعين` : ''}`).join('\n');
    const rws = getRewards().filter(r => r.status !== 'drawn').slice(0, 8).map(r => `- ${r.title} (${r.minStars}+ نجمة، السحب ${r.drawDate})`).join('\n');
    return `اليوم: ${t}.\n${aiUserLine()}\n\nالمرافق:\n${facs || 'لا توجد'}\n\nالفعاليات القادمة:\n${evs || 'لا توجد'}\n\nالمكافآت المفتوحة:\n${rws || 'لا توجد'}\n\nقواعد النجوم: حضور فعالية 1، نادٍ 2، تطوع 2 + نجمة لكل ساعتين، عمل خيري 3، موهبة منشورة 2. المستويات: برونزي 10، فضي 25، ذهبي 50، ماسي 100. كلما زادت النجوم زادت فرصة الفوز في السحوبات.`;
}

const AI_SYSTEM_YOUTH = `أنت «مساعد داري»، المساعد الذكي لمنصة مواهب داري التي تربط شباب الجزائر بدور الشباب وبيوت الشباب في الولايات الـ58.
أجب بالعربية الفصحى البسيطة القريبة من الشباب الجزائري (يمكنك فهم الدارجة)، بإيجاز ووضوح (3 إلى 6 أسطر)، وبنبرة ودودة ومحفزة.
استعمل فقط المعلومات الواردة في سياق المنصة عن المرافق والفعاليات والمواعيد والأسعار، ولا تخترع أرقام هواتف أو مواعيد. إن لم تجد المعلومة فقل ذلك واقترح مراسلة الدار من المنصة.
يمكنك إضافة أزرار في آخر الجواب بهذه الصيغ فقط: [[facility:المعرف]] لفتح مرفق، [[event:المعرف]] لفتح فعالية، [[tab:booking]] [[tab:events-page]] [[tab:volunteer]] [[tab:talents]] [[tab:rewards]] [[tab:messages]] [[tab:profile]] [[tab:houses]]، [[quiz]] لاختبار اكتشاف الموهبة، [[chat:معرف المرفق]] لمراسلة دار. لا تضع أكثر من 3 أزرار.
لا تطلب أبداً كلمة مرور أو معلومات حساسة.`;

// ---------- الأزرار داخل الأجوبة ----------
function aiParseActions(text) {
    const actions = [];
    const clean = String(text || '').replace(/\[\[(facility|event|tab|chat|quiz)(?::([^\]]+))?\]\]/g, (m, kind, arg) => {
        actions.push({ kind, arg: (arg || '').trim() });
        return '';
    }).replace(/\*\*(.+?)\*\*/g, '$1').trim();
    return { text: clean, actions: actions.slice(0, 3) };
}

function aiActionButton(a) {
    const tabs = { booking: ['fa-bed', 'الحجز'], 'events-page': ['fa-calendar-days', 'الفعاليات'], volunteer: ['fa-hand-holding-heart', 'التطوع'], talents: ['fa-palette', 'معرض المواهب'], rewards: ['fa-gift', 'النجوم والمكافآت'], messages: ['fa-comments', 'الرسائل'], profile: ['fa-id-card', 'جوازي'], houses: ['fa-house-chimney-user', 'دور الشباب'] };
    if (a.kind === 'facility') { const f = findFacility(a.arg); return f ? `<button class="chip-btn" onclick="closeModal('aiModal'); openFacility('${esc(f.id)}')"><i class="fas ${FACILITY_TYPES[f.type]?.icon || 'fa-house'}"></i> ${esc(f.name)}</button>` : ''; }
    if (a.kind === 'event') { const e = getEvents().find(x => x.id === a.arg); return e ? `<button class="chip-btn" onclick="closeModal('aiModal'); openEventFromHome('${esc(e.id)}')"><i class="fas fa-calendar-check"></i> ${esc(e.title)}</button>` : ''; }
    if (a.kind === 'chat') { const f = findFacility(a.arg); return f ? `<button class="chip-btn" onclick="closeModal('aiModal'); openChatWith('${esc(f.id)}')"><i class="fas fa-comment-dots"></i> راسل ${esc(f.name)}</button>` : ''; }
    if (a.kind === 'quiz') return `<button class="chip-btn" onclick="closeModal('aiModal'); openQuiz()"><i class="fas fa-compass"></i> اكتشف موهبتك</button>`;
    if (a.kind === 'tab' && tabs[a.arg]) return `<button class="chip-btn" onclick="closeModal('aiModal'); switchTab('${a.arg}')"><i class="fas ${tabs[a.arg][0]}"></i> ${tabs[a.arg][1]}</button>`;
    return '';
}

// ---------- المساعد المحلي (من بيانات المنصة) ----------
function aiFindWilaya(text) {
    const norm = s => String(s).replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    const t = norm(text);
    let best = null;
    Object.entries(WILAYAS).forEach(([code, name]) => {
        const n = norm(name);
        if (n.length > 2 && t.includes(n) && (!best || n.length > best.len)) best = { code, len: n.length };
    });
    return best ? best.code : '';
}

function aiFindCategory(text) {
    const words = {
        art: /رسم|فن|تصوير|تصميم|خط|art|dessin/, music: /موسيق|غناء|عزف|غيتار|قيتار|عود|انشاد|إنشاد|music/,
        tech: /برمج|اعلام|إعلام|روبوت|تقني|حاسوب|كمبيوتر|code|informatique/, sport: /رياض|كرة|كورة|فوت|سباح|كاراتي|جيدو|sport|foot/,
        stage: /مسرح|تمثيل|إلقاء|القاء|theatre|théâtre/, writing: /كتاب|قراءة|شعر|قصة|أدب|ادب|lecture/, social: /كشاف|بيئ|تخييم|جمعو/
    };
    return Object.keys(words).find(k => words[k].test(text)) || '';
}

function aiLocalAnswer(q) {
    const t = q.toLowerCase();
    const w = aiFindWilaya(q);
    const cat = aiFindCategory(t);
    const facs = getFacilities();
    const inW = list => w ? list.filter(f => f.wilaya === w) : sortFacilities(list.slice(), true);
    const wName = w ? 'ولاية ' + getWilayaName(w) : (userLocated ? 'بالقرب منك' : '');
    const today = todayStr();
    const evAll = getEvents().filter(e => e.status === 'approved' && (e.date || '') >= today).sort(byDateTime);
    const evW = w ? evAll.filter(e => (e.wilaya || findFacility(e.placeId)?.wilaya) === w) : evAll;
    const facLines = list => list.slice(0, 3).map(f => `• ${f.name} (${wilayaLabel(f)})`).join('\n');
    const facActs = list => list.slice(0, 2).map(f => `[[facility:${f.id}]]`).join('');

    if (/^(\s*)(سلام|السلام|مرحبا|مرحباً|أهلا|اهلا|صباح|مساء|salam|bonjour|hello|hi)\b/i.test(q.trim()))
        return `أهلاً بك في مواهب داري 👋\nأنا مساعدك: أدلّك على دور الشباب، الحجز في بيوت الشباب، الفعاليات، فرص التطوع، وكيف تجمع النجوم وتربح المكافآت. ماذا تحتاج؟ [[tab:houses]][[quiz]][[tab:rewards]]`;
    if (/حجز|احجز|نحجز|إقامة|اقامة|مبيت|نبات|سرير|بيت الشباب|بيوت الشباب|مخيم|hostel|auberge/.test(t)) {
        const list = inW(facs.filter(isBookable));
        if (!list.length) return `لا يوجد مرفق إقامة مسجّل ${wName ? 'في ' + wName : ''} حالياً. يمكنك تصفح كل بيوت الشباب من صفحة الحجز. [[tab:booking]]`;
        return `للإقامة ${wName ? 'في ' + wName : ''} هذه أبرز الخيارات:\n${facLines(list)}\nمن صفحة الحجز تختار التواريخ وعدد الأشخاص، فتعرف الأسرّة المتاحة والمبلغ التقديري، ثم تصلك تذكرة برمز QR بعد التأكيد. ${facActs(list)}[[tab:booking]]`;
    }
    if (/نجم|نجوم|مكاف|جائز|سحب|ربح|نربح|مستوى|reward/.test(t)) {
        const st = window.myStats || { stars: 0 };
        const tier = tierFor(st.stars);
        return `${currentUser ? `لديك ${st.stars} نجمة (المستوى ${tier.label})${tier.next ? `، وبقي لك ${tier.toNext} للمستوى ${tier.next.label}` : ''}.\n` : ''}تجمع النجوم من: حضور الفعاليات (1)، الانخراط في نادٍ (2)، التطوع (2 + نجمة لكل ساعتين)، الأعمال الخيرية الموثّقة (3)، والمواهب المنشورة (2).\nكل نجمة تساوي فرصة في سحوبات المكافآت، وبعض المكافآت القيّمة تتطلب مستوى أعلى. [[tab:rewards]][[tab:volunteer]]`;
    }
    if (/خيري|تبرع|صدقة|قفة|إطعام|اطعام|charit/.test(t))
        return `الأعمال الخيرية (التبرع بالدم، قفة رمضان، التشجير، زيارة المسنين...) تُسجَّل من جوازك: اضغط «سجّل عملاً خيرياً» واختر الدار التي تؤكده. بعد التأكيد تصلك شهادة موثّقة و3 نجوم. [[tab:profile]]`;
    if (/تطوع|متطوع|نتطوع|bénévol|benevol|volunt/.test(t)) {
        const vols = volunteerEvents().filter(e => !w || (e.wilaya || findFacility(e.placeId)?.wilaya) === w).slice(0, 3);
        return vols.length ? `فرص تطوع قادمة ${wName ? 'في ' + wName : ''}:\n${vols.map(e => `• ${e.title}، ${formatDateAr(e.date)}${e.time ? ' على ' + e.time : ''}`).join('\n')}\nسجّل، احضر وأظهر بطاقتك، فتصلك شهادة تطوع ونجوم. ${vols.slice(0, 2).map(e => `[[event:${e.id}]]`).join('')}[[tab:volunteer]]`
            : `لا توجد فرص تطوع مبرمجة ${wName ? 'في ' + wName : ''} حالياً. تابع صفحة التطوع، أو راسل دار الشباب القريبة لتقترح مبادرة. [[tab:volunteer]][[tab:messages]]`;
    }
    if (/نادي|نوادي|انخراط|نخرط|ننخرط|ورش|club/.test(t) || (cat && /وين|أين|اين|نلقى|أجد|اجد|نتعلم|أتعلم|اتعلم/.test(t))) {
        const re = cat ? TALENT_CATS[cat].clubs : /./;
        const rows = [];
        inW(facs).forEach(f => splitList(f.clubs).forEach(c => { if (re.test(c)) rows.push({ f, c }); }));
        return rows.length ? `نوادٍ ${cat ? 'في ' + TALENT_CATS[cat].label + ' ' : ''}${wName ? 'في ' + wName : ''}:\n${rows.slice(0, 4).map(r => `• ${r.c}: ${r.f.name}`).join('\n')}\nمن صفحة الدار اضغط «انخرط» وأرسل طلبك. ${rows.slice(0, 2).map(r => `[[facility:${r.f.id}]]`).join('')}`
            : `لم أجد نادياً ${cat ? 'في ' + TALENT_CATS[cat].label + ' ' : ''}${wName ? 'في ' + wName : ''}. جرّب ولاية مجاورة، أو راسل الدار لتقترح فتحه. [[tab:houses]][[quiz]]`;
    }
    if (/فعالي|نشاط|أنشطة|انشطة|برنامج|حفل|مسابق|événement|event|weekend|ويكاند|نهاية الأسبوع/.test(t)) {
        const list = (cat ? evW.filter(e => TALENT_CATS[cat].events.includes(e.category)) : evW).slice(0, 4);
        return list.length ? `قريباً ${wName ? 'في ' + wName : 'في دور الشباب'}:\n${list.map(e => `• ${e.title}، ${relativeDay(e.date) || formatDateAr(e.date)}${e.time ? ' ' + e.time : ''} (${e.placeName || e.address || ''})`).join('\n')} ${list.slice(0, 2).map(e => `[[event:${e.id}]]`).join('')}[[tab:events-page]]`
            : `لا توجد فعاليات مبرمجة ${wName ? 'في ' + wName : ''} حالياً. يمكنك متابعة التقويم أو اقتراح فعالية. [[tab:events-page]]`;
    }
    if (/شهاد|جواز|سيرة|cv|certif/.test(t))
        return `جواز المواهب يجمع شهاداتك الموثّقة (المشاركات، التطوع، الأعمال الخيرية) ومواهبك، برابط ورمز QR تشاركه مع الجامعة أو صاحب العمل، ويمكن لأي أحد التحقق من كل شهادة. [[tab:profile]]`;
    if (/موهبت|موهبة|نكتشف|اكتشف|واش ندير|ماذا أفعل|ماذا افعل|ملل|فراغ|قلق|زهق/.test(t))
        return `جرّب اختبار «اكتشف موهبتك»: ست أسئلة قصيرة تقترح عليك المجال الأنسب والنوادي والفعاليات القريبة. ${cat ? `وبما أنك تهتم بـ${TALENT_CATS[cat].label}، يمكنك عرض أعمالك في المعرض.` : ''} [[quiz]][[tab:talents]]`;
    if (/قريب|أقرب|اقرب|بالقرب|حذايا|حدايا|near|proche|دار الشباب|دور الشباب/.test(t) || w) {
        const list = inW(facs.filter(f => f.type === 'youth')).concat(inW(facs.filter(f => f.type !== 'youth')));
        if (!list.length) return `لا توجد مرافق مسجّلة ${wName ? 'في ' + wName : ''} بعد. [[tab:houses]]`;
        return `${w ? 'في ' + wName : userLocated ? 'الأقرب إليك' : 'بعض المرافق المسجّلة'}:\n${facLines(list)}${!userLocated && !w ? '\nحدّد موقعك من صفحة دور الشباب لأرتّبها حسب القرب.' : ''} ${facActs(list)}[[tab:houses]]`;
    }
    if (/راسل|تواصل|اتصال|هاتف|رقم|نكلم|نتصل|message|contact/.test(t))
        return `يمكنك مراسلة أي دار شباب مباشرة من المنصة: افتح صفحة الدار واضغط «راسل الدار»، أو ابدأ محادثة من صفحة الرسائل. [[tab:messages]][[tab:houses]]`;
    return `يمكنني مساعدتك في:\n• إيجاد دار شباب أو نادٍ في ولايتك\n• الحجز في بيوت الشباب\n• الفعاليات وفرص التطوع\n• النجوم والمكافآت وجواز المواهب\nاكتب مثلاً: «نادي رسم في سطيف» أو «بيت شباب في وهران». [[tab:houses]][[quiz]]`;
}

// ---------- واجهة المساعد ----------
function openAssistant(prefill) {
    document.getElementById('aiModal').classList.add('active');
    if (!aiHistory.length) {
        const name = (currentUserData?.name || currentUser?.displayName || '').split(' ')[0];
        aiHistory.push({ role: 'model', text: `أهلاً${name ? ' ' + name : ''} 👋 أنا «مساعد داري». اسألني عن دور الشباب في ولايتك، الحجز، الفعاليات، التطوع، أو كيف تجمع النجوم. [[tab:houses]][[quiz]][[tab:rewards]]` });
    }
    renderAssistant();
    aiInit();
    const inp = document.getElementById('ai-input');
    if (prefill) { inp.value = prefill; aiSend(); } else setTimeout(() => inp.focus(), 150);
}

function renderAssistant() {
    const box = document.getElementById('ai-msgs');
    box.innerHTML = aiHistory.map((m, i) => {
        if (m.role === 'user') return `<div class="bubble me"><p>${esc(m.text)}</p></div>`;
        const { text, actions } = aiParseActions(m.text);
        return `<div class="bubble them ai"><p>${esc(text).replace(/\n/g, '<br>')}</p>
            ${actions.length ? `<div class="ai-acts">${actions.map(aiActionButton).join('')}</div>` : ''}
            <div class="b-tools"><button class="link-btn" onclick="aiSpeak(${i})" title="استمع"><i class="fas fa-volume-high"></i></button>${m.local ? '<small class="muted">المساعد المحلي</small>' : ''}</div></div>`;
    }).join('') + (aiBusy ? '<div class="bubble them ai typing"><span></span><span></span><span></span></div>' : '');
    box.scrollTop = box.scrollHeight;
    const sugg = currentUser
        ? ['ما الفعاليات القريبة مني هذا الأسبوع؟', 'كيف أرفع نجومي؟', 'أريد نادي رسم في ولايتي', 'أين أبيت في رحلة إلى غرداية؟']
        : ['ما هي مواهب داري؟', 'بيت شباب في وهران', 'كيف أتطوع؟', 'كيف أربح مكافأة؟'];
    document.getElementById('ai-sugg').innerHTML = aiHistory.length < 3 ? sugg.map(s => `<button class="chip-btn" onclick="document.getElementById('ai-input').value=this.textContent; aiSend()">${esc(s)}</button>`).join('') : '';
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
    let answer, local = false;
    try {
        const hist = aiHistory.slice(-9, -1).filter((m, i, arr) => !(i === 0 && m.role === 'model'));
        answer = await aiGenerate(q, { system: AI_SYSTEM_YOUTH + '\n\nسياق المنصة:\n' + aiPlatformContext(), history: hist });
    } catch (e) {
        answer = aiLocalAnswer(q);
        local = true;
    }
    aiBusy = false;
    aiHistory.push({ role: 'model', text: answer, local });
    renderAssistant();
}

function aiSpeak(i) {
    if (!('speechSynthesis' in window)) return showToast('القراءة الصوتية غير مدعومة في هذا المتصفح', 'info');
    const { text } = aiParseActions(aiHistory[i]?.text || '');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
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
    if (/وقت|توقيت|ساعة|مواعيد|تفتح|يفتح|horaire/.test(t)) return f && f.openTime ? `مرحباً! الدار مفتوحة من ${f.openTime} إلى ${f.closeTime || ''}${f.closedDay ? '، وتغلق يوم ' + f.closedDay : ''}. نرحب بك في أي وقت.` : 'مرحباً! الدار مفتوحة من الأحد إلى الخميس من 08:30 إلى 17:00.';
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
