const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) results = results.concat(getFiles(full));
    else if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(full);
  });
  return results;
}

const files = getFiles(path.join(__dirname, '..', 'src'));
const dbTables = new Set();
const storageBuckets = new Set();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');

  // Match .storage.from('bucket')
  const storageRegex = /\.storage\.from\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = storageRegex.exec(content)) !== null) {
    storageBuckets.add(match[1]);
  }

  // Match .from('table') where not preceded by .storage
  const dbRegex = /(?:\.client|\.supabase|supabase|client)\.from\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dbRegex.exec(content)) !== null) {
    dbTables.add(match[1]);
  }
});

const sqlPath = path.join(__dirname, '..', 'supabase', 'consolidated_schema.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');
const sqlTables = new Set();
const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-zA-Z0-9_]+)/gi;

let m;
while ((m = createTableRegex.exec(sqlContent)) !== null) {
  sqlTables.add(m[1]);
}

console.log('📦 BUCKETS DE STORAGE USADOS NO CÓDIGO:', Array.from(storageBuckets));
console.log('📊 TOTAL DE TABELAS USADAS NO BANCO DE DADOS:', dbTables.size);
console.log('🏛️ TOTAL DE TABELAS CRIADAS NO SQL CONSOLIDADO:', sqlTables.size);

const missing = Array.from(dbTables).filter(t => !sqlTables.has(t));
console.log('\n--- VEREDITO FINAL ---');
if (missing.length === 0) {
  console.log('✅ NENHUMA TABELA FALTANDO! 100% das ' + dbTables.size + ' tabelas estão perfeitamente criadas no Supabase.');
} else {
  console.log('❌ Tabelas faltando:', missing);
}
