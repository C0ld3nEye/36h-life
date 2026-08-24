import fs from 'fs';
let content = fs.readFileSync('src/components/FoldersScreen.tsx', 'utf-8');

const targetChar = `<button
                    key={char.id}
                    onClick={() => openCharModal(char)}
                    className="bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-md flex flex-col gap-2 text-left hover:border-rose-500/40 hover:bg-slate-800/80 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        {char.imageUrl ? (
                          <img 
                            src={char.imageUrl} 
                            alt={char.name} 
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-rose-500/40 shadow-sm"
                          />
                        ) : (`;

const replacementChar = `<div
                    key={char.id}
                    onClick={() => openCharModal(char)}
                    className="relative bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-md flex flex-col gap-2 text-left hover:border-rose-500/40 hover:bg-slate-800/80 transition-all group cursor-pointer"
                  >
                    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(\`Supprimer définitivement le personnage "\${char.name}" des archives ?\`)) {
                            deleteCharacter(char.id);
                          }
                        }}
                        className="p-1.5 bg-rose-950/90 hover:bg-rose-600 text-rose-300 hover:text-white rounded-md border border-rose-500/50 shadow-sm transition-all"
                        title="Supprimer définitivement"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-start justify-between gap-2 w-full pr-8">
                      <div className="flex items-center gap-2 min-w-0">
                        {char.imageUrl ? (
                          <div className="relative group/img w-9 h-9 rounded-full shrink-0 border border-rose-500/40 shadow-sm overflow-hidden">
                            <img 
                              src={char.imageUrl} 
                              alt={char.name} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div 
                              onClick={(e) => { e.stopPropagation(); setLightboxImage({ src: char.imageUrl, title: char.name }); }}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-[1px] cursor-zoom-in"
                              title="Voir en plein écran"
                            >
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (`;

content = content.replace(targetChar, replacementChar);
fs.writeFileSync('src/components/FoldersScreen.tsx', content);
