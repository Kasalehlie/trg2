import React from "react";
import { CogIcon } from "@heroicons/react/24/outline/esm/index";
import { statTypeByValue } from "../config/statTypes.jsx";

export const getIcon = (type: string) => {
  const Icon = statTypeByValue[type]?.icon ?? CogIcon;
  return <Icon />;
};
