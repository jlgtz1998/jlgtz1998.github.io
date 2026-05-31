const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath, pattern);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (pattern.test(content)) {
        console.log(`Match in: ${filePath}`);
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            console.log(`  Line ${index + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

console.log('Searching for fixed/absolute elements or references to N logo...');
searchDir('./app', /fixed|absolute|N-indicator|n-indicator|class.*n|id.*n/i);
searchDir('./components', /fixed|absolute|N-indicator|n-indicator|class.*n|id.*n/i);
