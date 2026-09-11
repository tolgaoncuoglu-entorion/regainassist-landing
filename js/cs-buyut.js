// ═══ CASESUITE GÖRSEL BÜYÜTME ═════════════════════════════════════════════
// ⛔ NEDEN VAR: üçlü şeritte ölçüm yazıları OKUNMUYOR. Görsel küçükken
//    "bir şeyler var" der, büyüdüğünde ÜRÜNÜN NE YAPTIĞINI gösterir.
// ⛔ Zemin, X ve Escape kapatır — kapanma yolu tek olursa kullanıcı sıkışır.
// ⭐ Açılışta odak kapat düğmesine gider, kapanışta AÇAN düğmeye geri döner:
//    klavyeyle gezen kullanıcı yerini kaybetmez.
(function () {
  var kutu = document.getElementById('csBuyut');
  if (!kutu) return;
  var img = document.getElementById('csBuyutImg');
  var webp = document.getElementById('csBuyutWebp');
  var kapat = document.getElementById('csBuyutKapat');
  var acan = null;

  function ac(dugme) {
    var yol = dugme.getAttribute('data-buyuk');
    if (!yol) return;
    acan = dugme;
    var ic = dugme.querySelector('img');
    webp.srcset = yol + '.webp';
    img.src = yol + '.jpg';
    img.alt = ic ? ic.alt : '';
    kutu.hidden = false;
    document.body.style.overflow = 'hidden';   // arka plan kaymasın
    kapat.focus();
  }
  function kapa() {
    kutu.hidden = true;
    document.body.style.overflow = '';
    // ⛔ `src`i BOŞALTMA: aynı görsel tekrar açılınca yeniden indirilirdi.
    if (acan) { acan.focus(); acan = null; }
  }

  document.querySelectorAll('.cs-gorsel').forEach(function (d) {
    d.addEventListener('click', function () { ac(d); });
  });
  kapat.addEventListener('click', kapa);
  // Zemine tıklama kapatır; GÖRSELE tıklama kapatmaz (yanlışlıkla kapanmasın).
  kutu.addEventListener('click', function (e) { if (e.target === kutu) kapa(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !kutu.hidden) kapa();
  });
})();
