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
    "The Ritchie Group (TRG) is a second-generation family office, based in Salt Lake City, Utah, that has owned and developed real estate for over 40 years. TRG's primary focus is on multifamily, self-storage, industrial, and hospitality real estate development projects. TRG has a development queue of 3400+ multifamily units, 400+ keys of hospitality, and 4.4M SF of industrial warehouse at various stages of design and development.",
};
writeFileSync(join(dataDir, "about.json"), JSON.stringify(about, null, 2) + "\n");
console.log("Wrote src/data/about.json");

// Remove orphaned file
const other = join(dataDir, "other.json");
if (existsSync(other)) {
  rmSync(other);
  console.log("Deleted src/data/other.json");
}
