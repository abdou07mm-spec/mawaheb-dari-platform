// =====================================================================
// مواهب داري: لوحة قيادة دور الشباب (للمسيّرين)
// مؤشرات، تنبيهات ذكية تقترح الإجراء المناسب، رسوم بيانية، وتقرير بالذكاء الاصطناعي.
// =====================================================================
let dashReportHTML = '';

function dashData() {
    const t = todayStr();
    const month = t.slice(0, 7);
    const members = allUsersAdmin.filter(u => u.role !== 'admin');
    const pending = {
        bookings: allBookings.filter(b => b.status === 'pending'),
        clubs: allMemberships.filter(m => m.status === 'pending'),
        talents: allTalents.filter(x => x.status === 'pending'),
        charity: allCharity.filter(c => c.status === 'pending')
    };
    return {
        t, month, members, pending,
        pendingCount: Object.values(pending).reduce((s, l) => s + l.length, 0),
        guestsToday: allBookings.filter(b => b.status === 'confirmed' && b.checkIn <= t && b.checkOut > t).reduce((s, b) => s + (Number(b.guests) || 0), 0),
        upcoming: allEvents.filter(e => e.status === 'approved' && (e.date || '') >= t).sort(byDateTime),
        monthCerts: allCertsAdmin.filter(c => String(c.issuedAt || c.date || '').slice(0, 7) === month),
        hours: allCertsAdmin.reduce((s, c) => s + (c.type === 'volunteer' ? Number(c.hours) || 0 : 0), 0)
    };
}

function dashInsights(d) {
    const out = [];
    const old = l => l.filter(x => x.createdAt && nightsBetween(String(x.createdAt).slice(0, 10), d.t) >= 2).length;
    const late = old(d.pending.bookings) + old(d.pending.clubs) + old(d.pending.talents) + old(d.pending.charity);
    if (late) out.push({ c: '#ef4444', i: 'fa-hourglass-half', txt: `${late} ${late > 2 ? 'طلبات تنتظر' : 'طلب ينتظر'} المراجعة منذ أكثر من يومين`, act: `switchTab('admin-bookings')`, btn: 'راجع الآن' });
    const recent = allEvents.filter(e => e.status === 'approved' && e.date < d.t && nightsBetween(e.date, d.t) <= 14);
    recent.forEach(e => {
        const hasCerts = allCertsAdmin.some(c => c.eventId === e.id);
        const people = Object.keys(e.participants || {}).length + Object.keys(e.attendees || {}).length;
        if (!hasCerts && people) out.push({ c: '#f59e0b', i: 'fa-certificate', txt: `فعالية «${e.title}» انتهت ولم تُصدر شهادات المشاركين (${people}) بعد`, act: `openAttendance('${e.id}')`, btn: 'الحضور والشهادات' });
    });
    d.upcoming.filter(e => nightsBetween(d.t, e.date) <= 7 && Number(e.volunteers) > Object.keys(e.participants || {}).length).slice(0, 2).forEach(e => {
        const miss = Number(e.volunteers) - Object.keys(e.participants || {}).length;
        out.push({ c: '#10b981', i: 'fa-hand-holding-heart', txt: `«${e.title}» (${relativeDay(e.date) || formatDateAr(e.date)}) تحتاج ${miss} ${miss > 2 ? 'متطوعين' : 'متطوعاً'} آخرين`, act: `openBroadcast()`, btn: 'رسالة جماعية' });
    });
    const unread = typeof unreadTotal === 'function' ? unreadTotal() : 0;
    if (unread) out.push({ c: '#3b82f6', i: 'fa-comments', txt: `${unread} ${unread > 2 ? 'رسائل' : 'رسالة'} من الشباب دون رد`, act: `switchTab('messages')`, btn: 'الرسائل' });
    allRewards.filter(r => r.status === 'open' && r.drawDate && r.drawDate <= d.t).forEach(r =>
        out.push({ c: '#f4b41b', i: 'fa-shuffle', txt: `حان موعد سحب «${r.title}» (${Object.keys(r.entries || {}).length} مشارك)`, act: `runDraw('${r.id}')`, btn: 'إجراء السحب' }));
    const cats = {};
    allTalents.forEach(x => { cats[x.category] = (cats[x.category] || 0) + 1; });
    d.members.forEach(u => { const q = u.talentQuiz?.top; if (q) cats[q] = (cats[q] || 0) + 1; });
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    if (topCat && TALENT_CATS[topCat[0]]) {
        const has = d.upcoming.some(e => TALENT_CATS[topCat[0]].events.includes(e.category));
        if (!has) out.push({ c: TALENT_CATS[topCat[0]].color, i: TALENT_CATS[topCat[0]].icon, txt: `«${TALENT_CATS[topCat[0]].label}» أكثر مجال يهتم به الشباب (${topCat[1]}) ولا توجد فعالية قادمة فيه`, act: `showAddEventModal()`, btn: 'برمج فعالية' });
    }
    const gold = d.members.filter(u => memberStats(u.id).st.stars >= 50).length;
    if (gold) out.push({ c: '#f4b41b', i: 'fa-crown', txt: `${gold} ${gold > 2 ? 'أعضاء' : 'عضو'} في المستوى الذهبي أو أعلى: كافئهم بسحب خاص`, act: `openRewardForm()`, btn: 'مكافأة جديدة' });
    return out;
}

