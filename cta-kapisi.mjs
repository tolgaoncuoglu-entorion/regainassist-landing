// ─────────────────────────────────────────────────────────────────────────
// CTA KAPISI — CTAClick guvenilir gonderiliyor mu?
//
// Sorun: olay gonderilir gonderilmez tarayici sayfayi terk ediyordu; istek
// yola cikmadan iptal oluyor ve CTAClick KAYBOLUYORDU.
//
// ⚠️ Bu kapi dinleyicinin KOPYASINI test ETMEZ. index.html'deki GERCEK
// script blogu okunur, sahte bir DOM'da kosturulur ve HTML'deki GERCEK
// CTA adresleri uzerinde tiklama simule edilir. (Bu projede kopyayi test
// etmek daha once bir mutasyonu kacirmisti.)
// ─────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs'

let gecti = 0, kaldi = 0
const T = (ad, kosul, ek = '') => {
  if (kosul) { gecti++; console.log(`  + ${ad}`) }
  else { kaldi++; console.log(`  - ${ad}${ek ? ' -- ' + ek : ''}`) }
}
const H = readFileSync(new URL('./index.html', import.meta.url), 'utf8')

// ── GERCEK dinleyiciyi HTML'den cikar ──
const blok = H.match(/<script>\s*(\(function \(\) \{\s*var GECIKME_MS[\s\S]*?)<\/script>/)
if (!blok) { console.log('  - CTA script blogu BULUNAMADI (kapi olcemedi)'); process.exit(1) }
const KOD = blok[1]

// ── HTML'deki GERCEK CTA'lar ──
const ctalar = [...H.matchAll(/<a\b([^>]*href="([^"]*app\.regainassist\.com[^"]*)"[^>]*)>/g)]
  .map(m => ({ etiket: m[0], href: m[2], target: (m[1].match(/target="([^"]*)"/) || [])[1] || '' }))

// ── Sahte DOM: dinleyiciyi kur, tiklama uret ──
function ortam({ pixel = 'calisir' } = {}) {
  const olaylar = [], zamanlayicilar = []
  let dinleyici = null
  const belge = { addEventListener: (t, f) => { if (t === 'click') dinleyici = f } }
  // ⚠️ href'i SAYAN kurulum: duz nesnede ikinci atama ayni degeri yazar ve
  // esitlik kontrolu cift navigasyonu GOREMEZ (olculdu: mutasyon kacti).
  const atamalar = []
  const konum = {}
  Object.defineProperty(konum, 'href', {
    get: () => atamalar.length ? atamalar[atamalar.length - 1] : '',
    set: (v) => { atamalar.push(v) },
  })
  const pencere = { location: konum }
  const fbq = pixel === 'yok' ? undefined
            : pixel === 'hata' ? () => { throw new Error('pixel patladi') }
            : (...a) => olaylar.push(a)
  const sT = (f, ms) => { zamanlayicilar.push({ f, ms, iptal: false }); return zamanlayicilar.length - 1 }
  const cT = (i) => { if (zamanlayicilar[i]) zamanlayicilar[i].iptal = true }
  new Function('document', 'window', 'fbq', 'setTimeout', 'clearTimeout', KOD)(belge, pencere, fbq, sT, cT)
  return { olaylar, zamanlayicilar, pencere, atamalar, tikla: (cta, ek = {}) => {
    let engellendi = false
    const a = { href: cta.href, target: cta.target }
    // closest: gercek secici ile eslesme
    const kapsayan = (sec) => {
      const m = sec.match(/^a\[href\*="([^"]+)"\]$/)
      return m && a.href.includes(m[1]) ? a : null
    }
    dinleyici({
      defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false,
      shiftKey: false, altKey: false, ...ek,
      target: { closest: kapsayan },
      preventDefault: () => { engellendi = true },
    })
    return { engellendi }
  } }
}

console.log(`\n(1) KAPSAM — HTML'deki TUM app.regainassist.com CTA'lari (${ctalar.length})`)
{
  T('CTA bulundu (kapi OLCEBILDI)', ctalar.length >= 8, `bulunan: ${ctalar.length}`)
  let kapsanan = 0, eksik = []
  for (const c of ctalar) {
    const o = ortam()
    o.tikla(c)
    const gonderildi = o.olaylar.some(a => a[0] === 'trackCustom' && a[1] === 'CTAClick')
    if (gonderildi) kapsanan++; else eksik.push(c.href)
  }
  T(`${ctalar.length} CTA'nin TAMAMI olay gonderiyor`, kapsanan === ctalar.length, `kapsanmayan: ${eksik.join(', ')}`)
  T('hicbir CTA atlanmadi', eksik.length === 0)
  // <a> DISI navigasyon olmamali — delegasyon onu goremez
  const disNav = H.match(/(location\.href|window\.open|action=)[^;>]{0,60}app\.regainassist\.com/g) || []
  T('<a> disi CTA yok (delegasyon her seyi kapsar)', disNav.length === 0, disNav.join(' | '))
}

console.log('\n(2) SAYFAYI TERK EDEN TIKLAMA — olay gonderilir, SONRA gidilir')
{
  const normal = ctalar.find(c => !c.target)
  const o = ortam()
  const { engellendi } = o.tikla(normal)
  T('varsayilan navigasyon DURDURULUR', engellendi === true)
  T('CTAClick gonderilir', o.olaylar.some(a => a[1] === 'CTAClick'))
  T('trackCustom kullanilir (Lead DEGIL)', o.olaylar[0][0] === 'trackCustom')
  T('olay parametresi YOK (kisisel veri gitmez)', o.olaylar[0].length === 2, JSON.stringify(o.olaylar[0]))
  T('zamanlayici kuruldu', o.zamanlayicilar.length === 1)
  T('gecikme ~200 ms', o.zamanlayicilar[0].ms === 200, String(o.zamanlayicilar[0].ms))
  T('zamanlayici ONCESINDE gidilmez', o.pencere.location.href === '')
  o.zamanlayicilar[0].f()
  T('zamanlayici sonrasi HEDEFE gidilir', o.pencere.location.href === normal.href, o.pencere.location.href)
  o.zamanlayicilar[0].f()
  T('iki kez cagrilsa da TEK navigasyon', o.atamalar.length === 1, `atama: ${o.atamalar.length}`)
}

console.log('\n(3) KULLANICI BEKLEMEDE KALMAZ — uc kacis yolu')
{
  const normal = ctalar.find(c => !c.target)
  // ① pixel YOK → varsayilan davranisa hic dokunulmaz
  const y = ortam({ pixel: 'yok' })
  const r1 = y.tikla(normal)
  T('pixel yoksa preventDefault YAPILMAZ', r1.engellendi === false)
  T('pixel yoksa zamanlayici da yok', y.zamanlayicilar.length === 0)

  // ② fbq HATA firlatirsa → beklemeden gidilir
  const h = ortam({ pixel: 'hata' })
  const r2 = h.tikla(normal)
  T('fbq patlarsa yine de yonlendirilir', h.pencere.location.href === normal.href, h.pencere.location.href)
  T('fbq patlarsa zamanlayici IPTAL edilir', h.zamanlayicilar[0]?.iptal === true)
  T('fbq patlasa da navigasyon durduruldu ve TELAFI edildi', r2.engellendi === true)
}

console.log('\n(4) SAYFAYI TERK ETMEYEN TIKLAMALAR — olculur ama GECIKTIRILMEZ')
{
  const yeniSekme = ctalar.find(c => c.target === '_blank')
  T('target="_blank" CTA var (footer Demo)', !!yeniSekme)
  if (yeniSekme) {
    const o = ortam(); const r = o.tikla(yeniSekme)
    T('_blank: navigasyon SERBEST', r.engellendi === false)
    T('_blank: olay yine de gonderilir', o.olaylar.some(a => a[1] === 'CTAClick'))
    T('_blank: gecikme YOK', o.zamanlayicilar.length === 0)
  }
  const normal = ctalar.find(c => !c.target)
  for (const [ad, ek] of [['Cmd', { metaKey: true }], ['Ctrl', { ctrlKey: true }],
                          ['Shift', { shiftKey: true }], ['orta tik', { button: 1 }]]) {
    const o = ortam(); const r = o.tikla(normal, ek)
    T(`${ad}: navigasyon serbest + olay gonderilir`,
      r.engellendi === false && o.olaylar.some(a => a[1] === 'CTAClick') && o.zamanlayicilar.length === 0)
  }
  const o = ortam(); const r = o.tikla(normal, { button: 2 })
  T('sag tik: hicbir sey yapilmaz', r.engellendi === false && o.olaylar.length === 0)
  const p = ortam(); const rp = p.tikla(normal, { defaultPrevented: true })
  T('baska bir kod engellemisse dokunulmaz', rp.engellendi === false && p.olaylar.length === 0)
}

console.log('\n(5) SINIRLAR')
{
  T('Lead HIC gonderilmiyor', !/fbq\(\s*['"]track(Custom)?['"]\s*,\s*['"]Lead['"]/.test(H))
  T('pixel ID degismedi (2149…)', (H.match(/2149949149068931/g) || []).length === 2)
  T('eski pixel ID yok', !H.includes('2032392980824888'))
  const o = ortam()
  o.tikla({ href: 'https://ornek.com/baska', target: '' })
  T('ilgisiz baglanti tetiklemez', o.olaylar.length === 0)
}

console.log(`\n${gecti} gecti - ${kaldi} kaldi - ${kaldi ? 'KIRMIZI' : 'YESIL'}`)
process.exit(kaldi ? 1 : 0)
