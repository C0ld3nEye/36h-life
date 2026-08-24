# Architecture Vision V2.0 - 36H Life Simulator

Ce document synthétise la vision technique et narrative pour la version 2.0 du simulateur de vie, en s'appuyant sur les dernières avancées des modèles d'IA générative et de l'écosystème web.

## 1. Architecture Hybride (On-Device + Cloud)

L'objectif est d'optimiser la latence, les coûts et l'immersion en répartissant la charge cognitive de l'IA entre le navigateur du client et le cloud.

### Modèle Local (On-Device / Chrome `window.ai` / Gemini Nano)
*   **Interactions instantanées :** Gestion des dialogues mineurs (passants, marchands) et des descriptions de routine sans latence réseau.
*   **Analyse d'intention préliminaire :** Détection rapide des mots-clés et pré-validation des actions du joueur pour filtrer les requêtes inutiles.
*   **Offline First :** Maintien d'une boucle de gameplay basique (déplacements, inventaire, dialogues mis en cache) même en cas de coupure réseau.

### Modèle Cloud (Google AI Studio — Dernières versions Gemini Pro / Flash)
*   *Note : Utilisation stricte des modèles de dernière génération pour garantir les meilleures capacités de raisonnement.*
*   **Nœuds narratifs majeurs :** Gestion des personnages complexes, des arcs narratifs critiques et des résolutions d'énigmes.
*   **Sorties Structurées (Structured Outputs) :** Génération stricte des mutations d'état (ex: `delta_stress`, `cost_money`, `unlocked_clues`) injectées de manière déterministe dans le `rulesEngine`.
*   **Exploitation de la mémoire sémantique :** Intégration du contexte vectoriel (Top-K mémoires via Embeddings) directement dans le System Prompt.
*   **Hallucinations du Mindset :** Altération dynamique du style narratif et de la description du monde par l'IA en fonction du niveau de santé mentale du joueur.

---

## 2. Monde Asynchrone (« Living City »)

L'univers du jeu ne doit plus être figé en attendant l'input du joueur, mais exister et évoluer en arrière-plan.

*   **Déterminisme temporel piloté par le prompt :** Le *System Instruction* intègre la grille horaire des 36 heures. Lors d'un saut temporel (sommeil, trajet long), le modèle reçoit l'heure de départ, l'heure d'arrivée et l'état du monde, pour évaluer ce qui s'est passé en coulisses.
*   **Événements autonomes générés par l'IA :** 
    *   **Messages non sollicités :** Réception de SMS, menaces ou notifications de PNJ agissant de leur propre chef.
    *   **Mutations géographiques :** Fermeture de boutiques, zones devenues inaccessibles, déplacement de cibles.
    *   **Transactions passives :** Débits automatiques (factures, créanciers).
    *   **Péremption :** Invalidation des pistes (`PlotLeads`) si le joueur a mis trop de temps à réagir.

---

## 3. Optimisations Techniques et Améliorations de Boucle de Jeu

### A. Remplacement du parsing JSON par le "Tool Calling"
*   Le modèle se voit doter d'outils (`lock_location`, `send_sms`, `drain_bank_account`). L'IA décide de manière autonome d'invoquer ces fonctions lors de ses réponses narratives, rendant le parsing caduc et les conséquences systémiques beaucoup plus organiques.

### B. Architecture Multi-Agents (Orchestration)
*   **Game Master (GM) :** Le modèle superviseur qui gère les règles du monde, l'horloge et la cohérence.
*   **Personas dédiés :** Routage des requêtes spécifiques (ex: appeler un personnage clé) vers des agents ayant un *System Prompt* dédié uniquement à la psychologie de ce PNJ, évitant la dilution de la personnalité.

### C. Gestion Mémorielle à Deux Niveaux
*   **Working Memory (Résumé glissant) :** Un agent d'arrière-plan résume périodiquement les 10 dernières actions en un paragraphe dense pour maintenir le contexte immédiat à bas coût cognitif.
*   **Long-Term Memory (VectorDB) :** Recherche de similarité via Embeddings pour ressortir des détails lointains pertinents à la situation actuelle.

### D. UI/UX Psychologique Réactive
*   Connexion directe entre la jauge de `Mindset` et le code front-end (React/CSS/Framer Motion).
*   En cas de chute de la santé mentale : tremblements de l'interface, glitches visuels, couleurs maladives, mots de l'interface mutés (ex: le bouton "Dormir" devenant furtivement "S'évanouir").

### E. Flou entre Temps Diégétique et Temps Réel (PWA)
*   Utilisation des Service Workers pour synchroniser (à une certaine échelle) le temps du jeu et le temps réel hors-session.
*   **Push Notifications :** Envoi de notifications web réelles au joueur pendant qu'il ne joue pas (ex: SMS d'un PNJ en détresse à 3h du matin), brisant le quatrième mur pour une immersion totale.
