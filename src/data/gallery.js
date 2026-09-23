/**
 * The gallery.
 *
 * Drop a photograph into src/public/gallery/ named as `file` below and the
 * tile becomes a real image — in the grid and in the lightbox. Until then the
 * tile renders as a labelled placeholder that says so; it never pretends to be
 * a photograph that does not exist.
 *
 * ratio — "portrait" | "landscape" | "square". Drives the masonry rhythm, so
 *         vary it; a grid where everything is the same shape reads as a table.
 * album — used by the filter chips on /gallery/.
 */

export const albums = [
  { id: "all", label: "All" },
  { id: "events", label: "Events" },
  { id: "workshops", label: "Workshops" },
  { id: "ideathon", label: "Ideathon" },
  { id: "nec", label: "NEC" },
  { id: "community", label: "Community" },
];

export const gallery = [
  { file: "bootcamp.jpg", caption: "Bootcamp ’26", album: "workshops", ratio: "landscape" },
  { file: "founders-on-campus.jpg", caption: "Founders on Campus", album: "events", ratio: "portrait" },
  { file: "ideathon.jpg", caption: "Ideathon finals", album: "ideathon", ratio: "landscape" },
  { file: "nec-kickoff.jpg", caption: "NEC kick-off", album: "nec", ratio: "square" },
  { file: "idea-clinic.jpg", caption: "Idea Clinic", album: "workshops", ratio: "portrait" },
  { file: "team-offsite.jpg", caption: "Team offsite", album: "community", ratio: "landscape" },
  { file: "workshop-series.jpg", caption: "Workshop series", album: "workshops", ratio: "square" },
  { file: "campus-drive.jpg", caption: "Campus drive", album: "nec", ratio: "portrait" },
];

export const galleryNote =
  "Photography goes in once the shared drive is set up. Tiles without an image are labelled placeholders.";
