import { parse } from 'acorn';
import * as walk from 'acorn-walk';

function literal(node) {
 if (!node) return null;
 if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
 if (node.type === 'ObjectExpression') {
  const prop = node.properties.find(p => p.type === 'Property' && !p.computed && (p.key.name === 'url' || p.key.value === 'url'));
  return literal(prop?.value);
 }
 return null;
}
export function parsePrecache(text) {
 try {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Expected a JSON array');
  return { entries: data.map(x => typeof x === 'string' ? x : typeof x?.url === 'string' ? x.url : null) };
 } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
 const ast = parse(text, {ecmaVersion:'latest', sourceType:'module'});
 const found = [];
 walk.simple(ast, {CallExpression(node) {
  const callee = node.callee;
  if ((callee.type === 'Identifier' && callee.name === 'precacheAndRoute') || (callee.type === 'MemberExpression' && !callee.computed && callee.property.name === 'precacheAndRoute')) found.push(node.arguments[0]);
 }});
 if (found.length !== 1 || found[0]?.type !== 'ArrayExpression') throw new Error('Expected one precacheAndRoute([...]) call with a literal array');
 return { entries: found[0].elements.map(literal) };
}
function path(value) {
 if (typeof value !== 'string' || !value || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value) || value.includes('\\')) return null;
 const clean = value.split(/[?#]/, 1)[0].replace(/^\.\//,'').replace(/^\/+/, '');
 if (!clean || clean.split('/').some(x => x === '..')) return null;
 return clean;
}
export function analyze(manifest, entries) {
 if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object' || !Array.isArray(entries)) throw new Error('Expected a Vite manifest object and a precache array');
 const evidence = new Map(), warnings = new Set();
 const keys = Object.keys(manifest);
 const roots = keys.filter(k => manifest[k]?.isEntry);
 if (!roots.length) warnings.add('No isEntry roots found; reachability is incomplete.');
 const seen = new Set();
 function visit(key, dynamic, chain) {
  const token = `${dynamic}:${key}`;
  if (seen.has(token)) return;
  seen.add(token);
  const item = manifest[key];
  if (!item || typeof item !== 'object') { warnings.add(`Missing manifest reference: ${key}`); return; }
  for (const name of [item.file, ...(Array.isArray(item.css)?item.css:[]), ...(Array.isArray(item.assets)?item.assets:[])]) {
   const p = path(name);
   if (p && (!evidence.has(p) || (!dynamic && evidence.get(p).category === 'dynamic'))) evidence.set(p,{category:dynamic?'dynamic':'static',chain:[...chain,key]});
  }
  for (const next of Array.isArray(item.imports)?item.imports:[]) visit(next,dynamic,[...chain,key]);
  for (const next of Array.isArray(item.dynamicImports)?item.dynamicImports:[]) visit(next,true,[...chain,key]);
 }
 for (const root of roots) visit(root,false,[]);
 const rows = entries.map(url => {
  const p = path(url), hit = p && evidence.get(p);
  return {url, category: !p ? 'unknown' : hit?.category ?? 'unreferenced', chain: hit?.chain ?? []};
 });
 return {rows,warnings:[...warnings]};
}