function bars(rows, color) {
    const max = Math.max(1, ...rows.map(r => r[1]));
    return `<div class="bars">${rows.map(([l, v, c]) => `<div class="bar-col" title="${esc(l)}: ${v}"><span class="bar-v">${v}</span><div class="bar" style="height:${Math.max(4, v / max * 100)}%; --c:${c || color}"></div><small>${esc(l)}</small></div>`).join('')}</div>`;
}

function renderDashboard() {
    if (selectedRole !== 'admin' || !document.getElementById('dashboard')) return;
    const d = dashData();
    const name = (currentUserData?.name || '').split(' ')[0];
    document.getElementById('dash-hello').textContent = name ? `مرحباً ${name}` : 'مرحباً';
    document.getElementById('dash-kpis').innerHTML = [
        [d.pendingCount, 'طلبات للمراجعة', 'fa-inbox', '#f59e0b', `switchTab('admin-bookings')`],
        [d.guestsToday, 'نزيل اليوم', 'fa-bed', '#3b82f6', `switchTab('admin-bookings')`],
        [d.upcoming.length, 'فعالية قادمة', 'fa-calendar-check', '#10b981', `switchTab('admin-events')`],
        [typeof unreadTotal === 'function' ? unreadTotal() : 0, 'رسالة غير مقروءة', 'fa-comments', '#8b5cf6', `switchTab('messages')`],
        [d.members.length, 'عضو', 'fa-users', '#ec4899', `switchTab('members')`],
        [d.monthCerts.length, 'شهادة هذا الشهر', 'fa-certificate', '#f4b41b', `switchTab('members')`]
    ].map(([n, l, i, c, a]) => `<button class="stat-tile kpi" style="--c:${c}" onclick="${a}"><i class="fas ${i}"></i><b>${n}</b><span>${l}</span></button>`).join('');

    const ins = dashInsights(d);
    document.getElementById('dash-insights').innerHTML = ins.length ? ins.slice(0, 6).map(x => `
        <div class="insight" style="--c:${x.c}"><span class="mini-ico" style="--c:${x.c}"><i class="fas ${x.i}"></i></span><p>${esc(x.txt)}</p>${x.act ? `<button class="btn btn-outline btn-small" onclick="${x.act}">${x.btn}</button>` : ''}</div>`).join('')
        : `<div class="insight ok"><span class="mini-ico" style="--c:#10b981"><i class="fas fa-circle-check"></i></span><p>كل شيء على ما يرام: لا توجد طلبات متأخرة ولا شهادات معلّقة.</p></div>`;

    // الشهادات خلال 6 أشهر
    const months = [];
    for (let k = 5; k >= 0; k--) {
        const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() - k);
        const key = toDateStr(dt).slice(0, 7);
        months.push([MONTHS_DZ[dt.getMonth()], allCertsAdmin.filter(c => String(c.issuedAt || c.date || '').slice(0, 7) === key).length]);
    }
    document.getElementById('dash-chart-certs').innerHTML = bars(months, '#f4b41b');
    const cats = Object.entries(TALENT_CATS).map(([k, c]) => [c.short, allTalents.filter(x => x.category === k).length + d.members.filter(u => u.talentQuiz?.top === k).length, c.color]);
    document.getElementById('dash-chart-talents').innerHTML = bars(cats);
    const byType = {};
    allCertsAdmin.forEach(c => { const g = (CERT_TYPES[c.type] || CERT_TYPES.event).group; byType[g] = (byType[g] || 0) + 1; });
    const totalC = allCertsAdmin.length || 1;
    document.getElementById('dash-impact').innerHTML = `
        <div class="impact-row"><b>${d.hours}</b><span>ساعة تطوع موثّقة</span></div>
        ${['part', 'vol', 'charity'].map(g => `<div class="impact-line"><span><i class="fas ${CERT_GROUPS[g].icon}"></i> ${CERT_GROUPS[g].label}</span><div class="tm-bar"><span style="width:${Math.round((byType[g] || 0) / totalC * 100)}%"></span></div><b>${byType[g] || 0}</b></div>`).join('')}`;
    document.getElementById('dash-upcoming').innerHTML = d.upcoming.slice(0, 4).map(e => {
        const p = parseDateStr(e.date);
        const n = Object.keys(e.participants || {}).length + Object.keys(e.attendees || {}).length;
        return `<div class="mini-row" onclick="openAttendance('${e.id}')"><div class="date-badge small"><b>${p ? p.d : ''}</b><span>${p ? MONTHS_DZ[p.m - 1] : ''}</span></div>
            <div class="mini-info"><b>${esc(e.title)}</b><small>${esc(e.placeName || e.address || '')} · ${esc(e.time || '')}</small></div><span class="mini-side">${n} <i class="fas fa-users"></i></span></div>`;
    }).join('') || emptyState('fa-calendar-plus', 'لا توجد فعاليات قادمة', '<button class="btn btn-primary btn-small" onclick="showAddEventModal()"><i class="fas fa-plus"></i> فعالية جديدة</button>');
    document.getElementById('dash-report').innerHTML = dashReportHTML || `<p class="muted small">يحلّل الذكاء الاصطناعي نشاط الدور (الطلبات، الفعاليات، الحضور، التطوع، المواهب) ويقترح أولويات الأسبوع.</p>`;
}

