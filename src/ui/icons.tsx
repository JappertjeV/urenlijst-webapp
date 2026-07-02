export type IconName =
  | "vandaag"
  | "kalender"
  | "overzicht"
  | "instellingen"
  | "plus"
  | "chevron-links"
  | "chevron-rechts"
  | "kruis"
  | "potlood";

export function Icon({
  name,
  size = 24,
  strokeWidth = 1.9,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "vandaag":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      );
    case "kalender":
      return (
        <svg {...props}>
          <rect x="3" y="4.5" width="18" height="17" rx="3" />
          <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        </svg>
      );
    case "overzicht":
      return (
        <svg {...props}>
          <path d="M4 20V11M12 20V4M20 20v-6" />
          <path d="M2.5 20h19" />
        </svg>
      );
    case "instellingen":
      return (
        <svg {...props}>
          <path d="M5 21v-6M5 11V3M12 21v-9M12 8V3M19 21v-4M19 13V3" />
          <path d="M2.5 15h5M9.5 8h5M16.5 17h5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "chevron-links":
      return (
        <svg {...props}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      );
    case "chevron-rechts":
      return (
        <svg {...props}>
          <path d="M9 5l7 7-7 7" />
        </svg>
      );
    case "kruis":
      return (
        <svg {...props}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "potlood":
      return (
        <svg {...props}>
          <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19l-4 1z" />
        </svg>
      );
  }
}
