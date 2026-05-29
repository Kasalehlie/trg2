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
