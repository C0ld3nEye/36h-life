import fs from 'fs';

const content = fs.readFileSync('src/state/useGameState.ts', 'utf-8');

const injection = `
        if (res.newPlotLeads && res.newPlotLeads.length > 0) {
          set((state) => {
            const current = [...(state.plotLeads || [])];
            res.newPlotLeads!.forEach(lead => {
              current.push({
                ...lead,
                id: \`lead-\${Date.now()}-\${Math.random().toString(36).substring(7)}\`
              });
            });
            return { plotLeads: current, lastUpdateTime: Date.now() };
          });
        }

        if (res.updatedPlotLeads && res.updatedPlotLeads.length > 0) {
          set((state) => {
            const current = [...(state.plotLeads || [])];
            res.updatedPlotLeads!.forEach(update => {
              const idx = current.findIndex(l => l.id === update.id);
              if (idx !== -1) {
                const existing = current[idx];
                current[idx] = {
                  ...existing,
                  qualitativeStage: update.qualitativeStage || existing.qualitativeStage,
                  status: update.status || existing.status,
                  clues: update.newClues && update.newClues.length > 0 
                    ? [...(existing.clues || []), ...update.newClues] 
                    : existing.clues
                };
              }
            });
            return { plotLeads: current, lastUpdateTime: Date.now() };
          });
        }

        if (res.newRumors && res.newRumors.length > 0) {
          set((state) => {
            const current = [...(state.rumors || [])];
            res.newRumors!.forEach(rumor => {
              current.push({
                ...rumor,
                id: \`rumor-\${Date.now()}-\${Math.random().toString(36).substring(7)}\`
              });
            });
            return { rumors: current, lastUpdateTime: Date.now() };
          });
        }

        if (res.newMessages && res.newMessages.length > 0) {
          set((state) => {
            const current = [...(state.messages || [])];
            res.newMessages!.forEach(msg => {
              current.unshift({
                ...msg,
                id: \`msg-\${Date.now()}-\${Math.random().toString(36).substring(7)}\`,
                timestampReal: Date.now(),
                read: false,
                replied: false
              });
            });
            return { messages: current, lastUpdateTime: Date.now() };
          });
        }
`;

const replaced = content.replace('        if (res.choices) {', injection + '\n        if (res.choices) {');
fs.writeFileSync('src/state/useGameState.ts', replaced);
