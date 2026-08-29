// LANDING KAPISI — kaynak düzeyi. Render ayrıca tarayıcıda ölçülür.
import fs from 'node:fs'
const H = fs.readFileSync(process.argv[2], 'utf8')
const ONCE = fs.readFileSync('/tmp/index.before.html', 'utf8')
let ok=0, hata=[]
const T=(a,k)=> k?ok++:hata.push(a)

// ── L1: TANIMSIZ SINIF KALMASIN (asıl kusur buydu) ──────────────
const css = H.slice(H.indexOf('<style>'), H.indexOf('</style>'))
// NOT: bu kontrol yalnizca sinifin CSS'te HIC gecmedigini yakalar (toptan
// kayip). "Gorunum dogru mu" sorusunu kaynak yanitlayamaz — modifier siniflar
// (.featured, .rev) ve kaplar (.nav-logo) mesru olarak tek basina kural almaz.
// Gercek olcum TARAYICIDA: bkz. landing-render-kapisi.
const tanimli = new Set([...css.matchAll(/\.([a-z][a-z0-9-]*)/g)].map(m=>m[1]))
const kullanilan = new Set([...H.matchAll(/class="([^"]*)"/g)].flatMap(m=>m[1].split(/\s+/)).filter(Boolean))
const tanimsiz = [...kullanilan].filter(c=>!tanimli.has(c))
T(`L1 tanimsiz sinif: ${tanimsiz.join(',')}`, tanimsiz.length===0)

// ── L2: SEO KORUMASI — önceki sürümle birebir ───────────────────
const al = (src,re) => (src.match(re)||[])[1]
T('L2a title AYNI', al(H,/<title>([^<]*)</) === al(ONCE,/<title>([^<]*)</))
T('L2b description AYNI', al(H,/name="description" content="([^"]*)"/) === al(ONCE,/name="description" content="([^"]*)"/))
T('L2c canonical duruyor', /rel="canonical"/.test(H))
// Sosyal kart metni sayfadaki MARKA MESAJIYLA ayni olmali; hero degisince
// og:description bayat kalmisti ("Geriye kalan" → "Diğer her şey").
T('L2c2 og:description marka mesajiyla uyumlu',
  /property="og:description" content="Tedavi sizin işiniz\. Diğer her şey için/.test(H))
T('L2c3 eski marka mesaji hicbir yerde yok', !/Geriye kalan her şey/.test(H))
T('L2d tek h1', (H.match(/<h1[\s>]/g)||[]).length===1)
for (const a of ['#neden','#ozellikler','#fiyatlar','#sss','#iletisim'])
  T(`L2e capa ${a}`, H.includes(`id="${a.slice(1)}"`))
T('L2f gtag', H.includes('googletagmanager.com/gtag/js'))
T('L2g meta pixel', H.includes('fbq('))
T('L2h JSON-LD', (H.match(/application\/ld\+json/g)||[]).length>0)

// ── L3: FİYAT/İLETİŞİM İŞLEVİ BOZULMADI ─────────────────────────
for (const id of ['starter-fiyat','pro-fiyat','starter-tasarruf','pro-tasarruf',
                  'btn-aylik','btn-yillik','contact-name','contact-phone',
                  'contact-email','contact-clinic','contact-msg','contact-btn','contact-result'])
  T(`L3 id ${id}`, H.includes(`id="${id}"`))
T('L3b setPricingDonem duruyor', /function setPricingDonem/.test(H))
T('L3c submitContact duruyor', /function submitContact/.test(H))
T('L3d supabase cagrisi duruyor', H.includes('iletisim_formlari'))
// Fiyat KENDI elemaninda olculur: sayfada baska yerde gecen '999'
// (ornegin border-radius:999px) testi ayirt edici olmaktan cikariyordu.
T('L3e starter aylik 999', /id="starter-fiyat"[^>]*>999</.test(H))
T('L3f pro aylik 1.999', /id="pro-fiyat"[^>]*>1\.999</.test(H))
T('L3g yillik fiyatlar JS\'te', /799/.test(H) && /1\.599/.test(H))

// ── L4: GÖRSEL STRATEJİSİ ───────────────────────────────────────
const gorseller = new Set([...H.matchAll(/images\/([a-z0-9-]+)(@2x)?\.webp/g)].map(m=>m[1]))
// Politika (Tolga 27.08): landing'de URUN EKRANI KULLANILMAZ.
// Marka varliklari (logo, isaret, og karti) urun ekrani DEGILDIR — beyaz
// listede. Liste disinda HERHANGI bir gorsel cikarsa kapi kirmizi verir,
// yani yeni bir urun ekrani sessizce giremez.
// Onek eslemesi: og karti surumlenebilir (og-kart-v2, -v3 …). Tam ad
// listesi tutulursa her surumde kapi yanlis yere kirmizi verirdi.
const MARKA_ONEKLERI = ['marka', 'og-kart', 'regain-assist-logo', 'regain-assist-icon', 'paytr-logo']
const markaMi = g => MARKA_ONEKLERI.some(o => g === o || g.startsWith(o + '-'))
const urunEkranlari = [...gorseller].filter(g => !markaMi(g))
T(`L4a urun ekrani sayisi 0 (${urunEkranlari.join(',')||'yok'})`, urunEkranlari.length===0)
T('L4a0 marka isareti hero icinde', H.indexOf('marka.webp') < H.indexOf('</header>'))
// Hareket, kullanicinin tercihine SAYGILI olmali: animasyon yalnizca
// prefers-reduced-motion: no-preference altinda tanimli.
T('L4a0b nabiz hareketi tercihe saygili',
  /@media \(prefers-reduced-motion:no-preference\) \{[\s\S]{0,220}?\.halka \{ animation:nefes/.test(css))
T('L4a2 dashboard EKRANI kullanilmiyor', !/story-dashboard/.test(H))
// og:image de bir yuzeydir: urun ekrani oraya da konmamali
const og = (H.match(/property="og:image" content="([^"]*)"/)||[])[1] || ''
T(`L4a3 og:image urun ekrani degil (${og.split('/').pop()})`, /og-kart/.test(og))
// HTML'de gecen her gorsel dosyasi DISKTE var mi (silinen dosyaya atif kalmasin)
const kirik = [...H.matchAll(/(?:src|href|content)="[^"]*?(images\/[A-Za-z0-9@._-]+\.(?:webp|png|jpg|svg))"/g)]
  .map(m=>m[1]).filter(f=>!fs.existsSync(f))
T(`L4a4 kirik gorsel referansi yok (${kirik.join(',')})`, kirik.length===0)
// Widget izgarasi hikayeyi anlatiyor mu
// ── YENI ANLATI MIMARISI ───────────────────────────────────────────
// Dort hikaye DORT FARKLI bilesenle anlatilir; ayni kartin metni
// degistirilmis hali olmamali.
// Sinifin VARLIGI icerigin varligini kanitlamaz — kutunun ICINI olc.
// (Ilk surumde bos birakilan bir durum karti testten geciyordu.)
T('L4a5a 01 durum kartlari dolu',
  (H.match(/class="durum"><span class="d-l">[^<]+<\/span><b>[^<]+<\/b>/g)||[]).length===4)
T('L4a5b 02 uc adim', (H.match(/class="a-no"/g)||[]).length===3)
T('L4a5c 03 bagli tamamlanma', /class="tamamlar"/.test(H) && (H.match(/class="tik"/g)||[]).length===3)
T('L4a5d 04 zaman cizgisi', /class="zaman"/.test(H) && /3\. gün[\s\S]{0,200}30\. gün/.test(H))
T('L4a5e dort ayri bilesen', new Set(['durum','a-no','tamamlar','zaman'].filter(c=>H.includes('class="'+c+'"'))).size===4)
T('L4a6 kanban ekrani da kaldirildi', !/proof-kanban/.test(H))
// Ayni ozgullukte iki kural varsa SONRA gelen kazanir: .wgrid-4 mutlaka
// .wgrid'den SONRA tanimli olmali, yoksa 4'lu izgara 3 sutuna duser.

T('L4a7 hikaye kartlari esit yukseklikte (kaynak)', /cursor:grab; align-items:stretch/.test(H))
for (const yasak of ['story-aktarim','story-tedavi','story-takip'])
  T(`L4b yasak akis gorseli yok: ${yasak}`, !H.includes(yasak))
T('L4c dosyalar da silindi',
  ['story-aktarim','story-tedavi','story-takip'].every(f=>!fs.existsSync(`images/${f}@2x.webp`)))
// Her urun gorselinin yaninda TEMSILI VERI etiketi olmali
const shotSayisi=(H.match(/<img[^>]*images\/[a-z0-9-]+@2x\.webp/g)||[]).length
// Sinif LISTESI icinde ara: class="shot-cap story-cap" da sayilmali.
// Birebir dizge araniyordu ve ikinci sinif eklenince etiket gorunmez oldu.
const capSayisi=[...H.matchAll(/class="([^"]*)"/g)].filter(m=>m[1].split(/\s+/).includes('shot-cap')).length
// 0 ekran gorseli varsa kosul BOSTA saglanir; varsa her birinin etiketi olmali.
T(`L4d her ekran gorseli etiketli (${shotSayisi} gorsel / ${capSayisi} etiket)`, capSayisi>=shotSayisi)
T('L4e adim adim zincir kaldirildi', !/class="chain"/.test(H))
T('L4f AHA bolumu var', /Bunlar dört ayrı özellik değil\./.test(H) && /Aynı sistemin dört farklı anı\./.test(H))
T('L4f2 AHA zinciri 7 halka', ((H.match(/<div class="zincir"[\s\S]*?<\/div>/)||[''])[0].match(/<span>/g)||[]).length===7)
// Beyan TEK YERDE ve HERO'NUN ALTINDA — sayfadaki tüm değerleri kapsar.
// (Önce yalnız bir kartın altındaydı; diğer bölümlerin değerleri beyansızdı.)
T('L4g temsili beyani var', /class="temsili">\s*Sayfada kullanılan veriler temsilidir\./.test(H))
T('L4g2 beyan tek yerde', (H.match(/class="temsili"/g)||[]).length===1)
T('L4g3 beyan hero icinde', H.indexOf('class="temsili"') < H.indexOf('</header>'))

// ── L6: MOBİL ───────────────────────────────────────────────────
// Olculdu (360/390/768px iframe): asagidaki kurallar OLMADAN widget metni
// sessizce kirpiliyor, dokunma hedefleri 36px'in altinda kaliyor, mobil CTA
// logonun yanina dusuyor ve hikaye karti 1069px'e cikiyor.
T('L6a widget etiketi kirpilmiyor', !/\.wl \{[^}]*text-overflow:ellipsis/.test(css))
T('L6b widget alt metni kirpilmiyor', !/\.ws \{[^}]*text-overflow:ellipsis/.test(css))
T('L6c dokunma hedefi kurallari 900 blogunda',
  /max-width:900px\)[\s\S]*?\.rail-btn \{ width:44px; height:44px; \}[\s\S]*?\n  \}/.test(css))
T('L6d nokta gostergesi buyutulmus', /\.dot \{ padding:18px 5px/.test(css))
T('L6e mobil CTA saga yasli', /\.nav-in > \.btn \{ margin-left:auto; \}/.test(css))
T('L6f mobil durum kartlari 2 sutun', /max-width:900px\)[\s\S]*?\.durumlar \{ grid-template-columns:1fr 1fr; \}/.test(css))
// 🚨 29.08: `.bildirim-ikili` ve `.mods` gridleri KALDIRILDI — yetenekler
// artik acilir kollar (<details>). O bolumlerin responsive kurallarini
// sart kosan testler gecersizdi; yerine kollarin gercek davranisi olculuyor.
T('L6g kollar HER ekranda tek sutun', /\.kollar \{[^}]*flex-direction:column/.test(css))
// 29.08 yeni duzen: baslik ve vaat zaten DIKEY dizili (.kol-metin sutun),
// sarmaya gerek yok. Onceki test yatay yerlesime aitti.
T('L6h baslik ve vaat dikey dizili', /\.kol-metin \{[^}]*flex-direction:column/.test(css))
T('L6h2 maddeler dar ekranda TEK sutun',
  /max-width:640px\)[\s\S]*?\.kol-grid \{ grid-template-columns:1fr; \}/.test(css))
T('L6h2 olu grid kurallari kalmadi', !/\.bildirim-ikili|\.mods \{/.test(css))

// Dar ekranda yatay akislar sarinca ayrac satir sonunda asili kaliyordu.
T('L6i mobil akis ayraclari gizli', /\.hero-flow i, \.akis i, \.zaman i \{ display:none; \}/.test(css))
T('L6j AHA zinciri mobilde dikey', /max-width:640px\)[\s\S]*?\.zincir \{ flex-direction:column/.test(css))
T('L6k mobil ray basligi alt alta', /\.rail-head \{ flex-direction:column/.test(css))

// Starter'da 10, Pro'da 7 madde var; kartlar dogal yukseklikte birakilirsa
// esitsiz gorunuyordu (olculdu).
T('L6l fiyat kartlari esit yukseklik', /\.pricing-grid \{[^}]*align-items:stretch/.test(css))

// ── M: TEKRAR KURALI — her mesajın TEK evi ─────────────────────────
// Ölçüldü (önceki sürüm): dashboard 6, veri aktarımı 7, ÜTS 7, e-Nabız 7,
// hasta takibi 8 bölümde geçiyordu. Her ana mesaj artık tek bölümde.
const govde = H.slice(H.indexOf('</style>'))
const bolumler = govde.split(/(?=<(?:section|header|footer)[ >])/).filter(b=>b.trim())
function kacBolumde(rx) { return bolumler.filter(b=>rx.test(b)).length }
// Bir mesajın "evi" dışında ANLATILMAMASI: anahtar ifade tek bölümde geçmeli
T(`M1 sabah paneli tek evde (${kacBolumde(/Sabah klinikte|sabah kliniği açt/i)})`, kacBolumde(/Sabah klinikte|sabah kliniği açt/i) <= 1)
T(`M2 veri aktarimi tek evde (${kacBolumde(/Aktarım Sihirbazı|hastayı kim taşıyacak/i)})`, kacBolumde(/Aktarım Sihirbazı|hastayı kim taşıyacak/i) <= 1)
T(`M3 tedavi→stok→bildirim zinciri tek evde (${kacBolumde(/stoktan düştü/i)})`, kacBolumde(/stoktan düştü/i) <= 1)
T(`M4 hasta takip rehberi tek evde (${kacBolumde(/Kazanım Rehberi unutturmaz|3\. gün/i)})`, kacBolumde(/Kazanım Rehberi unutturmaz|3\. gün/i) <= 1)
// "Çok modül değil" marka tekrarı: hero + AHA = 2, final CTA'da OLMAMALI
T(`M5 marka mesaji en fazla 2 yerde (${kacBolumde(/Çok modül değil/)})`, kacBolumde(/Çok modül değil/) <= 2)
// Storytelling başlığı
T('M6 storytelling basligi dogru', /Tanıdık geliyor mu\?/.test(H) && !/Kliniğin dört gerçek anı/.test(H))
T('M7 ilerleme gostergesi minimal', /id="rail-say"/.test(H))

// Story 03'un cevabi: "evet" tek basina arka plan isinin de o anda bittigi
// izlenimi verebiliyordu. Gercek: hekimin isi biter, bildirim ~15 dk icinde
// gonderilir. Cumle ikisini birden dogru anlatmali.
// Soruya ("Peki iş bitti mi?") once DOGRUDAN cevap, sonra gerekce.
// "evet" TEK BASINA kalmamali: arka plandaki isin de o anda bittigi
// izlenimi verirdi. Ikisi BIRLIKTE bulunmali.
T('N0 story 03: dogrudan cevap + gerekce',
  /Tedavi kartını tamamladıysanız, <b>evet\.<\/b> Gerisini ReGain takip eder\./.test(H))
T('N0a "evet" tek basina degil',
  !/Tedavi kartını tamamladıysanız, <b>evet\.<\/b>\s*<\/p>/.test(H))
// 04'te ayni punchline iki kez vurulmamali
T('N0b "hatırlar" punchline tek', (H.match(/ReGain hatırlar/g)||[]).length===1)
// Sorudaki gun, zaman cizgisinin ILK adimiyla ayni olmali.
T('N0d 04 sorusu zaman cizgisiyle tutarli',
  /Peki… 3 gün sonra\?/.test(H) && /<span>3\. gün<\/span>/.test(H))
T('N0c "unutturmaz" tekrari kalkti', !/Rehberi unutturmaz/.test(H))

// ── N: ÜRÜN İDDİALARI ──────────────────────────────────────────────
T('N1 ÜTS otomatik gonderim iddiasi YOK', !/ÜTS bildirimi otomatik yapıldı|otomatik olarak bildiril/i.test(H))
T('N2 ÜTS gercek durum', /ÜTS bildirimi gönderime alındı/.test(H))
T('N3 e-Nabiz dogrudan gonderim reddi acik', /e-Nabız’a doğrudan gönderim yapılmaz/.test(H))
T('N4 e-Nabiz bildirim yapildi iddiasi YOK', !/e-Nabız bildirimi (yapıldı|gönderildi)/i.test(H))
T('N5 mutlak aktarim vaadi YOK', !/veri kaybı olmaz|%100 aktarım|garantili aktarım/i.test(H))
// 27.08: eski beyan ("hicbir bildirim onayiniz olmadan gonderilmez") HER
// bildirim icin ayri onay izlenimi veriyordu; o gunun akisinda hekim turu
// secip TEK onay veriyordu.
// 🚨 28.08 URUN DEGISTI: artik her urun icin IKI AYRI ZORUNLU karar var
// (UTS bildirimi yapilsin/yapilmasin · stok dusulsun/dusulmesin) ve karar
// verilmeden tedavi tamamlanamiyor. Yani "her urun icin ayri karar" artik
// dogru bir anlatim — kapi eski akisi sart kosuyordu.
T('N6 karar hekimde oldugu anlatiliyor',
  /karar verirsiniz/.test(H) && /her ürün için ayrı ayrı/i.test(H))
T('N6b karar verilmeden tamamlanmadigi yazili',
  /[Kk]arar verilmeden tedavi tamamlanmaz/.test(H))
// Tolga'nin acik istegi (29.08): bildirimin onaysiz GITMEDIGI de yazili
// olmali. 27.08'de kaldirilan eski ifadeden farki: o zaman TEK onay vardi
// ve "her bildirimde ayri onay" izlenimi yaniltiyordu; 28.08'den beri
// gercekten her urun icin ayri karar veriliyor.
T('N6b2 onaysiz bildirim gitmedigi yazili',
  /onay verilmeden bildirim gönderilmez/.test(H))
T('N6d e-Nabiz listesini KULLANICI yukluyor',
  /Bakanlık portalına kolayca yükleyebilirsiniz/.test(H))
// "Bakanlik" burada cins isim degil, belirli kurumun (Saglik Bakanligi)
// yerine gecen kisaltma — ozel ad yerine kullanildigi icin BUYUK yazilir.
T('N6e Bakanlik ozel ad olarak buyuk yaziliyor',
  /Bakanlık portalına/.test(H) && !/bakanlık portalına/.test(H))

// ── N7: YETENEK KOLLARI — iddialar URUNDE OLCULDU ───────────────────
// Her madde koda bakilarak dogrulandi; dogrulanmamis vaat yazilmadi.
T('N7a uc kol var', (H.match(/<details class="kol"/g)||[]).length === 3)
// 29.08: Tolga "hepsi acik widget gibi gorunsun" dedi — artik ucu de acik.
T('N7b uc kol da ACIK geliyor', (H.match(/<details class="kol"[^>]*open>/g)||[]).length === 3)
// Meta Ads her ozellige AYRI hedef URL istiyor; her widget kendi id'sinde.
T('N7i her widgetin kendi id\'si var',
  ['uts-enabiz','veri-aktarimi','hasta-kazanimi'].every(x => H.includes('id="'+x+'"')))
T('N7j nav uc ozellige ayri link veriyor',
  ['#uts-enabiz','#veri-aktarimi','#hasta-kazanimi'].every(x => H.includes('href="'+x+'"')))
T('N7k widget hedefleri yapiskan navin altinda kalmiyor',
  /\.kol\[id\][^}]*scroll-margin-top/.test(H))
// 7 link 640-900 arasi tasmasin; 640 altinda nav zaten gizleniyor.
T('N7l nav 900px altinda daraltiliyor',
  /max-width:900px\)[\s\S]*?\.nav-links \{ gap:14px/.test(H))
T('N7m nav 640 altinda gizli (mevcut davranis korundu)',
  /max-width:640px\)[\s\S]*?\.nav-links \{ display:none; \}/.test(H))

// ── N8: WIDGET GORUNUMU + HER WIDGETIN KENDI CTA'SI ─────────────────
// Tolga: "gorsel olarak sik durmuyor, alt alta liste gibi gorunuyor" ve
// "her widget'in altina CTA ekleyelim". Reklamdan gelen ziyaretci hero'yu
// atlayip dogrudan widget'a duser; orada bir cagri bulmali.
T('N8a her widgetin KENDI CTA\'si var', (H.match(/class="kol-cta"/g)||[]).length === 3)
T('N8b CTA metinleri FARKLI (ayni cagri uc kez degil)', (() => {
  const m = [...H.matchAll(/class="kol-cta"[^>]*>([^<]+)/g)].map(x => x[1].trim())
  return m.length === 3 && new Set(m).size === 3
})())
T('N8c CTA uygulamaya gidiyor',
  (H.match(/class="kol-cta" href="https:\/\/app\.regainassist\.com"/g)||[]).length === 3)
T('N8d her widgetin KENDI renk kimligi', (() => {
  const m = [...H.matchAll(/--kol-renk:([^;]+);/g)].map(x => x[1].trim())
  return m.length === 3 && new Set(m).size === 3
})())
T('N8e her widgetin ikonu var', (H.match(/class="kol-ikon"/g)||[]).length === 3)
// Tolga'nin basliklandirmasi (29.08): UTS tarafi BILDIRIM, e-Nabiz tarafi
// EXPORT — cunku e-Nabiz'a gonderim yapilmiyor, dosya disa aktariliyor.
// Baslik bu ayrimi tasiyor.
T('N8h baslik UTS bildirimi / e-Nabiz export ayrimini tasiyor',
  /ÜTS Bildirimleri &amp; e-Nabız Export/.test(H))
T('N8f maddeler IKI SUTUN (liste gorunumu degil)',
  /\.kol-grid \{[^}]*grid-template-columns:1fr 1fr/.test(H))
T('N8g widget kart gibi (ust serit + golge)',
  /\.kol \{[^}]*border-top:3px solid var\(--kol-renk/.test(H))
// Tolga: "sagdaki sutunlardaki yazilar soldakilerin devami gibi okunuyor".
// Her madde KENDI dikey cizgisiyle bagimsiz birim oldu.
T('N8i her madde kendi dikey cizgisini tasiyor',
  /\.kol-madde \{[^}]*border-left:2px solid var\(--kol-cizgi/.test(H))
T('N8j her widgetin cizgi rengi kendi kimliginden',
  (H.match(/--kol-cizgi:/g)||[]).length === 3)
// Baslik ve aciklama ayrisir: b bloк, altinda metin.
T('N8k madde basligi blok (aciklamayla ayni satirda degil)',
  /\.kol-madde b \{[^}]*display:block/.test(H))

// ── N9: HASTA KAZANIM VE YONETIM ────────────────────────────────────
// Kapsam genisledi: yalniz dusunen hasta degil, MEVCUT hastanin
// randevu oncesi/sonrasi iletisimi de. Iddialar olculdu:
//  - takipler.js  → kararsiz hasta icin SABIT hazir metinler
//  - AIAsistan.jsx→ 8 hazir baslik (randevu hatirlatma, tedavi oncesi/
//    sonrasi, gelmeyen takip, teklif takip, dogum gunu, kontrol daveti)
//  - Dashboard    → gelmeyen randevular otomatik isaretlenir + WhatsApp
T('N9a baslik kazanim VE yonetim', /Hasta Kazanım ve Yönetim Rehberi/.test(H))
T('N9b randevu oncesi/sonrasi iletisim anlatiliyor',
  /Randevu hatırlatma, tedavi öncesi bilgilendirme, tedavi sonrası takip/.test(H))
T('N9c gelmeyen hasta akisi anlatiliyor',
  /Randevusuna gelmeyenler otomatik işaretlenir/.test(H))
// ⛔ "hazir mesaj" ifadesi SABIT metin izlenimi vermemeli: AI Asistan
// mesaji hazir BASLIKTAN uretir. Metin "hazır başlıklardan oluşturulur" der.
T('N9d mesajlarin baslikTAN uretildigi yazili',
  /hazır başlıklardan oluşturulur/.test(H))
T('N9e reklam adresi KORUNDU (id degismedi)', /id="hasta-kazanimi"/.test(H))
T('N7c aktarim kapsamı: hasta+tedavi+randevu+odeme',
  /Hasta, tedavi, randevu ve ödeme birlikte aktarılır/.test(H))
// HastaImport.jsx'te GTIN/Lot No/Seri No/Urun Adi alanlari VAR (olculdu).
T('N7d UTS/e-Nabiz alanlari kosullu anlatiliyor',
  /dosyada varsa ÜTS ve e-Nabız bilgileri de taşınır/.test(H))
// Hastalar.jsx: topluHekimAta() + "N hastada hekim yok" dugmesi (olculdu).
T('N7e hekim atama vaadi', /tek tek veya topluca hekim atayabilirsiniz/.test(H))
T('N7f aktarim oncesi onizleme vaadi',
  /kaç yeni kayıt, kaç tekrar olduğunu görürsünüz/.test(H))
// ⛔ MUTLAK VAAT YOK: aktarim %100 dogru demiyoruz.
T('N7g mutlak eslesme vaadi yok',
  !/her zaman doğru eşleş|hatasız aktar|kesinlikle karışmaz/i.test(H))
T('N7h hasta kazanim kolu somut',
  /Kararsız veya düşünen hastaları tek listede görün/.test(H)
  && /tereddüt sebebine ve takip gününe göre/.test(H))
T('N6c e-Nabiz\'a dogrudan gonderim YAPILMADIGI duruyor',
  /doğrudan gönderim yapılmaz/.test(H))

// ── O: FAQ ŞEMASI ↔ GÖRÜNEN İÇERİK ─────────────────────────────────
const ldm = H.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
const ld = JSON.parse(ldm[1])
const faq = (ld['@graph']||[ld]).find(x=>x['@type']==='FAQPage')
const soz = (t)=>t.replace(/<[^>]+>/g,'').replace(/&#8378;/g,'₺').replace(/\s+/g,' ').trim()
const semaS = faq.mainEntity.map(q=>q.name)
const gorS  = [...H.matchAll(/<summary class="faq-q">([\s\S]*?)<\/summary>/g)].map(m=>soz(m[1]))
T(`O1 FAQ soru sayisi esit (${semaS.length}/${gorS.length})`, semaS.length===gorS.length)
T('O2 FAQ sorulari BIREBIR', semaS.every((q,i)=>q===gorS[i]))
const semaC = faq.mainEntity.map(q=>soz(q.acceptedAnswer.text))
const gorC  = [...H.matchAll(/<div class="faq-a">([\s\S]*?)<\/div>/g)].map(m=>soz(m[1]))
T('O3 FAQ cevaplari BIREBIR', semaC.every((c,i)=>c===gorC[i]))
T('O4 e-Nabiz sorusu duzeltildi', /e-Nabız kayıtlarını nasıl hazırlayabilirim\?/.test(H) && !/e-Nabız entegrasyonu nasıl çalışıyor/.test(H))

// ── L5: DOĞRULANMAMIŞ İSTATİSTİK GERİ GELMEDİ ───────────────────
T('L5 uydurma oran yok', !/%\s?60|~\s?%\s?90|~\s?%\s?35/.test(H))
T('L5b e-Nabiz dogrudan gonderim iddiasi yok', !/e-Nabız'a doğrudan (bildirim )?gönderi(r|lir)/.test(H))

console.log(hata.length ? `KIRMIZI ${hata.length}/${ok+hata.length}:\n  - ${hata.join('\n  - ')}` : `YESIL ${ok}/${ok}`)
process.exit(hata.length?1:0)
