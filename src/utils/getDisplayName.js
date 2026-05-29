import { statTypeByValue } from "../config/statTypes.jsx";

export default function getDisplayName(name) {
  return statTypeByValue[name]?.label ?? name;
}
