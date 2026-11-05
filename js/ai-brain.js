// =====================================================================
// مواهب داري: «عقل» المساعد الذكي
// - يفهم الدارجة الجزائرية بالحروف العربية واللاتينية (3=ع، 7=ح، 9=ق، 5=خ) والفرنسية والفصحى
// - يستخرج الولاية، المجال، الوقت، عدد الليالي والأشخاص، والدار المقصودة
// - يتذكّر سياق المحادثة («وفي وهران؟»، «شحال السومة؟»، «واش كاين فيها نوادي؟»)
// - يركّب أجوبة مفصّلة من بيانات المنصة، وتُمرَّر لـ Gemini كمعلومات موثوقة عند تفعيله
// =====================================================================

// ---------- التطبيع ----------
function nlNorm(s) {
    let t = String(s || '').toLowerCase().normalize('NFD');
    t = t.replace(/[̀-ͯ]/g, '')                      // حركات الحروف اللاتينية (é → e)
         .replace(/[ً-ٰٟـ]/g, '')          // التشكيل والهمزات المركّبة والتطويل
         .replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ء/g, '')
         .replace(/ڨ/g, 'ق').replace(/ڤ/g, 'ف').replace(/پ/g, 'ب').replace(/چ/g, 'ج').replace(/ک/g, 'ك').replace(/ی/g, 'ي')
         .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
         .replace(/[\u060C\u061B\u061F\u066A-\u066D\u06D4\u06DD\u06DE]/g, ' ')   // ؟ ، ؛ ٪ ۔ (علامات ترقيم داخل نطاق العربية)
         .replace(/[^؀-ۿa-z0-9\s]/g, ' ')
         .replace(/\s+/g, ' ').trim();
    return ' ' + t + ' ';
}
function nlKw(k) {
    const lead = k.startsWith(' '), trail = k.endsWith(' ');
    return (lead ? ' ' : '') + nlNorm(k).trim() + (trail ? ' ' : '');
}
const nlEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- المعجم: النوايا ----------
const NL_INTENTS_RAW = {
    greet:      [' سلام', 'السلام عليكم', ' مرحبا', ' اهلا', ' اهلين', 'صباح الخير', 'مساء الخير', 'مسا الخير', 'صباح النور', ' salam', ' slm ', ' bonjour', ' bonsoir', ' hello', ' hi ', 'واش راك', 'واش راكي', 'واش راكم', 'كي راك', 'كيراك', 'كي داير', 'كيداير', 'لاباس', ' labas', ' cava ', 'ca va', ' wesh ', ' wech ', ' wach rak'],
    thanks:     ['شكرا', 'يعطيك الصحه', 'يعطيك صحه', 'صحيت', 'بارك الله', 'الله يبارك', 'جزاك الله', 'يرحم والديك', 'ربي يحفظك', 'merci', ' saha ', 'sahit', 'ya3tik saha', 'yatik saha', 'thanks', 'thank you', 'mrc', 'عجبني', 'يعجبني', 'برافو', 'bravo', ' super', 'رائع', 'ممتاز', 'سعيد بالتطبيق', 'سعيده بالتطبيق', 'فرحان', 'mlih bzaf', 'زين بزاف', 'top '],
    bye:        ['بسلامه', 'بالسلامه', 'في امان الله', 'الى اللقاء', 'نشوفك', ' bye', 'au revoir', 'tchao', 'ciao', 'bslama', 'a plus'],
    who:        ['شكون انت', 'شكون نتا', 'شكون راك', 'من انت', 'واش تقدر دير', 'واش تعرف دير', 'واش تدير', 'كيفاش تخدم', 'واش تعاوني', 'عاوني', 'ساعدني', ' help', ' aide', 'aidez', 'chkoun', 'chkon', 'qui es tu', 'tu fais quoi', 'tu peux faire', 'مساعده', 'تقدر تعاوني'],
    about:      ['مواهب داري', 'هاد التطبيق', 'هذا التطبيق', 'هاد المنصه', 'هذه المنصه', 'شكون دار', 'شكون صمم', 'من صمم', 'من اعد', 'من صنع', 'mawaheb', 'plateforme', 'واش هي المنصه'],
    booking:    ['حجز', 'نحجز', 'احجز', 'حجزت', 'ريزرف', 'نريزرفي', 'reserv', 'nhjez', 'n7jez', 'nehjez', 'نبات', 'نبيت', 'مبيت', 'نرقد', 'رقاد', 'اقامه', 'نقيم', 'سرير', 'اسره', 'بيت الشباب', 'بيوت الشباب', 'بيت شباب', 'اوبيرج', 'لوبيرج', 'auberge', 'hostel', 'heberg', 'dormir', 'chambre', ' lit ', ' nbat', 'nergod', 'nor9od', 'مخيم', 'camping', 'لوطيل', 'hotel', 'فندق', 'معسكر صيفي', 'مخيم صيفي', 'colonie', 'camp de vacances', 'blasa nbat', 'بلاصه نبات', 'وين نبات', 'وين نرقد'],
    price:      ['شحال', 'بشحال', 'بقداش', 'قداش', 'الثمن', 'ثمن', 'السعر', 'سعر', 'دراهم', 'سومه', 'السومه', 'تكلف', 'تكلفه', 'غالي', 'رخيص', 'مجاني', 'بلاش', 'باطل', ' prix', 'combien', 'chhal', 'ch7al', 'b9adech', 'bchhal', 'tarif', 'gratuit', ' cher', 'dinar', 'دينار', ' دج'],
    hours:      ['وقتاش', 'واقتاش', 'اوقات', 'مواعيد', 'توقيت', 'يحل', 'تحل', 'يحلو', 'تحلو', 'يفتح', 'تفتح', 'يفتحو', 'يغلق', 'تغلق', 'يسكر', 'تسكر', 'يسكرو', 'يسدو', 'يبلعو', 'تبلع', 'horaire', 'heure', 'ouvert', 'ferme', 'wa9tach', 'wektach', 'waktach', 'mfta7', 'ma7loul'],
    openNow:    ['مفتوح', 'محلول', 'محلوله', 'مفتوحه', 'حال درك', 'حاله درك', 'ouvert maintenant', 'maintenant', ' درك', ' دروك', ' ضرك', ' الان', ' توا ', ' dorka', ' drok', ' doka'],
    events:     ['فعالي', 'نشاط', 'انشطه', 'نشاطات', 'برنامج', ' حفل', 'حفله', 'مهرجان', 'مسابق', 'ورشه', 'ورشات', 'تظاهر', 'سهره', 'خرجه', 'رحله', 'رحلات', 'جوله', 'activit', 'evenement', ' event', 'programme', 'festival', 'concours', 'atelier', 'soiree', 'sortie', 'excursion', 'واش كاين', 'شكاين', 'chkayen', 'wach kayen', 'واش كاين جديد', 'واش صاري', 'وين نخرج', 'نخرج'],
    volunteer:  ['تطوع', 'متطوع', 'نتطوع', 'تطوعي', 'بينيفول', 'benevol', 'volont', 'volunteer', 'نعاون', 'نساعد الناس', 'نخدم بلاش', 'n3awen', 'naawen', 'خدمه تطوعيه'],
    charity:    ['خيري', 'خيريه', 'تبرع', 'نتبرع', 'صدقه', ' قفه', 'فطور الصايم', 'مطعم الرحمه', 'اطعام', 'ايتام', 'يتامى', 'مسنين', 'الشيوخ', 'المرضى', 'don du sang', 'donner du sang', 'charit', 'caritat', 'sadaqa', 'kofa', ' الدم', ' بالدم'],
    clubs:      ['نادي', 'نوادي', 'النادي', 'انخراط', 'ننخرط', 'نخرط', 'نسجل في', 'نتسجل', 'نتعلم', 'دروس', 'دورس', 'تكوين', ' دوره', 'كورس', ' club', 'inscri', 'nsajel', ' cours', 'formation', 'apprendre', 'nt3alem', 'ntaalem', 'نقرا ', 'حصص', 'حصه'],
    stars:      [' نجم', 'نجوم', 'نجمه', 'ستار', 'etoile', ' star', 'مستوى', 'مستواي', 'niveau', 'نقاط', 'نقطه', ' points', 'ذهبي', 'برونزي', 'فضي', 'ماسي', 'ترتيبي', 'classement'],
    rewards:    ['مكافا', 'مكافي', 'كادو', 'هديه', 'هدايا', 'جايزه', 'جائزه', 'جوايز', 'جوائز', ' سحب', 'القرعه', 'قرعه', 'نربح', ' ربح', 'rbe7', 'nerbah', 'nrbah', 'gagner', 'cadeau', 'recompense', 'tirage', 'gift', 'prize'],
    passport:   ['شهاد', 'جواز', 'سيره ذاتيه', ' cv ', 'attestation', 'certificat', 'diplome', 'بطاقتي', 'الكود تاعي', 'qr', 'نتحقق', 'تحقق'],
    quiz:       ['موهبت', 'مواهبي', 'نكتشف', 'اكتشف', 'واش نقدر ندير', 'واش ندير', 'ماعرفتش واش', 'ما عرفتش واش', 'زعفان', 'قلقان', 'زهقان', 'ملل', ' فراغ', 'ما عندي ما ندير', 'مليت', 'قنطت', ' talent', 'ennui', 'je sais pas quoi', 'je m ennuie', 'wach ndir', 'ma3raftch'],
    houses:     ['دار الشباب', 'دور الشباب', 'دار شباب', 'ميزون', 'maison de jeune', 'maison des jeunes', 'dar chabab', 'dar chbab', 'dar echabab', 'مركب رياضي', 'ملعب', ' قاعه', ' salle', 'complexe', 'stade', 'مرافق', 'مرفق'],
    where:      [' وين ', ' فين ', ' اين ', 'قريب', 'اقرب', 'حدايا', 'حذايا', 'بالقرب', 'قدامي', 'near', 'proche', ' ou se', ' win ', ' fin ', 'pres de', 'وين كاين', 'وين نلقى', 'نلقى'],
    contact:    ['نتصل', 'نعيط', ' عيط', 'نكلم', ' رقم', 'نومرو', 'تيليفون', 'تلفون', 'هاتف', 'نراسل', 'راسل', 'تواصل', 'ميساج', ' مسج', 'رساله', 'numero', 'telephone', ' tel ', 'appeler', 'contact', ' message', 'email', ' mail'],
    directions: ['كيفاش نروح', 'كيفاش نوصل', 'كيف اصل', 'الطريق', 'الاتجاه', 'نوصل ل', 'خريطه', 'itineraire', 'chemin', 'comment aller', ' route', ' gps', ' map'],
    install:    ['نسطال', 'نسطالي', 'نحمل التطبيق', 'نتلشارجي', 'telecharg', 'install', 'تحميل التطبيق', 'تثبيت', 'playstore', 'play store', ' apk', 'appli'],
    account:    [' حساب', 'نسجل روحي', 'كلمه السر', 'كلمه المرور', 'نسيت', 'mot de passe', 'password', ' compte', 'connexion', 'login', 'تسجيل الدخول', 'نكونيكتي', 'connecter'],
    myStuff:    ['حجوزاتي', 'حجزي', 'تذكرتي', 'تيكي', 'ticket', 'ma reservation', 'طلبي', 'طلباتي', 'نواديا', 'انخراطي']
};
const NL_STRONG = { booking: 2, price: 2, hours: 2, events: 2, volunteer: 2.2, charity: 2.4, clubs: 2, stars: 2, rewards: 2.2, passport: 2, quiz: 2, contact: 1.6, directions: 2, install: 2.4, account: 2, myStuff: 2.6, greet: 1, thanks: 1.2, bye: 1.2, who: 1.6, about: 1.4, houses: 1, where: 0.8, openNow: 1.2 };
const NL_INTENTS = Object.fromEntries(Object.entries(NL_INTENTS_RAW).map(([k, v]) => [k, v.map(nlKw)]));

