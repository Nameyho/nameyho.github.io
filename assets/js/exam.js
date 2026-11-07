/* Simulateur d'examen Security+ SY0-701 */
(function () {
  "use strict";
  const S = window.SECPLUS, U = S.util, D = S.DOMAINS;
  const $ = function (s) { return document.querySelector(s); };
  const esc = U.esc;

  const BANK = S.buildBank();
  const BY_ID = {};
  BANK.forEach(function (b) { BY_ID[b.id] = b; });

  // Répartition pondérée (12/22/18/28/20 %)
  const FULL = { pbq: 4, split: { 1: 10, 2: 19, 3: 16, 4: 24, 5: 17 }, minutes: 90 };   // 4 + 86 = 90
  const QUICK = { pbq: 2, split: { 1: 3, 2: 6, 3: 5, 4: 8, 5: 6 }, minutes: 30 };       // 2 + 28 = 30
  const CORE_SHARE = 0.3; // part de questions écrites à la main dans les examens

  let X = null, tick = null;

  // --- Mémoire personnelle (navigateur) ---
  const seen = S.store.get("seen", {});        // id → nombre d'apparitions
  const mistakes = S.store.get("mistakes", {}); // id → true
  function saveMemory() { S.store.set("seen", seen); S.store.set("mistakes", mistakes); }

  // Trie par nombre d'apparitions croissant (jamais vues d'abord), puis au hasard
  function freshFirst(items) {
    return U.shuffle(items).sort(function (a, b) { return (seen[a.id] || 0) - (seen[b.id] || 0); });
  }

  function pickFrom(pool, n, usedKeys) {
    const out = [];
    const sorted = freshFirst(pool);
    for (let i = 0; i < sorted.length && out.length < n; i++) {
      if (usedKeys[sorted[i].key]) continue;
      usedKeys[sorted[i].key] = true;
      out.push(sorted[i]);
    }
    return out;
  }

  function selectExam(cfg) {
    const used = {};
    let mcq = [];
    Object.keys(cfg.split).forEach(function (d) {
      const n = cfg.split[d];
      const inDom = BANK.filter(function (b) { return String(b.d) === d; });
      const core = pickFrom(inDom.filter(function (b) { return b.kind === "core"; }), Math.round(n * CORE_SHARE), used);
      const rest = pickFrom(inDom.filter(function (b) { return b.kind !== "core"; }), n - core.length, used);
      mcq = mcq.concat(core, rest);
    });
    const pbqs = U.shuffle(S.data.pbqs).slice(0, cfg.pbq);
    return pbqs.map(function (p) { return { pbq: p }; }).concat(U.shuffle(mcq).map(function (b) { return { item: b }; }));
  }

  function instantiate(entry) {
    if (entry.pbq) {
      const p = entry.pbq;
      return { pbq: true, d: p.d, title: p.title, scenario: p.scenario, choices: p.choices, rows: U.shuffle(p.rows), e: p.e };
    }
    const q = entry.item.make();
    return { id: entry.item.id, d: entry.item.d, kind: entry.item.kind, q: q.q, o: q.o, a: q.a, e: q.e, multi: q.a.length > 1 };
  }

  function start(mode) {
    let entries = [], limit = 0, label = "";
    if (mode === "full") { entries = selectExam(FULL); limit = FULL.minutes * 60; label = "Examen complet"; }
    else if (mode === "quick") { entries = selectExam(QUICK); limit = QUICK.minutes * 60; label = "Mini-examen"; }
    else if (mode === "domain") {
      const d = $("#domSel").value, n = +$("#domCount").value;
      const pool = BANK.filter(function (b) { return String(b.d) === d; });
      entries = pickFrom(pool, n, {}).map(function (b) { return { item: b }; });
      if ($("#domPbq").checked) {
        entries = S.data.pbqs.filter(function (p) { return String(p.d) === d; }).map(function (p) { return { pbq: p }; }).concat(entries);
      }
      label = "Entraînement — domaine " + d;
    } else if (mode === "mistakes") {
      const ids = Object.keys(mistakes).filter(function (id) { return BY_ID[id]; });
      if (!ids.length) return;
      entries = U.shuffle(ids).slice(0, 50).map(function (id) { return { item: BY_ID[id] }; });
      label = "Révision des erreurs";
    }
    X = { mode: mode, label: label, qs: entries.map(instantiate), ans: {}, flags: {}, checked: {}, cur: 0, done: false, limit: limit, start: Date.now() };
    X.practice = (mode === "domain" || mode === "mistakes");
    show("exam"); render();
    clearInterval(tick);
    if (limit) tick = setInterval(updTimer, 500);
    updTimer();
  }

  function show(id) {
    ["home", "exam", "results"].forEach(function (s) { $("#" + s).classList.toggle("hidden", s !== id); });
    window.scrollTo(0, 0);
  }

  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  function updTimer() {
    if (!X) return;
    const el = $("#timer");
    if (!X.limit) { el.textContent = "Entraînement"; el.classList.remove("low"); return; }
    const left = X.limit - (Date.now() - X.start) / 1000;
    el.textContent = fmt(left);
    el.classList.toggle("low", left < 600);
    if (left <= 0) finish(true);
  }

  function answered(i) {
    const q = X.qs[i], a = X.ans[i];
    if (a == null) return false;
    if (q.pbq) return Object.keys(a).some(function (k) { return a[k]; });
    return Array.isArray(a) ? a.length > 0 : true;
  }

  function scoreQ(i) {
    const q = X.qs[i], a = X.ans[i];
    if (q.pbq) {
      if (!a) return 0;
      let ok = 0;
      q.rows.forEach(function (r, k) { if (a[k] === r.a) ok++; });
      return ok / q.rows.length;
    }
    if (a == null) return 0;
    const sel = [].concat(a).sort();
    return (sel.length === q.a.length && sel.every(function (v, k) { return v === q.a[k]; })) ? 1 : 0;
  }
  const weight = function (q) { return q.pbq ? 3 : 1; };

  function tag(q) {
    return '<span class="qtag" style="background:' + D[q.d].color + '">' + (q.pbq ? "PBQ · " : "") + "Domaine " + q.d + ".0 — " + esc(D[q.d].name) + "</span>";
  }

  function render() {
    const i = X.cur, q = X.qs[i], a = X.ans[i];
    const reveal = X.practice && X.checked[i];
    $("#qnum").textContent = "Question " + (i + 1) + " / " + X.qs.length;
    $("#flagBtn").classList.toggle("on", !!X.flags[i]);
    $("#flagBtn").classList.toggle("hidden", X.practice);
    $("#endBtn").textContent = X.practice ? "Voir le bilan" : "Terminer l'examen";

    let h = tag(q);
    if (q.pbq) {
      h += '<div class="qtext"><b>' + esc(q.title) + '</b></div><div class="scenario">' + esc(q.scenario) + "</div>";
      h += q.rows.map(function (r, k) {
        const v = (a && a[k]) || "";
        const cls = reveal ? (v === r.a ? "correct" : "wrong") : "";
        return '<div class="pbq-row ' + cls + '"><div>' + esc(r.l) + '</div><select data-pbq="' + k + '" ' + (reveal ? "disabled" : "") + '><option value="">— Choisir —</option>' +
          q.choices.map(function (c) { return "<option" + (v === c ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select>" +
          (reveal && v !== r.a ? '<div class="fix">Bonne réponse : ' + esc(r.a) + "</div>" : "") + "</div>";
      }).join("");
    } else {
      h += '<p class="qtext">' + esc(q.q) + (q.multi ? ' <span class="multi">(Choose two.)</span>' : "") + "</p>";
      const sel = a == null ? [] : [].concat(a);
      h += q.o.map(function (o, k) {
        let cls = sel.indexOf(k) >= 0 ? "sel" : "";
        if (reveal) { if (q.a.indexOf(k) >= 0) cls = "correct"; else if (sel.indexOf(k) >= 0) cls = "wrong"; }
        return '<div class="opt ' + cls + '" data-opt="' + k + '" role="button" tabindex="0"><span class="k">' + "ABCDE"[k] + ".</span><span>" + esc(o) + "</span></div>";
      }).join("");
    }
    if (reveal) {
      const s = scoreQ(i);
      const col = s === 1 ? "var(--ok)" : s > 0 ? "var(--warn)" : "var(--accent)";
      const lab = s === 1 ? "Correct !" : s > 0 ? "Partiellement correct (" + Math.round(s * 100) + " %)" : "Incorrect.";
      h += '<div class="expl"><span class="verdict" style="color:' + col + '">' + lab + "</span> " + esc(q.e) + "</div>";
    }
    h += '<div class="nav"><button id="prevBtn" ' + (i === 0 ? "disabled" : "") + ">← Précédente</button>";
    if (X.practice && !reveal) h += '<button class="primary" id="checkBtn" ' + (answered(i) ? "" : "disabled") + ">Valider</button>";
    h += '<button id="nextBtn" ' + (i === X.qs.length - 1 ? "disabled" : "") + ">Suivante →</button></div>";
    $("#qcard").innerHTML = h;
    renderGrid();
  }

  function renderGrid() {
    $("#qgrid").innerHTML = X.qs.map(function (q, k) {
      const c = [];
      if (k === X.cur) c.push("cur");
      if (X.practice && X.checked[k]) { const s = scoreQ(k); c.push(s === 1 ? "r-ok" : s > 0 ? "r-part" : "r-ko"); }
      else if (answered(k)) c.push("ans");
      if (X.flags[k]) c.push("flag");
      return '<button class="' + c.join(" ") + '" data-go="' + k + '">' + (q.pbq ? "P" : "") + (k + 1) + "</button>";
    }).join("");
  }

  function go(k) { if (k < 0 || k >= X.qs.length) return; X.cur = k; render(); window.scrollTo({ top: 0 }); }

  function check(i) {
    X.checked[i] = true;
    recordResult(i);
    saveMemory();
    render();
  }

  // Met à jour la mémoire personnelle pour une question
  function recordResult(i) {
    const q = X.qs[i];
    if (q.pbq || !q.id) return;
    seen[q.id] = (seen[q.id] || 0) + 1;
    if (scoreQ(i) === 1) delete mistakes[q.id]; else mistakes[q.id] = true;
  }

  document.addEventListener("click", function (e) {
    const t = e.target;
    const st = t.closest("[data-start]");
    if (st) { start(st.dataset.start); return; }
    if (!X || X.done) return;
    const opt = t.closest("[data-opt]");
    if (opt && !(X.practice && X.checked[X.cur])) {
      const q = X.qs[X.cur], k = +opt.dataset.opt;
      if (q.multi) {
        let s = [].concat(X.ans[X.cur] || []);
        s = s.indexOf(k) >= 0 ? s.filter(function (v) { return v !== k; }) : s.concat([k]);
        X.ans[X.cur] = s;
      } else X.ans[X.cur] = k;
      render(); return;
    }
    const g = t.closest("[data-go]");
    if (g) { go(+g.dataset.go); return; }
    if (t.id === "prevBtn") go(X.cur - 1);
    if (t.id === "nextBtn") go(X.cur + 1);
    if (t.id === "checkBtn") check(X.cur);
    if (t.id === "flagBtn") { X.flags[X.cur] = !X.flags[X.cur]; render(); }
  });

  document.addEventListener("change", function (e) {
    const t = e.target;
    if (t.dataset.pbq != null && X) {
      const o = X.ans[X.cur] || {};
      o[+t.dataset.pbq] = t.value;
      X.ans[X.cur] = o;
      renderGrid();
      const cb = $("#checkBtn"); if (cb) cb.disabled = !answered(X.cur);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (!X || X.done || $("#exam").classList.contains("hidden") || e.target.tagName === "SELECT") return;
    if (!$("#modal").classList.contains("hidden")) return;
    if (e.key === "ArrowRight") go(X.cur + 1);
    else if (e.key === "ArrowLeft") go(X.cur - 1);
    else if (e.key.toLowerCase() === "f" && !X.practice) { X.flags[X.cur] = !X.flags[X.cur]; render(); }
    else if (/^[1-5]$/.test(e.key)) { const el = document.querySelector('[data-opt="' + (+e.key - 1) + '"]'); if (el) el.click(); }
    else if (e.key === "Enter" && $("#checkBtn") && !$("#checkBtn").disabled) $("#checkBtn").click();
  });

  function confirmBox(title, text, yes) {
    $("#mTitle").textContent = title; $("#mText").textContent = text;
    $("#modal").classList.remove("hidden");
    $("#mYes").onclick = function () { $("#modal").classList.add("hidden"); yes(); };
    $("#mNo").onclick = function () { $("#modal").classList.add("hidden"); };
  }

  $("#endBtn").onclick = function () {
    if (X.practice) { finish(false); return; }
    const un = X.qs.filter(function (_, k) { return !answered(k); }).length;
    const fl = Object.keys(X.flags).filter(function (k) { return X.flags[k]; }).length;
    confirmBox("Terminer l'examen ?", un + " question(s) sans réponse, " + fl + " marquée(s) pour révision. Une fois terminé, tu ne pourras plus modifier tes réponses.", function () { finish(false); });
  };
  $("#quitBtn").onclick = function () {
    confirmBox("Quitter ?", "Ta progression sur cette session sera perdue.", function () { clearInterval(tick); X = null; show("home"); renderHome(); });
  };

  function finish(timeout) {
    if (X.done) return;
    X.done = true; clearInterval(tick);
    const used = (Date.now() - X.start) / 1000;
    let pts = 0, max = 0;
    const per = {};
    X.qs.forEach(function (q, k) {
      const s = scoreQ(k), w = weight(q);
      pts += s * w; max += w;
      per[q.d] = per[q.d] || { p: 0, m: 0 };
      per[q.d].p += s * w; per[q.d].m += w;
      if (!X.practice) recordResult(k);
      else if (!X.checked[k] && answered(k)) recordResult(k);
    });
    saveMemory();

    const pct = max ? Math.round(pts / max * 100) : 0;
    const scaled = Math.round(100 + 800 * (max ? pts / max : 0));
    const pass = scaled >= 750;
    const nCorrect = X.qs.filter(function (_, k) { return scoreQ(k) === 1; }).length;

    $("#resSub").textContent = (timeout ? "Temps écoulé — " : "") + X.label + " · " + new Date().toLocaleDateString("fr-BE");
    $("#rPct").textContent = pct + "%";
    $("#rPct").style.color = pct >= 85 ? "var(--ok)" : pct >= 75 ? "var(--warn)" : "var(--accent)";
    $("#rRaw").textContent = nCorrect + "/" + X.qs.length + " questions entièrement correctes";
    $("#rScaled").textContent = scaled;
    $("#rVerdict").textContent = pass ? "Réussi" : "Pas encore";
    $("#rVerdict").style.color = pass ? "var(--ok)" : "var(--accent)";
    $("#rVerdictH").textContent = pass ? (pct >= 85 ? "Tu es prêt·e pour le vrai examen" : "Juste au-dessus du seuil : garde de la marge") : "Concentre-toi sur tes domaines les plus faibles";
    $("#rTime").textContent = fmt(used);
    $("#rDomains").innerHTML = Object.keys(per).sort().map(function (d) {
      const p = Math.round(per[d].p / per[d].m * 100);
      return '<div class="drow"><div>' + d + ".0 " + esc(D[d].name) + '<div class="bar"><i style="width:' + p + "%;background:" + D[d].color + '"></i></div></div><b style="text-align:right">' + p + "%</b></div>";
    }).join("");

    // Historique + envoi vers le tableau de bord (même navigateur)
    const date = U.today();
    const hist = S.store.get("history", []);
    hist.push({ date: date, label: X.label, pct: pct, scaled: scaled, n: X.qs.length });
    S.store.set("history", hist.slice(-100));
    let saved = false;
    if (!X.practice) {
      const dash = S.store.get("dashboard", null) || {};
      dash.scores = dash.scores || [];
      dash.scores.push({ id: Date.now(), date: date, src: "Simulateur — " + X.label, v: pct });
      saved = S.store.set("dashboard", dash);
    }
    $("#rSaved").textContent = saved ? "✓ ajouté au tableau de bord" : "";
    X.reviewWrong = false; renderReview();
    show("results");
  }

  function renderReview() {
    const html = X.qs.map(function (q, k) {
      const s = scoreQ(k);
      if (X.reviewWrong && s === 1) return "";
      const col = s === 1 ? "var(--ok)" : s > 0 ? "var(--warn)" : "var(--accent)";
      const lab = s === 1 ? "Correct" : s > 0 ? "Partiel (" + Math.round(s * 100) + " %)" : (answered(k) ? "Incorrect" : "Sans réponse");
      let body = "";
      if (q.pbq) {
        const a = X.ans[k] || {};
        body = '<div class="scenario">' + esc(q.scenario) + "</div>" + q.rows.map(function (r, j) {
          return '<div class="pbq-row ' + (a[j] === r.a ? "correct" : "wrong") + '"><div>' + esc(r.l) + "</div><div>" + esc(a[j] || "—") +
            (a[j] !== r.a ? ' → <b style="color:var(--ok)">' + esc(r.a) + "</b>" : "") + "</div></div>";
        }).join("");
      } else {
        const sel = X.ans[k] == null ? [] : [].concat(X.ans[k]);
        body = q.o.map(function (o, j) {
          let c = "";
          if (q.a.indexOf(j) >= 0) c = "correct"; else if (sel.indexOf(j) >= 0) c = "wrong";
          return '<div class="opt static ' + c + '"><span class="k">' + "ABCDE"[j] + ".</span><span>" + esc(o) + (sel.indexOf(j) >= 0 ? ' <i class="mine">(ta réponse)</i>' : "") + "</span></div>";
        }).join("");
      }
      return '<div class="review-item">' + tag(q) + ' <span class="verdict" style="color:' + col + '">' + lab + "</span>" +
        '<p class="qtext">' + (q.pbq ? "<b>PBQ — " + esc(q.title) + "</b>" : esc(q.q)) + "</p>" + body + '<div class="expl">' + esc(q.e) + "</div></div>";
    }).join("");
    $("#review").innerHTML = html || '<p class="muted">Aucune erreur, bravo !</p>';
  }

  $("#onlyWrong").onclick = function () { X.reviewWrong = true; renderReview(); };
  $("#showAll").onclick = function () { X.reviewWrong = false; renderReview(); };
  $("#homeBtn").onclick = function () { X = null; show("home"); renderHome(); };

  function renderHome() {
    const st = S.bankStats(BANK);
    const seenCount = Object.keys(seen).length;
    const mCount = Object.keys(mistakes).filter(function (id) { return BY_ID[id]; }).length;
    $("#bankTotal").textContent = (st.total + st.pbqs).toLocaleString("fr-BE");
    $("#bankSeen").textContent = seenCount.toLocaleString("fr-BE");
    $("#bankSeenPct").textContent = Math.round(seenCount / st.total * 100) + " % de la banque";
    $("#mistakeCount").textContent = mCount;
    $("#mistakesBtn").disabled = !mCount;
    const hist = S.store.get("history", []);
    $("#histCard").classList.toggle("hidden", !hist.length);
    $("#hist").innerHTML = hist.slice().reverse().slice(0, 10).map(function (r) {
      const col = r.pct >= 85 ? "var(--ok)" : r.pct >= 75 ? "var(--warn)" : "var(--accent)";
      return '<div><span class="muted">' + r.date + '</span><span class="grow">' + esc(r.label) + '</span><b style="color:' + col + '">' + r.pct + "% · " + r.scaled + "/900</b></div>";
    }).join("");
  }

  window.addEventListener("beforeunload", function (e) {
    if (X && !X.done && !X.practice) { e.preventDefault(); e.returnValue = ""; }
  });

  renderHome();
})();
