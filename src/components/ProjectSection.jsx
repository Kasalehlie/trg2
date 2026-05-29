import React, { useState, useRef, useEffect } from "react";
import { projects, sortFeaturedFirst } from "../utils/content.js";
import ProjectCard from "./ProjectCard";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline/esm/index";

export default function ProjectSection() {
  const [currentProjects, setCurrentProjects] = useState(sortFeaturedFirst(projects));
  const containerRef = useRef(null);

  const [state, setState] = useState({
    scroller: null,
    itemWidth: 0,
    isPrevHidden: true,
    isNextHidden: false,
  });

  const next = () => {
    state.scroller.scrollBy({
      left: state.itemWidth * 3,
      top: 0,
      behavior: "smooth",
    });

    // Hide if is the last item
    setState({ ...state, isNextHidden: true, isPrevHidden: false });
  };

  const prev = () => {
    state.scroller.scrollBy({
      left: -state.itemWidth * 3,
      top: 0,
      behavior: "smooth",
    });
    setState({ ...state, isNextHidden: false, isPrevHidden: true });
    // Hide if is the last item
    // Show remaining
  };

  useEffect(() => {
    const items = containerRef.current.childNodes;
    const scroller = containerRef.current;
    const itemWidth = containerRef.current.firstElementChild?.clientWidth;

    setState({ ...state, scroller, itemWidth });

    return () => {};
  }, [currentProjects]);

  const setProjectCategory = (category) => {
    setCurrentProjects(
      sortFeaturedFirst(projects.filter((project) => project.category === category))
    );
  };

  return (
    <div className="px-4 max-w-5xl 2xl:max-w-7xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Project Highlights</h1>
      <ul className="italic flex gap-6 mb-1">
        <li>
          <button onClick={() => setCurrentProjects(sortFeaturedFirst(projects))}>All</button>
        </li>
        <li>
          <button onClick={() => setProjectCategory("multi-family")}>
            Multi-Family
          </button>
        </li>
        <li>
          <button onClick={() => setProjectCategory("industrial")}>
            Industrial
          </button>
        </li>
        <li>
          <button onClick={() => setProjectCategory("hospitality")}>
            Hospitality
          </button>
        </li>
      </ul>
      {currentProjects.length === 0 && (
        <p className="text-center text-xl font-bold py-2">
          There are no projects with this category.
        </p>
      )}
      <div className="relative w-full h-96 mb-12">
        <div
          className="relative w-full flex gap-6 snap-x snap-mandatory overflow-x-scroll overflow-y-hidden no-scrollbar"
          ref={containerRef}
        >
          {currentProjects.map((project) => (
            <div className="w-full md:w-1/3 flex-shrink-0 snap-start snap-always" key={project.id}>
              <ProjectCard
                key={project.id}
                title={project.title}
                image={project.image}
                id={project.id}
              />
            </div>
          ))}
        </div>
        <button
          onClick={prev}
          className="absolute left-0 top-0 bottom-0 my-auto z-40"
        >
          <ChevronLeftIcon className="w-14 h-14" />
        </button>
        <button
          onClick={next}
          className="absolute right-0 top-0 bottom-0 my-auto z-40"
        >
          <ChevronRightIcon className="w-14 h-14" />
        </button>
      </div>
      <div className="text-center">
        <a
          className="text-gray-200 bg-gray-600 hover:bg-gray-700 px-4 py-2 inline-block"
          href="/projects"
        >
          View All Projects
        </a>
      </div>
    </div>
  );
}
