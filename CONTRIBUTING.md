# Contribuer à Security+ Trainer

Merci de vouloir améliorer le projet ! Voici comment ajouter du contenu proprement.

## Règles de base

- **Uniquement du contenu original.** Ne copie jamais de questions issues de l'examen réel, de livres ou de cours payants. Les *braindumps* sont interdits par CompTIA et entraînent le retrait de la certification.
- Les questions restent **en anglais** (langue de l'examen) et les explications **en français**.
- Chaque contenu doit se rattacher à un objectif officiel SY0-701.
- Lance `npm run validate` avant d'ouvrir une pull request. La CI le fait aussi.

## Ajouter un concept (le plus simple)

Dans `data/concepts/domain-X.js`, ajoute une ligne dans la catégorie appropriée :

```js
SECPLUS.concepts(2, "Social engineering", [
  ["Quishing",                                        // terme exact (en anglais)
   "Phishing that uses QR codes to direct victims to malicious sites.",   // définition
   [                                                  // 3 mises en situation distinctes
     "Stickers with QR codes are placed over legitimate ones on parking meters.",
     "An email asks users to scan a QR code to re-enable their MFA.",
     "A poster in the break room offers a free lunch via a QR code that leads to a fake login page."
   ],
   "Le quishing est un phishing qui utilise des QR codes."  // explication en français
  ],
]);
```

Ce seul concept produit automatiquement **5 questions**.

**Conseils pour de bonnes mises en situation :**
- Ne cite pas le terme lui-même dans le scénario, sinon la réponse est donnée.
- Rends le scénario **assez spécifique** pour qu'un seul concept de la catégorie soit la meilleure réponse.
- Si ton concept ressemble trop à un autre (par exemple *Vishing* et *Pretexting*), ajoute la paire dans `CONFLICTS` (`assets/js/generator.js`). Ainsi, les deux ne seront jamais proposés ensemble.
- Une catégorie doit idéalement contenir au moins 4 concepts. Sinon, les distracteurs sont complétés avec d'autres concepts du même domaine.

## Ajouter une question écrite à la main

Dans `data/questions-core.js` :

```js
{"d":4,"q":"Question text…","o":["Option A","Option B","Option C","Option D"],"a":1,"e":"Explication en français."}
```

- `a` est l'index de la bonne réponse (en partant de 0), ou un tableau `[0,2]` pour les questions « Choose two ».
- Les options sont mélangées automatiquement à l'affichage.

## Ajouter une PBQ

Dans `data/pbqs.js` :

```js
{"d":3,"title":"…","scenario":"…","choices":["A","B","C"],"rows":[{"l":"Élément à classer","a":"B"}],"e":"Explication."}
```

Chaque ligne a une seule bonne réponse, qui doit figurer dans `choices`.

## Développement

```bash
npm run serve      # serveur local sur http://localhost:8080
npm run validate   # vérifications + statistiques
npm run sample     # 5 questions générées au hasard, pour relecture
```

Aucune dépendance ni étape de build : HTML, CSS et JavaScript natifs.
