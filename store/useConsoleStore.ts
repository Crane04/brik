import { create } from "zustand";

export type GameName = "fighter" | "tetris" | "brick" | "snake" | "racing";

type GameScores = Record<GameName, number>;

type ConsoleStore = {
  selectedGame: GameName;
  activeGame: GameName | null;
  powered: boolean;
  soundOn: boolean;
  musicOn: boolean;
  highScores: GameScores;
  selectGame: (game: GameName) => void;
  openGame: (game: GameName) => void;
  closeGame: () => void;
  togglePower: () => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  recordScore: (game: GameName, score: number) => void;
};

const emptyScores: GameScores = {
  fighter: 0,
  tetris: 0,
  brick: 0,
  snake: 0,
  racing: 0,
};

export const useConsoleStore = create<ConsoleStore>((set) => ({
  selectedGame: "brick",
  activeGame: null,
  powered: true,
  soundOn: true,
  musicOn: true,
  highScores: emptyScores,
  selectGame: (selectedGame) => set({ selectedGame }),
  openGame: (activeGame) => set({ activeGame }),
  closeGame: () => set({ activeGame: null }),
  togglePower: () => set((state) => ({ powered: !state.powered })),
  toggleSound: () => set((state) => ({ soundOn: !state.soundOn })),
  toggleMusic: () => set((state) => ({ musicOn: !state.musicOn })),
  recordScore: (game, score) => set((state) => {
    if (score <= state.highScores[game]) return state;
    return { highScores: { ...state.highScores, [game]: score } };
  }),
}));
