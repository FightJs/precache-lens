# Precache Lens

**Lazy-loaded doesn't necessarily mean downloaded later.** A Workbox service worker can precache a Vite dynamic chunk during installation. Precache Lens compares the actual precache list to the Vite manifest and shows the path that led to each match.

[Try the live demo](https://fightjs.github.io/precache-lens/) · [Report an issue](https://github.com/FightJs/precache-lens/issues)

## Try it

The demo opens with a synthetic example: an app shell, a lazy editor, and a WASM asset with no known Vite link. Select your Vite manifest (normally `dist/.vite/manifest.json`, generated with `build.manifest: true`) and your Workbox precache list to inspect your own build. Files are read locally; the tool does not upload them or execute the service worker.

The second input supports a JSON array of URL strings or `{ "url": "...", "revision": "..." }` objects, or JavaScript containing exactly one static `precacheAndRoute([...])` call. Computed array elements and URLs are shown as unknown; a computed array itself is rejected. Other Workbox configurations and arbitrary service-worker programs are not interpreted.

- **Static entry path:** reached from an `isEntry` root through static imports.
- **Dynamic path:** reached through at least one dynamic import, with no static path found.
- **No known Vite link:** no matching path in the traversed manifest. This is not a deletion recommendation.
- **Uncertain:** external or computed URLs, HTML entry keys without an explicit output match, or results affected by an incomplete graph.

## Limitations

The graph uses Vite's `imports`, `dynamicImports`, `file`, `css` and `assets` fields. It cannot discover runtime-computed URLs, references from arbitrary JS, public assets, custom service worker logic, or a deployment base prefix. Query strings are ignored for matching; paths must otherwise match exactly. Missing roots and manifest references are reported as warnings; without a complete graph, dynamic and unmatched entries remain uncertain. HTML entry keys are source names rather than explicit output paths, so unmatched HTML entries remain uncertain. Entries are not necessarily successful network requests: browser cache state, SW lifecycle, server behavior and configuration affect transfers. Dynamic precaching can be intentional for offline support. No file size or transfer amount is inferred. Each input is limited to 5 MiB.

## Development

```sh
npm ci
npm test
npm run dev
npm run build
```

Built with Vite and Acorn. Licensed under [MIT](LICENSE).
