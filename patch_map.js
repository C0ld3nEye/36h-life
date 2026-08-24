import fs from 'fs';
let content = fs.readFileSync('src/components/InteractiveCityMap.tsx', 'utf-8');

// 1. Add prop to interface
content = content.replace(
  '  onFastTravelAction?: (actionText: string) => void;',
  '  onFastTravelAction?: (actionText: string) => void;\n  onImageClick?: (src: string, title: string) => void;'
);

// 2. Destructure prop
content = content.replace(
  'export function InteractiveCityMap({ onSelectLocation, onFastTravelAction }: InteractiveCityMapProps) {',
  'export function InteractiveCityMap({ onSelectLocation, onFastTravelAction, onImageClick }: InteractiveCityMapProps) {'
);

// 3. Update img 1: line ~296
content = content.replace(
  /<img \s*src={loc\.imageUrl} \s*alt={loc\.name} \s*referrerPolicy="no-referrer"\s*className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"\s*\/>/g,
  `<img 
                                  src={loc.imageUrl} 
                                  alt={loc.name} 
                                  referrerPolicy="no-referrer"
                                  onClick={(e) => { e.stopPropagation(); if(onImageClick) onImageClick(loc.imageUrl, loc.name); }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                />`
);

// 4. Update img 2: modal image
content = content.replace(
  /<img \s*src={activeLocDetails\.imageUrl} \s*alt={activeLocDetails\.name}\s*referrerPolicy="no-referrer"\s*className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"\s*\/>/g,
  `<img 
                    src={activeLocDetails.imageUrl} 
                    alt={activeLocDetails.name}
                    referrerPolicy="no-referrer"
                    onClick={(e) => { e.stopPropagation(); if(onImageClick) onImageClick(activeLocDetails.imageUrl, activeLocDetails.name); }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                  />`
);

fs.writeFileSync('src/components/InteractiveCityMap.tsx', content);
