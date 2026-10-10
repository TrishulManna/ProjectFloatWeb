export const PLAYER_STATE_TYPE = {
    Idle: "Idle",
    Move: "Move",
    Jump: "Jump"
} as const;

export type PlayerStateType = typeof PLAYER_STATE_TYPE[keyof typeof PLAYER_STATE_TYPE];