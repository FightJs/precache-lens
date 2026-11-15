import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, parsePrecache } from '../src/analyze.js';

test('distinguishes static, dynamic and unknown references', () => {
 const manifest = {'index.html': {isEntry:true,file:'assets/main.js',dynamicImports:['lazy.js'],imports:['shared.js']},'lazy.js':{file:'assets/lazy.js',imports:['shared.js']},'shared.js':{file:'assets/shared.js',css:['assets/main.css']}};
 const result = analyze(manifest, ['/assets/main.js','assets/lazy.js?rev=1','assets/shared.js','assets/main.css','assets/orphan.wasm','https://other.example/x']);
 assert.deepEqual(result.rows.map(r=>r.category), ['static','dynamic','static','static','unreferenced','unknown']);
 assert.ok(result.rows[1].chain.includes('lazy.js'));
});
test('extracts only static Workbox entries without running expressions', () => {
 const result = parsePrecache('precacheAndRoute([{url:"a.js", revision:"1"}, {url: dynamic}, "b.js"])');
 assert.deepEqual(result.entries, ['a.js', null, 'b.js']);
});
test('rejects non-Workbox JavaScript and malformed manifest', () => {
 assert.throws(()=>parsePrecache('alert(1)'));
 assert.throws(()=>analyze([], []));
});

test('the shipped example yields useful categories through the same parser as user files', async () => {
 const { sampleManifest, samplePrecache } = await import('../src/example.js');
 const result = analyze(sampleManifest, parsePrecache(JSON.stringify(samplePrecache)).entries);
 assert.deepEqual(result.rows.map(r => r.category), ['static','static','static','dynamic','unreferenced','unknown']);
});
test('computed overrides and spread properties do not masquerade as static URLs', () => {
 const result = parsePrecache('precacheAndRoute([{url:"a.js", ...other}, {url:"a.js", [key]: "b.js"}, {url:"a.js", url: "b.js"}, {url:"ok.js", revision: null}])');
 assert.deepEqual(result.entries, [null, null, null, 'ok.js']);
});
test('an incomplete graph cannot establish that a URL is unreferenced', () => {
 const result = analyze({'index.html': {isEntry:true,file:'app.js',imports:['missing']}}, ['app.js','other.js']);
 assert.deepEqual(result.rows.map(r => r.category), ['static','unknown']);
 assert.ok(result.warnings.length);
});

test('analyzes actual Vite and Workbox build artifacts conservatively', async () => {
 const { readFile } = await import('node:fs/promises');
 const manifest = JSON.parse(await readFile(new URL('./fixtures/workbox-7-vite-6/manifest.json', import.meta.url), 'utf8'));
 const sw = await readFile(new URL('./fixtures/workbox-7-vite-6/sw.js.txt', import.meta.url), 'utf8');
 const rows = analyze(manifest, parsePrecache(sw).entries).rows;
 assert.deepEqual(rows.map(r => r.category), ['static','dynamic','unknown']);
 assert.equal(rows[2].url, 'index.html');
});
