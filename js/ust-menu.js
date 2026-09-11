// ═══ ÜST MENÜ AÇILIR DAVRANIŞI ════════════════════════════════════════════
// ⛔ TIKLAMAYLA açılır, HOVER ile DEĞİL: dokunmatik cihazda hover yoktur.
// ⛔ Dışarı tıklama + Esc kapatır; `aria-expanded` senkron tutulur;
//    menüdeki bağlantıya tıklanınca kapanır.
// ⭐ Ana sayfadaki satır içi nüshayla AYNI desen — davranış iki yerde ayrışmasın.
(function () {
  var ac = document.getElementById('umAc'), menu = document.getElementById('umMenu');
  if (!ac || !menu) return;
  function kapa(odak) {
    menu.hidden = true;
    ac.setAttribute('aria-expanded', 'false');
    if (odak) ac.focus();
  }
  ac.addEventListener('click', function (e) {
    e.stopPropagation();
    var acik = !menu.hidden;
    menu.hidden = acik;
    ac.setAttribute('aria-expanded', acik ? 'false' : 'true');
  });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) kapa(); });
  document.addEventListener('click', function (e) {
    if (!menu.contains(e.target) && e.target !== ac) kapa();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) kapa(true);
  });
})();
