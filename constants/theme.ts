export const THEME = {
  // LCD screen colors -- classic green-grey brick game feel
  screenBg: "#1a2a1a",
  screenGrid: "#1e2e1e",
  pixelOff: "#2a3a2a",
  pixelOn: "#a8c060",
  pixelGhost: "#4a6a2a",
  pixelDark: "#607830",

  // Shell colors
  shellBg: "#2a2a3a",
  shellAccent: "#f5a623",
  shellText: "#e8e6df",
  shellMuted: "#6b6b78",
  shellBorder: "#3a3a4a",

  // Game specific
  danger: "#c84848",
  white: "#e8e6df",
};

export const GRID = {
  COLS: 10,
  ROWS: 20,
  CELL: 28, // px per cell on screen
};

export const SPEEDS = {
  tetris: [800, 700, 600, 500, 400, 300, 200, 150, 100, 80],
  snake: 150,
  invaders: 600,
  mole: 1000,
};
