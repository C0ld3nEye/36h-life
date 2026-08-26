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
* **Embeddings & Mémoire Vectorielle (RAG) :** `text-embedding-004` (avec repli sur `gemini-embedding-2-preview`).

### Règle 2 : Inventaire 100 % Textuel (Zéro bouton d'action UI)
L'inventaire dans l'interface ([`src/components/InventoryView.tsx`](file:///c:/Users/Loric/Documents/antigravity/36h-life/src/components/InventoryView.tsx)) est une **archive visuelle de consultation pure**.
* Il ne **faut jamais ajouter de boutons "Manger", "Boire", "Consommer", "Déplacer" ou "Jeter"** dans les listes de l'interface.
* **Toutes les actions du joueur passent exclusivement par la saisie textuelle** dans la zone de texte du simulateur (ex: *"Je prépare des pâtes avec de la sauce bolognaise et 2 œufs"*).
* L'IA et le moteur de règles déterministe ([`DeterministicRulesEngine`](file:///c:/Users/Loric/Documents/antigravity/36h-life/src/engine/rulesEngine.ts)) doivent détecter automatiquement chaque ingrédient/objet mentionné, le déduire de l'inventaire avec la quantité exacte (`quantityDelta: -1`), et réapprovisionner les jauges vitales (faim, énergie, humeur).

### Règle 3 : Mémoire Sans Faille & Préservation Intégrale du Contexte (Zéro Amnésie)
Pour éviter que l'IA n'oublie des éléments majeurs de la vie du personnage :
* **Le répertoire canonique complet** (tous les personnages connus avec leur position actuelle, tous les lieux explorés avec leurs horaires, toutes les pistes d'intrigues, les rumeurs, l'agenda et les compétences) **DOIT TOUJOURS être injecté à 100 % dans le prompt**.
* **Il est formellement interdit de tronquer ou d'omettre des personnages ou des lieux connus** sous prétexte d'optimiser les tokens.
* Le système de **RAG vectoriel** ([`server/memoryEmbeddings.ts`](file:///c:/Users/Loric/Documents/antigravity/36h-life/server/memoryEmbeddings.ts)) indexe et extrait les souvenirs épisodiques contextuellement pertinents pour enrichir la mémoire à long terme.

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
* **Fermeture nocturne :** De **32:00 à 04:59** (*Nuit profonde*), les commerces et ateliers ferment automatiquement leurs portes.

### Règle 6 : Monde Vivant et Asynchrone (« Living City »)
La ville de Saint-Michel vit de manière autonome sans attendre les instructions du joueur :
* **Déplacements et routines des PNJ** : Les personnages possèdent une position dynamique (`currentLocationId`) et une routine horaire (`schedule`) évoluant selon la phase du cycle.
* **Accessibilité dynamique des lieux** : Calculée par [`DeterministicRulesEngine.isLocationOpen`](file:///c:/Users/Loric/Documents/antigravity/36h-life/src/engine/rulesEngine.ts) selon les horaires d'ouverture (`openingHours`) et les fermetures exceptionnelles narratives (`temporaryStatus`).
* **Péremption des pistes d'intrigue (`PlotLeads`)** : Les opportunités à durée limitée (`expiresAtGameDate`, `expiryWarningText`) expirent automatiquement (`status: 'expire'`) si le joueur tarde trop, avec attribution d'un motif narratif d'échéance manquée (`expiredReason`).
* **Communications spontanées** : L'IA émet des SMS autonomes (`newMessages`) pour relancer le joueur, proposer des sorties ou partager des rumeurs.

### Règle 7 : Narration Directe & Interdiction des Clichés Répétitifs
* **Interdiction formelle des tics de langage poétiques répétitifs** : Ne jamais commencer systématiquement chaque réponse par des formules toutes faites sur la météo ou la lumière (*"la lumière dorée vient caresser votre visage..."*, *"les reflets du soleil baignent la pièce..."*, etc.).
* La narration doit être **directe, vive, ancrée dans le concret et le quotidien** : décrire immédiatement le résultat de l'action du joueur, ses gestes réels, ou la réplique spontanée d'un personnage.
* L'ambiance et la météo ne sont mentionnées que de façon sobre lorsque la situation l'exige vraiment (ex: regarder par la fenêtre, sortir après une longue tâche).

### Règle 8 : Double Parcours des Tâches Longues & Seuil des 15 Minutes
* **Temps Réel Continu (Zéro Saut dans le Temps)** : Le jeu se déroule en temps réel continu (1 minute réelle = 1 minute de jeu). Il n'y a **jamais de saut artificiel dans le temps**.
* **Estimation systématique (`durationMinutes`)** : Chaque réponse de l'IA évalue la durée réaliste en minutes de jeu.
* **Moins de 15 minutes (< 15 min)** : L'action s'accomplit immédiatement dans le récit narratif sans générer de tâche bloquante ni de décompte. Le temps continue de s'écouler normalement en temps réel.
* **15 minutes ou plus (>= 15 min)** : Déclenchement d'une Tâche Longue avec deux voies d'expérience :
  * **Voie A (Joueur absent)** : Le timer s'écoule en arrière-plan en temps réel. À son terme, notification système. Au retour, le premier message est un grand récit chronologique récapitulant tout le déroulé de l'activité.
  * **Voie B (Joueur actif pendant la tâche)** : L'interface et le prompt restent verrouillés sur le contexte de la tâche en cours. Les choix (`choices`) sont des manières concrètes d'aborder le travail, et les messages du joueur peuvent accélérer (`taskTimeAdjustmentMinutes: -20`) ou ralentir (`+15`) le timer restant.

### Règle 9 : Interdiction des Données Chiffrées Visibles (Interface 100 % Qualitative)
* **Distinction Données Internes vs Affichage Joueur** : L'application et le moteur de règles peuvent manipuler en interne des données numériques, des calculs de points ou des paliers pour faire fonctionner les mécaniques sous le capot.
* **Zéro Chiffre Visible pour le Joueur** : Le joueur ne doit **JAMAIS** voir de données quantifiables, de scores, de points d'expérience ou de pourcentages pour ses compétences, son état de conscience, son bien-être ou ses jauges (pas de `+15 XP`, `Niveau 1`, `45/100`, `78%`).
* **Affichage Strictement Qualitatif** :
  * Compétences : Libellés humains (*Notions de base*, *Pratique régulière*, *Aisance acquise*, *Solide expérience*, *Expertise remarquable*) et barres de progression visuelles sans chiffres.
  * Jauges vitales et Mindset : Couleurs, sentiments diégétiques (*Pleine forme*, *Rassasié*, *Confiant*, *Tendu*) et jauges d'humeur sans pourcentages bruts.
  * Intrigues : Étape narrative textuelle (`qualitativeStage`) sans pourcentages artificiels de progression.

### Règle 10 : Écosystème Social Autonome & Dettes de Faveur
* **Graphe relationnel PNJ-PNJ (`socialTies`)** : Les personnages ont des liens vivants entre eux (alliés, associés, rivaux, créanciers, famille) qui évoluent de façon organique en arrière-plan.
* **Solidarité & Dettes de Faveur (`favorBalance` & `favorsNetwork`)** :
  * Rendre service à un PNJ augmente le solde de faveur (`favorDelta: +1`).
  * En situation critique (famine, détresse, compte débiteur, épuisement), un PNJ ami peut intervenir spontanément sans contrepartie financière immédiate pour offrir un hébergement d'urgence, un repas ou une aide financière (`favorDelta: -1`).
  * L'interface affiche l'état qualitatif des faveurs (*« Vous lui avez rendu un fier service »*, *« Relation équilibrée »*, *« Vous lui êtes redevable »*).

### Règle 11 : Économie Vivante, Revente Textuelle d'Objets & Fluctuations du Marché
* **Revente 100 % Textuelle & Mont-de-piété** :
  * Le joueur peut vendre ou mettre en gage des objets de son inventaire (objets trouvés, composants, montres, manuels) par simple saisie textuelle (ex: *"Je vends ma vieille montre au mont-de-piété"*).
  * **Validation Déterministe Stricte** : `DeterministicRulesEngine.validateAction` vérifie que le joueur possède l'objet et qu'il est bien déduit dans `inventoryUpdates` (`quantityDelta < 0`) avant d'autoriser le gain d'argent sur le compte courant (`checkingDelta > 0`). Tout gain sans objet réel déduit est immédiatement annulé.
* **Tendances de Marché Locales (`marketTrends`)** :
  * Événements économiques de quartier (pénuries, arrivages de fret, soldes) influençant les multiplicateurs de prix et consultables dans l'onglet Banque. Expiration automatique selon l'horloge du cycle de 36 heures.

---

## 🏛️ 2. ARCHITECTURE TECHNIQUE GLOBALE & FLUX DE DONNÉES

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React 19 / Vite)                        │
│  - MainScreen (Feed narratif, saisie textuelle, bulles de choix)        │
│  - TopBar (Jauges vitales, horloge 36h, indicateur Mindset, tâche)      │
│  - FoldersScreen (Archives : Inventaire, PNJ, Lieux, Pistes, SMS, RAG)  │
│  - AgendaScreen (Planning 2100, filtres & échéances)                    │
│  - BankScreen (Courant, Épargne, Dettes, Virements & Factures)          │
└───────────────────┬─────────────────────────────────▲───────────────────┘
                    │                                 │
            Actions │                                 │ Mutations validées
                    ▼                                 │
┌─────────────────────────────────────────────────────┴───────────────────┐
│                      MOTEUR DE RÈGLES DÉTERMINISTE                      │
│                       (src/engine/rulesEngine.ts)                       │
│  - Validation financière (plafonnement découvert & protection absence)  │
│  - Validation inventaire multi-ingrédients (retraits & déductions)      │
│  - Restauration automatique de satiété/faim lors des repas consommés   │
│  - Évaluation de péremption des pistes (PlotLeads 'expire')             │
│  - Calcul d'ouverture des lieux (cycle 36h & Nuit Profonde 32h-05h)     │
│  - Évaluation de survie & fin de partie (Breakdown vital ou mental)     │
└───────────────────┬─────────────────────────────────▲───────────────────┘
                    │                                 │
           Requêtes │                                 │ Réponses validées
                    ▼                                 │
┌─────────────────────────────────────────────────────┴───────────────────┐
│                         BACKEND (Node.js / Express)                     │
│  - server/routes/actionRoute.ts (Maître du Jeu Gemini 3.5 Flash Lite)   │
│  - server/routes/offlineRoute.ts (Récapitulatif d'absence autopilote)   │
│  - server/routes/taskProgressRoute.ts (Évolution des tâches longues)    │
│  - server/timeService.ts (Astronomie & Calendrier planétaire 2100)      │
│  - server/memoryEmbeddings.ts (RAG Vectoriel Embeddings Gemini)         │
│  - server/imageService.ts (Génération Portraits Flash Lite Image)       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 3. MATRICE DES INTERCONNEXIONS TRANSVERSALES

Tous les onglets de l'application sont interconnectés et réagissent de manière cohérente à la narration :

| Provenance | Destination | Mécanisme & Effet |
| :--- | :--- | :--- |
| **Messagerie (SMS)** | **Agenda** | Le bouton *« Fixer un RDV »* crée directement un événement lié dans l'Agenda. |
| **Messagerie (SMS)** | **Simulation (IA)** | Répondre à un SMS génère une action narrative immédiate avec la réaction du contact. |
| **Carte Urbaine** | **Relations (PNJ)** | Détecte et affiche les PNJ présents sur place avec lien direct vers leur fiche. |
| **Carte Urbaine** | **Simulation (IA)** | Le déplacement rapide (À pied ou Monorail) génère le trajet narratif et change le lieu actuel. |
| **Relations (PNJ)** | **Lieux & Carte** | Résolution dynamique de `currentLocationId` et des plannings habituels (`schedule`). |
| **Banque** | **Agenda** | Les prélèvements mensuels récurrents sont automatiquement projetés dans le calendrier. |
| **Journal Intime** | **Mémoires RAG** | Les souvenirs et étapes clés sont indexés en vecteurs et réinjectés dans les prompts IA. |
| **TopBar** | **Agenda & 36h** | Bannière d'alerte pour les événements à moins de 3h et modal d'explication céleste 36h. |
| **BottomNav** | **Archives & Agenda** | Badges en temps réel des SMS non lus et des urgences temporelles. |

---

## 💾 4. PERSISTANCE ET SYNCHRONISATION MULTI-APPAREILS

1. **IndexedDB (Source locale prioritaire)** :
   - Base `SimDeVieDB` avec store `gameState`. Snapshot miroir dans `localStorage['local_game_state']`.
   - Migration de schéma automatique (`migrateState`) assurant la compatibilité lors des évolutions.
2. **Firebase Firestore (Cloud temps réel)** :
   - Synchronisation liée au compte (`users/{userId}`), avec algorithme de fusion granulaire (`mergeGameStates`) pour empêcher tout écrasement lors des sessions hors-ligne.
   - Signature sémantique d'état pour éviter les écritures inutiles et contourner les restrictions de quota.
3. **Export / Import JSON Manuel** :
   - Fichier `.json` complet et exhaustif réutilisable sur n'importe quel navigateur ou appareil.

---

## 🍳 5. FONCTIONNEMENT DE L'INVENTAIRE ET DE LA CUISINE TEXTUELLE

1. **Détection textuelle floue** :
   - La fonction [`findMatchingInventoryItemIndex`](file:///c:/Users/Loric/Documents/antigravity/36h-life/src/lib/utils.ts) fait correspondre les termes culinaires (ex: *"œufs"*, *"sauce tomate"*, *"pâtes"*) avec les libellés réels du studio (ex: *"Boîte de 6 œufs fermiers"*).
2. **Consommation multi-ingrédients** :
   - Si le joueur prépare un repas composé de plusieurs ingrédients, l'IA et le moteur déduisent chaque ingrédient séparément (`quantityDelta: -1`).
   - Le moteur déterministe applique automatiquement le bonus de satiété approprié (`hunger: +45` pour un encas, `+75` pour un grand repas complet).
3. **Décompte unitaire dans les conditionnements** :
   - Les boîtes et packs voient leur quantité décrémentée unitairement sans disparition prématurée de l'objet tant que le stock n'est pas épuisé.

---

## ⏰ 6. LE CYCLE TEMPOREL DE 36 HEURES

### Tableau des 6 Phases Atmosphériques
| Plage Horaire | Nom de la Phase | Ambiance, Luminosité & Vie Sociale |
| :--- | :--- | :--- |
| **05:00 - 09:59** | Aube naissante | Ciel bleuté pâle, lueur rosée, réveil progressif du quartier Saint-Michel. |
| **10:00 - 15:59** | Matinée lumineuse | Plein jour éclatant, marchés et échoppes ouverts, animation intense. |
| **16:00 - 21:59** | Zénith solaire | Milieu exact de la journée de 36h, pic d'intensité lumineuse et d'activité. |
| **22:00 - 27:59** | Après-midi prolongé | Lumière cuivrée étirée, terrasses animées, fin d'après-midi prolongée. |
| **28:00 - 31:59** | Crépuscule doré | **Soirée tombante** (ciel pourpre, allumage des lanternes). **Ne jamais confondre avec le matin.** |
| **32:00 - 04:59** | Nuit profonde | Nuit noire sous la voûte étoilée, commerces et ateliers fermés, calme profond dans les rues. |

---

## 🧠 7. SYSTÈME D'EMBEDDINGS & RAG VECTORIEL

1. **Génération Vectorielle** :
   - Les souvenirs épisodiques créés lors des actions ou des récapitulatifs d'absence sont vectorisés via `getEmbedding(summary)`.
2. **Recherche Sémantique Hybride** :
   - Calcul de similarité cosinus (`cosineSimilarity`) combiné à la détection de mots-clés/tags, à l'importance du souvenir et à un facteur de décroissance temporelle calé sur le cycle de 36h.
3. **Réinjection contextuelle** :
   - Les souvenirs les plus pertinents sont insérés dans le prompt système (`[SOUVENIRS ÉPISODIQUES EXTRAITS PAR RAG]`), garantissant une continuité biographique absolue.

---

## 📋 8. DIRECTIVES POUR LES FUTURES MODIFICATIONS

1. **Ne pas lancer de commande de build (`npm run build` ou `vite build`)** sauf si l'utilisateur en fait la demande explicite.
2. **Ne pas modifier les noms des modèles Gemini** configurés dans le backend.
3. **Toujours faire valider les mutations financières et d'inventaire** par `DeterministicRulesEngine.validateAction()`.
4. **Toujours répondre et rédiger les documents / comptes-rendus en français.**
5. **Supprimer tout fichier temporaire de test** créé lors du développement afin de préserver la propreté du dossier de travail.
