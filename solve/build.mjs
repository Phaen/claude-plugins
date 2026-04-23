#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

await build({
	entryPoints: ['src/solve-mcp.ts'],
	bundle: true,
	platform: 'node',
	format: 'cjs',
	outfile: 'dist/solve-mcp.cjs',
	banner: { js: '#!/usr/bin/env node' }
});

console.log('Build complete → dist/solve-mcp.cjs');
