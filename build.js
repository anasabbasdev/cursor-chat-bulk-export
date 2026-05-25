/**
 * esbuild script that also copies the sql.js WASM file into out/.
 * Run: node build.js [--watch]
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

// Copy sql-wasm.wasm into out/ so the extension can load it at runtime
function copySqlWasm() {
  const src = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const destDir = path.join(__dirname, 'out');
  const dest = path.join(destDir, 'sql-wasm.wasm');
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('Copied sql-wasm.wasm → out/sql-wasm.wasm');
}

/** Optional: bundle sqlite3.exe for Windows large-DB support (place in tools/sqlite3.exe first). */
function copySqlite3Cli() {
  const destDir = path.join(__dirname, 'out');
  const isWin = process.platform === 'win32';
  const name = isWin ? 'sqlite3.exe' : 'sqlite3';
  const src = path.join(__dirname, 'tools', name);
  if (!fs.existsSync(src)) {
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, name));
  console.log(`Copied ${name} → out/${name}`);
}

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  // Inline the WASM file path as a string so we can use __dirname at runtime
  define: {},
};

async function main() {
  copySqlWasm();
  copySqlite3Cli();

  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes…');
  } else {
    await esbuild.build(buildOptions);
    console.log('Build complete.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
