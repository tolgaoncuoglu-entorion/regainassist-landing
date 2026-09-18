// ═══ KAYDIRINCA BELIREN BOLUMLER — PAYLASILAN ═══════════════════════════
// Ana sayfadaki sistemin aynisi, dokuz ic sayfa da ayni davransin diye
// buraya alindi. Kopyalanirsa biri duzeltilip oteki unutulur.
//
// ⛔ GORUNMEZLIGI CSS DEGIL JS ACAR: once `bel-hazir` isaretlenir, `.bel`
//    ancak o zaman saklanir. Betik hic kosmazsa (hata, eski tarayici,
//    engelli betik) sayfa BOS KALMAZ, sadece animasyon olmaz.
//
// 🔴 INTERSECTIONOBSERVER DENENDI VE YETMEDI (17.09, olculdu):
//    Gozlemci yalniz ESIK ASILDIGINDA haber verir. Oge tek karede alttan
//    uste atlayinca (capa baglantisi, tarayicinin kaydirma konumunu geri
//    yuklemesi, hizli kaydirma) durum «kesismiyor» → «kesismiyor» olur;
//    esik HIC asilmaz, geri cagirma HIC DOGMAZ ve baslik KALICI OLARAK
//    GORUNMEZ KALIR. Sayfanin sonuna atlayinca 5 basliktan 4'u gorunmez
//    kalmisti.
//    ⭐ Birkac ogede rAF ile kisilmis kaydirma dinleyicisi zaten bedava;
//      karmasik olan cozum YANLIS olandi.
(function () {
  var azHareket = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var kalan = Array.prototype.slice.call(document.querySelectorAll('.bel'));
  if (!kalan.length || azHareket) return;
  document.documentElement.classList.add('bel-hazir');

  function tara() {
    for (var i = kalan.length - 1; i >= 0; i--) {
      if (kalan[i].getBoundingClientRect().top < innerHeight * 0.88) {
        kalan[i].classList.add('gorundu');    // bir kez belirir, geri kaybolmaz
        kalan.splice(i, 1);
      }
    }
    if (!kalan.length) {
      removeEventListener('scroll', planla);
      removeEventListener('resize', planla);
    }
  }
  var bekliyor = false;
  function planla() {
    if (bekliyor) return;
    bekliyor = true;
    requestAnimationFrame(function () { bekliyor = false; tara(); });
  }
  tara();                                      // ilk hal: ust kisim hemen acilir
  addEventListener('scroll', planla, { passive: true });
  addEventListener('resize', planla);
})();
