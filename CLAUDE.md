# Sidlab Tools

A client-side suite of laboratory calculators. React 18 + TypeScript + Vite + Tailwind,
deployed to GitHub Pages at https://siddhantrajnaik.github.io/SidLab-Tools/.

## The one thing that matters

**The formulas are the product.** A calculator that renders beautifully and returns the
wrong number is worse than no calculator, because people trust it and pipette against it.

Before changing any calculation:

1. **Find the primary source.** A manufacturer's protocol, the original paper, a
   standards body. Not an SEO calculator site — several of those contradict each other
   and at least one contradicted NEB's own protocol during an earlier audit.
2. **Write the test first**, asserting the published reference value, not whatever the
   code currently returns.
3. **Cite the source in a comment** next to the constant, so the next person can check it
   without redoing the search.

Bugs found this way so far: primer Tm reading ~12 °C low (no Mg²⁺ term), Q5 annealing
3 °C off, SDS-PAGE APS and TEMED at twice Bio-Rad's published amounts, `log₁₀(1)`
rendering a blank panel, and the PCR master mix ignoring its own reaction-volume input.

## Layout

```
lib/            pure, tested calculation modules — no React
  labmath.ts    centrifugation, gels, Beer-Lambert, A260, ligation, solutions, pH
  tm.ts         nearest-neighbour thermodynamics, salt correction, annealing rules
  dimer.ts      self-dimer, cross-dimer, hairpin screening
  restriction.ts enzyme table (from REBASE), both-strand site finding, digestion
  sequence.ts   cleaning, complement, genetic code, translation, average MWs
  *.test.ts     vitest, asserting published reference values
pages/          one component per tool; UI only, imports the maths from lib/
components/     UI.tsx (Card/Input/Button/Select), ToolArt.tsx, ScienceIcons.tsx, Layout
```

**Calculations belong in `lib/`, not in a page.** They were originally inline in the
`.tsx` files, which is precisely why none of them could be tested. If you add a
calculator, put the maths in `lib/` with tests and let the page call it.

## Commands

```
npm run dev      # vite dev server
npm test         # vitest run — must pass before pushing
npm run build    # tsc && vite build; a type error fails the build
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which runs `npm test`, then
`npm run build`, then publishes to Pages. There is no manual deploy step — the old
`npm run deploy` was removed after the live site drifted six months behind `main`.

Pages is served from GitHub Actions, not from a branch. `vite.config.ts` sets
`base: './'` so relative asset paths work under the `/SidLab-Tools/` subpath; do not
hardcode absolute paths like `/branding/logo.png` (that exact bug 404'd in production).

## PWA

The app is installable and works offline via `vite-plugin-pwa`. Two deliberate choices:

- `registerType: 'autoUpdate'` — no "update available" prompt. Given the formula bugs
  above, nobody should be stranded on a cached build with wrong maths.
- `start_url` and `scope` are relative (`'.'`) so it installs correctly from the project
  subpath as well as a domain root.

`globPatterns` deliberately excludes the manifest and its icons, because the plugin
precaches those itself; globbing them too produced 16 precache entries for 10 files.

## Conventions

- Number inputs keep `''` as a distinct empty state rather than coercing to `0`, so a
  cleared field stays cleared and decimals can be typed. `safeNum` converts at use.
- Calculators show their equation and inputs alongside the result — the working is part
  of the output, so a user can check it.
- Tool card artwork lives in `ToolArt.tsx`, drawn to read at 64 px with colours passed in
  as props. Small corner icons come from `ScienceIcons.tsx` or lucide.
- Tailwind classes must be written out in full. Interpolated names like
  `` `text-${color}-600` `` are invisible to the compiler and silently produce no style.

## Secrets

There is no server, so there is nowhere to keep one. Never put an API key in a `VITE_*`
variable: Vite inlines those into the public bundle at build time and anyone can read
them. The AI Illustrator asks each visitor for their own Google AI Studio key and keeps
it in their `localStorage`. If a shared key is ever genuinely needed, it has to go behind
a proxy the site calls, not into the bundle.

## Known gaps

- The bundle is a single ~660 KB chunk with no route splitting.
- The primer designer's dimer screen is a stacking-energy heuristic over contiguous
  pairing; it does not model bulges, internal loops, or hairpin loop entropy the way
  mfold does.
- The Protocols page ships only two protocols.
