import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Urenlijst",
    short_name: "Urenlijst",
    description: "Uren bijhouden per werklocatie",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f2",
    theme_color: "#f7f6f2",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
