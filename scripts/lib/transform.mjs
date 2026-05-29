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
