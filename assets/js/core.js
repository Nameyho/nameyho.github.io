/* Noyau commun : registre des données + stockage local.
 * Toutes les données de progression restent dans le navigateur du visiteur (localStorage).
 * Rien n'est envoyé à un serveur. */
(function (global) {
  "use strict";

  const SECPLUS = global.SECPLUS || {};
  SECPLUS.data = { concepts: [], core: [], pbqs: [], ports: [] };

  SECPLUS.DOMAINS = {
    1: { name: "General Security Concepts", weight: 12, color: "var(--d1)" },
    2: { name: "Threats, Vulnerabilities & Mitigations", weight: 22, color: "var(--d2)" },
    3: { name: "Security Architecture", weight: 18, color: "var(--d3)" },
    4: { name: "Security Operations", weight: 28, color: "var(--d4)" },
    5: { name: "Security Program Management & Oversight", weight: 20, color: "var(--d5)" }
  };

  // --- Enregistrement des fichiers de données ---
  SECPLUS.concepts = function (domain, category, rows) {
    rows.forEach(function (r) {
      SECPLUS.data.concepts.push({ d: domain, cat: category, term: r[0], def: r[1], sc: r[2], fr: r[3] });
    });
  };
  SECPLUS.core = function (rows) { SECPLUS.data.core.push.apply(SECPLUS.data.core, rows); };
  SECPLUS.pbqs = function (rows) { SECPLUS.data.pbqs.push.apply(SECPLUS.data.pbqs, rows); };
  SECPLUS.ports = function (rows) {
    rows.forEach(function (r) { SECPLUS.data.ports.push({ proto: r[0], port: r[1], fr: r[2] }); });
  };

  // --- Stockage local (par navigateur, donc personnel à chaque visiteur) ---
  const PREFIX = "secplus.";
  SECPLUS.store = {
    get: function (key, fallback) {
      try {
        const raw = global.localStorage.getItem(PREFIX + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { global.localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) { try { global.localStorage.removeItem(PREFIX + key); } catch (e) {} },
    // Export / import de toute la progression (sauvegarde ou changement d'appareil)
    exportAll: function () {
      const out = {};
      try {
        for (let i = 0; i < global.localStorage.length; i++) {
          const k = global.localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) out[k.slice(PREFIX.length)] = JSON.parse(global.localStorage.getItem(k));
        }
      } catch (e) {}
      return { app: "securityplus-trainer", version: 1, exportedAt: new Date().toISOString(), data: out };
    },
    importAll: function (payload) {
      if (!payload || payload.app !== "securityplus-trainer" || !payload.data) throw new Error("Fichier de sauvegarde invalide");
      Object.keys(payload.data).forEach(function (k) { SECPLUS.store.set(k, payload.data[k]); });
    },
    clearAll: function () {
      try {
        const keys = [];
        for (let i = 0; i < global.localStorage.length; i++) {
          const k = global.localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) keys.push(k);
        }
        keys.forEach(function (k) { global.localStorage.removeItem(k); });
      } catch (e) {}
    }
  };

  // --- Utilitaires ---
  SECPLUS.util = {
    esc: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    },
    shuffle: function (arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    today: function () { return new Date().toISOString().slice(0, 10); },
    download: function (filename, obj) {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    }
  };

  global.SECPLUS = SECPLUS;
})(typeof window !== "undefined" ? window : globalThis);
