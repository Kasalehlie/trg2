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
