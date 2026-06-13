export const GAME_MODES = [
  { id: "open-world", label: "Open World" },
  { id: "hunted", label: "Hunted" },
] as const;

export type GameModeId = (typeof GAME_MODES)[number]["id"];
