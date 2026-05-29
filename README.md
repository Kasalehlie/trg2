# The Ritchie Group — Website

Static [Astro](https://astro.build) site for The Ritchie Group, deployed on Netlify.
Content (projects, news, team, homepage images) is edited through an admin portal
and stored as JSON files in this repo.

## How content updates work

Editors do **not** need to touch code. The flow:

```
Editor → yoursite.com/admin  (log in with the shared "TRG Editor" GitHub account)
       → edit Projects / News / Team / Homepage in a form UI
       → upload images via the Cloudinary widget
       → click Publish
            │  the CMS commits the JSON change to GitHub (main branch)
            ▼
       GitHub push triggers a Netlify build (astro build)
            ▼
       Static site redeploys (~1 min) → changes are live
```

- **Content lives as files in Git** — versioned, reversible, and durable. Every edit is a normal commit.
- **No database, no server** — the public site is static files on Netlify's CDN.
- **Images** are hosted on Cloudinary (cloud `dgjw3jwe3`); the CMS stores their URLs in the JSON.
- **Data location:** `src/data/projects/`, `src/data/news/`, `src/data/team/` (one file per item),
  plus a homepage settings file. The admin UI is at `/admin`.

### Accounts that must stay alive (autopay/keep-alive)

For the site to keep running unattended: the **domain registration**, **Netlify account**,
**GitHub account/repo**, and **Cloudinary account** must all remain active.


## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Card.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                             |
| :--------------------- | :------------------------------------------------- |
| `npm install`          | Installs dependencies                              |
| `npm run dev`          | Starts local dev server at `localhost:3000`        |
| `npm run build`        | Build your production site to `./dist/`            |
| `npm run preview`      | Preview your build locally, before deploying       |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro preview` |
| `npm run astro --help` | Get help using the Astro CLI                       |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
