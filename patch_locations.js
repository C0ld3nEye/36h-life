import fs from 'fs';
let content = fs.readFileSync('src/components/FoldersScreen.tsx', 'utf-8');

const targetLoc = `<button
                          key={loc.id}
                          onClick={() => openLocModal(loc)}
                          className="bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-md flex flex-col gap-2 text-left hover:border-emerald-500/40 hover:bg-slate-800/80 transition-all group overflow-hidden"
                        >
                          {loc.imageUrl && (
                            <div className="w-full h-24 rounded-lg overflow-hidden border border-white/10 shrink-0 relative">
                              <img 
                                src={loc.imageUrl} 
                                alt={loc.name} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                            </div>
                          )}`;

const replacementLoc = `<div
                          key={loc.id}
                          onClick={() => openLocModal(loc)}
                          className="relative bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-md flex flex-col gap-2 text-left hover:border-emerald-500/40 hover:bg-slate-800/80 transition-all group overflow-hidden cursor-pointer"
                        >
                          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(\`Supprimer définitivement le lieu "\${loc.name}" des archives ?\`)) {
                                  deleteLocation(loc.id);
                                }
                              }}
                              className="p-1.5 bg-rose-950/90 hover:bg-rose-600 text-rose-300 hover:text-white rounded-md border border-rose-500/50 shadow-sm transition-all"
                              title="Supprimer définitivement"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {loc.imageUrl && (
                            <div className="w-full h-24 rounded-lg overflow-hidden border border-white/10 shrink-0 relative group/img">
                              <img 
                                src={loc.imageUrl} 
                                alt={loc.name} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                              <div 
                                onClick={(e) => { e.stopPropagation(); setLightboxImage({ src: loc.imageUrl, title: loc.name }); }}
                                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-[1px]"
                                title="Voir en plein écran"
                              >
                                <ZoomIn className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          )}`;

content = content.replace(targetLoc, replacementLoc);
fs.writeFileSync('src/components/FoldersScreen.tsx', content);
