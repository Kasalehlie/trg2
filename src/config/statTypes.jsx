import {
  BuildingOfficeIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  HashtagIcon,
  MapPinIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline/esm/index";

export const STAT_TYPES = [
  { value: "units", label: "Units", icon: HashtagIcon },
  { value: "keys", label: "Keys", icon: HashtagIcon },
  { value: "squareFeet", label: "Square Feet", icon: Squares2X2Icon },
  { value: "yearCompleted", label: "Year Completed", icon: CalendarIcon },
  { value: "yearStarted", label: "Year Started", icon: CalendarIcon },
  { value: "status", label: "Status", icon: BuildingOfficeIcon },
  { value: "projectType", label: "Type", icon: ClipboardDocumentListIcon },
  { value: "location", label: "Location", icon: MapPinIcon },
  // Defensive alias for any legacy unmigrated data:
  { value: "type", label: "Type", icon: ClipboardDocumentListIcon },
];

export const statTypeByValue = Object.fromEntries(STAT_TYPES.map((t) => [t.value, t]));
