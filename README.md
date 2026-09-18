# Modern JS Todo

A todo app with no framework, written in TypeScript. Filters, search,
priorities, categories, drag-and-drop ordering, a dark theme, and everything
persisted to `localStorage`.

**Live:** https://sergeyshkryuba.github.io/modern-js-todo/

## Why it looks like this

The app is deliberately framework-free: the interesting part is the separation
between _state_ and _DOM_, which a framework would otherwise hide.

```
src/
  types.ts     the data model, plus runtime type guards
  store.ts     state and transitions — pure, no DOM, fully unit-tested
  storage.ts   localStorage access, guarded and validated
  render.ts    state -> DOM, and nothing else
  main.ts      wiring: events in, store updates out
tests/         Vitest specs for store.ts and render.ts
```

`TodoStore` never touches the document, and `render` never mutates state, so
the whole state machine can be tested without a browser. `main.ts` subscribes
once: every change saves and re-renders, and nothing else calls `render`
directly.

## What the rewrite fixed

This started as a single 278-line `app.js` (plus a near-identical, unused
`app-mod.js`). The rewrite is not cosmetic — it fixed real defects:

- **Stored XSS.** The list was built by interpolating task text into an
  `innerHTML` template, so a task called
  `<img src=x onerror="...">` executed on every render, on every future visit,
  out of `localStorage`. Rendering now goes through `textContent`.
- **Data loss on drag.** Reordering rebuilt the entire array from the ids in
  the DOM. With a filter or a search active the DOM only holds the matching
  subset, so one drag silently deleted every hidden task.
- **Colliding ids.** `Date.now()` as an id meant two tasks added in the same
  millisecond shared one, and toggling one toggled both.
- **Unvalidated storage.** Whatever JSON was in `localStorage` was trusted
  as-is; malformed data broke rendering.
- **No way to see all tasks** — the filter row offered only Active and
  Completed.
- **Escape did not close the edit dialog**, which made it a keyboard trap.
- **Flash of the light theme** on load for dark-theme users.
- Icon-only buttons had no accessible names; inputs had no labels.

## Running it

```bash
npm install
npm run dev
```

| Command             | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Dev server                       |
| `npm run build`     | Typecheck, then build to `dist/` |
| `npm run preview`   | Serve the built output           |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm test`          | Vitest (31 tests)                |
| `npm run verify`    | Everything above, in CI order    |

CI runs typecheck, a Prettier check, the tests and a build on every push;
pushes to `main` deploy to GitHub Pages.

## Licence

MIT
