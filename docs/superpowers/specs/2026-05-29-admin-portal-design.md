# Admin Portal for Content Editing — Design Spec

**Date:** 2026-05-29
**Status:** Approved (design); pending implementation plan
**Site:** The Ritchie Group marketing/portfolio site (Astro 1.9 static, deployed on Netlify)

## Goal

Let non-technical staff edit site content — **Projects (incl. marking homepage-featured
ones), News, Team, the homepage hero + stat callouts and their images, and the About Us
paragraph** — through a friendly admin UI, without touching code or Git directly. The site
will then be handed off and run largely unattended (edits a few times a year). The
solution must therefore have **nothing that rots or must be babysat**: no database, no
always-on server.

## Constraints & context (decisions already made)

- **Audience:** non-technical staff.
- **Update speed:** a ~1-minute rebuild after publishing is acceptable.
- **Cost:** free / self-hosted; no new subscriptions.
- **Hosting:** stays on **Netlify** (current host). No move to Vercel.
- **Editor login:** a single **shared "TRG Editor" GitHub account** (simplest login; small
  trusted team, so a per-person audit trail isn't required).
- **Images:** continue using the existing **Cloudinary** account (cloud `dgjw3jwe3`).
- **Out of scope:** the Give Back / Ritchie Foundation content is not editable in v1.

### Why not Payload / a headless CMS + database

Payload (and any DB-backed CMS) was considered and rejected for this hand-off. A
database-backed CMS is a *living system*: free-tier databases auto-pause and can be
**deleted after inactivity**, and a static site's public traffic never touches the DB —
so frequent visitors do **not** keep it alive. For a site that is edited rarely and then
left alone, the database is the one component that cannot "sit in space" safely, and a
non-technical owner cannot revive a reaped DB. A Git-based CMS has no database and no
server, so there is nothing to pause, reap, or maintain.

## Architecture

The public site's runtime is unchanged: a **static Astro build on Netlify**, served from
CDN. We add only an editing layer that writes content back to the repo as files.

```
Editor (non-technical staff)
  → visits  yoursite.com/admin
  → logs in with the shared "TRG Editor" GitHub account
  → edits Projects / News / Team / Homepage in a form UI
  → uploads images via the Cloudinary widget
  → clicks Publish
        │ Sveltia commits the JSON change to GitHub (main branch)
        ▼
  GitHub push triggers a Netlify build (astro build)
        ▼
  Static site redeploys (~1 min) → changes are live
```

Properties:
- **Content = files in Git** — versioned, reversible, durable regardless of any service.
- **No new always-on infrastructure** — nothing to pause or reap during a year untouched.
- **`/admin` is static** — Sveltia is a single HTML page + a `config.yml`, bundled into
  the same Netlify deploy. The only server-side piece is a tiny stateless OAuth handler
  (Netlify Function) for GitHub login.

### CMS choice: Sveltia

Sveltia CMS (a modern, maintained, Decap/Netlify-CMS-compatible successor). Chosen over
Decap because it authenticates directly via GitHub OAuth and avoids the deprecated Netlify
Identity, while using the same `config.yml` format.

## Content model

Content is migrated from single JSON arrays to **one file per item** (folder collections),
which gives editors a clean "＋ New" button, auto-generated slugs, small readable diffs,
and eliminates the manual-ID collisions present in the current data.

### Projects — `src/data/projects/<slug>.json`

| Field | Type | Notes |
|---|---|---|
| `id` | hidden | Existing projects keep their current numeric id so **detail-page URLs (`/projects/<id>`) do not change**. New projects auto-fill id from slug. |
| `title` | text (required) | |
| `order` | number | **New.** Preserves the curated display order the single array provides today (folder collections otherwise lose ordering). Seeded from current positions. |
| `featured` | boolean | **New.** When true, the project is pulled to the **front** of the homepage "Project Highlights" carousel (featured projects first, then the rest, each group by `order`). Defaults to `false`. Does not affect the `/projects` page. |
| `category` | select | `multi-family` / `hospitality` / `industrial` / `mixed-use`. Adds the real **Mixed-Use** category (the filter button for it is currently broken). |
| `image` | Cloudinary image (required) | main / card / hero image |
| `carousel` | list of Cloudinary images | detail-page gallery |
| `stats` | list of `{ type, text }` | `type` is a **dropdown** driven by the stat-types config (see below). `text` is the value; for `status` and `projectType` the value is also a dropdown. Keeps the `{type, text}` shape so `ProjectStats` rendering is essentially unchanged. |

#### Stat types configuration (single source of truth)

Today the stat vocabulary is duplicated across three places that have already drifted:
the data, `getIcon`, and `getDisplayName` (whose `startYear`/`developmentBudget` cases
never fire because no other place uses those names). This work replaces that with **one
config module** (e.g. `src/config/statTypes.js`) listing each canonical stat as
`{ value, label, icon }`. `getIcon`, `getDisplayName`, and the CMS `type` dropdown all
derive from it, so the vocabulary can no longer drift.

Canonical stat types (label → stored `value`): Units → `units`, Keys → `keys`,
Square Feet → `squareFeet`, Year Completed → `yearCompleted`, Year Started → `yearStarted`,
Status → `status`, Type → `projectType`, Location → `location`. Notes:

- **`type` is renamed to `projectType`** (display label stays "Type"). Today a stat is
  literally `{ type: "type", text: "Ground Up" }` — the kind-key `type` whose value is
  `type`. Renaming removes that collision/confusion in code.
- **`status` value is a dropdown:** `Completed` / `Under Construction` (the data only ever
  holds "Completed" (31) and a lone "Construction").
- **`projectType` value is a dropdown** seeded from existing values (Self-Storage, Ground
  Up, Cross Dock, Value Add Remodel, Resort, Full Service, Extended Stay, Adaptive Reuse,
  Remodel + Ground Up) with a custom/"Other" escape hatch.
- The dead `getDisplayName` cases (`startYear`, `developmentBudget`) are removed; the
  `developmentBudget`/`developmentalBudget` mismatch between the two utils goes away.

### News — `src/data/news/<slug>.json`

Fields: `title`, `link` (the article href), `type` (select: `Article` / `Video`),
`description`, `image` (Cloudinary), `author` (name string), `date` (single date picker).
The two existing fields `date` (display string) and `datetime` (ISO) are collapsed into one
date value; the display string is formatted at build time. News is sorted newest-first
automatically — no `order` field needed.

### Team — `src/data/team/<slug>.json`

Fields: `name`, `title`, `headshot` (Cloudinary image), `linkedin`, `order` (preserve
display order), and `bio` as a **single rich-text field** replacing the rigid
`biop1`/`biop2`/`biop3` paragraph slots. The team component is updated to render the
single bio.

### Homepage — `src/data/homepage.json` (singleton file collection)

One "Homepage" screen in the CMS holding all editable homepage content:

- `heroSlides`: list of up to 3 `{ image (Cloudinary), label }`. `Hero.jsx` is refactored
  to read this instead of its three hardcoded image URLs and labels.
- `statCallouts`: the two headline figures currently hardcoded in `StatsSection.jsx` —
  each `{ number, label, image (Cloudinary) }` (e.g. `3547` / "Apartment Units" and `5.7`
  / "Million Industrial Square Feet"). `StatsSection.jsx` is refactored to read these, so
  both the **numbers/labels and the two images** become editable. (These figures currently
  duplicate the About text's stats — see below.)

### About — `src/data/about.json` (singleton file collection)

`aboutText`: a rich-text field for the "About Us" paragraph currently hardcoded at the top
of the Team page (`team.astro`). `team.astro` is refactored to read it. This is the
company description ("…second-generation family office… 3400+ multifamily units…").

## Migration & code changes (one-time)

A migration script, run once:
1. Split `projects.json` → 28 files in `src/data/projects/`, assigning `order` from
   current positions, preserving each `id`, and normalizing stat `type` values + casing
   (`Location`→`location`, `Ut`→`UT`, etc.).
2. Split `team.json` → `src/data/team/`, merging `biop1-3` into one `bio`, assigning `order`.
3. Split `news.json` → `src/data/news/`, mapping `category.name`→`type` and the two date
   fields → one ISO `date`.
4. Create `homepage.json` seeded with the Hero's current 3 images/labels **and** the two
   `statCallouts` (numbers/labels/images) from `StatsSection.jsx`.
5. Create `about.json` seeded with the current "About Us" paragraph from `team.astro`.
6. Set `featured: false` on all migrated projects (owner marks featured ones afterward in
   the CMS).
7. Delete the orphaned `other.json`.

Code touch-ups so pages read the new structure:
- Glob-import the folders instead of importing single JSON arrays; sort projects/team by
  `order`, news by `date`.
- **Homepage "Project Highlights" (`ProjectSection.jsx`): sort `featured` projects first,
  then the rest, each by `order`.**
- Refactor `Hero.jsx` and `StatsSection.jsx` to read `homepage.json`.
- Refactor `team.astro` to read `about.json` for the intro paragraph.
- Update the team component for the single `bio` field (drops the `biop1`–`biop4` props;
  `biop4` is already passed but doesn't exist in the data).
- Introduce `src/config/statTypes.js` as the single source of truth; derive `getIcon`,
  `getDisplayName`, and the CMS dropdown from it.
- Fix the `cateogry` typo in **both** `ProjectSection.jsx` and `AllProjects.jsx`, and the
  `AllProjects` Mixed-Use filter.

**The public output stays visually identical** — verified by comparing rendered pages
before/after migration.

## CMS setup, auth & images

- **Sveltia CMS** at `public/admin/` (`index.html` + `config.yml`). No app dependency
  added; served as a static page.
- **Auth:** GitHub OAuth. A small stateless **Netlify Function** performs the OAuth token
  exchange (standard ~30-line handler). Editors log in with the shared **TRG Editor**
  GitHub account, added as a collaborator on the repo.
- **Publishing:** direct commit to `main` (no PR/editorial-review workflow — too technical
  for the audience). Save = commit = auto-rebuild.
- **Images:** the Cloudinary media-library integration is configured in `config.yml` with
  the cloud name + an unsigned upload preset. Editors drag-drop or pick from the existing
  library; the resulting URL is written into the JSON, matching today's storage approach.

### Cloudinary configuration (one-time, by the site owner)

1. Copy **Cloud name** (`dgjw3jwe3`) and **API Key** from Dashboard → Account Details.
   These go in the public `config.yml`. The **API secret is never committed**.
2. Create an **unsigned upload preset** (Settings → Upload → Upload presets → Add,
   Signing Mode: Unsigned). Optionally set a folder (e.g. `images/Projects`) and a
   format/size limit. Record the preset name for `config.yml`.
3. Add the site domain (+ `localhost` for testing) to **Allowed origins** (Settings →
   Security), so the public key can only upload to this preset from this site.
4. Confirm the Media Library is enabled.

Values needed at wiring time: **API key** and **upload preset name**.

## Durability (the "untouched for a year" goal)

Content is plain JSON in Git, so it survives regardless of any service uptime or billing.
The accounts that must remain active for the site to keep running (documented in the
README): **domain registration, Netlify, GitHub, Cloudinary.** Recommend **autopay on the
domain** — a lapsed domain is the single thing that takes the whole site down, and no CMS
choice prevents that.

## Testing & verification

1. `astro build` succeeds after migration.
2. Rendered Projects, project detail, News, Team (incl. About paragraph), and Homepage
   (hero + stat callouts) pages match the pre-migration output (spot-check the built HTML
   diff). Confirm stat icons now render correctly (calendar/map-pin, not gear).
3. Mark a project `featured` and confirm it jumps to the front of the homepage carousel.
4. End-to-end CMS test: log in → edit a project → upload an image → publish → confirm the
   commit lands on `main` and Netlify redeploys with the change visible.

## Bugs found (to fix during this work)

- **Broken stat icons:** `getIcon` switches on `yearCompleted`/`yearStarted`/`location`,
  but data stores `"year Completed"`/`"year Started"`/`"Location"`, so those stats render a
  generic gear icon. Fixed by normalizing stat `type` values.
- **Stat vocabulary in 3 drifted places:** data vs `getIcon` vs `getDisplayName`.
  `getDisplayName`'s `startYear`/`developmentBudget` cases never fire, and the two utils
  disagree (`developmentBudget` vs `developmentalBudget`). Fixed by the single
  `statTypes.js` source of truth.
- **Mixed-Use filter:** in `AllProjects.jsx` the "Mixed-Use" button calls
  `setProjectCategory("hospitality")` (copy-paste error); there is no `mixed-use` category
  in the data. Fixed by adding the category and correcting the handler.
- **Typo:** "cateogry" in the empty-state text of **both** `AllProjects.jsx` and
  `ProjectSection.jsx`.
- **Casing drift:** `location` vs `Location`, `Salt Lake City, Ut` vs `UT`, etc.
- **Stale content hardcoded in two places:** the company headline stats appear both in
  `StatsSection.jsx` and the `team.astro` About paragraph. Both become editable (homepage
  `statCallouts` and `about.json`).
- **Data to verify (not a code bug):** `GLH Building I` has status "Completed" but
  `yearCompleted: 2026` — flag to the owner to confirm.
- **Optional:** `projects/[id].astro` uses `.filter(...).at(0)` where `.find(...)` is
  clearer (low priority).

## Out of scope (YAGNI)

- Give Back / Ritchie Foundation editing.
- Editorial review / draft workflow (direct publish is intentional).
- Per-editor accounts / audit trail (shared account is intentional).
- Astro / dependency version upgrades (not required to ship the portal; can be a later,
  separate effort).
