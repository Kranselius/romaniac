// Principal parts for every verb. `npm run build:verbs` expands these into the
// complete conjugation tables in data/verbs.json, which is what the app loads.
// Irregular forms are given explicitly via the `x` overrides.
//
// Fields per verb:
//   inf    infinitive without "a"            en     English meaning
//   g      group/pattern label               lvl    beginner | intermediate | advanced
//   pres   6 present forms (eu tu el noi voi ei)
//   s3     3rd-person subjunctive (să ...)   part   past participle
//   impf   imperfect base (cânta → cântam, cântai, cânta, ...)
//   ps     perfect simplu / mai-mult-ca-perfect stem (cânta → cântai, cântasem)
//   imp    imperative tu, affirmative        c      complement for example sentences
//   x      overrides: { subj:[6], impVoi, ps3, mmcp (stem), noImp }

const V = (inf, en, g, lvl, pres, s3, part, impf, ps, imp, c, x = {}) =>
  ({ inf, en, g, lvl, pres: pres.split(' '), s3, part, impf, ps, imp, c, x });

export const SOURCES = [
  // ---- irregular & very common ----
  V('fi', 'to be', 'irregular', 'beginner', 'sunt ești este suntem sunteți sunt', 'fie', 'fost', 'era', 'fu', 'fii', 'acasă',
    { subj: ['fiu', 'fii', 'fie', 'fim', 'fiți', 'fie'], impVoi: 'fiți', mmcp: 'fuse' }),
  V('avea', 'to have', 'irregular', 'beginner', 'am ai are avem aveți au', 'aibă', 'avut', 'avea', 'avu', 'ai', 'o pisică',
    { mmcp: 'avuse' }),
  V('vrea', 'to want', 'irregular', 'beginner', 'vreau vrei vrea vrem vreți vor', 'vrea', 'vrut', 'voia', 'vru', '', 'o cafea',
    { mmcp: 'vruse', noImp: true }),
  V('putea', 'can, to be able to', '-ea', 'beginner', 'pot poți poate putem puteți pot', 'poată', 'putut', 'putea', 'putu', '', 'ajuta',
    { noImp: true }),
  V('face', 'to do, to make', '-e', 'beginner', 'fac faci face facem faceți fac', 'facă', 'făcut', 'făcea', 'făcu', 'fă', 'o supă'),
  V('merge', 'to go, to walk', '-e', 'beginner', 'merg mergi merge mergem mergeți merg', 'meargă', 'mers', 'mergea', 'merse', 'mergi', 'la piață'),
  V('veni', 'to come', '-i', 'beginner', 'vin vii vine venim veniți vin', 'vină', 'venit', 'venea', 'veni', 'vino', 'acasă'),
  V('mânca', 'to eat', '-a', 'beginner', 'mănânc mănânci mănâncă mâncăm mâncați mănâncă', 'mănânce', 'mâncat', 'mânca', 'mânca', 'mănâncă', 'pâine'),
  V('bea', 'to drink', 'irregular', 'beginner', 'beau bei bea bem beți beau', 'bea', 'băut', 'bea', 'bău', 'bea', 'apă'),
  V('lua', 'to take', 'irregular', 'beginner', 'iau iei ia luăm luați iau', 'ia', 'luat', 'lua', 'lua', 'ia', 'trenul'),
  V('da', 'to give', 'irregular', 'beginner', 'dau dai dă dăm dați dau', 'dea', 'dat', 'dădea', 'dădu', 'dă', 'un cadou'),
  V('sta', 'to stay, to sit', 'irregular', 'beginner', 'stau stai stă stăm stați stau', 'stea', 'stat', 'stătea', 'stătu', 'stai', 'acasă'),
  V('ști', 'to know', '-i', 'beginner', 'știu știi știe știm știți știu', 'știe', 'știut', 'știa', 'știu', 'știi', 'răspunsul'),
  V('vedea', 'to see', '-ea', 'beginner', 'văd vezi vede vedem vedeți văd', 'vadă', 'văzut', 'vedea', 'văzu', 'vezi', 'un film'),
  V('spune', 'to say, to tell', '-e', 'beginner', 'spun spui spune spunem spuneți spun', 'spună', 'spus', 'spunea', 'spuse', 'spune', 'o poveste'),
  V('zice', 'to say', '-e', 'beginner', 'zic zici zice zicem ziceți zic', 'zică', 'zis', 'zicea', 'zise', 'zi', 'bună ziua'),
  V('scrie', 'to write', '-e', 'beginner', 'scriu scrii scrie scriem scrieți scriu', 'scrie', 'scris', 'scria', 'scrise', 'scrie', 'o scrisoare'),
  V('ține', 'to hold, to keep', '-e', 'intermediate', 'țin ții ține ținem țineți țin', 'țină', 'ținut', 'ținea', 'ținu', 'ține', 'cheia'),
  V('dormi', 'to sleep', '-i', 'beginner', 'dorm dormi doarme dormim dormiți dorm', 'doarmă', 'dormit', 'dormea', 'dormi', 'dormi', 'bine'),

  // ---- -a verbs ----
  V('cânta', 'to sing', '-a', 'beginner', 'cânt cânți cântă cântăm cântați cântă', 'cânte', 'cântat', 'cânta', 'cânta', 'cântă', 'un cântec'),
  V('învăța', 'to learn', '-a', 'beginner', 'învăț înveți învață învățăm învățați învață', 'învețe', 'învățat', 'învăța', 'învăța', 'învață', 'română'),
  V('pleca', 'to leave', '-a', 'beginner', 'plec pleci pleacă plecăm plecați pleacă', 'plece', 'plecat', 'pleca', 'pleca', 'pleacă', 'acasă'),
  V('cumpăra', 'to buy', '-a', 'beginner', 'cumpăr cumperi cumpără cumpărăm cumpărați cumpără', 'cumpere', 'cumpărat', 'cumpăra', 'cumpăra', 'cumpără', 'lapte'),
  V('juca', 'to play', '-a', 'beginner', 'joc joci joacă jucăm jucați joacă', 'joace', 'jucat', 'juca', 'juca', 'joacă', 'fotbal'),
  V('asculta', 'to listen', '-a', 'beginner', 'ascult asculți ascultă ascultăm ascultați ascultă', 'asculte', 'ascultat', 'asculta', 'asculta', 'ascultă', 'muzică'),
  V('aștepta', 'to wait', '-a', 'beginner', 'aștept aștepți așteaptă așteptăm așteptați așteaptă', 'aștepte', 'așteptat', 'aștepta', 'aștepta', 'așteaptă', 'autobuzul'),
  V('intra', 'to enter, to go in', '-a', 'beginner', 'intru intri intră intrăm intrați intră', 'intre', 'intrat', 'intra', 'intra', 'intră', 'în casă'),
  V('ajuta', 'to help', '-a', 'beginner', 'ajut ajuți ajută ajutăm ajutați ajută', 'ajute', 'ajutat', 'ajuta', 'ajuta', 'ajută', 'un prieten'),
  V('căuta', 'to look for', '-a', 'beginner', 'caut cauți caută căutăm căutați caută', 'caute', 'căutat', 'căuta', 'căuta', 'caută', 'cheile'),
  V('întreba', 'to ask', '-a', 'beginner', 'întreb întrebi întreabă întrebăm întrebați întreabă', 'întrebe', 'întrebat', 'întreba', 'întreba', 'întreabă', 'profesorul'),
  V('alerga', 'to run', '-a', 'intermediate', 'alerg alergi aleargă alergăm alergați aleargă', 'alerge', 'alergat', 'alerga', 'alerga', 'aleargă', 'în parc'),
  V('termina', 'to finish', '-a', 'intermediate', 'termin termini termină terminăm terminați termină', 'termine', 'terminat', 'termina', 'termina', 'termină', 'lecția'),
  V('arăta', 'to show', '-a', 'intermediate', 'arăt arăți arată arătăm arătați arată', 'arate', 'arătat', 'arăta', 'arăta', 'arată', 'drumul'),
  V('spăla', 'to wash', '-a', 'intermediate', 'spăl speli spală spălăm spălați spală', 'spele', 'spălat', 'spăla', 'spăla', 'spală', 'vasele'),
  V('purta', 'to wear, to carry', '-a', 'intermediate', 'port porți poartă purtăm purtați poartă', 'poarte', 'purtat', 'purta', 'purta', 'poartă', 'o pălărie'),
  V('lăsa', 'to leave, to let', '-a', 'intermediate', 'las lași lasă lăsăm lăsați lasă', 'lase', 'lăsat', 'lăsa', 'lăsa', 'lasă', 'geanta aici'),
  V('uita', 'to forget', '-a', 'intermediate', 'uit uiți uită uităm uitați uită', 'uite', 'uitat', 'uita', 'uita', 'uită', 'umbrela'),
  V('repara', 'to repair', '-a', 'intermediate', 'repar repari repară reparăm reparați repară', 'repare', 'reparat', 'repara', 'repara', 'repară', 'bicicleta'),
  V('schimba', 'to change', '-a', 'intermediate', 'schimb schimbi schimbă schimbăm schimbați schimbă', 'schimbe', 'schimbat', 'schimba', 'schimba', 'schimbă', 'planul'),
  V('suna', 'to call, to ring', '-a', 'beginner', 'sun suni sună sunăm sunați sună', 'sune', 'sunat', 'suna', 'suna', 'sună', 'acasă'),
  V('urca', 'to climb, to go up', '-a', 'intermediate', 'urc urci urcă urcăm urcați urcă', 'urce', 'urcat', 'urca', 'urca', 'urcă', 'pe munte'),
  V('număra', 'to count', '-a', 'intermediate', 'număr numeri numără numărăm numărați numără', 'numere', 'numărat', 'număra', 'număra', 'numără', 'banii'),
  V('comanda', 'to order', '-a', 'intermediate', 'comand comanzi comandă comandăm comandați comandă', 'comande', 'comandat', 'comanda', 'comanda', 'comandă', 'o pizza'),
  V('explica', 'to explain', '-a', 'intermediate', 'explic explici explică explicăm explicați explică', 'explice', 'explicat', 'explica', 'explica', 'explică', 'regula'),
  V('spera', 'to hope', '-a', 'intermediate', 'sper speri speră sperăm sperați speră', 'spere', 'sperat', 'spera', 'spera', 'speră', 'mult'),
  V('prefera', 'to prefer', '-a', 'intermediate', 'prefer preferi preferă preferăm preferați preferă', 'prefere', 'preferat', 'prefera', 'prefera', 'preferă', 'ceaiul'),
  V('zbura', 'to fly', '-a', 'intermediate', 'zbor zbori zboară zburăm zburați zboară', 'zboare', 'zburat', 'zbura', 'zbura', 'zboară', 'la Paris'),
  V('curăța', 'to clean', '-a', 'advanced', 'curăț curăți curăță curățăm curățați curăță', 'curețe', 'curățat', 'curăța', 'curăța', 'curăță', 'bucătăria'),

  // ---- -a verbs, -ez type ----
  V('lucra', 'to work', '-a (-ez)', 'beginner', 'lucrez lucrezi lucrează lucrăm lucrați lucrează', 'lucreze', 'lucrat', 'lucra', 'lucra', 'lucrează', 'mult'),
  V('vizita', 'to visit', '-a (-ez)', 'beginner', 'vizitez vizitezi vizitează vizităm vizitați vizitează', 'viziteze', 'vizitat', 'vizita', 'vizita', 'vizitează', 'muzeul'),
  V('studia', 'to study', '-a (-ez)', 'intermediate', 'studiez studiezi studiază studiem studiați studiază', 'studieze', 'studiat', 'studia', 'studia', 'studiază', 'mult',
    { ps3: 'studie' }),
  V('desena', 'to draw', '-a (-ez)', 'intermediate', 'desenez desenezi desenează desenăm desenați desenează', 'deseneze', 'desenat', 'desena', 'desena', 'desenează', 'o casă'),
  V('dansa', 'to dance', '-a (-ez)', 'beginner', 'dansez dansezi dansează dansăm dansați dansează', 'danseze', 'dansat', 'dansa', 'dansa', 'dansează', 'la petrecere'),
  V('telefona', 'to phone', '-a (-ez)', 'intermediate', 'telefonez telefonezi telefonează telefonăm telefonați telefonează', 'telefoneze', 'telefonat', 'telefona', 'telefona', 'telefonează', 'acasă'),
  V('visa', 'to dream', '-a (-ez)', 'intermediate', 'visez visezi visează visăm visați visează', 'viseze', 'visat', 'visa', 'visa', 'visează', 'frumos'),
  V('păstra', 'to keep', '-a (-ez)', 'advanced', 'păstrez păstrezi păstrează păstrăm păstrați păstrează', 'păstreze', 'păstrat', 'păstra', 'păstra', 'păstrează', 'un secret'),

  // ---- -ea verbs ----
  V('tăcea', 'to be quiet', '-ea', 'advanced', 'tac taci tace tăcem tăceți tac', 'tacă', 'tăcut', 'tăcea', 'tăcu', 'taci', 'puțin'),
  V('cădea', 'to fall', '-ea', 'advanced', 'cad cazi cade cădem cădeți cad', 'cadă', 'căzut', 'cădea', 'căzu', 'cazi', 'pe gheață'),

  // ---- -e verbs ----
  V('înțelege', 'to understand', '-e', 'beginner', 'înțeleg înțelegi înțelege înțelegem înțelegeți înțeleg', 'înțeleagă', 'înțeles', 'înțelegea', 'înțelese', 'înțelege', 'totul'),
  V('ajunge', 'to arrive, to reach', '-e', 'beginner', 'ajung ajungi ajunge ajungem ajungeți ajung', 'ajungă', 'ajuns', 'ajungea', 'ajunse', 'ajungi', 'la timp'),
  V('deschide', 'to open', '-e', 'beginner', 'deschid deschizi deschide deschidem deschideți deschid', 'deschidă', 'deschis', 'deschidea', 'deschise', 'deschide', 'fereastra'),
  V('închide', 'to close', '-e', 'beginner', 'închid închizi închide închidem închideți închid', 'închidă', 'închis', 'închidea', 'închise', 'închide', 'ușa'),
  V('cunoaște', 'to know (someone/a place)', '-e', 'intermediate', 'cunosc cunoști cunoaște cunoaștem cunoașteți cunosc', 'cunoască', 'cunoscut', 'cunoștea', 'cunoscu', 'cunoaște', 'orașul'),
  V('pune', 'to put', '-e', 'beginner', 'pun pui pune punem puneți pun', 'pună', 'pus', 'punea', 'puse', 'pune', 'masa'),
  V('începe', 'to begin', '-e', 'beginner', 'încep începi începe începem începeți încep', 'înceapă', 'început', 'începea', 'începu', 'începe', 'lecția'),
  V('crede', 'to believe', '-e', 'intermediate', 'cred crezi crede credem credeți cred', 'creadă', 'crezut', 'credea', 'crezu', 'crede', 'povestea'),
  V('vinde', 'to sell', '-e', 'intermediate', 'vând vinzi vinde vindem vindeți vând', 'vândă', 'vândut', 'vindea', 'vându', 'vinde', 'mașina'),
  V('pierde', 'to lose, to miss', '-e', 'intermediate', 'pierd pierzi pierde pierdem pierdeți pierd', 'piardă', 'pierdut', 'pierdea', 'pierdu', 'pierde', 'trenul'),
  V('răspunde', 'to answer', '-e', 'intermediate', 'răspund răspunzi răspunde răspundem răspundeți răspund', 'răspundă', 'răspuns', 'răspundea', 'răspunse', 'răspunde', 'repede'),
  V('trimite', 'to send', '-e', 'intermediate', 'trimit trimiți trimite trimitem trimiteți trimit', 'trimită', 'trimis', 'trimitea', 'trimise', 'trimite', 'un mesaj'),
  V('duce', 'to take, to carry', '-e', 'intermediate', 'duc duci duce ducem duceți duc', 'ducă', 'dus', 'ducea', 'duse', 'du', 'copiii la școală'),
  V('aduce', 'to bring', '-e', 'beginner', 'aduc aduci aduce aducem aduceți aduc', 'aducă', 'adus', 'aducea', 'aduse', 'adu', 'flori'),
  V('conduce', 'to drive, to lead', '-e', 'intermediate', 'conduc conduci conduce conducem conduceți conduc', 'conducă', 'condus', 'conducea', 'conduse', 'condu', 'mașina'),
  V('alege', 'to choose', '-e', 'intermediate', 'aleg alegi alege alegem alegeți aleg', 'aleagă', 'ales', 'alegea', 'alese', 'alege', 'o carte'),
  V('râde', 'to laugh', '-e', 'intermediate', 'râd râzi râde râdem râdeți râd', 'râdă', 'râs', 'râdea', 'râse', 'râzi', 'mult'),
  V('plânge', 'to cry', '-e', 'intermediate', 'plâng plângi plânge plângem plângeți plâng', 'plângă', 'plâns', 'plângea', 'plânse', 'plângi', 'puțin'),
  V('trece', 'to pass, to cross', '-e', 'intermediate', 'trec treci trece trecem treceți trec', 'treacă', 'trecut', 'trecea', 'trecu', 'treci', 'strada'),
  V('cere', 'to ask for', '-e', 'intermediate', 'cer ceri cere cerem cereți cer', 'ceară', 'cerut', 'cerea', 'ceru', 'cere', 'ajutor'),

  // ---- -i verbs ----
  V('auzi', 'to hear', '-i', 'intermediate', 'aud auzi aude auzim auziți aud', 'audă', 'auzit', 'auzea', 'auzi', 'auzi', 'muzica'),
  V('simți', 'to feel', '-i', 'intermediate', 'simt simți simte simțim simțiți simt', 'simtă', 'simțit', 'simțea', 'simți', 'simte', 'frigul'),
  V('fugi', 'to run (away)', '-i', 'intermediate', 'fug fugi fuge fugim fugiți fug', 'fugă', 'fugit', 'fugea', 'fugi', 'fugi', 'acasă'),
  V('ieși', 'to go out', '-i', 'beginner', 'ies ieși iese ieșim ieșiți ies', 'iasă', 'ieșit', 'ieșea', 'ieși', 'ieși', 'afară'),
  V('sări', 'to jump', '-i', 'advanced', 'sar sari sare sărim săriți sar', 'sară', 'sărit', 'sărea', 'sări', 'sari', 'în apă'),

  // ---- -i verbs, -esc type ----
  V('vorbi', 'to speak', '-i (-esc)', 'beginner', 'vorbesc vorbești vorbește vorbim vorbiți vorbesc', 'vorbească', 'vorbit', 'vorbea', 'vorbi', 'vorbește', 'românește'),
  V('citi', 'to read', '-i (-esc)', 'beginner', 'citesc citești citește citim citiți citesc', 'citească', 'citit', 'citea', 'citi', 'citește', 'o carte'),
  V('locui', 'to live (reside)', '-i (-iesc)', 'beginner', 'locuiesc locuiești locuiește locuim locuiți locuiesc', 'locuiască', 'locuit', 'locuia', 'locui', 'locuiește', 'în București'),
  V('plăti', 'to pay', '-i (-esc)', 'beginner', 'plătesc plătești plătește plătim plătiți plătesc', 'plătească', 'plătit', 'plătea', 'plăti', 'plătește', 'nota'),
  V('găti', 'to cook', '-i (-esc)', 'beginner', 'gătesc gătești gătește gătim gătiți gătesc', 'gătească', 'gătit', 'gătea', 'găti', 'gătește', 'cina'),
  V('iubi', 'to love', '-i (-esc)', 'beginner', 'iubesc iubești iubește iubim iubiți iubesc', 'iubească', 'iubit', 'iubea', 'iubi', 'iubește', 'muzica'),
  V('mulțumi', 'to thank', '-i (-esc)', 'beginner', 'mulțumesc mulțumești mulțumește mulțumim mulțumiți mulțumesc', 'mulțumească', 'mulțumit', 'mulțumea', 'mulțumi', 'mulțumește', 'mamei'),
  V('găsi', 'to find', '-i (-esc)', 'beginner', 'găsesc găsești găsește găsim găsiți găsesc', 'găsească', 'găsit', 'găsea', 'găsi', 'găsește', 'cheile'),
  V('privi', 'to look at, to watch', '-i (-esc)', 'intermediate', 'privesc privești privește privim priviți privesc', 'privească', 'privit', 'privea', 'privi', 'privește', 'cerul'),
  V('folosi', 'to use', '-i (-esc)', 'intermediate', 'folosesc folosești folosește folosim folosiți folosesc', 'folosească', 'folosit', 'folosea', 'folosi', 'folosește', 'telefonul'),
  V('gândi', 'to think', '-i (-esc)', 'intermediate', 'gândesc gândești gândește gândim gândiți gândesc', 'gândească', 'gândit', 'gândea', 'gândi', 'gândește', 'mult'),
  V('munci', 'to work (hard)', '-i (-esc)', 'intermediate', 'muncesc muncești muncește muncim munciți muncesc', 'muncească', 'muncit', 'muncea', 'munci', 'muncește', 'mult'),
  V('primi', 'to receive', '-i (-esc)', 'beginner', 'primesc primești primește primim primiți primesc', 'primească', 'primit', 'primea', 'primi', 'primește', 'un cadou'),
  V('dori', 'to wish, to want', '-i (-esc)', 'beginner', 'doresc dorești dorește dorim doriți doresc', 'dorească', 'dorit', 'dorea', 'dori', 'dorește', 'o cafea'),
  V('călători', 'to travel', '-i (-esc)', 'intermediate', 'călătoresc călătorești călătorește călătorim călătoriți călătoresc', 'călătorească', 'călătorit', 'călătorea', 'călători', 'călătorește', 'cu trenul'),
  V('pregăti', 'to prepare', '-i (-esc)', 'intermediate', 'pregătesc pregătești pregătește pregătim pregătiți pregătesc', 'pregătească', 'pregătit', 'pregătea', 'pregăti', 'pregătește', 'micul dejun'),
  V('construi', 'to build', '-i (-iesc)', 'advanced', 'construiesc construiești construiește construim construiți construiesc', 'construiască', 'construit', 'construia', 'construi', 'construiește', 'o casă'),
  V('trăi', 'to live (be alive)', '-i (-iesc)', 'intermediate', 'trăiesc trăiești trăiește trăim trăiți trăiesc', 'trăiască', 'trăit', 'trăia', 'trăi', 'trăiește', 'frumos'),
  V('sosi', 'to arrive', '-i (-esc)', 'intermediate', 'sosesc sosești sosește sosim sosiți sosesc', 'sosească', 'sosit', 'sosea', 'sosi', 'sosește', 'la timp'),

  // ---- -î verbs ----
  V('coborî', 'to go down, to get off', '-î', 'intermediate', 'cobor cobori coboară coborâm coborâți coboară', 'coboare', 'coborât', 'cobora', 'coborâ', 'coboară', 'scările'),
  V('hotărî', 'to decide', '-î (-ăsc)', 'advanced', 'hotărăsc hotărăști hotărăște hotărâm hotărâți hotărăsc', 'hotărască', 'hotărât', 'hotăra', 'hotărâ', 'hotărăște', 'repede'),
  V('urî', 'to hate', '-î (-ăsc)', 'advanced', 'urăsc urăști urăște urâm urâți urăsc', 'urască', 'urât', 'ura', 'urâ', 'urăște', 'frigul'),
];
