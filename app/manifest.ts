export default function manifest() {
  return {
    id: "/",
    name: "Flashcards",
    short_name: "Flash",
    description: "Mobile-first spaced repetition flashcards",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#f6f7fb",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
