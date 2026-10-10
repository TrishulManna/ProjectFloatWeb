import type {IState} from "@/game/fsm/IState.ts";
import type GamePhysics from "@/game/GamePhysics.ts";

export default class IdleState implements IState{
    private gamePhysics?: GamePhysics;

    enter(gamePhysics: GamePhysics) {
        // this.gamePhysics = gamePhysics;
        //
        // this.gamePhysics?.idle();
        console.log('entering Idle')
    }
    execute() {
        console.log('executing Idle')
    }
    exit() {
        console.log('exiting Idle')
    }
}