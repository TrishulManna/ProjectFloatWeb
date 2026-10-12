import type {IState} from "@/game/fsm/IState.ts";
import {type PlayerStateType} from "@/game/fsm/PlayerStateType.ts";
import type GamePhysics from "@/game/GamePhysics.ts";
import type {GameStateType} from "@/game/fsm/GameStateType.ts";

type StateMachineTypes = PlayerStateType | GameStateType;

export default class StateMachine{
    private currentState?: IState;
    private currentStateName?: StateMachineTypes;
    private states: Partial<Record<StateMachineTypes, IState>> = {};

    public addState(type: StateMachineTypes, state: IState){
        this.states[type] = state;
    }

    public changeState(newState:StateMachineTypes, gamePhysics?: GamePhysics){
        const state = this.states[newState];
        if(this.isOnState(newState) || !state) return;

        this.currentState?.exit();

        this.currentState = state;
        this.currentStateName = newState;

        this.currentState.enter(gamePhysics);
        // debugger;
    }

    public update() {
        if(this.currentState != null) this.currentState.execute();
    }

    public isOnState(stateName: string){
        return stateName == this.currentStateName;
    }
}