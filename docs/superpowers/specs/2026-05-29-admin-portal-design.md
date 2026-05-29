# Admin Portal for Content Editing — Design Spec

**Date:** 2026-05-29
**Status:** Approved (design); pending implementation plan
**Site:** The Ritchie Group marketing/portfolio site (Astro 1.9 static, deployed on Netlify)

## Goal

Let non-technical staff edit site content — **Projects, News, Team, and the homepage
images** — through a friendly admin UI, without touching code or Git directly. The site
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
| `category` | select | `multi-family` / `hospitality` / `industrial` / `mixed-use`. Adds the real **Mixed-Use** category (the filter button for it is currently broken). |
| `image` | Cloudinary image (required) | main / card / hero image |
| `carousel` | list of Cloudinary images | detail-page gallery |
| `stats` | list of `{ type, text }` | `type` is a **dropdown of canonical values** (see below). `text` is the free value. Keeps the existing `{type, text}` shape so `ProjectStats` rendering is unchanged. |

Canonical stat `type` values (label → stored value): Units → `units`, Keys → `keys`,
Square Feet → `squareFeet`, Year Completed → `yearCompleted`, Year Started → `yearStarted`,
Status → `status`, Type → `type`, Location → `location`. These match what `getIcon`
already switches on, fixing icons that currently render as a generic gear (see Bugs).

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

`heroSlides`: a list of up to 3 `{ image (Cloudinary), label }`. `Hero.jsx` is refactored
to read this file instead of its three hardcoded image URLs and labels. During
implementation, audit the other homepage sections (`StatsSection`, etc.) for any other
hardcoded images; only the Hero has them as of this writing.

## Migration & code changes (one-time)

A migration script, run once:
1. Split `projects.json` → 28 files in `src/data/projects/`, assigning `order` from
   current positions, preserving each `id`, and normalizing stat `type` values + casing
   (`Location`→`location`, `Ut`→`UT`, etc.).
2. Split `team.json` → `src/data/team/`, merging `biop1-3` into one `bio`, assigning `order`.
3. Split `news.json` → `src/data/news/`, mapping `category.name`→`type` and the two date
   fields → one ISO `date`.
4. Create `homepage.json` seeded with the Hero's current 3 images/labels.
5. Delete the orphaned `other.json`.

Code touch-ups so pages read the new structure:
- Glob-import the folders instead of importing single JSON arrays; sort projects/team by
  `order`, news by `date`.
- Refactor `Hero.jsx` to read `homepage.json`.
- Update the team component for the single `bio` field.
- Fix the `AllProjects` Mixed-Use filter + `cateogry` typo.
- Extend `getDisplayName`/`getIcon` so canonical stat types get clean labels/icons.

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
2. Rendered Projects, project detail, News, Team, and Homepage pages match the
   pre-migration output (spot-check the built HTML diff).
3. End-to-end CMS test: log in → edit a project → upload an image → publish → confirm the
   commit lands on `main` and Netlify redeploys with the change visible.

## Bugs found (to fix during this work)

- **Broken stat icons:** `getIcon` switches on `yearCompleted`/`yearStarted`/`location`,
  but data stores `"year Completed"`/`"year Started"`/`"Location"`, so those stats render a
  generic gear icon. Fixed by normalizing stat `type` values.
- **Mixed-Use filter:** in `AllProjects.jsx` the "Mixed-Use" button calls
  `setProjectCategory("hospitality")` (copy-paste error); there is no `mixed-use` category
  in the data. Fixed by adding the category and correcting the handler.
- **Typo:** "cateogry" in `AllProjects.jsx` empty-state text.
- **Casing drift:** `location` vs `Location`, `Salt Lake City, Ut` vs `UT`, etc.
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
