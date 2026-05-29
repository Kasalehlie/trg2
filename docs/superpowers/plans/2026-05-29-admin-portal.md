# Admin Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let non-technical staff edit Projects (incl. homepage-featured ones), News, Team, the homepage hero + stat callouts and their images, and the About Us paragraph through a Sveltia CMS at `/admin`, with content stored as per-item JSON files in Git and the public site staying a static Astro build on Netlify.

**Architecture:** Migrate the three single-array JSON files into one-file-per-item folder collections plus two singleton files (`homepage.json`, `about.json`). Astro/React read content through a small loader module. A single source of truth (`statTypes`) drives stat icons/labels/dropdown. Sveltia CMS (static `/admin` page + `config.yml`) commits edits to GitHub via a GitHub OAuth handshake handled by a Netlify Function; images upload to the existing Cloudinary account.

**Tech Stack:** Astro 1.9, React 18, Tailwind 3, Vitest (new, for pure-function tests), Sveltia CMS, Netlify (hosting + Functions), Cloudinary.

---

## File Structure

**New files:**
- `vitest.config.mjs` — Vitest config (node environment).
- `scripts/lib/transform.mjs` — pure migration transforms (slugify, normalizers, record mappers). Imported by the runner and by tests.
- `scripts/migrate-content.mjs` — one-time runner: reads old arrays, writes per-item files + singletons, deletes `other.json`.
- `test/transform.test.mjs` — tests for transforms.
- `test/contentHelpers.test.mjs` — tests for sort/format/paragraph helpers.
- `test/statTypes.test.mjs` — tests for the stat-types source of truth.
- `src/config/statTypes.jsx` — canonical stat types `{ value, label, icon }` + lookup map.
- `src/utils/contentHelpers.js` — pure helpers: `sortByOrder`, `sortFeaturedFirst`, `formatNewsDate`, `toParagraphs`.
- `src/utils/content.js` — globs the data folders, exports sorted `projects`/`team`/`news` + re-exports helpers.
- `src/data/projects/*.json` — one file per project (generated).
- `src/data/team/*.json` — one file per team member (generated).
- `src/data/news/*.json` — one file per article (generated).
- `src/data/homepage.json` — hero slides + stat callouts (generated).
- `src/data/about.json` — About Us paragraph (generated).
- `public/admin/index.html` — Sveltia CMS entry page.
- `public/admin/config.yml` — CMS collections + backend + media config.
- `netlify/functions/auth.mjs` — starts GitHub OAuth.
- `netlify/functions/callback.mjs` — completes GitHub OAuth, posts token to the CMS.
- `netlify.toml` — build + functions config.

**Modified files:**
- `src/utils/getIcon.tsx` — derive from `statTypes`.
- `src/utils/getDisplayName.js` — derive from `statTypes`.
- `src/components/ProjectSection.jsx` — read loader, featured-first sort, fix typo.
- `src/components/AllProjects.jsx` — read loader, add Mixed-Use, fix filter + typo.
- `src/components/Hero.jsx` — read `homepage.json`.
- `src/components/StatsSection.jsx` — read `homepage.json`.
- `src/components/TeamCard.jsx` — single `bio` → paragraphs.
- `src/components/BlogSection.jsx` — simplified news props.
- `src/pages/index.astro` — loader + new BlogSection props.
- `src/pages/news.astro` — loader + new BlogSection props (fixes existing typos).
- `src/pages/team.astro` — loader + About paragraph + new TeamCard props.
- `src/pages/projects/[id].astro` — loader.
- `package.json` — add Vitest + `test` script.

**Deleted files:**
- `src/data/other.json`, `src/data/projects.json`, `src/data/team.json`, `src/data/news.json` (after migration).

---

## Phase 0 — Tooling

### Task 1: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.mjs`

- [ ] **Step 1: Add the dev dependency and test script**

Run:
```bash
npm install -D vitest@^1.6.0
```

- [ ] **Step 2: Add the `test` script to `package.json`**

In `package.json`, add a `"test"` line to `scripts` so it reads:

```json
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Create `vitest.config.mjs`**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.mjs"],
  },
});
```

- [ ] **Step 4: Verify the runner works (no tests yet)**

Run: `npm test`
Expected: exits 0 with "No test files found" (acceptable for now).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.mjs
git commit -m "chore: add Vitest for pure-function tests"
```

---

## Phase 1 — Migration transforms (TDD) and one-time migration

### Task 2: `slugify` and stat normalizers

**Files:**
- Create: `scripts/lib/transform.mjs`
- Test: `test/transform.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `test/transform.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { slugify, normalizeStatType, normalizeStatValue } from "../scripts/lib/transform.mjs";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("XR International I")).toBe("xr-international-i");
  });
  it("strips punctuation and collapses dashes", () => {
    expect(slugify("Portland & 82nd")).toBe("portland-82nd");
  });
});

describe("normalizeStatType", () => {
  it("maps drifted names to canonical", () => {
    expect(normalizeStatType("year Completed")).toBe("yearCompleted");
    expect(normalizeStatType("year Started")).toBe("yearStarted");
    expect(normalizeStatType("Location")).toBe("location");
    expect(normalizeStatType("type")).toBe("projectType");
  });
  it("passes through already-canonical names", () => {
    expect(normalizeStatType("units")).toBe("units");
    expect(normalizeStatType("squareFeet")).toBe("squareFeet");
  });
});

describe("normalizeStatValue", () => {
  it("normalizes status", () => {
    expect(normalizeStatValue("status", "Construction")).toBe("Under Construction");
    expect(normalizeStatValue("status", "Completed")).toBe("Completed");
  });
  it("uppercases trailing state code in location", () => {
    expect(normalizeStatValue("location", "Salt Lake City, Ut")).toBe("Salt Lake City, UT");
  });
  it("trims other values", () => {
    expect(normalizeStatValue("units", " 240 ")).toBe("240");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot find `../scripts/lib/transform.mjs`.

- [ ] **Step 3: Implement the transforms**

Create `scripts/lib/transform.mjs`:

```js
export function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const STAT_TYPE_MAP = {
  "year completed": "yearCompleted",
  "year started": "yearStarted",
  location: "location",
  type: "projectType",
  units: "units",
  keys: "keys",
  squarefeet: "squareFeet",
  status: "status",
};

