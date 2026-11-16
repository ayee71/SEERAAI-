import fs from 'fs';
const filePath = 'src/data/cassationPrecedents.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace '  },' with fields and then '  },'
// Use a regex that specifically targets the end of the object inside the array
content = content.replace(/  \},\n  \{/g, '  rating: 0,\n  ratingCount: 0,\n  },\n  {');
// Also handle the last object
content = content.replace(/  \}\n\];/g, '  rating: 0,\n  ratingCount: 0,\n  }\n];');

fs.writeFileSync(filePath, content);
console.log('Migration completed successfully.');
