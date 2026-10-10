import type {IState} from "@/game/fsm/IState.ts";

export default class MoveState implements IState{
    enter() {
        console.log('entering MoveState')
    }
    execute() {
        console.log('executing MoveState')
    }
    exit() {
        console.log('exiting MoveState')
    }
}