export function normalizeStatType(raw) {
  const key = String(raw).trim().toLowerCase();
  return STAT_TYPE_MAP[key] ?? String(raw).trim();
}

export function normalizeStatValue(type, text) {
  const value = String(text).trim();
  if (type === "status") {
    return value.toLowerCase() === "construction" ? "Under Construction" : value;
  }
  if (type === "location") {
    return value.replace(/,\s*([A-Za-z]{2})\s*$/, (_m, st) => `, ${st.toUpperCase()}`);
  }
  return value;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: PASS (8 assertions).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/transform.mjs test/transform.test.mjs
git commit -m "feat: migration transforms for slug and stat normalization"
```

### Task 3: Record mappers (project, team, news)

**Files:**
- Modify: `scripts/lib/transform.mjs`
- Test: `test/transform.test.mjs`

- [ ] **Step 1: Add failing tests**

Append to `test/transform.test.mjs`:

```js
import { projectToRecord, teamToRecord, newsToRecord } from "../scripts/lib/transform.mjs";

describe("projectToRecord", () => {
  const raw = {
    id: "13",
    title: "The Charles",
    image: "img.jpg",
    carousel: ["a.jpg", "b.jpg"],
    category: "multi-family",
    stats: [
      { type: "units", text: "240" },
      { type: "year Completed", text: "2022" },
      { type: "status", text: "Completed" },
      { type: "type", text: "Ground Up" },
      { type: "Location", text: "Salt Lake City, Ut" },
    ],
  };
  const rec = projectToRecord(raw, 0);
  it("preserves id and title, adds order + featured", () => {
    expect(rec.id).toBe("13");
    expect(rec.order).toBe(0);
    expect(rec.featured).toBe(false);
  });
  it("normalizes stat types and values", () => {
    expect(rec.stats[1]).toEqual({ type: "yearCompleted", text: "2022" });
    expect(rec.stats[3]).toEqual({ type: "projectType", text: "Ground Up" });
    expect(rec.stats[4]).toEqual({ type: "location", text: "Salt Lake City, UT" });
  });
});

describe("teamToRecord", () => {
  const rec = teamToRecord(
    { name: "Paul Ritchie", title: "Founder", headshot: "h.jpg", linkedin: "url", biop1: "One.", biop2: "Two." },
    2
  );
  it("merges bios into one paragraph string, sets order", () => {
    expect(rec.bio).toBe("One.\n\nTwo.");
    expect(rec.order).toBe(2);
  });
});

describe("newsToRecord", () => {
  const rec = newsToRecord({
    title: "A headline",
    href: "https://x.com",
    category: { name: "Article" },
    description: "desc",
    datetime: "2022-11-01",
    imageUrl: "i.jpg",
    author: { name: "Building Salt Lake" },
  });
  it("flattens to simple fields", () => {
    expect(rec).toEqual({
      title: "A headline",
      link: "https://x.com",
      type: "Article",
      description: "desc",
      image: "i.jpg",
      author: "Building Salt Lake",
      date: "2022-11-01",
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `projectToRecord` is not exported.

- [ ] **Step 3: Implement the mappers**

Append to `scripts/lib/transform.mjs`:

```js
export function projectToRecord(raw, index) {
  return {
    id: raw.id,
    title: raw.title,
    order: index,
    featured: false,
    category: raw.category,
    image: raw.image,
    carousel: Array.isArray(raw.carousel) ? raw.carousel : [],
    stats: (raw.stats ?? []).map((s) => {
      const type = normalizeStatType(s.type);
      return { type, text: normalizeStatValue(type, s.text) };
    }),
  };
}

export function teamToRecord(raw, index) {
  const bio = [raw.biop1, raw.biop2, raw.biop3, raw.biop4]
    .filter(Boolean)
    .map((p) => String(p).trim())
    .join("\n\n");
  return {
    name: raw.name,
    title: raw.title,
    headshot: raw.headshot,
    linkedin: raw.linkedin ?? "",
    order: index,
    bio,
  };
}

export function newsToRecord(raw) {
  return {
    title: raw.title,
    link: raw.href,
    type: raw.category?.name ?? "Article",
    description: raw.description ?? "",
    image: raw.imageUrl,
    author: raw.author?.name ?? "",
    date: raw.datetime,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: PASS (all assertions).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/transform.mjs test/transform.test.mjs
git commit -m "feat: record mappers for project/team/news migration"
```

### Task 4: Migration runner + execute once

**Files:**
- Create: `scripts/migrate-content.mjs`

- [ ] **Step 1: Write the runner**

Create `scripts/migrate-content.mjs`:

```js
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { slugify, projectToRecord, teamToRecord, newsToRecord } from "./lib/transform.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src", "data");

function readJson(name) {
  return JSON.parse(readFileSync(join(dataDir, name), "utf8"));
}

function writeFolder(folder, records, slugOf) {
  const dir = join(dataDir, folder);
  mkdirSync(dir, { recursive: true });
  const used = new Map();
  for (const rec of records) {
    let slug = slugOf(rec);
    const n = (used.get(slug) ?? 0) + 1;
    used.set(slug, n);
    if (n > 1) slug = `${slug}-${n}`;
    writeFileSync(join(dir, `${slug}.json`), JSON.stringify(rec, null, 2) + "\n");
  }
  console.log(`Wrote ${records.length} files to src/data/${folder}/`);
}

// Projects
const projects = readJson("projects.json").map((p, i) => projectToRecord(p, i));
writeFolder("projects", projects, (r) => slugify(r.title));

// Team
const team = readJson("team.json").map((t, i) => teamToRecord(t, i));
writeFolder("team", team, (r) => slugify(r.name));

// News
const news = readJson("news.json").map((n) => newsToRecord(n));
writeFolder("news", news, (r) => slugify(r.title));

// Homepage singleton (seeded from current hardcoded Hero + StatsSection values)
const homepage = {
  heroSlides: [
    {
      image:
        "https://res.cloudinary.com/dgjw3jwe3/image/upload/q_auto,f_auto/v1740439413/images/Projects/TheCharles2/The_Charles_GR_MR_1_of_104_wx1v8k_rpr6nu.jpg",
      label: "Multi-Family",
    },
    {
      image:
        "https://res.cloudinary.com/dgjw3jwe3/image/upload/q_auto,f_auto/v1740174545/images/Projects/LeMeridian2/MER_SLCLD_EXTERIOR_DAY-5_hyq2my.jpg",
      label: "Hospitality",
    },
    {
      image:
        "https://res.cloudinary.com/dgjw3jwe3/image/upload/q_auto,f_auto/v1767827724/images/Projects/Solhavn/09-DJI_20250716092432_0416_D_pepkcz.jpg",
      label: "Multi-Family",
    },
  ],
  statCallouts: [
    {
      number: "3547",
      label: "Apartment Units",
      image:
        "https://res.cloudinary.com/dgjw3jwe3/image/upload/q_auto,f_auto/v1767829998/images/Projects/AF860/Arza_Aerial_Night_Lights_iuxcsa.jpg",
    },
    {
      number: "5.7",
      label: "Million Industrial Square Feet",
      image:
        "https://res.cloudinary.com/dgjw3jwe3/image/upload/q_auto,f_auto/v1767897377/images/Projects/GLH%20Building%20I/Aerial_Mountain_Backdrop_Medium_Angle_ubeg69.jpg",
    },
  ],
};
writeFileSync(join(dataDir, "homepage.json"), JSON.stringify(homepage, null, 2) + "\n");
console.log("Wrote src/data/homepage.json");

// About singleton (seeded from current team.astro paragraph)
const about = {
  aboutText:
    "The Ritchie Group (TRG) is a second-generation family office, based in Salt Lake City, Utah, that has owned and developed real estate for over 40 years. TRG’s primary focus is on multifamily, self-storage, industrial, and hospitality real estate development projects. TRG has a development queue of 3400+ multifamily units, 400+ keys of hospitality, and 4.4M SF of industrial warehouse at various stages of design and development.",
};
writeFileSync(join(dataDir, "about.json"), JSON.stringify(about, null, 2) + "\n");
console.log("Wrote src/data/about.json");

// Remove orphaned file
const other = join(dataDir, "other.json");
if (existsSync(other)) {
  rmSync(other);
  console.log("Deleted src/data/other.json");
}
```

- [ ] **Step 2: Run the migration**

Run: `node scripts/migrate-content.mjs`
Expected output: "Wrote 32 files to src/data/projects/", plus team/news counts, homepage.json, about.json, and "Deleted src/data/other.json".

- [ ] **Step 3: Sanity-check generated data**

Run: `ls src/data/projects | wc -l` → Expected: `32`
Run: `cat src/data/projects/the-charles.json` → Expected: has `"order": 0`, `"featured": false`, stat `{ "type": "yearCompleted", ... }`, location `"Salt Lake City, UT"`.

- [ ] **Step 4: Delete the old array files**

```bash
git rm src/data/projects.json src/data/team.json src/data/news.json
```

(Note: `other.json` was already deleted by the script; stage that removal in the next commit.)

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-content.mjs src/data/projects src/data/team src/data/news src/data/homepage.json src/data/about.json
git add -A src/data
git commit -m "feat: migrate content to per-item files + homepage/about singletons"
```

---

## Phase 2 — Content loader, stat-types source of truth, and wiring

### Task 5: Pure content helpers (TDD)

**Files:**
- Create: `src/utils/contentHelpers.js`
- Test: `test/contentHelpers.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `test/contentHelpers.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { sortByOrder, sortFeaturedFirst, formatNewsDate, toParagraphs } from "../src/utils/contentHelpers.js";

describe("sortByOrder", () => {
  it("sorts ascending by order", () => {
    const out = [{ order: 2 }, { order: 0 }, { order: 1 }].sort(sortByOrder);
    expect(out.map((x) => x.order)).toEqual([0, 1, 2]);
  });
});

describe("sortFeaturedFirst", () => {
  it("keeps featured first, preserves relative order within groups", () => {
    const input = [
      { id: "a", featured: false },
      { id: "b", featured: true },
      { id: "c", featured: false },
      { id: "d", featured: true },
    ];
    expect(sortFeaturedFirst(input).map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });
});

describe("formatNewsDate", () => {
  it("formats ISO date to readable, in UTC", () => {
    expect(formatNewsDate("2022-11-01")).toBe("Nov 1, 2022");
  });
});

describe("toParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(toParagraphs("One.\n\nTwo.")).toEqual(["One.", "Two."]);
  });
  it("returns empty array for empty input", () => {
    expect(toParagraphs("")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot find `../src/utils/contentHelpers.js`.

- [ ] **Step 3: Implement the helpers**

Create `src/utils/contentHelpers.js`:

```js
export function sortByOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0);
}

export function sortFeaturedFirst(list) {
  const featured = list.filter((p) => p.featured);
  const rest = list.filter((p) => !p.featured);
  return [...featured, ...rest];
}

export function formatNewsDate(iso) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function toParagraphs(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/contentHelpers.js test/contentHelpers.test.mjs
git commit -m "feat: pure content helpers (sort, date format, paragraphs)"
```

### Task 6: Stat-types source of truth (TDD)

**Files:**
- Create: `src/config/statTypes.jsx`
- Test: `test/statTypes.test.mjs`
- Modify: `src/utils/getDisplayName.js`, `src/utils/getIcon.tsx`

- [ ] **Step 1: Write the failing tests**

Create `test/statTypes.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { STAT_TYPES, statTypeByValue } from "../src/config/statTypes.jsx";
import getDisplayName from "../src/utils/getDisplayName.js";

describe("STAT_TYPES", () => {
  it("covers the canonical set", () => {
    expect(STAT_TYPES.map((t) => t.value).sort()).toEqual(
      ["keys", "location", "projectType", "squareFeet", "status", "type", "units", "yearCompleted", "yearStarted"].sort()
    );
  });
  it("every type has a label and icon", () => {
    for (const t of STAT_TYPES) {
      expect(typeof t.label).toBe("string");
      expect(t.icon).toBeTruthy();
    }
  });
});

describe("getDisplayName", () => {
  it("returns canonical labels", () => {
    expect(getDisplayName("yearCompleted")).toBe("Year Completed");
    expect(getDisplayName("projectType")).toBe("Type");
    expect(getDisplayName("squareFeet")).toBe("Square Feet");
  });
  it("falls back to the raw value when unknown", () => {
    expect(getDisplayName("mystery")).toBe("mystery");
  });
});
```

Note: `STAT_TYPES` includes a `type` alias pointing at the same entry as `projectType` so any not-yet-migrated data still resolves (defensive). See implementation.

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot find `../src/config/statTypes.jsx`.

- [ ] **Step 3: Create the config**

Create `src/config/statTypes.jsx`:

```jsx
import {
  BuildingOfficeIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  HashtagIcon,
  MapPinIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline/esm/index";

export const STAT_TYPES = [
  { value: "units", label: "Units", icon: HashtagIcon },
  { value: "keys", label: "Keys", icon: HashtagIcon },
  { value: "squareFeet", label: "Square Feet", icon: Squares2X2Icon },
  { value: "yearCompleted", label: "Year Completed", icon: CalendarIcon },
  { value: "yearStarted", label: "Year Started", icon: CalendarIcon },
  { value: "status", label: "Status", icon: BuildingOfficeIcon },
  { value: "projectType", label: "Type", icon: ClipboardDocumentListIcon },
  { value: "location", label: "Location", icon: MapPinIcon },
  // Defensive alias for any legacy unmigrated data:
  { value: "type", label: "Type", icon: ClipboardDocumentListIcon },
];

export const statTypeByValue = Object.fromEntries(STAT_TYPES.map((t) => [t.value, t]));
```

- [ ] **Step 4: Rewrite `getDisplayName.js` to derive from the config**

Replace the entire contents of `src/utils/getDisplayName.js`:

```js
import { statTypeByValue } from "../config/statTypes.jsx";

export default function getDisplayName(name) {
  return statTypeByValue[name]?.label ?? name;
}
```

- [ ] **Step 5: Rewrite `getIcon.tsx` to derive from the config**

Replace the entire contents of `src/utils/getIcon.tsx`:

```tsx
import React from "react";
import { CogIcon } from "@heroicons/react/24/outline/esm/index";
import { statTypeByValue } from "../config/statTypes.jsx";

export const getIcon = (type: string) => {
  const Icon = statTypeByValue[type]?.icon ?? CogIcon;
  return <Icon />;
};
```

- [ ] **Step 6: Run to verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/config/statTypes.jsx src/utils/getDisplayName.js src/utils/getIcon.tsx test/statTypes.test.mjs
git commit -m "feat: single source of truth for stat types (fixes icon drift)"
```

### Task 7: Content loader module

**Files:**
- Create: `src/utils/content.js`

- [ ] **Step 1: Create the loader**

Create `src/utils/content.js`:

```js
import { sortByOrder, sortFeaturedFirst, formatNewsDate, toParagraphs } from "./contentHelpers.js";

const projectModules = import.meta.glob("../data/projects/*.json", { eager: true });
const teamModules = import.meta.glob("../data/team/*.json", { eager: true });
const newsModules = import.meta.glob("../data/news/*.json", { eager: true });

const values = (modules) => Object.values(modules).map((m) => m.default);

export const projects = values(projectModules).sort(sortByOrder);
export const team = values(teamModules).sort(sortByOrder);
export const news = values(newsModules).sort((a, b) => new Date(b.date) - new Date(a.date));

export { sortFeaturedFirst, formatNewsDate, toParagraphs };
```

- [ ] **Step 2: Verify the build resolves the globs**

Run: `npm run build`
Expected: build succeeds (pages still import the old `projects.json` directly — that's fixed in later tasks; this step only confirms the loader compiles). If the build fails because old array files were deleted, proceed to Task 8 which rewires the pages, then build.

- [ ] **Step 3: Commit**

```bash
git add src/utils/content.js
git commit -m "feat: content loader globbing per-item data folders"
```

### Task 8: Rewire Projects pages to the loader (+ featured sort + bug fixes)

**Files:**
- Modify: `src/components/ProjectSection.jsx`, `src/components/AllProjects.jsx`, `src/pages/projects/[id].astro`

- [ ] **Step 1: Update `ProjectSection.jsx`**

Change the import block (top of file) from:

```jsx
import projects from "../data/projects.json";
import ProjectCard from "./ProjectCard";
```

to:

```jsx
import { projects, sortFeaturedFirst } from "../utils/content.js";
import ProjectCard from "./ProjectCard";
```

Change the state initializer from:

```jsx
  const [currentProjects, setCurrentProjects] = useState(projects);
```

to:

```jsx
  const [currentProjects, setCurrentProjects] = useState(sortFeaturedFirst(projects));
```

Change the "All" button handler from:

```jsx
          <button onClick={() => setCurrentProjects(projects)}>All</button>
```

to:

```jsx
          <button onClick={() => setCurrentProjects(sortFeaturedFirst(projects))}>All</button>
```

Change `setProjectCategory` from:

```jsx
  const setProjectCategory = (category) => {
    setCurrentProjects(
      projects.filter((project) => project.category === category)
    );
  };
```

to:

```jsx
  const setProjectCategory = (category) => {
    setCurrentProjects(
      sortFeaturedFirst(projects.filter((project) => project.category === category))
    );
  };
```

Fix the typo in the empty-state text from `cateogry` to `category`:

```jsx
          There are no projects with this category.
```

- [ ] **Step 2: Update `AllProjects.jsx`**

Change the import from `import projects from "../data/projects.json";` to:

```jsx
import { projects } from "../utils/content.js";
```

Fix the Mixed-Use button (it currently calls `setProjectCategory("hospitality")`):

```jsx
        <li>
          <button onClick={() => setProjectCategory("mixed-use")}>
            Mixed-Use
          </button>
        </li>
```

Fix the typo in the empty-state text from `cateogry` to `category`.

- [ ] **Step 3: Update `src/pages/projects/[id].astro`**

Change the import from `import projects from "../../data/projects.json";` to:

```astro
import { projects } from "../../utils/content.js";
```

(The `getStaticPaths` and `filter` logic below it continue to work unchanged because each record still has `id`.)

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: build succeeds.
Run: `npm run preview` then visit `/projects` and a project detail page; confirm all 32 projects render, the Mixed-Use filter no longer duplicates Hospitality, and stat icons show calendar/map-pin (not gears).

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectSection.jsx src/components/AllProjects.jsx src/pages/projects/[id].astro
git commit -m "feat: projects read from loader; featured-first sort; fix Mixed-Use + typo"
```

### Task 9: Rewire News (loader + simplified BlogSection)

**Files:**
- Modify: `src/components/BlogSection.jsx`, `src/pages/news.astro`, `src/pages/index.astro`

- [ ] **Step 1: Simplify `BlogSection.jsx` props**

Replace the entire `BlogSection.jsx` with:

```jsx
/* News card */
import React from "react";
export default function BlogSection({ title, link, type, description, image, author, date, datetime }) {
  return (
    <div className="relative w-full h-full">
      <div className="flex flex-col rounded-lg shadow-lg overflow-hidden h-full">
        <div className="flex-shrink-0">
          <img className="h-48 w-full object-cover" src={image} alt="" />
        </div>
        <div className="p-6 bg-darkbg-dark flex-grow h-full flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-rblue">
              <a href={link} className="hover:underline">
                {type}
              </a>
            </p>
            <a href={link} className="block mt-2">
              <p className="text-xl font-semibold text-gray-200">{title}</p>
              <p className="mt-3 text-base text-gray-400">{description}</p>
            </a>
          </div>
          <div className="mt-6 flex items-center">
            <div>
              <p className="text-sm font-medium text-gray-200">{author}</p>
              <div className="flex space-x-1 text-sm text-gray-400">
                <time dateTime={datetime}>{date}</time>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `news.astro`**

Replace the frontmatter import `import news from "../data/news.json";` with:

```astro
import { news, formatNewsDate } from "../utils/content.js";
```

Replace the `{news.map(...)}` block with:

```astro
      {news.map((article) => (
        <BlogSection
          title={article.title}
          link={article.link}
          type={article.type}
          description={article.description}
          image={article.image}
          author={article.author}
          date={formatNewsDate(article.date)}
          datetime={article.date}
          client:load
        />
      ))}
```

- [ ] **Step 3: Update `index.astro` news section**

Replace `import news from "../data/news.json";` with an import from the loader. At the top of the frontmatter, change/add:

```astro
import { projects, news, formatNewsDate } from "../utils/content.js";
```

(Remove the old `import projects from "../data/projects.json";` and `import news from "../data/news.json";` lines.)

Replace the homepage news `.slice(0, 3).map(...)` block with:

```astro
        {news
          .slice(0, 3)
          .map((article) => (
            <BlogSection
              title={article.title}
              link={article.link}
              type={article.type}
              description={article.description}
              image={article.image}
              author={article.author}
              date={formatNewsDate(article.date)}
              datetime={article.date}
              client:load
            />
          ))}
```

Note: `index.astro` imports `projects` but only uses it via child components; keep the import only if referenced, otherwise remove to avoid an unused-import lint. (As of now `index.astro` does not directly use `projects` in its template — remove it from the import if unused.)

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: success.
Run: `npm run preview`; visit `/news` and the homepage; confirm article descriptions now show (the old `desription` typo is gone), dates read like "Nov 1, 2022", and the type label appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/BlogSection.jsx src/pages/news.astro src/pages/index.astro
git commit -m "feat: news reads from loader; simplified BlogSection; fix desription typo"
```

---

## Phase 3 — Editable singletons (Hero, StatsSection, About, Team bios)

### Task 10: Hero reads `homepage.json`

**Files:**
- Modify: `src/components/Hero.jsx`

- [ ] **Step 1: Replace `Hero.jsx`**

Replace the entire file with a data-driven version (keeps the 3-slide animation behavior):

```jsx
import React, { useState, useEffect } from "react";
import homepage from "../data/homepage.json";

const slides = homepage.heroSlides;

function slideClass(index, current) {
  // index is 0-based; current is 1-based
  const pos = index + 1;
  if (pos === current) return "translate-x-0 transition-transform duration-1000";
  if (pos === current - 1 || (current === 1 && pos === slides.length))
    return "-translate-x-full transition-transform duration-1000";
  return "translate-x-full";
}

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide((prev) => (prev >= slides.length ? 1 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-128 bg-white relative">
      {slides.map((slide, i) => (
        <img
          key={i}
          src={slide.image}
          className={`w-full h-full object-cover object-center absolute inset-0 ${slideClass(i, currentSlide)}`}
        />
      ))}
      <div className="max-w-5xl w-full h-full mx-auto relative px-4 py-12">
        <div className="h-full w-max bg-darkbg bg-opacity-80 px-10 py-6 relative flex flex-col items-start justify-between border-sushi border-solid border-4 z-40">
          <div>
            <h1 className="font-semibold text-md text-white uppercase mb-2">
              {slides[currentSlide - 1]?.label}
            </h1>
            <h1 className="font-bold text-white text-4xl uppercase">
              The
              <br />
              Ritchie
              <br />
              Group
            </h1>
          </div>
          <a href="/projects" className="font-semibold text-sm hover:underline">
            See Projects <span className="text-xs">{">"}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build and visually verify**

Run: `npm run build && npm run preview`
Expected: homepage hero cycles through the same 3 images with the slide label showing.

- [ ] **Step 3: Commit**

```bash
git add src/components/Hero.jsx
git commit -m "feat: Hero carousel reads editable homepage.json slides"
```

### Task 11: StatsSection reads `homepage.json`

**Files:**
- Modify: `src/components/StatsSection.jsx`

- [ ] **Step 1: Replace `StatsSection.jsx`**

Replace the entire file with a data-driven version preserving the alternating layout:

```jsx
import React from "react";
import Fade from "react-reveal/Fade";
import homepage from "../data/homepage.json";

const [first, second] = homepage.statCallouts;

export default function StatsSection() {
  return (
    <>
      <div className="relative grid grid-cols-1 md:grid-cols-2 max-w-5xl 2xl:max-w-7xl mx-auto px-4 py-8 gap-6">
        <div className="flex items-center justify-start md:justify-center w-full">
          <Fade left>
            <div className="w-32 h-32 border-solid border-sushi border-4 flex items-center">
              <h2 className="text-7xl font-bold ml-6">{first.number}</h2>
            </div>
            <div className="w-24"></div>
            <div className="h-full flex items-center font-normal text-lg">
              <h1>{first.label}</h1>
            </div>
          </Fade>
        </div>
        <Fade right>
          <img src={first.image} className="w-full h-auto z-10" />
          <div
            style={{ backgroundImage: `url(/elements/dots.svg)` }}
            className="w-64 h-48 absolute -right-2 bottom-4 z-0 transform transition-all duration-500 bg-cover bg-no-repeat"
          />
        </Fade>
      </div>
      <div className="relative grid grid-cols-1 md:grid-cols-2 max-w-5xl 2xl:max-w-7xl mx-auto px-4 py-12 gap-6">
        <div className="flex items-center justify-start md:justify-center w-full md:col-start-2">
          <Fade right>
            <div className="w-32 h-32 border-solid border-sushi border-4 flex items-center">
              <h2 className="text-7xl font-bold ml-10">{second.number}</h2>
            </div>
            <div className="w-12"></div>
            <div className="h-full flex items-center font-normal text-lg">
              <h1>{second.label}</h1>
            </div>
          </Fade>
        </div>
        <Fade left>
          <img src={second.image} className="w-full h-auto transform z-10 md:col-start-1 md:row-start-1" />
          <div
            style={{ backgroundImage: `url(/elements/dots.svg)` }}
            className="w-64 h-48 absolute -left-2 bottom-4 z-0 transform transition-all duration-500 bg-cover bg-no-repeat"
          />
        </Fade>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build and visually verify**

Run: `npm run build && npm run preview`
Expected: the two stat callouts ("3547 / Apartment Units", "5.7 / Million Industrial Square Feet") and their images render as before.

- [ ] **Step 3: Commit**

```bash
git add src/components/StatsSection.jsx
git commit -m "feat: StatsSection reads editable homepage.json callouts"
```

### Task 12: Team bios + About paragraph

**Files:**
- Modify: `src/components/TeamCard.jsx`, `src/pages/team.astro`

- [ ] **Step 1: Update `TeamCard.jsx` to use a single `bio`**

Change the component signature from:

```jsx
export default function TeamCard({ name, headshot, title, biop1, biop2, biop3, biop4, linkedin }) {
```

to:

```jsx
import { toParagraphs } from "../utils/contentHelpers.js";

export default function TeamCard({ name, headshot, title, bio, linkedin }) {
```

(Keep the existing `import React, { useState } from "react";` and `XMarkIcon` import; add the `toParagraphs` import below them.)

Replace the bio paragraphs block:

```jsx
              <div className="overflow-y-scroll">
                <p className="text-2xl mb-4">{biop1}</p>
                <p className="text-2xl mb-4">{biop2}</p>
                <p className="text-2xl mb-4">{biop3}</p>
                <p className="text-2xl">{biop4}</p>
              </div>
```

with:

```jsx
              <div className="overflow-y-scroll">
                {toParagraphs(bio).map((p, i) => (
                  <p key={i} className="text-2xl mb-4">{p}</p>
                ))}
              </div>
```

- [ ] **Step 2: Update `team.astro`**

Replace the frontmatter:

```astro
import team from "../data/team.json";
```

with:

```astro
import { team } from "../utils/content.js";
import { toParagraphs } from "../utils/contentHelpers.js";
import about from "../data/about.json";
```

Replace the hardcoded About paragraph (`<h2 class="text-xl"> ... </h2>`) with:

```astro
      <div class="text-xl">
        {toParagraphs(about.aboutText).map((p) => (
          <p class="mb-4">{p}</p>
        ))}
      </div>
```

Replace the team `.map(...)` props block with:

```astro
      {team.map((member) => (
        <TeamCard
          name={member.name}
          headshot={member.headshot}
          title={member.title}
          bio={member.bio}
          linkedin={member.linkedin}
          client:load
        />
      ))}
```

- [ ] **Step 3: Build and visually verify**

Run: `npm run build && npm run preview`
Expected: `/team` shows the About Us paragraph and every member's "See More" modal shows their full bio.

- [ ] **Step 4: Commit**

```bash
git add src/components/TeamCard.jsx src/pages/team.astro src/data/about.json
git commit -m "feat: editable About paragraph + single bio field for team"
```

### Task 13: Full pre-CMS verification

**Files:** none (verification only)

- [ ] **Step 1: Clean build**

Run: `rm -rf dist && npm run build`
Expected: success, no references to deleted `*.json` arrays.

- [ ] **Step 2: Confirm no dangling imports**

Run: `grep -rn "data/projects.json\|data/team.json\|data/news.json\|data/other.json" src`
Expected: no matches.

- [ ] **Step 3: Run unit tests**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 4: Manual spot-check**

Run: `npm run preview` and check `/`, `/projects`, a project detail page, `/news`, `/team`. Confirm parity with production and correct stat icons.

- [ ] **Step 5: Commit (if any cleanup was needed)**

```bash
git commit -am "chore: pre-CMS verification cleanup" || echo "nothing to commit"
```

---

## Phase 4 — Sveltia CMS, OAuth, Cloudinary

> Manual prerequisites for this phase (done by the site owner, recorded here):
> - **GitHub OAuth App** (github.com → Settings → Developer settings → OAuth Apps → New): Homepage URL = the site URL; Authorization callback URL = `https://<SITE>/.netlify/functions/callback`. Copy the Client ID and generate a Client Secret.
> - In Netlify → Site settings → Environment variables, add `OAUTH_GITHUB_CLIENT_ID` and `OAUTH_GITHUB_CLIENT_SECRET`.
> - **Least-privilege editor account:** the shared **TRG Editor** GitHub account should be a *dedicated* account that is a collaborator on `Kasalehlie/trg2` **and nothing else** (so its token, even at repo scope, can't reach other repos). Add it as a collaborator on `Kasalehlie/trg2`.
> - **OAuth scope:** the repo is **public**, so the functions request the narrower **`public_repo`** scope. If the repo is ever made private, change `scope=public_repo` → `scope=repo` in `auth.mjs` (a public-repo token cannot write to a private repo).
> - **Repo visibility note:** `trg2` is a *fork*; GitHub won't toggle a fork to private directly — going private means duplicating into a new private repo and repointing Netlify + `config.yml`. If you intend to do that, do it **before** this phase to avoid rewiring.
> - **Cloudinary** (cloud `dgjw3jwe3`): create an unsigned upload preset; note its name; add the site domain + `localhost` to Allowed origins. Have the Cloudinary **API key** ready.

### Task 14: Netlify build + functions config

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Create `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"
```

- [ ] **Step 2: Commit**

```bash
git add netlify.toml
git commit -m "chore: netlify build + functions config"
```

### Task 15: GitHub OAuth Netlify Functions

**Files:**
- Create: `netlify/functions/auth.mjs`, `netlify/functions/callback.mjs`

- [ ] **Step 1: Create `auth.mjs` (redirects to GitHub with a CSRF `state`)**

Scope is `public_repo` because the repo is public (switch to `repo` only if it goes private — see Phase-4 prerequisites).

```js
import crypto from "node:crypto";

export async function handler(event) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const host = event.headers.host;
  const redirectUri = `https://${host}/.netlify/functions/callback`;
  const state = crypto.randomUUID();
  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=public_repo` +
    `&state=${state}`;
  return {
    statusCode: 302,
    headers: {
      Location: url,
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
    body: "",
  };
}
```

- [ ] **Step 2: Create `callback.mjs` (verifies `state`, exchanges code, posts token to the CMS origin)**

```js
function resultPage(status, payload, targetOrigin) {
  const body = `<!doctype html><html><body><script>
    (function() {
      function send(msg) { window.opener && window.opener.postMessage(msg, ${JSON.stringify(targetOrigin)}); }
      window.addEventListener("message", function() {
        send('authorization:github:${status}:${JSON.stringify(payload)}');
      }, { once: true });
      send("authorizing:github");
    })();
  </script></body></html>`;
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      // Clear the state cookie now that the flow is complete.
      "Set-Cookie": "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    },
    body,
  };
}

export async function handler(event) {
  const params = event.queryStringParameters || {};
  const code = params.code;
  const returnedState = params.state;
  const cookie = event.headers.cookie || "";
  const savedState = (cookie.match(/(?:^|;\s*)oauth_state=([^;]+)/) || [])[1];
  const siteOrigin = `https://${event.headers.host}`;

  // CSRF check: state must be present and match the cookie set by auth.mjs.
  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    return resultPage("error", { error: "invalid_state" }, siteOrigin);
  }

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.OAUTH_GITHUB_CLIENT_ID,
      client_secret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await res.json();

  if (!data.access_token) {
    return resultPage("error", { error: data.error || "unknown" }, siteOrigin);
  }
  return resultPage("success", { token: data.access_token, provider: "github" }, siteOrigin);
}
```

Note: the token is never logged; `client_secret` is read only from the Netlify env var.

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/auth.mjs netlify/functions/callback.mjs
git commit -m "feat: GitHub OAuth handler for the CMS (Netlify functions)"
```

### Task 16: Sveltia admin page + config

**Files:**
- Create: `public/admin/index.html`, `public/admin/config.yml`

- [ ] **Step 1: Self-host a pinned Sveltia bundle (no third-party CDN at runtime)**

The admin page handles a GitHub token, so it must not load executable code from an unpinned CDN. Download a specific released version into `public/admin/` so it is served from our own origin and survives even if the CDN is down.

Run (replace `X.Y.Z` with the latest released version from https://github.com/sveltia/sveltia-cms/releases):
```bash
curl -fsSL "https://unpkg.com/@sveltia/cms@X.Y.Z/dist/sveltia-cms.js" -o public/admin/sveltia-cms.js
```
Verify it downloaded a real bundle:
```bash
head -c 200 public/admin/sveltia-cms.js && echo && wc -c public/admin/sveltia-cms.js
```
Expected: non-empty JS (hundreds of KB), not an HTML error page.

- [ ] **Step 2: Create `public/admin/index.html` referencing the local bundle**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>TRG Content Admin</title>
  </head>
  <body>
    <script src="/admin/sveltia-cms.js"></script>
  </body>
</html>
```

(If you prefer the CDN over self-hosting, pin the exact version **and** add a Subresource Integrity hash: `integrity="sha384-$(curl -fsSL <url> | openssl dgst -sha384 -binary | openssl base64 -A)" crossorigin="anonymous"`. Self-hosting is recommended for the unattended hand-off.)

- [ ] **Step 3: Create `public/admin/config.yml`**

Replace `REPLACE_WITH_CLOUDINARY_API_KEY` and `REPLACE_WITH_UPLOAD_PRESET` with the real Cloudinary values before deploying.

```yaml
backend:
  name: github
  repo: Kasalehlie/trg2
  branch: main
  base_url: https://REPLACE_WITH_SITE_DOMAIN
  auth_endpoint: /.netlify/functions/auth

media_library:
  name: cloudinary
  config:
    cloud_name: dgjw3jwe3
    api_key: "REPLACE_WITH_CLOUDINARY_API_KEY"
    upload_preset: REPLACE_WITH_UPLOAD_PRESET

collections:
  - name: projects
    label: Projects
    folder: src/data/projects
    create: true
    slug: "{{slug}}"
    extension: json
    format: json
    identifier_field: title
    fields:
      - { name: id, label: ID, widget: hidden, default: "{{slug}}" }
      - { name: title, label: Title, widget: string }
      - { name: order, label: Display order, widget: number, value_type: int, default: 999 }
      - { name: featured, label: Feature on homepage, widget: boolean, default: false }
      - name: category
        label: Category
        widget: select
        options: ["multi-family", "hospitality", "industrial", "mixed-use"]
      - { name: image, label: Main image, widget: image }
      - { name: carousel, label: Gallery images, widget: list, field: { name: image, label: Image, widget: image } }
      - name: stats
        label: Stats
        widget: list
        fields:
          - name: type
            label: Stat type
            widget: select
            options:
              - { label: Units, value: units }
              - { label: Keys, value: keys }
              - { label: Square Feet, value: squareFeet }
              - { label: Year Completed, value: yearCompleted }
              - { label: Year Started, value: yearStarted }
              - { label: Status, value: status }
              - { label: Type, value: projectType }
              - { label: Location, value: location }
          - { name: text, label: Value, widget: string }

  - name: news
    label: News
    folder: src/data/news
    create: true
    slug: "{{slug}}"
    extension: json
    format: json
    identifier_field: title
    fields:
      - { name: title, label: Title, widget: string }
      - { name: link, label: Link (article URL), widget: string }
      - { name: type, label: Type, widget: select, options: ["Article", "Video"] }
      - { name: description, label: Description, widget: text }
      - { name: image, label: Image, widget: image }
      - { name: author, label: Author, widget: string }
      - { name: date, label: Date, widget: datetime, date_format: "YYYY-MM-DD", time_format: false, picker_utc: true }

  - name: team
    label: Team
    folder: src/data/team
    create: true
    slug: "{{slug}}"
    extension: json
    format: json
    identifier_field: name
    fields:
      - { name: name, label: Name, widget: string }
      - { name: title, label: Title, widget: string }
      - { name: headshot, label: Headshot, widget: image }
      - { name: linkedin, label: LinkedIn URL, widget: string, required: false }
      - { name: order, label: Display order, widget: number, value_type: int, default: 999 }
      - { name: bio, label: Bio, widget: text, hint: "Separate paragraphs with a blank line." }

  - name: singletons
    label: Site Content
    files:
      - name: homepage
        label: Homepage
        file: src/data/homepage.json
        fields:
          - name: heroSlides
            label: Hero slides
            widget: list
            max: 3
            fields:
              - { name: image, label: Image, widget: image }
              - { name: label, label: Label, widget: string }
          - name: statCallouts
            label: Stat callouts
            widget: list
            fields:
              - { name: number, label: Number, widget: string }
              - { name: label, label: Label, widget: string }
              - { name: image, label: Image, widget: image }
      - name: about
        label: About Us
        file: src/data/about.json
        fields:
          - { name: aboutText, label: About paragraph, widget: text, hint: "Separate paragraphs with a blank line." }
```

- [ ] **Step 4: Fill in the real values**

Edit `config.yml`: set `base_url` to the live site domain, `api_key` to the Cloudinary API key, `upload_preset` to the preset name.

- [ ] **Step 5: Build to confirm `/admin` is published**

Run: `npm run build`
Expected: `dist/admin/index.html`, `dist/admin/sveltia-cms.js`, and `dist/admin/config.yml` exist (Astro copies `public/` verbatim).
Run: `ls dist/admin`

- [ ] **Step 6: Commit**

```bash
git add public/admin/index.html public/admin/sveltia-cms.js public/admin/config.yml
git commit -m "feat: Sveltia CMS admin page + collection config"
```

---

## Phase 5 — Deploy & end-to-end verification

### Task 17: Deploy and test the editing loop

**Files:** none

- [ ] **Step 1: Push and let Netlify deploy**

```bash
git push origin <branch>
```
Confirm the Netlify build succeeds and the functions deploy.

- [ ] **Step 2: Test login**

Visit `https://<SITE>/admin`, click "Login with GitHub", authenticate as the **TRG Editor** account. Expected: the CMS dashboard loads with Projects / News / Team / Site Content.

- [ ] **Step 3: Test an edit + image upload**

Edit a project's title; add an image via the Cloudinary widget; toggle `featured`; Publish. Expected: a commit appears on `main`, Netlify rebuilds, and within ~1 min the change is live (and the featured project leads the homepage carousel).

- [ ] **Step 4: Test a new item**

Create a new News article and Publish. Confirm it appears at `/news`.

- [ ] **Step 5: Update the README accounts/keep-alive note if anything changed**

Confirm the README "accounts that must stay alive" section is accurate (domain, Netlify, GitHub, Cloudinary). Commit any doc fixes.

```bash
git commit -am "docs: finalize admin portal notes" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Per-item folder collections — Tasks 4, 7, 8, 9, 12. ✅
- Preserve project URLs via stable `id` — Task 3 (`projectToRecord` keeps `id`), Task 8 (`[id].astro`). ✅
- `order` + featured-first homepage sort — Tasks 3, 5, 8. ✅
- `featured` flag editable — Task 16 (boolean widget). ✅
- Category incl. Mixed-Use + filter fix — Tasks 8, 16. ✅
- Stat-types single source of truth + icon fix + `projectType` rename — Tasks 2, 6, 16. ✅
- News single date + type + fix `desription` — Tasks 3, 9. ✅
- Team single bio + About paragraph editable — Tasks 3, 12, 16. ✅
- Homepage hero + stat callouts editable — Tasks 4, 10, 11, 16. ✅
- Delete `other.json` — Task 4. ✅
- Sveltia + GitHub OAuth (shared account) + Cloudinary — Tasks 14, 15, 16, 17. ✅
- Durability/keep-alive docs — README (already committed) + Task 17. ✅
- Testing/verification — Tasks 13, 17. ✅

**Security hardening (from plan security review):**
- Sveltia bundle self-hosted from our own origin (no unpinned third-party CDN executing on the token-bearing admin page) — Task 16.
- OAuth uses a CSRF `state` cookie verified in the callback — Task 15.
- `postMessage` is scoped to the site origin, not `"*"` — Task 15.
- Least-privilege `public_repo` scope (public repo) + dedicated single-purpose editor account — Task 15 + Phase-4 prerequisites.
- Client secret stays in Netlify env vars; token is never logged.

**Known deviations from spec (intentional, flagged to user):**
1. About/bio use multiline text rendered as paragraphs (`toParagraphs`) rather than full Markdown — avoids adding a markdown dependency.
2. Stat **value** dropdowns for `status`/`projectType` are deferred (Git CMS limitation); the **type** dropdown ships and migration normalizes existing values. Future enhancement: variable-type list or promoting status/projectType to top-level select fields.

**Placeholder scan:** Cloudinary `api_key`/`upload_preset`, `base_url`, and the push `<branch>`/`<SITE>` are explicit fill-ins with instructions, not hidden TODOs. The OAuth `callback.mjs` code-parsing line is intentionally defensive; if `event.queryStringParameters.code` is reliably present on Netlify, it simplifies to `const code = event.queryStringParameters.code;` — verify during Task 17.

**Type consistency:** Record field names (`id`, `title`, `order`, `featured`, `category`, `image`, `carousel`, `stats[].type`, `stats[].text`, team `bio`, news `link`/`type`/`image`/`author`/`date`, `homepage.heroSlides[]`, `homepage.statCallouts[]`, `about.aboutText`) are consistent across the migration mappers (Task 3), loader (Task 7), components (Tasks 8–12), and CMS config (Task 16).
