import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';

const production = process.argv[2] === 'production';

// The plugin is authored as a single CommonJS file (src/main.js) with no
// dependencies, so this bundle step is optional: it only minifies for release.
const context = await esbuild.context({
  entryPoints: ['src/main.js'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins,
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: production ? false : 'inline',
  treeShaking: true,
  minify: production,
  outfile: 'main.js',
});

if (production) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