async function aiDashboardReport(btn) {
    const d = dashData();
    const ins = dashInsights(d);
    const cats = Object.entries(TALENT_CATS).map(([k, c]) => `${c.label}: ${allTalents.filter(x => x.category === k).length}`).join('، ');
    const summary = `طلبات معلقة: حجوزات ${d.pending.bookings.length}، انخراطات ${d.pending.clubs.length}، مواهب ${d.pending.talents.length}، أعمال خيرية ${d.pending.charity.length}. نزلاء اليوم: ${d.guestsToday}. فعاليات قادمة: ${d.upcoming.length} (${d.upcoming.slice(0, 5).map(e => e.title + ' ' + e.date).join('، ')}). أعضاء: ${d.members.length}. شهادات هذا الشهر: ${d.monthCerts.length}. ساعات تطوع موثّقة: ${d.hours}. المواهب حسب المجال: ${cats}. تنبيهات: ${ins.map(x => x.txt).join(' | ') || 'لا شيء'}.`;
    const run = async () => {
        let html;
        try {
            const out = await aiText(`أنت مستشار لتسيير دور الشباب في الجزائر. هذه أرقام المنصة:\n${summary}\nاكتب تقريراً قصيراً بالعربية: سطر يلخص الوضع، ثم 3 أولويات عملية لهذا الأسبوع (كل أولوية في سطر يبدأ بـ «- »)، ثم فكرة فعالية واحدة مناسبة لاهتمامات الشباب. لا تخترع أرقاماً.`, { temperature: 0.5, maxTokens: 500 });
            html = `<div class="ai-report"><span class="ai-mode live"><i class="fas fa-bolt"></i> Gemini</span>${esc(out).replace(/\n/g, '<br>')}</div>`;
        } catch (e) {
            html = `<div class="ai-report"><span class="ai-mode local"><i class="fas fa-microchip"></i> تحليل محلي</span>
                <b>الوضع:</b> ${d.pendingCount} طلبات للمراجعة، ${d.upcoming.length} فعاليات قادمة، ${d.monthCerts.length} شهادة هذا الشهر و${d.hours} ساعة تطوع موثّقة.<br>
                <b>الأولويات:</b><br>${(ins.length ? ins.slice(0, 3).map(x => '- ' + esc(x.txt)) : ['- لا توجد أولويات عاجلة: واصل برمجة الفعاليات وتأكيد الحضور بالرمز']).join('<br>')}<br>
                <small class="muted">فعّل Firebase AI Logic لتحصل على تقرير مكتوب بـ Gemini.</small></div>`;
        }
        dashReportHTML = html;
        document.getElementById('dash-report').innerHTML = html;
    };
    aiWriteInto(btn, run);
}
