import fs from 'fs';
const lintOutput = fs.readFileSync('lint.log', 'utf8');
const linesToFix = [];

// Parse line numbers
const regex = /FoldersScreen\.tsx\((\d+),\d+\): error TS17002: Expected corresponding JSX closing tag for 'div'/g;
let match;
while ((match = regex.exec(lintOutput)) !== null) {
  linesToFix.push(parseInt(match[1], 10));
}

let content = fs.readFileSync('src/components/FoldersScreen.tsx', 'utf8').split('\n');

for (const lineNum of linesToFix) {
  const index = lineNum - 1;
  content[index] = content[index].replace('</button>', '</div>');
}

fs.writeFileSync('src/components/FoldersScreen.tsx', content.join('\n'));
console.log('Fixed', linesToFix.length, 'lines.');
