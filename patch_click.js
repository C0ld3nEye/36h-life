import fs from 'fs';
let content = fs.readFileSync('src/components/FoldersScreen.tsx', 'utf-8');

// For locations grid
content = content.replace(
  /<div className="absolute inset-0 bg-gradient-to-t from-slate-950\/80 via-transparent to-transparent pointer-events-none" \/>\s*<div \s*onClick=\{\(e\) => \{ e\.stopPropagation\(\); setLightboxImage\(\{ src: loc\.imageUrl, title: loc\.name \}\); \}\}\s*className="absolute inset-0 flex items-center justify-center bg-black\/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-\[1px\]"\s*title="Voir en plein écran"\s*>\s*<ZoomIn className="w-6 h-6 text-white" \/>\s*<\/div>/g,
  '<div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />'
);
content = content.replace(
  /<img \s*src=\{loc\.imageUrl\} \s*alt=\{loc\.name\} \s*referrerPolicy="no-referrer"\s*className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"\s*\/>/g,
  '<img src={loc.imageUrl} alt={loc.name} referrerPolicy="no-referrer" onClick={(e) => { e.stopPropagation(); setLightboxImage({ src: loc.imageUrl, title: loc.name }); }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer relative z-20" />'
);

// For characters grid
content = content.replace(
  /<div \s*onClick=\{\(e\) => \{ e\.stopPropagation\(\); setLightboxImage\(\{ src: char\.imageUrl, title: char\.name \}\); \}\}\s*className="absolute inset-0 flex items-center justify-center bg-black\/40 opacity-0 group-hover\/img:opacity-100 transition-opacity backdrop-blur-\[1px\] cursor-zoom-in"\s*title="Voir en plein écran"\s*>\s*<ZoomIn className="w-4 h-4 text-white" \/>\s*<\/div>/g,
  ''
);
content = content.replace(
  /<img \s*src=\{char\.imageUrl\} \s*alt=\{char\.name\} \s*referrerPolicy="no-referrer"\s*className="w-full h-full object-cover"\s*\/>/g,
  '<img src={char.imageUrl} alt={char.name} referrerPolicy="no-referrer" onClick={(e) => { e.stopPropagation(); setLightboxImage({ src: char.imageUrl, title: char.name }); }} className="w-full h-full object-cover cursor-pointer relative z-20" />'
);

fs.writeFileSync('src/components/FoldersScreen.tsx', content);
