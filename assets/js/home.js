/* Page d'accueil : statistiques de la banque + résumé personnel (si progression existante) */
(function () {
  "use strict";
  const S = window.SECPLUS;
  const $ = function (s) { return document.querySelector(s); };
  const fr = function (n) { return n.toLocaleString("fr-BE"); };

  const bank = S.buildBank();
  const st = S.bankStats(bank);
  $("#nQ").textContent = fr(st.total + st.pbqs);
  $("#nC").textContent = fr(st.concepts);

  const dash = S.store.get("dashboard", null);
  const hist = S.store.get("history", []);
  const seen = S.store.get("seen", {});
  const hasData = dash || hist.length || Object.keys(seen).length;
  if (!hasData) return;
  $("#mine").classList.remove("hidden");

  // Progression pondérée par domaine
  let w = 0;
  (S.objectives || []).forEach(function (D) {
    let d = 0, n = 0;
    D.objs.forEach(function (o) { o.i.forEach(function (_, k) { n++; if (dash && dash.items && dash.items[o.id + "#" + k]) d++; }); });
    w += (n ? d / n : 0) * D.w;
  });
  $("#mProg").textContent = Math.round(w) + "%";

  if (hist.length) {
    const last = hist[hist.length - 1];
    $("#mLast").textContent = last.pct + "%";
    $("#mLast").style.color = last.pct >= 85 ? "var(--ok)" : last.pct >= 75 ? "var(--warn)" : "var(--accent)";
    $("#mLastH").textContent = last.label + " · " + last.date;
  }
  const nSeen = Object.keys(seen).length;
  $("#mSeen").textContent = fr(nSeen);
  $("#mSeenH").textContent = Math.round(nSeen / st.total * 100) + " % de la banque";

  if (dash && dash.exam) {
    const t = new Date(dash.exam + "T00:00:00"), now = new Date(); now.setHours(0, 0, 0, 0);
    const d = Math.round((t - now) / 86400000);
    $("#mExam").textContent = d > 0 ? "J-" + d : d === 0 ? "Aujourd'hui" : "Passé";
    $("#mExamH").textContent = new Date(dash.exam).toLocaleDateString("fr-BE");
  }
})();
