# Kosh कोश

**Data has a pulse.**

Kosh (कोश, Hindi for "treasury" or "lexicon") is a library of _expressive data components_ for React: numbers, chips, rings and sparklines that show real data and animate every change in it.

This repository holds the free part of Kosh under the MIT licence: the motion core and four components. They install into your project as source files you own, through a [shadcn-compatible registry](https://ui.shadcn.com/docs/registry). Live demos and docs for every component are at **https://kosh-hazel.vercel.app**.

## What is here

| Item          | What it does                                                                                                      | Docs                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `motion-core` | Tokens, `KoshProvider`, `useMotionLevel`, `useSpringValue`, `useEntrance`, `MotionSwitch` and the CSS motion rules | [/docs/motion](https://kosh-hazel.vercel.app/docs/motion)            |
| Flow Number   | Only the digits that changed roll. They flash the signal colour when the number rose, a muted colour when it fell | [/components/flow-number](https://kosh-hazel.vercel.app/components/flow-number) |
| Delta Chip    | A chip for a signed change. When the direction reverses, the arrow turns over and the background cross-fades      | [/components/delta-chip](https://kosh-hazel.vercel.app/components/delta-chip)   |
| Fill Ring     | Progress toward a goal. The arc fills with an overshoot and bursts once at the goal                                | [/components/fill-ring](https://kosh-hazel.vercel.app/components/fill-ring)     |
| Live Spark    | A sparkline for a value that keeps arriving. A new point slides in and the line moves along                        | [/components/live-spark](https://kosh-hazel.vercel.app/components/live-spark)   |

Every component needs `motion-core`. Delta Chip and Fill Ring also use Flow Number. Installing a component brings what it needs.

The site shows four more components (Streak Heatmap, Morph Bars, Activity Feed and Story Card). They are not in this repository, and this licence does not cover them.

## Five rules

1. Motion has a meaning, or it is cut. Every animation encodes a change in the data.
2. Animate from the old value, never from zero.
3. Entrances can be theatrical. Updates are quick and interruptible.
4. One insight, one frame.
5. The calm version is still beautiful.

## The motion switch

Every component takes `motion="auto | full | reduced | none"`. It can be set in three places: the component's prop, an app-wide `<KoshProvider motion>`, and the operating system's reduced-motion setting. **The calmest one wins**, so no prop can override a visitor's request for reduced motion.

| Level     | What you get                                                      |
| --------- | ----------------------------------------------------------------- |
| `full`    | Every pop, roll and spring                                        |
| `reduced` | Nothing moves. Opacity and colour changes only                    |
| `none`    | The final state at once. The animation engine is never downloaded |
| `auto`    | Follows the operating system                                      |

Every component shares one API shape: `data`, `motion`, `tone`, `onSettle`, `className`.

## Install into a Next.js app

You need React 19.2 or newer. The core adds the npm package `motion`. The install was tested with shadcn 4.23.0 in a fresh `create-next-app` project: the files land under `src/kosh/` and the app typechecks. A production build of that app has not been verified yet. The commands below are for PowerShell.

Skip this step in an existing app that already has a `components.json`:

```powershell
npx create-next-app@latest kosh-consumer --ts --tailwind --app --src-dir --use-pnpm --import-alias "@/*" --yes
```

```powershell
Set-Location kosh-consumer
```

```powershell
npx shadcn@latest init -d
```

Merge this entry into the app's `components.json`. The components name their dependencies as `@kosh/motion-core` and `@kosh/flow-number`, so the namespace is needed even when you install by URL.

```json
{
  "registries": { "@kosh": "https://kosh-hazel.vercel.app/r/{name}.json" }
}
```

Then add the core and the components you want:

```powershell
npx shadcn@latest add https://kosh-hazel.vercel.app/r/motion-core.json
```

```powershell
npx shadcn@latest add https://kosh-hazel.vercel.app/r/flow-number.json
```

`delta-chip`, `fill-ring` and `live-spark` install the same way.

Import the shared styles once, after Tailwind, in `src/app/globals.css`. Each component imports its own stylesheet. Import `motion-switch.css` only if you render `MotionSwitch`.

```css
@import "tailwindcss";
@import "../kosh/motion/tokens.css";
@import "../kosh/motion/motion.css";
@import "../kosh/motion/motion-switch.css";
```

Render `<MotionScript />` in `<head>`, which sets the motion level before first paint, and wrap the app in `<KoshProvider>`:

```tsx
// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import { KoshProvider, MotionScript } from "@/kosh/motion";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <MotionScript />
      </head>
      <body>
        <KoshProvider motion="auto">{children}</KoshProvider>
      </body>
    </html>
  );
}
```

Your app owns font loading. Then pass the current value through `data` and let the component animate from the previous one:

```tsx
"use client";

import { useState } from "react";
import { FlowNumber } from "@/kosh/flow-number/flow-number";

export default function SessionCount() {
  const [sessions, setSessions] = useState(128);

  return (
    <div>
      <FlowNumber data={sessions} />
      <button type="button" onClick={() => setSessions((n) => n + 1)}>
        Log a session
      </button>
    </div>
  );
}
```

## Layout

```
registry.json                  registry manifest: motion-core and the four components
src/kosh/motion/               motion core: tokens, provider, hooks, switch, CSS rules
src/kosh/<name>/<name>.tsx|css one folder per component
```

`registry.json` points straight at the files in `src/kosh/`, so what you read here is what the registry ships. Building this repository produces the same JSON files the site serves.

## Work on it

You need Node.js 20.18.1 or newer (the shadcn CLI's minimum) and pnpm.

```powershell
pnpm install
```

```powershell
pnpm typecheck
```

```powershell
pnpm registry:build
```

`pnpm registry:build` runs `shadcn build` and writes one self-contained JSON file per item to `public/r/`. Serve that folder from your own host if you would rather not install from kosh-hazel.vercel.app, and change the `@kosh` URL to match.

## Licence

[MIT](LICENSE). It covers everything in this repository.
