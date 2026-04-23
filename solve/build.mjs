#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

const shared = {
	bundle: true,
	platform: 'node',
	format: 'cjs',
	banner: { js: '#!/usr/bin/env node' },
};

await Promise.all([
	build({ ...shared, entryPoints: ['src/solve-mcp.ts'],  outfile: 'dist/solve-mcp.cjs' }),
	build({ ...shared, entryPoints: ['src/solve-cli.ts'],  outfile: 'dist/solve-cli.cjs' }),
]);

console.log('Build complete → dist/solve-mcp.cjs, dist/solve-cli.cjs');
