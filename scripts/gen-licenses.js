// 直接依存パッケージのライセンス情報を src/assets/licenses.json に書き出す。
// 実行: node scripts/gen-licenses.js   （依存を更新したら再実行）
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const deps = Object.keys({ ...(pkg.dependencies || {}) }).sort();

const LICENSE_FILES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'License', 'LICENSE-MIT', 'LICENSE.markdown'];

function readLicenseText(dir) {
  for (const f of LICENSE_FILES) {
    const p = path.join(dir, f);
    try {
      if (fs.existsSync(p)) {
        const t = fs.readFileSync(p, 'utf8').trim();
        if (t) return t;
      }
    } catch {}
  }
  return null;
}

function authorOf(p) {
  if (!p.author) return null;
  if (typeof p.author === 'string') return p.author;
  return p.author.name || null;
}

function repoOf(p) {
  if (!p.repository) return p.homepage || null;
  if (typeof p.repository === 'string') return p.repository;
  return p.repository.url || p.homepage || null;
}

const out = [];
for (const name of deps) {
  const dir = path.join(root, 'node_modules', name);
  try {
    const p = require(path.join(dir, 'package.json'));
    out.push({
      name,
      version: p.version || '',
      license: typeof p.license === 'string' ? p.license : p.license?.type || 'UNKNOWN',
      author: authorOf(p),
      repository: repoOf(p),
      text: readLicenseText(dir),
    });
  } catch (e) {
    out.push({ name, version: '', license: 'UNKNOWN', author: null, repository: null, text: null });
  }
}

const dest = path.join(root, 'src', 'assets', 'licenses.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`wrote ${out.length} packages → ${path.relative(root, dest)}`);
