import { sortByOrder, sortFeaturedFirst, formatNewsDate, toParagraphs } from "./contentHelpers.js";

const projectModules = import.meta.glob("../data/projects/*.json", { eager: true });
const teamModules = import.meta.glob("../data/team/*.json", { eager: true });
const newsModules = import.meta.glob("../data/news/*.json", { eager: true });

const values = (modules) => Object.values(modules).map((m) => m.default);

export const projects = values(projectModules).sort(sortByOrder);
export const team = values(teamModules).sort(sortByOrder);
export const news = values(newsModules).sort((a, b) => new Date(b.date) - new Date(a.date));

export { sortFeaturedFirst, formatNewsDate, toParagraphs };
