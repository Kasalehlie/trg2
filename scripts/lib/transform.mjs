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
