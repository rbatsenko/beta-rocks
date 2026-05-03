export const ROCK_TYPES = [
  "granite",
  "sandstone",
  "limestone",
  "gneiss",
  "quartzite",
  "gritstone",
  "basalt",
  "volcanic",
  "conglomerate",
  "schist",
  "slate",
  "other",
] as const;

export type CragRockType = (typeof ROCK_TYPES)[number];
