import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');
const injection = `📅 NOUVELLES FONCTIONNALITÉS ARCHIVISTES (INTÉGRATION DES INTRIGUES, RUMEURS ET MESSAGES) :
- Tu PEUX et DOIS générer ou mettre à jour des Pistes (newPlotLeads, updatedPlotLeads) si le joueur découvre un mystère, une offre d'emploi, ou débute une quête.
- Tu PEUX générer de nouvelles Rumeurs Urbaines (newRumors) si le joueur écoute aux portes, traîne dans un bar, ou capte des bruits de couloir.
- Tu PEUX simuler la réception de messages asynchrones (newMessages) provenant des PNJ connus sur le communicateur du joueur. Fais-le naturellement pour relancer l'intrigue.

⚠️ RÈGLES DE COHÉRENCE TEMPORELLE ABSOLUE`;

content = content.replace('⚠️ RÈGLES DE COHÉRENCE TEMPORELLE ABSOLUE', injection);

fs.writeFileSync('server.ts', content);