// ---------- المعجم: مجالات المواهب ----------
const NL_CATS = Object.fromEntries(Object.entries({
    art:     ['رسم', 'نرسم', 'رسام', 'تصوير', 'فوتو', 'تصميم', 'ديزاين', 'خط عربي', ' الخط', 'فنون', ' فن ', 'تشكيلي', 'dessin', 'peinture', 'photo', 'design', 'graffiti', ' art ', 'rsem', 'calligraph'],
    music:   ['موسيق', 'مزيكا', 'غنا', 'نغني', 'قيتار', 'غيتار', ' عود', 'بيانو', ' راب', 'شعبي', ' راي ', 'اندلسي', 'انشاد', 'كمان', 'music', 'musique', 'chant', 'guitar', 'piano', ' rap ', 'violon', 'mazika', 'nghanni'],
    tech:    ['برمج', 'اعلام الي', 'انفو', 'كمبيوتر', 'حاسوب', 'روبوت', 'تقني', 'ذكاء اصطناعي', 'جيمينغ', 'programm', ' code', 'coding', ' info ', 'informatique', 'robot', 'ordinateur', ' pc ', ' web', 'gaming', 'electroni'],
    sport:   ['رياض', 'سبور', 'كوره', ' كره', ' فوت', 'بالون', 'سباح', ' عوم', 'كاراتي', 'كاراطي', 'جيدو', 'ملاكم', 'بوكس', ' جري', 'ركض', 'باسكيت', 'هاند', 'تنس', 'جمباز', 'لياقه', 'كمال الاجسام', 'football', ' foot', ' sport', 'natation', 'karate', 'judo', 'boxe', 'basket', 'handball', 'tennis', 'fitness', 'musculation', 'koura'],
    stage:   ['مسرح', 'تمثيل', 'نمثل', 'ممثل', 'القاء', 'كوميد', 'سكاتش', 'ستاند اب', 'سينما', 'theatre', 'comedie', 'acteur', 'sketch', 'stand up', 'cinema'],
    writing: ['كتابه', 'نكتب', ' قصه', ' قصص', ' شعر', 'قراءه', 'نقرا الكتب', 'روايه', ' ادب', 'مطالعه', 'ecriture', 'ecrire', 'poesie', 'lecture', ' livre', ' roman', ' slam'],
    social:  ['كشاف', 'سكوت', ' بيئ', 'تخييم', 'جمعي', 'مبادر', 'scout', 'environnement', 'association', 'randonn']
}).map(([k, v]) => [k, v.map(nlKw)]));

// ---------- المعجم: الولايات بالدارجة واللاتينية والفرنسية ----------
const NL_WILAYA_ALIASES = {
    '1': ['ادرار', 'adrar'], '2': ['الشلف', 'chlef', 'شلف'], '3': ['الاغواط', 'laghouat', 'لغواط'], '4': ['ام البواقي', 'oum el bouaghi'],
    '5': ['باتنه', 'batna'], '6': ['بجايه', 'bejaia', 'bgayet', 'vgayet', 'bougie', 'بقايت'], '7': ['بسكره', 'biskra'], '8': ['بشار', 'bechar'],
    '9': ['البليده', 'blida', 'بليده'], '10': ['البويره', 'bouira', 'بويره'], '11': ['تمنراست', 'تامنغست', 'tamanrasset', 'tamanghasset', ' tam '],
    '12': ['تبسه', 'tebessa'], '13': ['تلمسان', 'tlemcen', 'tlemsen'], '14': ['تيارت', 'tiaret'], '15': ['تيزي وزو', 'تيزي', 'tizi ouzou', 'tizi'],
    '16': ['الجزائر العاصمه', 'العاصمه', 'دزاير', 'الدزاير', 'الدزاير العاصمه', 'ولايه الجزائر', 'alger', 'algiers', 'dzair', 'dzayer', 'el djazair', 'la capitale'],
    '17': ['الجلفه', 'djelfa', 'جلفه'], '18': ['جيجل', 'jijel'], '19': ['سطيف', 'سطايف', 'setif', 'stif', 'steef'], '20': ['saida'],
    '21': ['سكيكده', 'skikda'], '22': ['سيدي بلعباس', 'بلعباس', 'sidi bel abbes', 'bel abbes', ' sba '], '23': ['عنابه', 'annaba', 'bone'],
    '24': ['قالمه', 'guelma'], '25': ['قسنطينه', 'قسمطينه', 'constantine', 'qsentina', 'csantina'], '26': ['المديه', 'medea', 'مديه'],
    '27': ['مستغانم', 'mostaganem', 'mosta'], '28': ['المسيله', 'msila', 'مسيله'], '29': ['mascara'], '30': ['ورقله', 'ouargla', 'wargla'],
    '31': ['وهران', 'wahran', 'oran', 'wehran'], '32': ['el bayadh'], '33': ['اليزي', 'illizi'], '34': ['برج بوعريريج', 'البرج', 'bordj bou arreridj', ' bba '],
    '35': ['بومرداس', 'boumerdes'], '36': ['الطارف', 'el tarf'], '37': ['تندوف', 'tindouf'], '38': ['تيسمسيلت', 'tissemsilt'], '39': ['الوادي', 'واد سوف', 'el oued', 'oued souf', ' souf '],
    '40': ['خنشله', 'khenchela'], '41': ['سوق اهراس', 'souk ahras'], '42': ['تيبازه', 'tipaza', 'tipasa'], '43': ['ميله', 'mila'], '44': ['عين الدفلى', 'ain defla'],
    '45': ['النعامه', 'naama'], '46': ['عين تموشنت', 'ain temouchent'], '47': ['غردايه', 'ghardaia', 'ghardaya'], '48': ['غليزان', 'relizane']
};
let nlWilayaCache = { key: '', idx: [] };
function nlWilayaIndex() {
    const facs = getFacilities();
    const key = facs.length + ':' + Object.keys(WILAYAS).length;
    if (nlWilayaCache.key === key) return nlWilayaCache.idx;
    const idx = [];
    // أسماء تحمل معنى آخر في الكلام اليومي (معسكر، سعيدة، البيض) تُفهم فقط مع كلمة «ولاية» أو بالحروف اللاتينية
    const ambiguous = new Set(['16', '20', '29', '32']);
    Object.entries(WILAYAS).forEach(([code, name]) => {
        idx.push([nlNorm((ambiguous.has(code) ? 'ولايه ' : '') + name).trim(), code]);
    });
    Object.entries(NL_WILAYA_ALIASES).forEach(([code, list]) => list.forEach(a => idx.push([nlNorm(a).trim(), code])));
    facs.forEach(f => { if (f.commune && f.wilaya && nlNorm(f.commune).trim().length > 2) idx.push([nlNorm(f.commune).trim(), String(f.wilaya)]); });
    idx.sort((a, b) => b[0].length - a[0].length);
    nlWilayaCache = { key, idx: idx.map(([a, c]) => [new RegExp(`(^|\\s)(و|ف|ب|ل|ال|في|من|ل ال)?${nlEsc(a)}(\\s|$)`), c]) };
    return nlWilayaCache.idx;
}
function nlFindWilaya(t) {
    if (/ (ولايتي|بلادي|حومتي|مدينتي|عندنا|chez nous|ma wilaya|ma ville|bladi) /.test(t) && currentUserData?.wilaya) return String(currentUserData.wilaya);
    for (const [re, code] of nlWilayaIndex()) if (re.test(t)) return code;
    return '';
}

