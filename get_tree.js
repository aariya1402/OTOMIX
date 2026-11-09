const fs = require('fs');
const path = require('path');

function getTree(dir, prefix = '', ignore = ['node_modules', 'dist', '.git']) {
  const items = fs.readdirSync(dir);
  const filtered = items.filter(item => !ignore.includes(item));
  
  let result = '';
  filtered.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isLast = index === filtered.length - 1;
    const isDir = fs.statSync(fullPath).isDirectory();
    
    result += `${prefix}${isLast ? '└── ' : '├── '}${item}${isDir ? '/' : ''}\n`;
    
    if (isDir) {
      result += getTree(fullPath, prefix + (isLast ? '    ' : '│   '), ignore);
    }
  });
  return result;
}

const packagesDir = path.join(__dirname, 'packages');
console.log('packages/');
console.log(getTree(packagesDir));