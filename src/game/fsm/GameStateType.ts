export const GAME_STATE_TYPE = {
    Active: "Active",
    Inactive: "Inactive",
    Paused: "Paused",
} as const;

export type GameStateType = typeof GAME_STATE_TYPE[keyof typeof GAME_STATE_TYPE];