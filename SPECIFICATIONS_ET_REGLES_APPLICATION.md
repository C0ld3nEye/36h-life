# 🪐 GUIDE MAÎTRE, SPÉCIFICATIONS ET RÈGLES INVIOLABLES DE L'APPLICATION
**Projet : Simulateur de Vie 36H (SimDeVie)**  
*Document de référence technique et narratif à destination des développeurs et intelligences artificielles.*

---

## 🛑 1. LES RÈGLES D'OR INVIOLABLES (NE JAMAIS MODIFIER)

Toute intelligence artificielle ou développeur intervenant sur cette base de code **DOIT IMPÉRATIVEMENT** respecter les 5 piliers fondamentaux suivants :

### Règle 1 : Modèles d'Intelligence Artificielle Fixes
Les identifiants de modèles d'IA configurés dans le projet sont définitifs et ne doivent **JAMAIS** être renommés, modifiés ou remplacés sans demande explicite de l'utilisateur :
* **Texte et Narration :** `gemini-3.5-flash-lite` (avec repli sur `gemini-3.1-flash-lite`).
* **Génération d'Images & Portraits :** `gemini-3.1-flash-lite-image` (avec repli sur `gemini-3.1-flash-image` puis repli déterministe).

### Règle 2 : Inventaire 100 % Textuel (Zéro bouton d'action UI)
L'inventaire dans l'interface ([`src/components/InventoryView.tsx`](file:///c:/Users/Loric/Documents/antigravity/36h-life/src/components/InventoryView.tsx)) est une **archive visuelle de consultation pure**.
* Il ne **faut jamais ajouter de boutons "Manger", "Boire", "Consommer", "Déplacer" ou "Jeter"** dans les listes de l'interface.
* **Toutes les actions du joueur passent exclusivement par la saisie textuelle** dans la zone de texte du simulateur (ex: *"Je prépare des pâtes avec de la sauce bolognaise et 2 œufs"*).
* L'IA et le moteur de règles déterministe ([`DeterministicRulesEngine`](file:///c:/Users/Loric/Documents/antigravity/36h-life/src/engine/rulesEngine.ts)) doivent détecter automatiquement chaque ingrédient/objet mentionné, le déduire de l'inventaire avec la quantité exacte (`quantityDelta: -1`), et réapprovisionner les jauges vitales (faim, énergie, humeur).

### Règle 3 : Mémoire Sans Faille & Préservation Intégrale du Contexte (Zéro Amnésie)
Pour éviter que l'IA n'oublie des éléments majeurs de la vie du personnage :
* **Le répertoire canonique complet** (tous les personnages connus, tous les lieux explorés, toutes les pistes d'intrigues, les rumeurs et les alertes d'agenda) **DOIT TOUJOURS être injecté à 100 % dans le prompt**.
* **Il est formellement interdit de tronquer ou d'omettre des personnages ou des lieux connus** sous prétexte d'optimiser les tokens.
* Le système de **RAG vectoriel** ([`server/memoryEmbeddings.ts`](file:///c:/Users/Loric/Documents/antigravity/36h-life/server/memoryEmbeddings.ts)) sert de couche de rappel supplémentaire pour les souvenirs épisodiques anciens, mais ne remplace pas le répertoire canonique.

### Règle 4 : Protection Financière Déterministe en Mode Hors-Ligne (Autopilote)
Le joueur ne doit jamais revenir dans sa partie après une absence pour découvrir son compte bancaire vidé :
* **Mode `prudent`** : Dépenses en absence **strictement égales à 0 €** (`checkingDelta: 0`).
* **Mode `normal`** : Dépenses de 0 € si des provisions existent dans le studio, plafonnées à **10 € maximum** si le frigo était totalement vide.
* **Mode `curieux`** : Petits frais du quotidien (café, encas) plafonnés à **5 € maximum**.
* Le moteur déterministe [`rulesEngine.ts`](file:///c:/Users/Loric/Documents/antigravity/36h-life/src/engine/rulesEngine.ts) intercepte et bloque tout débit non conforme.

### Règle 5 : Respect du Cycle Planétaire de 36 Heures
* Une journée complète fait **exactement 36 heures** (et non 24 heures).
* Le calendrier démarre le **01/01/2100** (Jour 1).
* Les 6 phases atmosphériques (Aube naissante, Matinée lumineuse, Zénith solaire, Après-midi prolongé, Crépuscule doré, Nuit profonde) régissent la luminosité, la météo et le rythme social de la cité.
* **Attention :** Les heures 28:00 à 31:59 correspondent au crépuscule/soirée et non au matin !

### Règle 6 : Narration Directe & Interdiction des Clichés Répétitifs
* **Interdiction formelle des tics de langage poétiques répétitifs** : Ne jamais commencer systématiquement chaque réponse par des formules toutes faites sur la météo ou la lumière (*"la lumière dorée vient caresser votre visage..."*, *"les reflets du soleil baignent la pièce..."*, etc.).
* La narration doit être **directe, vive, ancrée dans le concret et le quotidien** : décrire immédiatement le résultat de l'action du joueur, ses gestes réels, ou la réplique spontanée d'un personnage.
* L'ambiance et la météo ne sont mentionnées que de façon sobre lorsque la situation l'exige vraiment (ex: regarder par la fenêtre, sortir après une longue tâche).

### Règle 7 : Double Parcours des Tâches Longues & Seuil des 15 Minutes
* **Temps Réel Continu (Zéro Saut dans le Temps)** : Le jeu se déroule en temps réel continu (1 minute réelle = 1 minute de jeu). Il n'y a **jamais de saut artificiel dans le temps**.
* **Estimation systématique (`durationMinutes`)** : Chaque réponse de l'IA évalue la durée réaliste en minutes de jeu.
* **Moins de 15 minutes (< 15 min)** : L'action s'accomplit immédiatement dans le récit narratif sans générer de tâche bloquante ni de décompte. Le temps continue de s'écouler normalement en temps réel.
* **15 minutes ou plus (>= 15 min)** : Déclenchement d'une Tâche Longue avec deux voies d'expérience :
  * **Voie A (Joueur absent)** : Le timer s'écoule en arrière-plan en temps réel. À son terme, notification système. Au retour, le premier message est un grand récit chronologique récapitulant tout le déroulé de l'activité.
  * **Voie B (Joueur actif pendant la tâche)** : L'interface et le prompt restent verrouillés sur le contexte de la tâche en cours. Les choix (`choices`) sont des manières concrètes d'aborder le travail, et les messages du joueur peuvent accélérer (`taskTimeAdjustmentMinutes: -20`) ou ralentir (`+15`) le timer restant.

### Règle 8 : Interdiction des Données Chiffrées Visibles (Interface 100 % Qualitative)
* **Distinction Données Internes vs Affichage Joueur** : L'application et le moteur de règles peuvent manipuler en interne des données numériques, des calculs de points ou des paliers pour faire fonctionner les mécaniques sous le capot.
* **Zéro Chiffre Visible pour le Joueur** : Le joueur ne doit **JAMAIS** voir de données quantifiables, de scores, de points d'expérience ou de pourcentages pour ses compétences, son état de conscience, son bien-être ou ses jauges (pas de `+15 XP`, `Niveau 1`, `45/100`, `78%`).
* **Affichage Strictement Qualitatif** :
  * Compétences : Libellés humains (*Notions de base*, *Pratique régulière*, *Savoir-faire solide*, *Maîtrise confirmée*) et barres de progression visuelles sans chiffres.
  * Jauges vitales et Mindset : Couleurs, sentiments diégétiques (*Pleine forme*, *Rassasié*, *Confiant*, *Tendu*) et jauges d'humeur sans pourcentages bruts.

---

## 🏛️ 2. ARCHITECTURE TECHNIQUE GLOBALE

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19 / Vite)               │
│  - MainScreen (Feed narratif, saisie textuelle, choix)      │
│  - TopBar (Jauges vitales, horloge 36h, indicateur Mindset)│
│  - FoldersScreen (Archives : Inventaire, PNJ, Lieux, RAG)   │
│  - AgendaScreen & BankScreen (Planning & Finances)          │
└──────────────┬───────────────────────────────▲──────────────┘
               │                               │
       Actions │                               │ État mis à jour
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│                  MOTEUR DE RÈGLES DÉTERMINISTE              │
│                 (src/engine/rulesEngine.ts)                 │
│  - Validation des finances (pas de découvert interdit)      │
│  - Validation des retraits d'inventaire multi-ingrédients   │
│  - Validation des gains de faim/énergie lors des repas      │
│  - Évaluation de fin de cycle (Victoire / Breakdown vital)  │
└──────────────┬───────────────────────────────▲──────────────┘
               │                               │
      Requêtes │                               │ Réponses JSON
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│                    BACKEND (Node.js / Express)              │
│  - server/routes/actionRoute.ts (Maître du Jeu Flash Lite)  │
│  - server/routes/offlineRoute.ts (Récapitulatif d'absence)  │
│  - server/routes/imageRoute.ts (Génération Flash Lite Image)│
│  - server/timeService.ts (Astronomie & Calendrier 2100)     │
│  - server/memoryEmbeddings.ts (RAG Vectoriel Embeddings)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 3. SYSTÈME DE SAUVEGARDE ET PERSISTANCE

L'application utilise une stratégie de persistance à 3 niveaux pour garantir **zéro perte de données** :

1. **IndexedDB (Source locale prioritaire)** : Stocke l'état complet via `idb-keyval` sans restriction de quota.
2. **Firebase Firestore (Cloud temps réel)** : Sauvegarde distante liée au compte Google ou anonyme (`users/{userId}`), avec algorithme de fusion anti-conflits (`mergeGameStates`).
3. **Export / Import JSON Manuel** : Permet à l'utilisateur d'exporter sa partie sous forme de fichier `.json` complet.
   * **Champs impérativement inclus dans l'export :** `epochRealTime`, `gameStatus`, `vitals`, `skills`, `inventory`, `characters`, `locations`, `bank`, `diary`, `agenda`, `plotLeads`, `rumors`, `messages`, `episodicMemories`, `activePlotHooks`, `currentTask`, `narrativeHistory`, `autopilotMode`.

---

## 🍳 4. FONCTIONNEMENT DE L'INVENTAIRE ET DE LA CUISINE

### A. Détection floue et extraction des ingrédients
La fonction [`normalizeItemSearchKey`](file:///c:/Users/Loric/Documents/antigravity/36h-life/src/lib/utils.ts#L452) et [`findMatchingInventoryItemIndex`](file:///c:/Users/Loric/Documents/antigravity/36h-life/src/lib/utils.ts#L471) permettent de faire correspondre le texte saisi par le joueur avec l'inventaire :
* Supprime les articles, conditionnements (*boîte de, paquet de, bocal de*) et accents.
* Fait correspondre par exemple `"pâtes"` avec `"Paquet de pâtes (500g)"` ou `"œufs"` avec `"Boîte de 6 œufs fermiers"`.

### B. Consommation d'ingrédients multiples
Lorsqu'une phrase comme `"Je me prépare des pâtes avec de la sauce tomate et 2 œufs"` est exécutée :
1. Le prompt serveur force le modèle à renvoyer 3 entrées dans `inventoryUpdates` avec `quantityDelta: -1` (ou `-2` pour les unités).
2. Le `DeterministicRulesEngine` intercepte ces mises à jour, vérifie l'existence des objets dans l'inventaire du joueur ou de son appartement, et applique une hausse de satiété (`hunger: +75`) et de moral (`mood: +8`).
3. Si un objet est une boîte (ex: boîte de 6 œufs), sa quantité diminue unitairement sans supprimer la boîte jusqu'à ce que le stock atteigne 0.

---

## ⏰ 5. LE CYCLE TEMPOREL DE 36 HEURES

### Tableau des Phases Atmosphériques
| Plage Horaire | Nom de la Phase | Caractéristiques et Ambiance |
| :--- | :--- | :--- |
| **05:00 - 09:59** | Aube naissante | Ciel bleuté pâle, lueur d'aube rosée, réveil progressif du quartier Saint-Michel. |
| **10:00 - 15:59** | Matinée lumineuse | Soleil haut et net, commerces et échoppes ouverts, animation matinale intense. |
| **16:00 - 21:59** | Zénith solaire | Milieu exact de la journée de 36h, pic d'intensité lumineuse et de chaleur. |
| **22:00 - 27:59** | Après-midi prolongé | Lumière dorée, ombres allongées, terrasses animées, ambiance de fin d'après-midi. |
| **28:00 - 31:59** | Crépuscule doré | **Soirée tombante** (ciel pourpre/ambré, allumage des lanternes). **Ne jamais confondre avec le matin.** |
| **32:00 - 04:59** | Nuit profonde | Nuit noire, néons et lanternes allumés, commerces fermés, calme profond dans les rues. |

---

## 🧠 6. MÉMOIRE ET RAG (EMBEDDINGS VECTORIELS)

* Chaque événement marquant génère un souvenir épisodique vectorisé via le modèle `gemini-embedding-2-preview` (ou repli).
* Les vecteurs sont stockés dans `episodicMemories` et comparés par similarité cosinus avec l'action courante du joueur.
* Une pondération temporelle logarithmique favorise les souvenirs contextuellement pertinents.
* Ces souvenirs sont injectés dans la section `[SOUVENIRS ÉPISODIQUES EXTRAITS PAR RAG]` du prompt pour donner à l'IA une mémoire à long terme infaillible.

---

## 📋 7. DIRECTIVES POUR LES FUTURES MODIFICATIONS

1. **Ne pas lancer de commande de build (`npm run build` ou `vite build`)** sauf si l'utilisateur en fait la demande explicite.
2. **Ne pas modifier les noms des modèles Gemini** dans `server/aiClient.ts` et `server/imageService.ts`.
3. **Toujours faire valider les modifications financières et d'inventaire** par `DeterministicRulesEngine.validateAction()`.
4. **Toujours répondre et rédiger les comptes-rendus en français.**
5. **Supprimer tout fichier temporaire de test** créé lors du développement afin de ne pas polluer l'espace de travail.
