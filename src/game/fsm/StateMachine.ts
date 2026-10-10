import type {IState} from "@/game/fsm/IState.ts";
import {type PlayerStateType} from "@/game/fsm/PlayerStateType.ts";
import type GamePhysics from "@/game/GamePhysics.ts";

// type StateParams = Record<PlayerStateType, IState>;

export default class StateMachine{
    private currentState?: IState;
    private currentStateName?: PlayerStateType;
    private states: Partial<Record<PlayerStateType, IState>> = {};
    // private playerStates: Record<PlayerStateType, IState>;
    // private playerStates: StateParams;
    // Ok het idee is om een generieke statemachine te maken
    // Bij het instanteren van de class geef je als parameter mee welke set van playerStates je wil gebruiken
    //
    // constructor(stateGroup: PlayerStateType) {
    //     this.addState(PLAYER_STATE_TYPE.Idle, )
    // }

    public addState(type: PlayerStateType, state: IState){
        // if(type in this.playerStates) return;

        this.states[type] = state;
    }

    public changeState(newState:PlayerStateType, gamePhysics: GamePhysics){
        const state = this.states[newState];
        if(this.isOnState(newState) || !state) return;

        this.currentState?.exit();

        this.currentState = state;
        this.currentStateName = newState;

        this.currentState.enter(gamePhysics);
    }

    public update() {
        if(this.currentState != null) this.currentState.execute();
    }

    public isOnState(stateName: string){
        return stateName == this.currentStateName;
    }
}