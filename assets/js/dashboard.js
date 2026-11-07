/* Tableau de bord de suivi — progression stockée localement (navigateur) */
(function(){
"use strict";
const DOMAINS = SECPLUS.objectives;
const STORE = SECPLUS.store;

const DEFAULT_PREP = [
 "Créer mon compte CompTIA / Pearson VUE",
 "Acheter le voucher d'examen",
 "Choisir le format : centre d'examen ou en ligne (OnVUE)",
 "Réserver la date d'examen",
 "Vérifier la pièce d'identité (nom identique à l'inscription)",
 "Si en ligne : test système OnVUE + pièce calme et dégagée",
 "Réviser la gestion du temps : 90 questions max, 90 minutes",
 "S'entraîner aux PBQ (questions de simulation)",
 "Score visé : 750 / 900 pour réussir"
];
const DEFAULT_RES = [
 "Objectifs officiels SY0-701 (PDF CompTIA) téléchargés",
 "Cours vidéo complet (ex. Professor Messer, Jason Dion)",
 "Fiches de révision / flashcards des acronymes",
 "Lab pratique : Wireshark, nmap, règles de pare-feu",
 "Premier examen blanc complet (diagnostic)",
 "Examens blancs ≥ 85 % de façon régulière",
 "Revue ciblée des objectifs en confiance faible"
];

let S = Object.assign({items:{}, conf:{}, prep:null, res:null, scores:[], exam:"", open:{}}, STORE.get("dashboard", {}) || {});
if(!S.prep) S.prep = DEFAULT_PREP.map(t=>({t,d:false}));
if(!S.res)  S.res  = DEFAULT_RES.map(t=>({t,d:false}));
function save(){ STORE.set("dashboard", S); }

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const itemKey = (oid,i) => oid+"#"+i;

function objStats(o){ let d=0; o.i.forEach((_,k)=>{ if(S.items[itemKey(o.id,k)]) d++; }); return {d, n:o.i.length}; }
function domStats(D){ let d=0,n=0; D.objs.forEach(o=>{ const s=objStats(o); d+=s.d; n+=s.n; }); return {d,n,p:n?d/n:0}; }

const CONF = [["low","Faible","var(--accent)"],["mid","Moyen","var(--warn)"],["high","Solide","var(--ok)"]];

function renderDomains(){
  const q = $("#search").value.trim().toLowerCase();
  const f = $("#filter").value;
  $("#domains").innerHTML = DOMAINS.map(D=>{
    const ds = domStats(D);
    const objs = D.objs.map(o=>{
      const s = objStats(o), full = s.d===s.n, c = S.conf[o.id];
      const text = (o.id+" "+o.t+" "+o.i.join(" ")).toLowerCase();
      let hide = q && !text.includes(q);
      if(f==="todo" && full) hide = true;
      if(f==="done" && !full) hide = true;
      if(f==="weak" && c!=="low") hide = true;
      const open = S.open[o.id] || (q && !hide);
      return `<div class="obj ${open?"open":""} ${hide?"hidden":""}" data-o="${o.id}">
        <div class="ohead" data-toggle-o="${o.id}">
          <span class="id">${o.id}</span>
          <span class="t">${esc(o.t)} ${full?'<span class="ok-badge">✓</span>':""}</span>
          <span class="conf">${CONF.map(([k,l,col])=>`<button data-conf="${o.id}" data-v="${k}" class="${c===k?"on":""}" style="${c===k?`background:${col};border-color:${col}`:""}">${l}</button>`).join("")}</span>
          <div class="bar mini"><i style="width:${s.d/s.n*100}%;background:${D.color}"></i></div>
          <span class="c">${s.d}/${s.n}</span>
        </div>
        <div class="oitems">${o.i.map((t,k)=>{ const on=!!S.items[itemKey(o.id,k)];
          return `<label class="check ${on?"done":""}"><input type="checkbox" data-item="${itemKey(o.id,k)}" ${on?"checked":""}><span>${esc(t)}</span></label>`;}).join("")}</div>
      </div>`;
    }).join("");
    const domOpen = S.open["D"+D.id] || !!q || f!=="all";
    return `<div class="domain ${domOpen?"open":""}" id="dom${D.id}">
      <div class="dhead" data-toggle-d="${D.id}">
        <span class="chev">▶</span>
        <span class="tag" style="background:${D.color}">${D.id}.0</span>
        <h3>${esc(D.name)} <span class="w">· ${D.en} · ${D.w}%</span></h3>
        <div class="bar" style="width:110px;margin:0"><i style="width:${ds.p*100}%;background:${D.color}"></i></div>
        <span class="p">${Math.round(ds.p*100)}%</span>
      </div>
      <div class="dbody">${objs}</div>
    </div>`;
  }).join("");
}

function renderSummary(){
  let wsum=0, done=0, total=0;
  $("#domSummary").innerHTML = DOMAINS.map(D=>{
    const s = domStats(D); wsum += s.p*D.w; done+=s.d; total+=s.n;
    return `<div class="domrow" data-jump="${D.id}">
      <span class="num">${D.id}.0</span>
      <div><div class="name">${esc(D.name)} <small>· ${D.w}%</small></div><div class="bar"><i style="width:${s.p*100}%;background:${D.color}"></i></div></div>
      <span class="pct">${Math.round(s.p*100)}%</span></div>`;
  }).join("");
  const g = Math.round(wsum);
  $("#kGlobal").textContent = g+"%";
  $("#kGlobalBar").style.width = g+"%";
  $("#kItems").textContent = done;
  const objDone = DOMAINS.reduce((a,D)=>a+D.objs.filter(o=>{const s=objStats(o);return s.d===s.n}).length,0);
  $("#kItemsHint").textContent = `sur ${total} · ${objDone}/28 objectifs complets`;
}

function renderExam(){
  $("#examDate").value = S.exam || "";
  if(!S.exam){ $("#kDays").textContent="—"; return; }
  const t = new Date(S.exam+"T00:00:00"), now = new Date(); now.setHours(0,0,0,0);
  const d = Math.round((t-now)/86400000);
  $("#kDays").textContent = d>0 ? `J-${d}` : d===0 ? "Aujourd'hui !" : "Passé";
  $("#kDays").style.color = d>=0 && d<=14 ? "var(--warn)" : "";
}

function renderScores(){
  const sc = [...S.scores].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  const best = sc.length ? Math.max(...sc.map(s=>s.v)) : null;
  $("#kBest").textContent = best===null ? "—" : best+"%";
  $("#kBest").style.color = best===null ? "" : best>=85 ? "var(--ok)" : best>=70 ? "var(--warn)" : "var(--accent)";
  $("#kBestHint").textContent = sc.length ? `${sc.length} examen(s) · objectif 85 %+` : "objectif : 85 % et plus";
  if(!sc.length){ $("#chart").innerHTML = `<div class="empty" style="align-self:center;width:100%;text-align:center">Ajoute ton premier score pour voir ta courbe</div>`; $("#scoreList").innerHTML=""; return; }
  const last = sc.slice(-14);
  $("#chart").innerHTML = `<div class="target" style="bottom:85%"><span>85 %</span></div>` +
    last.map(s=>`<div class="col" title="${esc(s.src)} — ${s.v}%" style="height:${s.v}%;background:${s.v>=85?"var(--ok)":s.v>=70?"var(--warn)":"var(--accent)"}"><b>${s.v}</b></div>`).join("");
  $("#scoreList").innerHTML = [...sc].reverse().map(s=>`<div><span class="m">${s.date||"—"}</span><span style="flex:1">${esc(s.src||"Examen blanc")}</span><b>${s.v}%</b><button class="x" data-delscore="${s.id}">×</button></div>`).join("");
}

function renderList(key, el, countEl){
  const L = S[key];
  $(el).innerHTML = L.map((x,i)=>`<label class="check ${x.d?"done":""}"><input type="checkbox" data-list="${key}" data-i="${i}" ${x.d?"checked":""}><span>${esc(x.t)}</span><button class="x" data-dellist="${key}" data-i="${i}" title="Supprimer">×</button></label>`).join("");
  $(countEl).textContent = `${L.filter(x=>x.d).length}/${L.length}`;
}

function renderAll(){ renderSummary(); renderDomains(); renderExam(); renderScores(); renderList("prep","#prepList","#prepCount"); renderList("res","#resList","#resCount"); }

document.addEventListener("click", e=>{
  const t = e.target;
  if(t.dataset.conf){ e.stopPropagation(); const id=t.dataset.conf; S.conf[id] = S.conf[id]===t.dataset.v ? undefined : t.dataset.v; save(); renderDomains(); return; }
  if(t.dataset.delscore){ S.scores = S.scores.filter(s=>String(s.id)!==t.dataset.delscore); save(); renderScores(); return; }
  if(t.dataset.dellist){ e.preventDefault(); S[t.dataset.dellist].splice(+t.dataset.i,1); save(); renderAll(); return; }
  const oh = t.closest("[data-toggle-o]");
  if(oh){ const id=oh.dataset.toggleO; S.open[id]=!S.open[id]; save(); oh.parentElement.classList.toggle("open"); return; }
  const dh = t.closest("[data-toggle-d]");
  if(dh){ const id="D"+dh.dataset.toggleD; S.open[id]=!S.open[id]; save(); dh.parentElement.classList.toggle("open"); return; }
  const j = t.closest("[data-jump]");
  if(j){ const id=j.dataset.jump; S.open["D"+id]=true; save(); renderDomains(); document.getElementById("dom"+id).scrollIntoView({behavior:"smooth",block:"start"}); }
});

document.addEventListener("change", e=>{
  const t = e.target;
  if(t.dataset.item){ S.items[t.dataset.item] = t.checked; if(!t.checked) delete S.items[t.dataset.item]; save(); renderSummary(); renderDomains(); }
  if(t.dataset.list){ S[t.dataset.list][+t.dataset.i].d = t.checked; save(); renderList(t.dataset.list, "#"+t.dataset.list+"List", "#"+t.dataset.list+"Count"); }
});

$("#examDate").addEventListener("change", e=>{ S.exam = e.target.value; save(); renderExam(); });
$("#search").addEventListener("input", renderDomains);
$("#filter").addEventListener("change", renderDomains);
$("#expandAll").onclick = ()=>{ DOMAINS.forEach(D=>{ S.open["D"+D.id]=true; D.objs.forEach(o=>S.open[o.id]=true); }); save(); renderDomains(); };
$("#collapseAll").onclick = ()=>{ S.open={}; save(); renderDomains(); };

$("#sDate").value = new Date().toISOString().slice(0,10);
$("#sAdd").onclick = ()=>{
  const v = parseInt($("#sVal").value,10);
  if(isNaN(v)||v<0||v>100){ $("#sVal").focus(); return; }
  S.scores.push({id:Date.now(), date:$("#sDate").value, src:$("#sSrc").value.trim(), v});
  $("#sVal").value=""; save(); renderScores();
};
$("#sVal").addEventListener("keydown", e=>{ if(e.key==="Enter") $("#sAdd").click(); });

function addTo(key, input){ const v=$(input).value.trim(); if(!v) return; S[key].push({t:v,d:false}); $(input).value=""; save(); renderList(key,"#"+key+"List","#"+key+"Count"); }
$("#prepAdd").onclick = ()=>addTo("prep","#prepNew");
$("#resAdd").onclick  = ()=>addTo("res","#resNew");
$("#prepNew").addEventListener("keydown", e=>{ if(e.key==="Enter") addTo("prep","#prepNew"); });
$("#resNew").addEventListener("keydown", e=>{ if(e.key==="Enter") addTo("res","#resNew"); });

$("#exportBtn").onclick = ()=>{
  SECPLUS.util.download(`securityplus-progression-${new Date().toISOString().slice(0,10)}.json`, STORE.exportAll());
};
$("#importFile").addEventListener("change", e=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{ try{ STORE.importAll(JSON.parse(r.result)); S = Object.assign({items:{},conf:{},prep:[],res:[],scores:[],exam:"",open:{}}, STORE.get("dashboard", {})); renderAll(); }catch(err){ $("#kItemsHint").textContent = "Fichier de sauvegarde invalide"; } };
  r.readAsText(f); e.target.value="";
});
$("#resetBtn").onclick = ()=>{
  if($("#resetBtn").dataset.arm){ S={items:{},conf:{},prep:DEFAULT_PREP.map(t=>({t,d:false})),res:DEFAULT_RES.map(t=>({t,d:false})),scores:[],exam:"",open:{}}; save(); renderAll(); $("#resetBtn").textContent="Réinitialiser"; delete $("#resetBtn").dataset.arm; return; }
  $("#resetBtn").dataset.arm="1"; $("#resetBtn").textContent="Confirmer ?";
  setTimeout(()=>{ $("#resetBtn").textContent="Réinitialiser"; delete $("#resetBtn").dataset.arm; },3000);
};

renderAll();
})();
