const fs = require('fs');

const content = fs.readFileSync('public/assets/aistudio/Baafata_Murtii_Sirraayame__1__7c35b2c0.html', 'utf8');
const parts = content.split('<script');
const scriptText = parts[3].substring(parts[3].indexOf('>') + 1, parts[3].indexOf('</script>'));

console.log('Script length:', scriptText.length);

// Let's inspect where categories or case arrays are defined
const matches = scriptText.match(/([a-zA-Z0-9_$]+)\s*:\s*\[/g);
console.log('Array properties in script:', matches ? matches.slice(0, 30) : []);

// Let's see occurrences of category names
const categories = ["አሠሪና ሠራተኛ", "ውል", "ፍትሐ ብሄር ሥነ ሥርዓት", "ንግድ"];
for (const cat of categories) {
  const count = (scriptText.match(new RegExp(cat, 'g')) || []).length;
  console.log(`Category "${cat}" occurrences:`, count);
}

// Let's look for how `cases` or `categories` is structured
const previewIdx = scriptText.indexOf('cases:');
if (previewIdx !== -1) {
  console.log('Found "cases:":', scriptText.substring(previewIdx, previewIdx + 500));
} else {
  // Let's find first tartiiba
  const tIdx = scriptText.indexOf('tartiiba');
  console.log('Found "tartiiba":', scriptText.substring(tIdx - 100, tIdx + 300));
}
