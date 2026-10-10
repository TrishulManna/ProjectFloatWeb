import type {IState} from "@/game/fsm/IState.ts";

export default class JumpState implements IState{
    enter() {
        console.log('entering JumpState')
    }
    execute() {
        console.log('executing JumpState')
    }
    exit() {
        console.log('exiting JumpState')
    }
}