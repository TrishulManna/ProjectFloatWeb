import type GamePhysics from "@/game/GamePhysics.ts";

export interface IState {
    enter(gamePhysics: GamePhysics): void;
    execute(): void;
    exit(): void;
}