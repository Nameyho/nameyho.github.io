/* Générateur de questions.
 * Construit la banque à partir de :
 *  - questions écrites à la main (data/questions-core.js)
 *  - concepts (data/concepts/*.js) → 5 questions par concept :
 *      3 mises en situation, 1 définition → terme, 1 terme → définition
 *  - ports (data/ports.js) → protocole → port et port → protocole
 *  - calculs de risque (SLE / ALE / ARO) avec valeurs aléatoires
 * Les distracteurs sont tirés au hasard à chaque affichage, dans la même famille de concepts. */
(function (global) {
  "use strict";
  const S = global.SECPLUS;
  const U = S.util;

  // Groupes de termes trop proches pour servir de distracteurs l'un à l'autre
  // (sinon plusieurs réponses pourraient être défendables).
  const CONFLICTS = [
    ["Phishing", "Spear phishing", "Whaling", "Business email compromise", "Brand impersonation"],
    ["Vishing", "Pretexting", "Impersonation", "Voice call vector"],
    ["Brand impersonation", "Typosquatting", "Impersonation"],
    ["Distributed denial-of-service", "Amplified DDoS"],
    ["On-path attack", "ARP poisoning", "Evil twin", "Rogue access point", "Deauthentication attack"],
    ["Credential replay", "Replay attack"],
    ["Brute force", "Dictionary attack", "Rainbow table"],
    ["Collision attack", "Birthday attack"],
    ["Trojan", "Remote access trojan"], ["Keylogger", "Spyware"],
    ["Fileless malware", "Memory injection"],
    ["Unsupported systems", "End-of-life", "Legacy system"],
    ["Data exfiltration", "Espionage"], ["Financial gain", "Blackmail"], ["Ransomware", "Blackmail"],
    ["Honeyfile", "Honeytoken"],
    ["Asymmetric encryption", "Key exchange", "Transport encryption"],
    ["Symmetric encryption", "Full-disk encryption", "Record-level encryption"],
    ["Salting", "Key stretching"], ["Data masking", "Obfuscation"],
    ["Certificate authority", "Root of trust", "Certificate chaining"],
    ["Shared responsibility model", "Infrastructure as a Service"],
    ["Shared responsibility model", "Platform as a Service"],
    ["Shared responsibility model", "Software as a Service"],
    ["Serverless", "Platform as a Service"],
    ["Industrial control systems", "SCADA"],
    ["Real-time operating system", "Embedded system"], ["Internet of Things", "Embedded system"],
    ["Screened subnet", "Security zones"], ["802.1X", "Extensible Authentication Protocol"],
    ["Next-generation firewall", "Unified threat management"], ["Web application firewall", "Next-generation firewall"],
    ["Remote access VPN", "Full tunnel", "Split tunnel", "Transport Layer Security"],
    ["Site-to-site VPN", "IPSec"], ["SD-WAN", "Secure access service edge"],
    ["Trade secret", "Intellectual property"], ["Data sovereignty", "Geolocation"],
    ["Load balancing", "Clustering"], ["Geographic dispersion", "Offsite backup"],
    ["Replication", "Journaling"], ["Tabletop exercise", "Simulation"],
    ["Secure baseline", "Group Policy"], ["Site survey", "Heat map"],
    ["Mobile device management", "Bring your own device"],
    ["Asset inventory", "Enumeration"],
    ["Vulnerability scan", "Credentialed scan", "Rescanning"],
    ["Threat feed", "Open-source intelligence", "Dark web monitoring"],
    ["Penetration testing", "Bug bounty"],
    ["Security information and event management", "Log aggregation"],
    ["Security Content Automation Protocol", "Benchmarks"],
    ["Web filter", "Agent-based web filtering", "DNS filtering"],
    ["Endpoint detection and response", "Extended detection and response"],
    ["User behavior analytics", "Anomaly-based detection"],
    ["SSH", "SFTP"],
    ["Federation", "Single sign-on", "SAML"],
    ["Rule-based access control", "Time-of-day restrictions"],
    ["Multifactor authentication", "Something you have"], ["Multifactor authentication", "Something you are"],
    ["Multifactor authentication", "Somewhere you are"],
    ["Security key", "Something you have"], ["Security key", "Passwordless authentication"],
    ["Password manager", "Password vaulting"],
    ["Privileged access management", "Just-in-time permissions"],
    ["Privileged access management", "Password vaulting"],
    ["Privileged access management", "Ephemeral credentials"],
    ["Legal hold", "E-discovery"], ["Chain of custody", "Forensic imaging"],
    ["Endpoint logs", "Operating system security logs"],
    ["Acceptable use policy", "Policy"], ["Incident response plan", "Playbook"],
    ["Board of directors", "Governance committee"],
    ["Risk appetite", "Expansionary risk appetite"], ["Risk appetite", "Conservative risk appetite"],
    ["Due diligence", "Vendor questionnaire"],
    ["Fines", "Sanctions"], ["Attestation", "Acknowledgement"],
    ["Internal audit", "Audit committee"], ["Internal audit", "Self-assessment"],
    ["Physical penetration test", "Offensive testing"],
    ["Anomalous behavior recognition", "Unintentional behavior"],
    ["Anomalous behavior recognition", "Insider threat awareness"],
    ["Situational awareness", "Operational security"]
  ];
  const conflictMap = {};
  CONFLICTS.forEach(function (g) {
    g.forEach(function (a) {
      conflictMap[a] = conflictMap[a] || {};
      g.forEach(function (b) { if (a !== b) conflictMap[a][b] = true; });
    });
  });
  const conflicts = function (a, b) { return !!(conflictMap[a] && conflictMap[a][b]); };

  const SCENARIO_STEMS = [
    "Which of the following BEST describes this?",
    "Which of the following is being described?",
    "Which of the following does this scenario BEST illustrate?",
    "Which of the following concepts does this MOST likely represent?"
  ];

  // Choisit 3 distracteurs : d'abord dans la même catégorie, puis dans le même domaine.
  function distractors(concept, n) {
    const C = S.data.concepts;
    const ok = function (x) { return x !== concept && x.term !== concept.term && !conflicts(concept.term, x.term); };
    // même catégorie en priorité, complétée par le reste du domaine si besoin
    const pool = U.shuffle(C.filter(function (x) { return x.d === concept.d && x.cat === concept.cat && ok(x); }))
      .concat(U.shuffle(C.filter(function (x) { return x.d === concept.d && x.cat !== concept.cat && ok(x); })));
    // évite deux distracteurs en conflit entre eux
    const chosen = [];
    for (let i = 0; i < pool.length && chosen.length < n; i++) {
      if (!chosen.some(function (c) { return conflicts(c.term, pool[i].term); })) chosen.push(pool[i]);
    }
    return chosen;
  }

  function firstSentence(s) {
    const m = String(s).match(/^.*?[.!?](\s|$)/);
    return m ? m[0].trim() : s;
  }

  function explain(concept, others) {
    return concept.fr + "\n\nLes autres options :\n" + others.map(function (o) {
      return "• " + o.term + " — " + firstSentence(o.fr);
    }).join("\n");
  }

  // Construit un objet question {q, o, a, e} à partir de la bonne réponse et des distracteurs.
  function assemble(stem, correctLabel, distractorLabels, expl) {
    const opts = U.shuffle([correctLabel].concat(distractorLabels));
    return { q: stem, o: opts, a: [opts.indexOf(correctLabel)], e: expl };
  }

  // --- Calculs de risque ---
  function money(n) { return "$" + n.toLocaleString("en-US"); }
  const CALC = [
    { id: "calc-ale", make: function () {
      const value = U.pick([50, 80, 120, 150, 200, 250, 400, 500, 750, 1000]) * 1000;
      const ef = U.pick([10, 20, 25, 30, 40, 50, 60, 75, 100]);
      const years = U.pick([1, 2, 4, 5, 10]);
      const aro = 1 / years;
      const sle = value * ef / 100, ale = Math.round(sle * aro);
      const cands = [ale, sle, Math.round(value * aro), ale * 2, Math.round(ale / 2), ale + 10000];
      const uniq = Array.from(new Set(cands)).slice(0, 4);
      const labels = U.shuffle(uniq).map(money);
      return {
        q: "A server room is valued at " + money(value) + ". A flood would cause damage equal to " + ef + "% of its value, and such a flood is expected once every " + (years === 1 ? "year" : years + " years") + ". What is the annualized loss expectancy (ALE)?",
        o: labels, a: [labels.indexOf(money(ale))],
        e: "SLE = valeur × EF = " + money(value) + " × " + ef + "% = " + money(sle) + ".\nARO = 1/" + years + " = " + (Math.round(aro * 100) / 100) + ".\nALE = SLE × ARO = " + money(ale) + "."
      };
    }},
    { id: "calc-sle", make: function () {
      const value = U.pick([20, 40, 60, 90, 120, 300, 600]) * 1000;
      const ef = U.pick([5, 10, 15, 20, 25, 40, 50, 80]);
      const sle = value * ef / 100;
      const cands = [sle, value, Math.round(value * (100 - ef) / 100), sle * 2, Math.round(sle / 2)];
      const uniq = Array.from(new Set(cands)).slice(0, 4);
      const labels = U.shuffle(uniq).map(money);
      return {
        q: "A database server is valued at " + money(value) + ". A ransomware attack is expected to cause a loss equal to " + ef + "% of its value. What is the single loss expectancy (SLE)?",
        o: labels, a: [labels.indexOf(money(sle))],
        e: "SLE = valeur de l'actif × exposure factor = " + money(value) + " × " + ef + "% = " + money(sle) + "."
      };
    }},
    { id: "calc-aro", make: function () {
      const years = U.pick([2, 4, 5, 10, 20, 25, 50]);
      const aro = 1 / years;
      const fmt = function (x) { return String(Math.round(x * 1000) / 1000); };
      const cands = [aro, years, aro * 2, 1 - aro];
      const labels = U.shuffle(Array.from(new Set(cands.map(fmt)))).slice(0, 4);
      if (labels.indexOf(fmt(aro)) < 0) labels[0] = fmt(aro);
      return {
        q: "A risk analyst estimates that a major earthquake will affect the data center once every " + years + " years. What annualized rate of occurrence (ARO) should be used?",
        o: labels, a: [labels.indexOf(fmt(aro))],
        e: "ARO = nombre d'occurrences par an = 1 / " + years + " = " + fmt(aro) + "."
      };
    }}
  ];

  // --- Construction de la banque ---
  // Chaque élément : { id, d, kind, key (pour éviter les doublons de concept), make() → question }
  S.buildBank = function () {
    const bank = [];

    S.data.core.forEach(function (q, i) {
      bank.push({ id: "core-" + i, d: q.d, kind: "core", key: "core-" + i, make: function () {
        const idx = U.shuffle(q.o.map(function (_, k) { return k; }));
        const ans = [].concat(q.a);
        return { q: q.q, o: idx.map(function (k) { return q.o[k]; }), a: ans.map(function (a) { return idx.indexOf(a); }).sort(), e: q.e };
      }});
    });

    S.data.concepts.forEach(function (c) {
      const key = "c:" + c.term;
      c.sc.forEach(function (sc, k) {
        bank.push({ id: key + ":s" + k, d: c.d, kind: "scenario", key: key, make: function () {
          const ds = distractors(c, 3);
          return assemble(sc + " " + U.pick(SCENARIO_STEMS), c.term, ds.map(function (x) { return x.term; }), explain(c, ds));
        }});
      });
      bank.push({ id: key + ":def", d: c.d, kind: "definition", key: key, make: function () {
        const ds = distractors(c, 3);
        return assemble("Which of the following terms BEST matches this definition: “" + c.def + "”", c.term, ds.map(function (x) { return x.term; }), explain(c, ds));
      }});
      bank.push({ id: key + ":term", d: c.d, kind: "term", key: key, make: function () {
        const ds = distractors(c, 3);
        return assemble("Which of the following BEST describes " + c.term + "?", c.def, ds.map(function (x) { return x.def; }), explain(c, ds));
      }});
    });

    const P = S.data.ports;
    P.forEach(function (p) {
      const others = function () {
        return U.shuffle(P.filter(function (x) { return x.port !== p.port; })).slice(0, 3);
      };
      bank.push({ id: "port:" + p.port + ":p", d: 4, kind: "port", key: "port:" + p.port, make: function () {
        const os = others();
        return assemble("Which port does " + p.proto + " use by default?", p.port, os.map(function (x) { return x.port; }),
          p.proto + " → " + p.port + " : " + p.fr + "\n\nLes autres options :\n" + os.map(function (x) { return "• " + x.port + " — " + x.proto; }).join("\n"));
      }});
      bank.push({ id: "port:" + p.port + ":s", d: 4, kind: "port", key: "port:" + p.port, make: function () {
        const os = others();
        return assemble("A firewall log shows traffic to TCP/UDP port " + p.port + ". Which service is MOST likely in use?", p.proto, os.map(function (x) { return x.proto; }),
          "Le port " + p.port + " correspond à " + p.proto + " : " + p.fr + "\n\nLes autres options :\n" + os.map(function (x) { return "• " + x.proto + " — port " + x.port; }).join("\n"));
      }});
    });

    CALC.forEach(function (c) {
      bank.push({ id: c.id, d: 5, kind: "calc", key: c.id, make: c.make });
    });

    return bank;
  };

  S.bankStats = function (bank) {
    const st = { total: bank.length, byDomain: {}, byKind: {}, pbqs: S.data.pbqs.length, concepts: S.data.concepts.length };
    bank.forEach(function (b) {
      st.byDomain[b.d] = (st.byDomain[b.d] || 0) + 1;
      st.byKind[b.kind] = (st.byKind[b.kind] || 0) + 1;
    });
    return st;
  };
})(typeof window !== "undefined" ? window : globalThis);
