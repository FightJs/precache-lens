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
