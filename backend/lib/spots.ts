import type { Campus } from "./types";

/**
 * Meetup spots per campus. Edit freely: add or remove a string and it shows
 * up in the app. Keep them public, easy to find, and free to be in.
 */
export const SPOTS: Record<Campus, string[]> = {
  Burnaby: [
    "AQ pond (Academic Quadrangle)",
    "Convocation Mall steps",
    "Student Union Building (SUB)",
    "Bennett Library entrance",
    "Dining Commons",
    "West Mall Centre atrium",
    "Cornerstone, by the bus loop",
  ],
  Surrey: [
    "SFU Surrey mezzanine",
    "Central City food court",
    "Surrey campus library entrance",
    "Civic Plaza",
    "Engineering building atrium",
  ],
  Vancouver: [
    "Harbour Centre lobby",
    "Belzberg Library entrance",
    "Goldcorp Centre atrium",
    "Segal Building lobby",
    "Waterfront Station plaza",
  ],
};

/** Which campus a spot belongs to, or null for an unknown spot. */
export function campusOfSpot(spot: string): Campus | null {
  for (const campus of Object.keys(SPOTS) as Campus[]) {
    if (SPOTS[campus].includes(spot)) return campus;
  }
  return null;
}
