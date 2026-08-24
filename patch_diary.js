import fs from 'fs';
let content = fs.readFileSync('src/components/FoldersScreen.tsx', 'utf-8');

const targetDiary = `<button
                                onClick={() => {
                                  if (confirm("Supprimer cette page du journal ?")) {
                                    deleteDiaryEntry(entry.id);
                                    showToast("Entrée supprimée.");
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-md transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>`;

const replacementDiary = `<button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Supprimer DÉFINITIVEMENT cette page du journal ?")) {
                                    deleteDiaryEntry(entry.id);
                                    showToast("Entrée supprimée.");
                                  }
                                }}
                                className="p-1.5 text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 rounded-md transition-colors"
                                title="Supprimer définitivement"
                              >
                                <X className="w-4 h-4" />
                              </button>`;

content = content.replace(targetDiary, replacementDiary);
fs.writeFileSync('src/components/FoldersScreen.tsx', content);