// ---------- الوقت والأعداد ----------
function nlTime(t) {
    if (/ (ا?ليوم|lyoum|lyom|aujourd hui|aujourdhui|today|هاد النهار|هذا اليوم|الليله|lyouma) /.test(t)) return 'today';
    if (/ (غدوه|غدوا|غدا|ghodwa|ghedwa|ghadwa|demain|tomorrow) /.test(t)) return 'tomorrow';
    if (/(ويكاند|ويكند|weekend|week end|نهايه الاسبوع|عطله الاسبوع| الجمعه | السبت | samedi | vendredi )/.test(t)) return 'weekend';
    if (/(السمانه|سمانه|هاد الاسبوع|هذا الاسبوع| الاسبوع |semaine|simana)/.test(t)) return 'week';
    if (/(هاد الشهر|هذا الشهر| الشهر |ce mois| mois )/.test(t)) return 'month';
    if (/( العطله | عطله |vacances| الصيف | صيف | ete )/.test(t)) return 'holiday';
    return '';
}
const NL_NUM = { 'واحد': 1, 'وحده': 1, 'جوج': 2, 'زوج': 2, 'زوز': 2, 'اثنين': 2, 'ثلاثه': 3, 'تلاته': 3, 'ثلاث': 3, 'تلت': 3, 'اربعه': 4, 'ربعه': 4, 'اربع': 4, 'خمسه': 5, 'خمس': 5, 'سته': 6, 'ست': 6, 'سبعه': 7, 'ثمنيه': 8, 'ثمانيه': 8, 'تسعه': 9, 'عشره': 10,
    'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5, 'six': 6, 'sept': 7, 'zouj': 2, 'jouj': 2, 'zoudj': 2, 'tlata': 3, 'arb3a': 4, 'khamsa': 5 };
function nlNumBefore(t, unit) {
    const m = t.match(new RegExp(`(\\d+|${Object.keys(NL_NUM).join('|')}) ?(${unit})`));
    if (!m) return 0;
    return /^\d+$/.test(m[1]) ? parseInt(m[1]) : NL_NUM[m[1]] || 0;
}
function nlCounts(t) {
    let nights = nlNumBefore(t, 'ليالي|ليال|ليلات|ليله|ايام|يوم|nuits?|jours?|nights?|days?');
    if (!nights && /(ليلتين|يومين|deux nuits|lilatin|liltin|lilten|leltin|youmin|yomin)/.test(t)) nights = 2;
    if (!nights && /(سمانه|اسبوع|semaine)/.test(t) && /(نبات|حجز|اقامه|nbat|reserv|سرير)/.test(t)) nights = 7;
    if (!nights && / (ليله|nuit) /.test(t)) nights = 1;
    let persons = nlNumBefore(t, 'اشخاص|شخص|انفار|نفار|افراد|personnes?|pers|صحاب|اصحاب|اصدقاء|ناس|people');
    if (!persons && /(شخصين|انا وصاحبي|انا وصديقي|انا وختي|انا وخويا|moi et mon|moi et ma|nous deux|جوج ناس|زوج ناس|ana w sahbi|ana w sa7bi|ana w khouya|ana w khoya|ana w okhti|ana w sahbti|ana wsahbi|zouj nas|jouj nas)/.test(t)) persons = 2;
    if (!persons && / (وحدي|بوحدي|seul|seule|wahdi) /.test(t)) persons = 1;
    if (!persons) {
        const nightUnit = '(?:ليالي|ليال|ليلات|ليله|ايام|يوم|nuits?|jours?|nights?)';
        const m = t.match(new RegExp(`\\s(?:ل|لل|pour |l )\\s?(\\d+|${Object.keys(NL_NUM).join('|')})(?!\\s?${nightUnit})\\s`));
        if (m) persons = /^\d+$/.test(m[1]) ? parseInt(m[1]) : NL_NUM[m[1]] || 0;
    }
    return { nights: Math.min(nights, 30), persons: Math.min(persons, 40) };
}

// ---------- أسلوب الجواب: دارجة أو فصحى ----------
const NL_DARIJA_MARKERS = [' واش ', ' كاش ', ' نحب ', ' حاب ', ' حابه ', ' وين ', ' فين ', 'كيفاش', 'شحال', 'بقداش', ' بزاف', ' ديال', ' تاع ', ' تاعي', ' راني', ' راك ', ' راكي', ' نتا ', ' نتي ', 'ماكانش', ' كاين', ' باش ', ' درك ', ' دروك', ' غدوه', ' بصح ', ' برك ', ' ماشي ', ' علاش', 'وقتاش', ' مليح', ' نروح', ' نلقى', ' نقدر', ' ندير', ' نبات', ' جوج ', ' سمانه', ' خويا', ' صاحبي', ' يعطيك', ' بلاصه', ' حومه', ' نخدم', ' زعفان', ' ياسر', ' صحا', ' هاد ', ' هادي', ' داك', ' ماعرفتش',
    ' wach ', ' wech ', ' win ', 'kifach', 'chhal', 'bzaf', ' rani ', ' rak ', ' kayen', ' makach', ' bach ', ' dork', 'ghodwa', ' nheb', 'n7eb', ' nhab', 'khouya', 'sahbi', 'bezaf', ' mlih', 'ya3tik', ' saha', ' nrouh', ' n9der', ' ndir', ' nlga', ' nelga'];
function nlIsDarija(raw, t) {
    if (/[a-z]/.test(t) && /[a-z][3795][a-z]|[3795][a-z]{2}/.test(raw.toLowerCase())) return true; // عربيزي: 3abd, n7eb, 9arya
    return NL_DARIJA_MARKERS.some(m => t.includes(m));
}
function nlPhr(d) {
    return d ? {
        hi: 'مرحبا بيك', found: 'هاك واش لقيت', none: 'للأسف ما لقيتش', steps: 'كيفاش تدير', tip: 'نصيحة صغيرة', more: 'تحب نزيدك معلومات على حاجة أخرى؟',
        good: 'بالتوفيق 💪', nodata: 'ما عنديش هاد المعلومة', ask: 'تقدر تسقسي الدار مباشرة من المنصة', also: 'وزيد', near: 'قراب ليك', or: 'ولا'
    } : {
        hi: 'مرحباً بك', found: 'إليك ما وجدت', none: 'للأسف لم أجد', steps: 'الخطوات', tip: 'نصيحة', more: 'هل تريد معلومات عن شيء آخر؟',
        good: 'بالتوفيق 💪', nodata: 'لا تتوفر لدي هذه المعلومة', ask: 'يمكنك سؤال الدار مباشرة من المنصة', also: 'وأيضاً', near: 'الأقرب إليك', or: 'أو'
    };
}

// ---------- سياق المحادثة ----------
let nlCtx = { intent: '', wilaya: '', cat: '', time: '', facIds: [], evIds: [], nights: 0, persons: 0, darija: false };
function nlReset() { nlCtx = { intent: '', wilaya: '', cat: '', time: '', facIds: [], evIds: [], nights: 0, persons: 0, darija: false }; }
// صيغ العدد بالعربية
function nlNightsGen(n) { return n === 1 ? 'ليلة واحدة' : n === 2 ? 'ليلتين' : nightsLabel(n); }
function nlStarsN(n) { n = Number(n) || 0; return n === 1 ? 'نجمة واحدة' : n === 2 ? 'نجمتان' : n >= 3 && n <= 10 ? `${n} نجوم` : `${n} نجمة`; }

// ---------- التحليل ----------
function nlParse(raw) {
    const t = nlNorm(raw);
    const scores = {};
    Object.entries(NL_INTENTS).forEach(([id, kws]) => {
        let s = 0;
        kws.forEach(k => { if (t.includes(k)) s += (NL_STRONG[id] || 1) * (k.trim().length >= 5 ? 1.25 : 1); });
        if (s) scores[id] = s;
    });
    // «درك/الآن» وحدها لا تعني «مفتوح الآن» إلا مع سؤال عن الأوقات أو الدار
    if (scores.openNow && !scores.hours && !scores.houses && !/(مفتوح|محلول|ouvert)/.test(t)) delete scores.openNow;
    if (scores.openNow) scores.hours = (scores.hours || 0) + scores.openNow;
    const cat = Object.keys(NL_CATS).find(k => NL_CATS[k].some(w => t.includes(w))) || '';
    const wilaya = nlFindWilaya(t);
    const time = nlTime(t);
    const { nights, persons } = nlCounts(t);
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const all = / (كل الولايات|كامل الولايات|في كل بلاصه|partout|toutes les wilayas|وين ما كان) /.test(t);
    const marker = /^ (و |وفي|و في|وب|et |w |و ال|وكاين|و كاين|وواش|و واش|وشحال|و شحال|ووين|و وين|طيب|ok |داك|هاداك|هاذاك|فيها|فيه|تاعها|عندهم)/.test(t) || / (تماك|تما|غادي|هناك|هنالك|tmak|temma|la bas|là bas) /.test(t);
    const short = t.trim().split(' ').length <= 3;
    const pronoun = / (فيها|فيه|تاعها|تاعو|عندهم|عندها|هاديك|هاداك|هذه الدار|نفس الدار|la bas|labas dar) /.test(t);
    let type = '';
    if (/(بيت الشباب|بيوت الشباب|بيت شباب|اوبيرج|auberge|hostel)/.test(t)) type = 'hostel';
    else if (/(دار الشباب|دور الشباب|دار شباب|maison de jeune|maison des jeunes|dar chabab|dar chbab)/.test(t)) type = 'youth';
    else if (/(مخيم|camping|camp )/.test(t)) type = 'camp';
    else if (/(مركب|ملعب|stade|complexe)/.test(t)) type = 'sport';
    const msa = / (اريد|ما هي|ما هو|كيف |هل |لماذا|متى |اين |يمكنني|أود) /.test(t);
    const darija = nlIsDarija(raw, t) || (nlCtx.darija && !msa);
    return { raw, t, scores, ranked, cat, wilaya, time, nights, persons, all, marker, short, pronoun, type, darija };
}

// ---------- أدوات البيانات ----------
function nlNextWeekend() {
    const d = new Date();
    for (let i = 0; i < 7; i++) {
        const x = new Date(d); x.setDate(d.getDate() + i);
        if (x.getDay() === 5 || x.getDay() === 6) return toDateStr(x);
    }
    return todayStr();
}
function nlDateRange(time) {
    const t = todayStr();
    if (time === 'today') return [t, t];
    if (time === 'tomorrow') return [addDays(t, 1), addDays(t, 1)];
    if (time === 'weekend') { const f = nlNextWeekend(); return [f, new Date(f).getDay() === 6 ? f : addDays(f, 1)]; }
    if (time === 'week') return [t, addDays(t, 7)];
    if (time === 'month') return [t, addDays(t, 31)];
    return [t, addDays(t, 120)];
}
function nlTimeLabel(time) {
    return { today: 'اليوم', tomorrow: 'غداً', weekend: 'نهاية الأسبوع', week: 'هذا الأسبوع', month: 'هذا الشهر', holiday: 'العطلة' }[time] || '';
}
function nlFacs({ wilaya, type, bookable }) {
    let list = getFacilities();
    if (bookable) list = list.filter(isBookable);
    if (type) list = list.filter(f => f.type === type);
    if (wilaya) list = list.filter(f => String(f.wilaya) === String(wilaya));
    return sortFacilities(list.slice(), true);
}
function nlEvWilaya(e) { return String(e.wilaya || findFacility(e.placeId)?.wilaya || ''); }
function nlEvents({ wilaya, cat, time, volunteer }) {
    const [from, to] = nlDateRange(time);
    let list = getEvents().filter(e => e.status === 'approved' && (e.date || '') >= from && (e.date || '') <= to);
    if (volunteer) list = list.filter(e => Number(e.volunteers) > 0);
    if (wilaya) list = list.filter(e => nlEvWilaya(e) === String(wilaya));
    if (cat) {
        const re = NL_CATS[cat];
        list = list.filter(e => TALENT_CATS[cat].events.includes(e.category) || re.some(w => nlNorm(e.title + ' ' + (e.description || '')).includes(w)));
    }
    return list.sort(byDateTime);
}
function nlDistance(f) { const d = facilityDistance(f); return d != null && userLocated ? ' · ' + formatDistance(d) : ''; }
function nlFacLine(f) {
    const t = FACILITY_TYPES[f.type] || FACILITY_TYPES.youth;
    const open = facilityOpenState(f);
    return `- **${f.name}** (${t.label}، ${wilayaLabel(f)})${open ? ' · ' + open.label : ''}${nlDistance(f)}`;
}
function nlEvLine(e) {
    const cat = EVENT_CATEGORIES[e.category];
    const reg = Object.keys(e.participants || {}).length;
    const need = Number(e.volunteers) || 0;
    return `- **${e.title}**: ${relativeDay(e.date) || formatDateAr(e.date)}${e.time ? ' على ' + e.time : ''} · ${e.placeName || findFacility(e.placeId)?.name || e.address || ''}${cat ? ' · ' + cat.label : ''}${need > reg ? ` · يحتاج ${need - reg} متطوعين` : ''}`;
}
function nlDayName(f) { return f.closedDay !== undefined && f.closedDay !== '' && typeof WEEKDAYS !== 'undefined' ? WEEKDAYS[Number(f.closedDay)] : ''; }
function nlWName(code) { return code ? 'ولاية ' + getWilayaName(code) : ''; }
function nlTags(list) { return list.filter(Boolean).slice(0, 3).map(x => `[[${x}]]`).join(''); }
function nlAsk(list) { return list.filter(Boolean).slice(0, 3).map(x => `[[ask:${x}]]`).join(''); }
function nlFirstName() { return (currentUserData?.name || currentUser?.displayName || '').trim().split(' ')[0]; }

// ---------- الأجوبة ----------
const NL_HANDLERS = {
    greet(p, P) {
        const n = nlFirstName();
        return `${P.hi}${n ? ' يا ' + n : ''} 👋 ${p.darija ? 'أنا «مساعد داري»، واش نقدر نعاونك اليوم؟' : 'أنا «مساعد داري»، كيف أساعدك اليوم؟'}\n` +
            `${p.darija ? 'تقدر تسقسيني على:' : 'يمكنك أن تسألني عن:'}\n- دور الشباب والنوادي في ولايتك\n- المبيت في بيوت الشباب والأسعار\n- الفعاليات وفرص التطوع\n- النجوم والمكافآت وجواز المواهب` +
            nlTags(['tab:houses', 'quiz', 'tab:rewards']) + nlAsk([p.darija ? 'واش كاين فعاليات هاد السمانة؟' : 'ما الفعاليات هذا الأسبوع؟', p.darija ? 'نحب نبات في بيت الشباب' : 'أريد الحجز في بيت شباب', p.darija ? 'كيفاش نربح النجوم؟' : 'كيف أجمع النجوم؟']);
    },
    thanks(p, P) { return `${p.darija ? 'العفو، الله يسلمك 🌟 ديما في الخدمة!' : 'العفو، يسعدني ذلك 🌟'}\n${P.more}` + nlAsk([p.darija ? 'واش كاين جديد في ولايتي؟' : 'ما الجديد في ولايتي؟', p.darija ? 'كيفاش نتطوع؟' : 'كيف أتطوع؟']); },
    bye(p) { return p.darija ? 'بالسلامة، ربي يوفقك 👋 وكي تحتاج حاجة راني هنا.' : 'في أمان الله 👋 أنا هنا متى احتجت.'; },
    who(p, P) {
        return `${p.darija ? 'أنا «مساعد داري»، المساعد الذكي تاع منصة مواهب داري 🤖' : 'أنا «مساعد داري»، المساعد الذكي لمنصة مواهب داري 🤖'}\n${p.darija ? 'نفهم الدارجة والفرنسية والعربية، وتقدر تهدر معايا بالصوت 🎙️' : 'أفهم الدارجة والفرنسية والفصحى، ويمكنك محادثتي بالصوت 🎙️'}\n` +
            `- **دور الشباب**: «وين كاين دار شباب في وهران؟»\n- **المبيت**: «بشحال الليلة في بيت الشباب سطيف لجوج؟»\n- **النوادي**: «نحب نتعلم القيتار في قسنطينة»\n- **الفعاليات**: «واش كاين هاد الويكاند في العاصمة؟»\n- **التطوع والخير**: «نحب نتطوع» أو «تبرعت بالدم»\n- **النجوم والمكافآت**: «شحال عندي نجوم؟»\n${P.tip}: ${p.darija ? 'كي تقولي ولايتك نعطيك أجوبة أدق.' : 'اذكر ولايتك لأعطيك أجوبة أدق.'}` + nlTags(['quiz', 'tab:houses']);
    },
    about(p) {
        return `**مواهب داري** منصة رقمية تربط شباب الجزائر بدور الشباب وبيوت الشباب في الولايات الـ58، من إعداد **آية عابر**.\n- **تطبيق للشباب**: الدليل، الحجز، الفعاليات، التطوع والأعمال الخيرية، معرض المواهب، جواز المواهب، النجوم والمكافآت، والمراسلة\n- **بوابة لدور الشباب**: لوحة قيادة، الحضور بالمسح، الشهادات الموثّقة، ملفات الأعضاء، والسحوبات الشفافة\n${p.darija ? 'وأنا المساعد الذكي تاعها 😊' : 'وأنا مساعدها الذكي 😊'}` + nlTags(['tab:houses', 'tab:profile', 'tab:rewards']);
    },
    booking(p, P, x) {
        const facs = x.facility ? [x.facility].filter(isBookable) : nlFacs({ wilaya: x.wilaya, type: p.type === 'camp' ? 'camp' : '', bookable: true });
        const nights = p.nights || nlCtx.nights || (x.time === 'weekend' ? 2 : 1);
        const persons = p.persons || nlCtx.persons || 1;
        nlCtx.nights = nights; nlCtx.persons = persons;
        const inD = x.time === 'today' ? todayStr() : x.time === 'weekend' ? nlNextWeekend() : addDays(todayStr(), 1);
        const outD = addDays(inD, nights);
        if (!facs.length) {
            const alt = nlFacs({ bookable: true }).slice(0, 3);
            nlCtx.facIds = alt.map(f => f.id);
            return `${P.none} بيت شباب أو مخيم مسجّل ${x.wilaya ? 'في ' + nlWName(x.wilaya) : ''} حالياً 😕\n${alt.length ? (p.darija ? 'بصح كاين هادو في ولايات أخرى:' : 'لكن تتوفر هذه في ولايات أخرى:') + '\n' + alt.map(nlFacLine).join('\n') : ''}\n${P.tip}: ${p.darija ? 'سقسي دار الشباب في ولايتك، ساعات يعرفو بلايص مبيت قريبة.' : 'اسأل دار الشباب في ولايتك عن أماكن مبيت قريبة.'}` +
                nlTags(alt.slice(0, 2).map(f => 'facility:' + f.id).concat('tab:booking')) + nlAsk([p.darija ? 'وفي وهران؟' : 'وفي وهران؟']);
        }
        const shown = facs.slice(0, 4);
        nlCtx.facIds = shown.map(f => f.id);
        const lines = shown.map(f => {
            const av = availabilityFor(f, inD, outD);
            const avTxt = av ? (av.free >= persons ? ` · ✅ ${av.free} سرير متاح` : ` · ⚠️ ${av.free ? 'متبقٍ ' + av.free + ' فقط' : 'ممتلئ في هذه الفترة'}`) : '';
            return `- **${f.name}** (${wilayaLabel(f)}): ${f.price ? formatDZD(f.price) + ' لليلة للشخص' : 'السعر عند الدار'}${f.capacity ? ` · السعة ${f.capacity} سرير` : ''}${avTxt}${nlDistance(f)}`;
        });
        const best = shown.find(f => f.price) || null;
        const cost = best ? `\n💰 ${p.darija ? 'الحساب التقريبي' : 'التكلفة التقريبية'} في ${best.name}: ${nightsLabel(nights)} × ${personsLabel(persons)} × ${formatDZD(best.price)} = **${formatDZD(best.price * nights * persons)}**` : '';
        return `🛏️ ${p.darija ? 'المبيت' : 'الإقامة'} ${x.wilaya ? 'في ' + nlWName(x.wilaya) : P.near}${x.time ? ' (' + nlTimeLabel(x.time) + ')' : ''}، ${p.darija ? 'من' : 'ابتداءً من'} ${formatDateAr(inD)} ${p.darija ? 'لمدة' : 'لمدة'} ${nlNightsGen(nights)}:\n${lines.join('\n')}${cost}\n\n**${P.steps}:**\n1. ${p.darija ? 'افتح صفحة الحجز واختار الدار' : 'افتح صفحة الحجز واختر المرفق'}\n2. ${p.darija ? 'حط التواريخ وشحال من واحد' : 'حدّد التواريخ وعدد الأشخاص'}\n3. ${p.darija ? 'ابعث الطلب، وكي يتأكد تجيك تذكرة بـ QR' : 'أرسل الطلب، وبعد التأكيد تصلك تذكرة برمز QR'}\n${P.tip}: ${p.darija ? 'ما تنساش بطاقة التعريف، والصيف احجز بكري.' : 'لا تنس بطاقة التعريف، واحجز مبكراً في الصيف.'}` +
            nlTags(shown.slice(0, 2).map(f => 'facility:' + f.id).concat('tab:booking')) +
            nlAsk([persons === 1 ? (p.darija ? 'وشحال لجوج ليلتين؟' : 'وكم لشخصين وليلتين؟') : '', p.darija ? 'واش كاين فعاليات تماك؟' : 'ما الفعاليات هناك؟', p.darija ? 'وقتاش يحلو؟' : 'ما أوقات العمل؟']);
    },
    price(p, P, x) {
        let facs = x.facility ? [x.facility] : x.wilaya ? nlFacs({ wilaya: x.wilaya }) : (nlCtx.facIds || []).map(findFacility).filter(Boolean);
        if (!facs.length) facs = nlFacs({ bookable: true });
        const paid = facs.filter(f => f.price).sort((a, b) => a.price - b.price).slice(0, 4);
        const nights = p.nights || nlCtx.nights || 1, persons = p.persons || nlCtx.persons || 1;
        nlCtx.nights = nights; nlCtx.persons = persons;
        if (!paid.length) return `${P.nodata} على الأسعار ${x.wilaya ? 'في ' + nlWName(x.wilaya) : ''} 🤔\n- ${p.darija ? 'الانخراط في النوادي والفعاليات غالباً مجاني ولا برسوم رمزية' : 'الانخراط في النوادي والفعاليات غالباً مجاني أو برسوم رمزية'}\n- ${P.ask}` + nlTags(facs.slice(0, 1).map(f => 'chat:' + f.id).concat('tab:booking'));
        nlCtx.facIds = paid.map(f => f.id);
        return `💰 ${p.darija ? 'الأسعار' : 'الأسعار'} (${nightsLabel(nights)}، ${personsLabel(persons)}):\n${paid.map(f => `- **${f.name}**: ${formatDZD(f.price)} لليلة للشخص ← المجموع **${formatDZD(f.price * nights * persons)}**`).join('\n')}\n${p.darija ? 'الأسعار رمزية باش تكون في متناول كل الشباب. والانخراط في النوادي غالباً مجاني ولا برسوم رمزية.' : 'الأسعار رمزية لتكون في متناول الشباب، والانخراط في النوادي غالباً مجاني أو برسوم رمزية.'}` +
            nlTags(paid.slice(0, 2).map(f => 'facility:' + f.id).concat('tab:booking')) + nlAsk([p.darija ? 'كيفاش نحجز؟' : 'كيف أحجز؟', nights === 1 ? (p.darija ? 'وشحال لـ 3 ليالي؟' : 'وكم لثلاث ليالٍ؟') : '']);
    },
    hours(p, P, x) {
        let facs = x.facility ? [x.facility] : x.wilaya ? nlFacs({ wilaya: x.wilaya, type: p.type }) : (nlCtx.facIds || []).map(findFacility).filter(Boolean);
        if (!facs.length) facs = nlFacs({ type: p.type }).slice(0, 3);
        facs = facs.slice(0, 4);
        nlCtx.facIds = facs.map(f => f.id);
        const lines = facs.map(f => {
            const open = facilityOpenState(f);
            const day = nlDayName(f);
            return `- **${f.name}**: ${f.openTime ? `من ${f.openTime} إلى ${f.closeTime}` : 'الأوقات غير محددة'}${day ? ` · مغلق يوم ${day}` : ''}${open ? ` · الآن: ${open.open ? '🟢 ' : '🔴 '}${open.label}` : ''}`;
        });
        return `🕒 ${p.darija ? 'الأوقات' : 'أوقات العمل'}:\n${lines.join('\n')}\n${P.tip}: ${p.darija ? 'في رمضان والعطل الأوقات تقدر تتبدل، سقسي الدار قبل ما تروح.' : 'قد تتغير الأوقات في رمضان والعطل، تأكد مع الدار قبل الذهاب.'}` +
            nlTags(facs.slice(0, 1).map(f => 'facility:' + f.id).concat(facs.slice(0, 1).map(f => 'chat:' + f.id))) + nlAsk([p.darija ? 'واش كاين نوادي فيها؟' : 'ما النوادي فيها؟', p.darija ? 'كيفاش نروح ليها؟' : 'كيف أصل إليها؟']);
    },
    events(p, P, x) {
        let list = nlEvents({ wilaya: x.wilaya, cat: x.cat, time: x.time });
        let relaxed = '';
        if (!list.length && x.time) { list = nlEvents({ wilaya: x.wilaya, cat: x.cat }); relaxed = p.darija ? `ما كاين والو ${nlTimeLabel(x.time)}، بصح هادو جايين:` : `لا شيء ${nlTimeLabel(x.time)}، لكن هذه قادمة:`; }
        if (!list.length && x.cat) { list = nlEvents({ wilaya: x.wilaya }); relaxed = p.darija ? `ما لقيتش فعاليات في ${TALENT_CATS[x.cat].label}، بصح كاين هادو:` : `لم أجد فعاليات في ${TALENT_CATS[x.cat].label}، لكن هناك:`; }
        if (!list.length && x.wilaya) { list = nlEvents({}); relaxed = p.darija ? `ما كاين حتى فعالية مبرمجة في ${nlWName(x.wilaya)} درك، هاك واش كاين في ولايات أخرى:` : `لا فعاليات مبرمجة في ${nlWName(x.wilaya)} حالياً، وهذه في ولايات أخرى:`; }
        if (!list.length) return `${P.none} ${p.darija ? 'حتى فعالية مبرمجة درك' : 'أي فعالية مبرمجة حالياً'} 📅\n- ${p.darija ? 'تبّع صفحة الفعاليات، الدور تزيد البرامج كل سمانة' : 'تابع صفحة الفعاليات، فالدور تضيف برامج جديدة باستمرار'}\n- ${p.darija ? 'تقدر حتى تقترح فعالية بروحك من زر ＋' : 'يمكنك أيضاً اقتراح فعالية من زر ＋'}` + nlTags(['tab:events-page']);
        const shown = list.slice(0, 5);
        nlCtx.evIds = shown.map(e => e.id);
        const head = `📅 ${p.darija ? 'الفعاليات' : 'الفعاليات القادمة'}${x.wilaya && !relaxed ? ' في ' + nlWName(x.wilaya) : ''}${x.cat && !relaxed ? ' (' + TALENT_CATS[x.cat].label + ')' : ''}${x.time && !relaxed ? ' ' + nlTimeLabel(x.time) : ''}:`;
        return `${relaxed || head}\n${shown.map(nlEvLine).join('\n')}${list.length > shown.length ? `\n${p.darija ? 'وكاين' : 'وهناك'} ${list.length - shown.length} ${p.darija ? 'أخرى في صفحة الفعاليات.' : 'أخرى في صفحة الفعاليات.'}` : ''}\n\n${p.darija ? 'اضغط «سأحضر» باش يتحسب حضورك، وكي تروح أظهر بطاقتك (QR) تجيك شهادة و⭐.' : 'اضغط «سأحضر» ليُسجَّل حضورك، وعند الدخول أظهر بطاقتك (QR) لتصلك شهادة ونجمة.'}` +
            nlTags(shown.slice(0, 2).map(e => 'event:' + e.id).concat('tab:events-page')) + nlAsk([p.darija ? 'واش كاين فرص تطوع؟' : 'هل توجد فرص تطوع؟', x.wilaya ? '' : (p.darija ? 'وفي ولايتي؟' : 'وفي ولايتي؟'), p.darija ? 'وين نبات إذا رحت؟' : 'أين أبيت إن ذهبت؟']);
    },
    volunteer(p, P, x) {
        let list = nlEvents({ wilaya: x.wilaya, time: x.time, volunteer: true });
        let note = '';
        if (!list.length && (x.wilaya || x.time)) { list = nlEvents({ volunteer: true }); note = p.darija ? `ما كاين فرص ${x.wilaya ? 'في ' + nlWName(x.wilaya) : ''} ${nlTimeLabel(x.time)}، بصح كاين هادو:` : `لا فرص ${x.wilaya ? 'في ' + nlWName(x.wilaya) : ''} ${nlTimeLabel(x.time)}، لكن هناك:`; }
        const shown = list.slice(0, 4);
        nlCtx.evIds = shown.map(e => e.id);
        const lines = shown.map(e => {
            const hrs = Number(e.volunteerHours) || 3;
            return nlEvLine(e) + ` · +${certStars({ type: 'volunteer', hours: hrs })} ⭐ (${hrs} ساعات موثّقة)`;
        });
        const st = window.myStats;
        return `🤝 ${p.darija ? 'التطوع يحسبلك ساعات موثّقة وشهادة ونجوم!' : 'التطوع يمنحك ساعات موثّقة وشهادة ونجوماً!'}\n${shown.length ? (note || (p.darija ? 'فرص قريبة:' : 'فرص قادمة:')) + '\n' + lines.join('\n') : (p.darija ? 'ما كاين حتى فرصة مبرمجة درك، تبّع الصفحة ولا اقترح مبادرة.' : 'لا فرص مبرمجة حالياً، تابع الصفحة أو اقترح مبادرة.')}\n\n**${P.steps}:**\n1. ${p.darija ? 'اضغط «تطوع الآن» في الفرصة اللي تعجبك' : 'اضغط «تطوع الآن» في الفرصة المناسبة'}\n2. ${p.darija ? 'نهار الفعالية أظهر بطاقتك (QR) للمسيّر' : 'يوم الفعالية أظهر بطاقتك (QR) للمسيّر'}\n3. ${p.darija ? 'تجيك شهادة تطوع في جوازك ونجوم: 2 + نجمة على كل ساعتين' : 'تصلك شهادة تطوع في جوازك ونجوم: 2 + نجمة لكل ساعتين'}${st ? `\n${p.darija ? 'درك عندك' : 'لديك حالياً'} **${st.hours}** ${p.darija ? 'ساعة تطوع و' : 'ساعة تطوع و'}**${st.stars}** ⭐.` : ''}` +
            nlTags(shown.slice(0, 1).map(e => 'event:' + e.id).concat('tab:volunteer', currentUser ? 'do:idcard' : 'do:login')) + nlAsk([p.darija ? 'نحب نسجل عمل خيري' : 'أريد تسجيل عمل خيري', p.darija ? 'كيفاش نربح مكافأة؟' : 'كيف أربح مكافأة؟']);
    },
    charity(p, P) {
        const mine = typeof myCharity !== 'undefined' ? myCharity : [];
        return `💚 ${p.darija ? 'الأعمال الخيرية تتحسبلك في جوازك!' : 'الأعمال الخيرية تُوثَّق في جوازك!'}\n${p.darija ? 'كاين بزاف أنواع:' : 'من أمثلتها:'}\n- 🩸 التبرع بالدم\n- 🍲 قفة رمضان، فطور الصايم وإطعام المحتاجين\n- 🌳 التشجير وتنظيف الحي\n- 👵 زيارة المسنين والمرضى\n- 🧒 دعم الأيتام ودروس الدعم المجانية\n\n**${P.steps}:**\n1. ${p.darija ? 'افتح جوازك واضغط «سجّل عملاً خيرياً»' : 'من جوازك اضغط «سجّل عملاً خيرياً»'}\n2. ${p.darija ? 'اختار النوع والتاريخ والدار اللي تقدر تأكدو، وزيد تصويرة إذا كاين' : 'اختر النوع والتاريخ والدار التي تؤكده، وأرفق صورة إن وُجدت'}\n3. ${p.darija ? 'كي تأكدو الدار تجيك شهادة عمل خيري و3 نجوم ⭐⭐⭐' : 'بعد تأكيد الدار تصلك شهادة عمل خيري و3 نجوم ⭐⭐⭐'}${mine.length ? `\n${p.darija ? 'عندك' : 'لديك'} ${mine.filter(c => c.status === 'pending').length} ${p.darija ? 'في الانتظار و' : 'في الانتظار و'}${mine.filter(c => c.status === 'approved').length} ${p.darija ? 'مؤكدة.' : 'مؤكدة.'}` : ''}` +
            nlTags([currentUser ? 'do:charity' : 'do:login', 'tab:volunteer']) + nlAsk([p.darija ? 'واش كاين فرص تطوع؟' : 'هل توجد فرص تطوع؟']);
    },
    clubs(p, P, x) {
        const facs = x.facility ? [x.facility] : nlFacs({ wilaya: x.wilaya, type: p.type });
        const re = x.cat ? NL_CATS[x.cat] : null;
        const rows = [];
        facs.forEach(f => splitList(f.clubs).forEach((c, i) => { if (!re || re.some(w => nlNorm(c).includes(w)) || TALENT_CATS[x.cat].clubs.test(c)) rows.push({ f, c, i }); }));
        let note = '';
        if (!rows.length && x.cat) {
            nlFacs({}).forEach(f => splitList(f.clubs).forEach((c, i) => { if (TALENT_CATS[x.cat].clubs.test(c) || re.some(w => nlNorm(c).includes(w))) rows.push({ f, c, i }); }));
            if (rows.length) note = p.darija ? `ما لقيتش نادي ${TALENT_CATS[x.cat].label} ${x.wilaya ? 'في ' + nlWName(x.wilaya) : ''}، بصح كاين في:` : `لم أجد نادي ${TALENT_CATS[x.cat].label} ${x.wilaya ? 'في ' + nlWName(x.wilaya) : ''}، لكنه متوفر في:`;
        }
        if (!rows.length) return `${P.none} ${p.darija ? 'نادي بهاد المواصفات' : 'نادياً بهذه المواصفات'} 😕\n- ${p.darija ? 'جرب ولاية قريبة ولا مجال آخر' : 'جرّب ولاية مجاورة أو مجالاً آخر'}\n- ${p.darija ? 'راسل الدار تاعك واقترح عليهم يفتحو النادي، كي يكونو بزاف الشباب يتفتح' : 'راسل دار الشباب واقترح فتح النادي إن كان هناك طلب'}` + nlTags(['tab:houses', 'quiz', 'do:newchat']);
        const shown = rows.slice(0, 5);
        nlCtx.facIds = Array.from(new Set(shown.map(r => r.f.id)));
        return `🎭 ${note || (p.darija ? 'النوادي' : 'النوادي المتوفرة') + (x.cat ? ' في ' + TALENT_CATS[x.cat].label : '') + (x.wilaya ? ' في ' + nlWName(x.wilaya) : '') + ':'}\n${shown.map(r => `- **${r.c}**: ${r.f.name} (${wilayaLabel(r.f)})${r.f.openTime ? ` · ${r.f.openTime}-${r.f.closeTime}` : ''}`).join('\n')}${rows.length > shown.length ? `\n${p.darija ? 'وكاين' : 'وهناك'} ${rows.length - shown.length} ${p.darija ? 'نوادي أخرى.' : 'نوادٍ أخرى.'}` : ''}\n\n**${p.darija ? 'كيفاش تنخرط' : 'طريقة الانخراط'}:**\n1. ${p.darija ? 'افتح صفحة الدار واضغط «انخرط» قدام النادي' : 'افتح صفحة الدار واضغط «انخرط» بجانب النادي'}\n2. ${p.darija ? 'حط عمرك ومستواك ورقمك' : 'أدخل سنك ومستواك ورقم هاتفك'}\n3. ${p.darija ? 'كي يقبلوك تجيك شهادة انخراط و2 نجوم ⭐⭐' : 'بعد القبول تصلك شهادة انخراط ونجمتان ⭐⭐'}` +
            nlTags(nlCtx.facIds.slice(0, 2).map(id => 'facility:' + id).concat('quiz')) + nlAsk([p.darija ? 'وقتاش يحلو؟' : 'ما أوقات العمل؟', x.cat ? (p.darija ? 'واش كاين فعاليات في هاد المجال؟' : 'هل توجد فعاليات في هذا المجال؟') : '', p.darija ? 'نحب نعرض موهبتي' : 'أريد عرض موهبتي']);
    },
    catInfo(p, P, x) {
        const c = TALENT_CATS[x.cat];
        const clubs = [];
        nlFacs({ wilaya: x.wilaya }).forEach(f => splitList(f.clubs).forEach(cl => { if (c.clubs.test(cl) || NL_CATS[x.cat].some(w => nlNorm(cl).includes(w))) clubs.push({ f, cl }); }));
        const evs = nlEvents({ wilaya: x.wilaya, cat: x.cat }).slice(0, 3);
        nlCtx.facIds = Array.from(new Set(clubs.map(r => r.f.id))).slice(0, 4);
        nlCtx.evIds = evs.map(e => e.id);
        return `${p.darija ? 'زين! 😍' : 'رائع! 😍'} **${c.label}**: ${c.desc}\n${clubs.length ? `\n🎭 ${p.darija ? 'نوادي' : 'نوادٍ'}${x.wilaya ? ' في ' + nlWName(x.wilaya) : ''}:\n${clubs.slice(0, 3).map(r => `- ${r.cl}: ${r.f.name} (${wilayaLabel(r.f)})`).join('\n')}` : `\n${p.darija ? 'ما لقيتش نادي في هاد المجال' : 'لم أجد نادياً في هذا المجال'}${x.wilaya ? ' في ' + nlWName(x.wilaya) : ''}.`}${evs.length ? `\n\n📅 ${p.darija ? 'فعاليات تناسبك' : 'فعاليات تناسبك'}:\n${evs.map(nlEvLine).join('\n')}` : ''}\n\n🌟 ${p.darija ? 'وتقدر تعرض أعمالك في معرض المواهب وتربح 2 نجوم كي تتنشر.' : 'يمكنك أيضاً عرض أعمالك في معرض المواهب لتربح نجمتين عند النشر.'}` +
            nlTags(nlCtx.facIds.slice(0, 1).map(id => 'facility:' + id).concat(evs.slice(0, 1).map(e => 'event:' + e.id), currentUser ? 'do:addtalent' : 'quiz')) + nlAsk([x.wilaya ? '' : (p.darija ? 'وفي ولايتي؟' : 'وفي ولايتي؟'), p.darija ? 'كيفاش ننخرط؟' : 'كيف أنخرط؟']);
    },
    stars(p, P) {
        const rules = `- حضور فعالية: +${STAR_RULES.event}\n- الانخراط في نادٍ: +${STAR_RULES.club}\n- تطوع: +${STAR_RULES.volunteer} ونجمة على كل ساعتين\n- عمل خيري موثّق: +${STAR_RULES.charity}\n- موهبة منشورة: +${STAR_RULES.talent}`;
        if (!currentUser) return `⭐ **النجوم** ${p.darija ? 'تجمعها كي تشارك وتتطوع:' : 'تجمعها بالمشاركة والتطوع:'}\n${rules}\n${p.darija ? 'كل نجمة = فرصة في سحوبات المكافآت، وكاين 5 مستويات من «نجم صاعد» حتى «ماسي».' : 'كل نجمة = فرصة في سحوبات المكافآت، وهناك 5 مستويات من «نجم صاعد» إلى «ماسي».'}\n${p.darija ? 'سجّل باش تبدا تجمع!' : 'سجّل لتبدأ الجمع!'}` + nlTags(['do:login', 'tab:rewards']);
        const st = window.myStats || { stars: 0, hours: 0, certs: 0 };
        const tier = tierFor(st.stars);
        const plan = volunteerEvents().slice(0, 2).map(e => `- ${p.darija ? 'تطوع في' : 'تطوّع في'} «${e.title}» (${relativeDay(e.date) || formatDateAr(e.date)}): +${certStars({ type: 'volunteer', hours: Number(e.volunteerHours) || 3 })} ⭐`);
        const elig = getRewards().filter(r => r.status !== 'drawn' && st.stars >= (Number(r.minStars) || 0)).slice(0, 2);
        return `⭐ ${p.darija ? 'عندك' : 'لديك'} **${nlStarsN(st.stars)}**، ${p.darija ? 'مستواك' : 'مستواك'} **${tier.label}**${tier.next ? ` · ${p.darija ? 'باقيلك' : 'بقي لك'} **${tier.toNext}** ${p.darija ? 'للمستوى' : 'للمستوى'} ${tier.next.label} (${tier.next.perk})` : ' · أعلى مستوى 👑'}\n\n${p.darija ? 'كيفاش تزيد:' : 'كيف تزيد نجومك:'}\n${rules}${plan.length ? `\n\n🎯 ${p.darija ? 'خطة سريعة:' : 'خطة سريعة:'}\n${plan.join('\n')}` : ''}${elig.length ? `\n\n🎁 ${p.darija ? 'درك تقدر تدخل في:' : 'يمكنك الآن دخول:'} ${elig.map(r => '«' + r.title + '»').join('، ')}` : ''}` +
            nlTags(['tab:rewards', 'tab:volunteer', 'tab:profile']) + nlAsk([p.darija ? 'واش هوما المكافآت؟' : 'ما المكافآت المتاحة؟']);
    },
    rewards(p, P) {
        const st = window.myStats || null;
        const open = getRewards().filter(r => r.status !== 'drawn').slice(0, 4);
        const lines = open.map(r => {
            const ok = st && st.stars >= (Number(r.minStars) || 0);
            return `- **${r.title}**${r.value ? ' (' + r.value + ')' : ''}: ${r.minStars}+ نجمة · ${countdownLabel(r.drawDate)}${st ? (ok ? ` · ${p.darija ? 'فرصتك' : 'فرصتك'} ≈ ${rewardChance(r, st.stars)}%` : ` · 🔒 ${p.darija ? 'باقيلك' : 'تحتاج'} ${Number(r.minStars) - st.stars}`) : ''}${r.sample ? ' · نموذج' : ''}`;
        });
        return `🎁 ${p.darija ? 'المكافآت والسحوبات:' : 'المكافآت والسحوبات:'}\n${lines.join('\n') || (p.darija ? '- ما كاين حتى سحب مفتوح درك' : '- لا توجد سحوبات مفتوحة حالياً')}\n\n**${p.darija ? 'كيفاش يخدم السحب' : 'كيف يعمل السحب'}:**\n- ${p.darija ? 'كل نجمة موثّقة = فرصة، يعني كي تزيد نجومك تزيد فرصتك' : 'كل نجمة موثّقة = فرصة، فكلما زادت نجومك زادت فرصتك'}\n- ${p.darija ? 'المكافآت الغالية تطلب عدد أدنى من النجوم' : 'المكافآت الأثمن تشترط حداً أدنى من النجوم'}\n- ${p.darija ? 'السحب شفاف: تتنشر البذرة وقائمة المشاركين، وأي واحد يقدر يعاود الحساب' : 'السحب شفاف: تُنشر البذرة وقائمة المشاركين ويمكن لأي أحد إعادة الحساب'}` +
            nlTags(['tab:rewards', 'tab:volunteer']) + nlAsk([p.darija ? 'كيفاش نزيد النجوم؟' : 'كيف أزيد نجومي؟']);
    },
    passport(p, P) {
        const st = window.myStats;
        return `🪪 **${p.darija ? 'جواز المواهب' : 'جواز المواهب'}**: ${p.darija ? 'الملف تاعك اللي يجمع' : 'ملفك الذي يجمع'} المشاركات والتطوع والأعمال الخيرية ومواهبك، ${p.darija ? 'بشهادات موثّقة من دور الشباب.' : 'بشهادات موثّقة من دور الشباب.'}\n- ${p.darija ? 'كل شهادة عندها رمز تحقق وQR، والجامعة ولا صاحب الخدمة يقدر يتأكد منها' : 'لكل شهادة رمز تحقق وQR يتحقق منه الجامعة أو صاحب العمل'}\n- ${p.darija ? 'تقدر تطبعها ولا تحفظها PDF' : 'يمكن طباعتها أو حفظها PDF'}\n- ${p.darija ? 'شارك رابط جوازك في الـ CV تاعك' : 'شارك رابط جوازك في سيرتك الذاتية'}\n- ${p.darija ? 'الهاتف والإيميل ما يبانوش في الجواز العام' : 'لا يظهر الهاتف والبريد في الجواز العام'}${st ? `\n${p.darija ? 'درك عندك' : 'لديك حالياً'} **${st.certs}** ${p.darija ? 'شهادة' : 'شهادة'} و**${st.stars}** ⭐.` : ''}` +
            nlTags([currentUser ? 'tab:profile' : 'do:login', currentUser ? 'do:idcard' : '']) + nlAsk([p.darija ? 'كيفاش نجيب شهادة؟' : 'كيف أحصل على شهادة؟']);
    },
    quiz(p, P, x) {
        const evs = nlEvents({ wilaya: x.wilaya || currentUserData?.wilaya || '', time: 'week' }).slice(0, 2);
        return `${p.darija ? 'ما تقلقش، كاين بزاف حوايج تقدر تديرها 😊' : 'لا تقلق، هناك الكثير مما يمكنك فعله 😊'}\n- 🧭 ${p.darija ? 'جرب اختبار «اكتشف موهبتك»: 6 أسئلة ويقولك وين تبان موهبتك، ويقترح عليك نوادي وفعاليات' : 'جرّب اختبار «اكتشف موهبتك»: 6 أسئلة تقترح المجال والنوادي والفعاليات'}\n- 🤝 ${p.darija ? 'التطوع يعرّفك بناس جدد ويعطيك شهادات' : 'التطوع يعرّفك بأشخاص جدد ويمنحك شهادات'}\n- 🎨 ${p.darija ? 'اعرض واش تعرف دير في معرض المواهب' : 'اعرض ما تتقنه في معرض المواهب'}${evs.length ? `\n\n📅 ${p.darija ? 'هاد السمانة كاين:' : 'هذا الأسبوع:'}\n${evs.map(nlEvLine).join('\n')}` : ''}` +
            nlTags(['quiz', 'tab:volunteer', 'tab:talents']) + nlAsk([p.darija ? 'نحب الرياضة' : 'أحب الرياضة', p.darija ? 'نحب الرسم' : 'أحب الرسم']);
    },
    houses(p, P, x) {
        if (x.facility) return NL_HANDLERS.facility(p, P, x);
        const list = nlFacs({ wilaya: x.wilaya, type: p.type });
        if (!list.length) {
            const near = nlFacs({ type: p.type }).slice(0, 3);
            nlCtx.facIds = near.map(f => f.id);
            return `${P.none} ${p.type ? FACILITY_TYPES[p.type].label : (p.darija ? 'مرفق' : 'مرفقاً')} ${p.darija ? 'مسجّل' : 'مسجّلاً'} ${x.wilaya ? 'في ' + nlWName(x.wilaya) : ''} ${p.darija ? 'في المنصة درك' : 'في المنصة حالياً'}.\n${near.length ? (p.darija ? 'هادو كاينين:' : 'هذه متوفرة:') + '\n' + near.map(nlFacLine).join('\n') : ''}` + nlTags(near.slice(0, 2).map(f => 'facility:' + f.id).concat('tab:houses'));
        }
        const shown = list.slice(0, 5);
        nlCtx.facIds = shown.map(f => f.id);
        const evN = nlEvents({ wilaya: x.wilaya }).length;
        return `🏠 ${x.wilaya ? (p.darija ? 'في ' : 'في ') + nlWName(x.wilaya) : (userLocated ? P.near : (p.darija ? 'بعض المرافق' : 'بعض المرافق المسجّلة'))}:\n${shown.map(nlFacLine).join('\n')}${list.length > shown.length ? `\n${p.darija ? 'وكاين' : 'وهناك'} ${list.length - shown.length} ${p.darija ? 'أخرى.' : 'أخرى.'}` : ''}${x.wilaya && evN ? `\n📅 ${p.darija ? 'وكاين' : 'وهناك'} ${evN} ${p.darija ? 'فعالية جاية في هاد الولاية.' : 'فعالية قادمة في هذه الولاية.'}` : ''}${!userLocated && !x.wilaya ? `\n${P.tip}: ${p.darija ? 'قولي ولايتك ولا حدد موقعك باش نرتبهم على حساب القرب.' : 'اذكر ولايتك أو حدد موقعك لأرتبها حسب القرب.'}` : ''}` +
            nlTags(shown.slice(0, 2).map(f => 'facility:' + f.id).concat('tab:houses')) + nlAsk([p.darija ? 'واش كاين نوادي فيها؟' : 'ما النوادي فيها؟', p.darija ? 'وقتاش يحلو؟' : 'ما أوقات العمل؟', p.darija ? 'واش كاين فعاليات تماك؟' : 'ما الفعاليات هناك؟']);
    },
    facility(p, P, x) {
        const f = x.facility;
        const t = FACILITY_TYPES[f.type] || FACILITY_TYPES.youth;
        const open = facilityOpenState(f);
        const day = nlDayName(f);
        const evs = getEvents().filter(e => e.placeId === f.id && e.status === 'approved' && (e.date || '') >= todayStr()).sort(byDateTime).slice(0, 3);
        nlCtx.facIds = [f.id];
        const rows = [
            f.openTime ? `- 🕒 ${f.openTime} - ${f.closeTime}${day ? ' · مغلق يوم ' + day : ''}${open ? ' · ' + open.label : ''}` : '',
            f.phone ? `- 📞 ${f.phone}` : `- 💬 ${p.darija ? 'ما عندهاش رقم مسجّل، راسلها من المنصة' : 'لا رقم مسجّل، راسلها من المنصة'}`,
            f.clubs ? `- 🎭 النوادي: ${splitList(f.clubs).join('، ')}` : '',
            f.facilities ? `- 🧰 ${splitList(f.facilities).join('، ')}` : '',
            isBookable(f) ? `- 🛏️ ${f.capacity ? f.capacity + ' سرير' : 'إقامة'}${f.price ? ' · ' + formatDZD(f.price) + ' لليلة للشخص' : ''}` : '',
            f.description ? `- ℹ️ ${f.description}` : ''
        ].filter(Boolean);
        return `${t.emoji} **${f.name}** (${t.label}، ${placeLine(f, false)})\n${rows.join('\n')}${evs.length ? `\n\n📅 ${p.darija ? 'جاي فيها:' : 'قريباً فيها:'}\n${evs.map(nlEvLine).join('\n')}` : ''}` +
            nlTags(['facility:' + f.id, 'chat:' + f.id, isBookable(f) ? 'tab:booking' : '']) + nlAsk([p.darija ? 'كيفاش نروح ليها؟' : 'كيف أصل إليها؟', isBookable(f) ? (p.darija ? 'بشحال الليلة لجوج؟' : 'كم سعر الليلة لشخصين؟') : (p.darija ? 'كيفاش ننخرط؟' : 'كيف أنخرط؟')]);
    },
    contact(p, P, x) {
        let facs = x.facility ? [x.facility] : x.wilaya ? nlFacs({ wilaya: x.wilaya, type: p.type }) : (nlCtx.facIds || []).map(findFacility).filter(Boolean);
        facs = facs.slice(0, 3);
        nlCtx.facIds = facs.map(f => f.id);
        return `💬 ${p.darija ? 'تقدر تهدر مع أي دار شباب مباشرة من المنصة (المراسلة)، ويجاوبوك المسيّرين.' : 'يمكنك مراسلة أي دار شباب مباشرة من المنصة، ويجيبك المسيّرون.'}${facs.length ? '\n' + facs.map(f => `- **${f.name}**: ${f.phone ? '📞 ' + f.phone : (p.darija ? 'بالمراسلة برك' : 'عبر المراسلة')}${f.email ? ' · ✉️ ' + f.email : ''}`).join('\n') : ''}\n${P.tip}: ${p.darija ? 'قول واش تحب بالتفصيل (النادي، التاريخ، شحال من واحد) باش يجاوبوك بالخف.' : 'اذكر طلبك بالتفصيل (النادي، التاريخ، العدد) ليصلك الرد أسرع.'}` +
            nlTags(facs.length ? facs.slice(0, 2).map(f => 'chat:' + f.id) : ['do:newchat', 'tab:messages']);
    },
    directions(p, P, x) {
        const f = x.facility || (nlCtx.facIds || []).map(findFacility).filter(Boolean)[0] || (x.wilaya ? nlFacs({ wilaya: x.wilaya })[0] : null);
        if (!f) return `🗺️ ${p.darija ? 'قولي على أنهي دار تحب تروح، ونعطيك الطريق عبر خرائط Google.' : 'أخبرني بالدار التي تريدها لأعطيك الطريق عبر خرائط Google.'}` + nlTags(['tab:houses']);
        nlCtx.facIds = [f.id];
        return `🗺️ **${f.name}**: ${placeLine(f)}${nlDistance(f)}\n${p.darija ? 'افتح صفحة الدار واضغط «الاتجاهات» تتفتح خرائط Google وتديك حتى للباب.' : 'افتح صفحة الدار واضغط «الاتجاهات» لتفتح خرائط Google وتوصلك.'}` + nlTags(['facility:' + f.id, 'chat:' + f.id]);
    },
    install(p) {
        return `📲 ${p.darija ? 'تقدر تحط مواهب داري في التيليفون كي تطبيق، بلا Play Store:' : 'يمكنك تثبيت مواهب داري على هاتفك كتطبيق دون متجر:'}\n- **أندرويد**: Chrome ← القائمة ⋮ ← «تثبيت التطبيق»\n- **آيفون**: Safari ← زر المشاركة ← «إضافة إلى الشاشة الرئيسية»\n${p.darija ? 'ويخدم حتى بلا كونكسيون، ويجيك فيه المساعد والحجز والتطوع.' : 'ويعمل حتى دون اتصال، مع اختصارات للمساعد والحجز والتطوع.'}` + nlTags(['do:install']);
    },
    account(p) {
        return `👤 ${p.darija ? 'الحساب مجاني:' : 'الحساب مجاني:'}\n1. ${p.darija ? 'من شاشة الترحيب اضغط «أنشئ حسابك»' : 'من شاشة الترحيب اضغط «أنشئ حسابك»'}\n2. ${p.darija ? 'حط اسمك، الإيميل، الرقم، الولاية وكلمة السر' : 'أدخل الاسم، البريد، الهاتف، الولاية وكلمة المرور'}\n3. ${p.darija ? 'نسيت كلمة السر؟ في صفحة الدخول اضغط «نسيت كلمة المرور» تجيك رسالة في الإيميل' : 'نسيت كلمة المرور؟ اضغط «نسيت كلمة المرور» في صفحة الدخول لتصلك رسالة'}` + nlTags([currentUser ? 'tab:settings' : 'do:login']);
    },
    myStuff(p) {
        if (!currentUser) return `${p.darija ? 'سجّل الدخول باش نوريلك حجوزاتك وطلباتك.' : 'سجّل الدخول لأعرض حجوزاتك وطلباتك.'}` + nlTags(['do:login']);
        const b = (typeof myBookings !== 'undefined' ? myBookings : []).slice(0, 3);
        const m = (typeof myMemberships !== 'undefined' ? myMemberships : []).slice(0, 3);
        return `📋 ${p.darija ? 'طلباتك:' : 'طلباتك:'}\n${b.length ? b.map(x => `- 🛏️ ${x.placeName}: ${formatDateAr(x.checkIn)} ← ${formatDateAr(x.checkOut)} · ${(REQUEST_STATUS[x.status] || REQUEST_STATUS.pending).label} · ${x.code}`).join('\n') : (p.darija ? '- ما عندك حتى حجز' : '- لا حجوزات')}\n${m.length ? m.map(x => `- 🎭 ${x.club} (${x.placeName}): ${(REQUEST_STATUS[x.status] || REQUEST_STATUS.pending).label}`).join('\n') : (p.darija ? '- ما عندك حتى انخراط' : '- لا انخراطات')}` + nlTags(['tab:booking', 'tab:profile']);
    },
    wilayaSummary(p, P, x) {
        const facs = nlFacs({ wilaya: x.wilaya });
        const evs = nlEvents({ wilaya: x.wilaya });
        const clubs = new Set();
        facs.forEach(f => splitList(f.clubs).forEach(c => clubs.add(c)));
        nlCtx.facIds = facs.slice(0, 4).map(f => f.id);
        return `📍 **${nlWName(x.wilaya)}** ${p.darija ? 'في مواهب داري:' : 'في مواهب داري:'}\n- 🏠 ${facs.length} ${p.darija ? 'مرفق' : 'مرفق'}: ${facs.slice(0, 3).map(f => f.name).join('، ') || '—'}\n- 🛏️ ${facs.filter(isBookable).length} ${p.darija ? 'للمبيت' : 'للإقامة'}\n- 🎭 ${clubs.size} ${p.darija ? 'نادي' : 'نادٍ'}${clubs.size ? ': ' + Array.from(clubs).slice(0, 4).join('، ') : ''}\n- 📅 ${evs.length} ${p.darija ? 'فعالية جاية' : 'فعالية قادمة'}${evs[0] ? ' · أقربها «' + evs[0].title + '» ' + (relativeDay(evs[0].date) || formatDateAr(evs[0].date)) : ''}\n${p.darija ? 'على واش تحب نزيدك؟' : 'عمّ تريد التفاصيل؟'}` +
            nlTags(facs.slice(0, 2).map(f => 'facility:' + f.id).concat('tab:houses')) + nlAsk([p.darija ? 'وين نبات تماك؟' : 'أين أبيت هناك؟', p.darija ? 'واش كاين فعاليات؟' : 'ما الفعاليات؟', p.darija ? 'واش كاين نوادي؟' : 'ما النوادي؟']);
    },
    fallback(p, P) {
        return `${p.darija ? 'سمحلي، ما فهمتش مليح واش تحوس 🤔' : 'عذراً، لم أفهم طلبك جيداً 🤔'}\n${p.darija ? 'جرب تكتب هكا:' : 'جرّب مثلاً:'}\n- «${p.darija ? 'وين كاين دار شباب في سطيف؟' : 'دار شباب في سطيف'}»\n- «${p.darija ? 'نحب نبات ليلتين في وهران' : 'أريد المبيت ليلتين في وهران'}»\n- «${p.darija ? 'واش كاين فعاليات هاد الويكاند؟' : 'ما الفعاليات نهاية الأسبوع؟'}»\n- «${p.darija ? 'نحب نتعلم الموسيقى' : 'أريد تعلم الموسيقى'}»\n${P.ask}.` + nlTags(['tab:houses', 'quiz', 'do:newchat']);
    }
};

// المرفق المقصود بالاسم (مثل «بيت الشباب سطيف» أو «دار الشباب تلمسان»)
function nlFindFacility(p, wilaya) {
    if (p.pronoun && nlCtx.facIds.length === 1) return findFacility(nlCtx.facIds[0]);
    const facs = getFacilities();
    const named = facs.filter(f => {
        const n = nlNorm(f.name).replace(/ (دار|بيت|مخيم|المركب|الرياضي|الجواري|الشباب|شباب) /g, ' ').trim();
        return n.length > 3 && p.t.includes(' ' + n + ' ');
    });
    if (named.length === 1) return named[0];
    if (wilaya && p.type) {
        const c = facs.filter(f => String(f.wilaya) === String(wilaya) && f.type === p.type);
        if (c.length === 1) return c[0];
    }
    return null;
}

// ---------- المحرّك ----------
function nlAnswer(raw) {
    const p = nlParse(raw);
    const P = nlPhr(p.darija);
    let intent = p.ranked[0] || '';
    // ترتيب الأولويات عند تعدد النوايا
    const has = k => p.scores[k];
    if (has('price') && (has('booking') || nlCtx.intent === 'booking' || nlCtx.intent === 'price')) intent = 'price';
    if (has('booking') && has('price') && !nlCtx.facIds.length) intent = 'booking';
    if (has('hours') && (has('houses') || has('clubs'))) intent = 'hours';
    if (has('directions')) intent = 'directions';
    if (intent === 'where' || (intent === 'houses' && has('clubs'))) intent = has('clubs') ? 'clubs' : has('booking') ? 'booking' : has('events') ? 'events' : 'houses';
    if (has('greet') && p.ranked.length > 1 && intent === 'greet') intent = p.ranked[1];
    // «شحال عندي نجوم؟» سؤال عن النجوم لا عن السعر
    if ((has('stars') || has('rewards')) && has('price') && !has('booking')) intent = has('stars') ? 'stars' : 'rewards';

    // السياق: لا نرث الولاية والمجال إلا عند المتابعة الصريحة («وفي...»، «تماك»، «فيها»)
    // أو عند سؤال يعود على ما سبق (السعر، الأوقات، الاتصال، الطريق) أو تكرار نفس الموضوع
    const ctxIntents = ['price', 'hours', 'contact', 'directions'];
    const continuing = !intent && (p.time || p.nights || p.persons || p.type || p.wilaya);
    const inheritW = !p.all && !p.wilaya && (p.marker || p.pronoun || ctxIntents.includes(intent) || continuing || (intent && intent === nlCtx.intent && p.short));
    const wilaya = p.all ? '' : (p.wilaya || (inheritW ? nlCtx.wilaya : '') || '');
    const cat = p.cat || (p.marker && ['clubs', 'events', 'catInfo'].includes(nlCtx.intent) ? nlCtx.cat : '');
    const time = p.time || ((p.marker || continuing) && ['events', 'volunteer', 'booking'].includes(nlCtx.intent) ? nlCtx.time : '');
    const facility = nlFindFacility(p, p.wilaya || wilaya);

    if (!intent) {
        if (p.cat) intent = 'catInfo';
        else if ((p.wilaya || p.time || p.nights || p.persons || p.type) && nlCtx.intent && !['greet', 'thanks', 'bye', 'who', 'about'].includes(nlCtx.intent)) intent = nlCtx.intent;
        else if (facility) intent = 'facility';
        else if (p.wilaya) intent = 'wilayaSummary';
        else if (p.nights || p.persons) intent = 'booking';
    }
    if (intent === 'houses' && facility && !p.wilaya) intent = 'facility';
    if (['clubs', 'events'].includes(intent) === false && intent === 'quiz' && p.cat) intent = 'catInfo';
    if (!intent || !NL_HANDLERS[intent]) intent = 'fallback';

    const x = { wilaya, cat, time, facility };
    nlCtx.darija = p.darija;
    const out = NL_HANDLERS[intent](p, P, x);
    if (!['greet', 'thanks', 'bye', 'who', 'about', 'fallback'].includes(intent)) {
        nlCtx.intent = intent === 'facility' ? 'houses' : intent;
        if (wilaya) nlCtx.wilaya = wilaya;
        if (cat) nlCtx.cat = cat;
        nlCtx.time = time;
    }
    return { text: out.replace(/\n{3,}/g, '\n\n').trim(), intent, parsed: { wilaya, cat, time, nights: p.nights, persons: p.persons, darija: p.darija, facility: facility?.id || '' } };
}
