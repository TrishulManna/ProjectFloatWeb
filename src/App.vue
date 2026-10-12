<script setup lang="ts">
import * as THREE from 'three'
import {reactive, ref, useTemplateRef} from 'vue'
import * as RAPIER from "@dimforge/rapier3d-compat";
import Menu from "@/components/Menu.vue";
import GameRenderer from "@/game/GameRenderer.ts"
import GamePhysics from "@/game/GamePhysics.ts";
import StateMachine from "@/game/fsm/StateMachine.ts";
import RapierDebugRenderer from "@/game/helpers/RapierDebugRenderer.ts";

import {PLAYER_STATE_TYPE} from "@/game/fsm/PlayerStateType.ts";
import IdleState from "@/game/fsm/playerStates/idleState.ts";
import MoveState from "@/game/fsm/playerStates/moveState.ts";
import JumpState from "@/game/fsm/playerStates/jumpState.ts";

import {GAME_STATE_TYPE} from "@/game/fsm/GameStateType.ts";
import InactiveState from "@/game/fsm/gameStates/inactiveState.ts";
import PausedState from "@/game/fsm/gameStates/pausedState.ts";
import ActiveState from "@/game/fsm/gameStates/activeState.ts";

// Vue.js
const gameCanvas = useTemplateRef('gameCanvas');

//Three.js
let gameRenderer: GameRenderer;

// Rapier
let gamePhysics: GamePhysics;
let debugRenderer: RapierDebugRenderer;

let playerStateMachine: StateMachine;
const gameStateMachine = reactive(new StateMachine());

gameStateMachine.addState(GAME_STATE_TYPE.Inactive, new InactiveState());
gameStateMachine.addState(GAME_STATE_TYPE.Active, new ActiveState());
gameStateMachine.addState(GAME_STATE_TYPE.Paused, new PausedState());
gameStateMachine.changeState(GAME_STATE_TYPE.Inactive);

function initializeThree() {
  gameRenderer = new GameRenderer(gameCanvas.value!);
  gameRenderer.renderer.setAnimationLoop( animate );

  onWindowResize();

  // Movement input
  window.addEventListener( 'keydown', onKeydown)
  window.addEventListener( 'keyup', onKeyUp);
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', pauseGame)

  // Hides the pointer
  if(gameCanvas.value) {
    gameCanvas.value.addEventListener( 'click', onMouseClick);
  }
}

async function initializePhysics() {
  // Rapier is a WebAssembly module, it has to be loaded asynchronously
  // Don’t continue until Rapier’s actual physics engine is ready
  await RAPIER.init();
  gamePhysics = new GamePhysics();

  //Add both worlds to the debugger
  debugRenderer = new RapierDebugRenderer(gameRenderer.scene, gamePhysics.world);

  //Initial start of the player state
  playerStateMachine.changeState(PLAYER_STATE_TYPE.Idle, gamePhysics);
}

function animate(){
  gameRenderer.renderer.render( gameRenderer.scene, gameRenderer.camera );

  if(gamePhysics && !gameStateMachine.isOnState(GAME_STATE_TYPE.Paused) ) {
    const deltaTime = 1 /60;
    const speed = 2.5 * deltaTime;
    const rotation = gamePhysics.characterRigidBody.rotation();
    const quaternion = new THREE.Quaternion(
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w
    );

    if((gamePhysics.movement.x !== 0 || gamePhysics.movement.z !== 0) && gamePhysics.verticalVelocity === 0){
      playerStateMachine.changeState(PLAYER_STATE_TYPE.Move, gamePhysics);
    }

    if(gamePhysics.verticalVelocity !== 0){
      playerStateMachine.changeState(PLAYER_STATE_TYPE.Jump, gamePhysics);
    }

    if(gamePhysics.movement.x === 0 && gamePhysics.verticalVelocity === 0 && gamePhysics.movement.z === 0){
      playerStateMachine.changeState(PLAYER_STATE_TYPE.Idle, gamePhysics);
    }

    // Apply gravity
    gamePhysics.verticalVelocity += gamePhysics.gravity * deltaTime;


    // Character movement
    // Currently only converting to a THREE vector3 and back to Rapier to use the two threejs native functions
    const localMove = new THREE.Vector3(gamePhysics.movement.x, gamePhysics.movement.y, gamePhysics.movement.z);
    localMove.applyQuaternion(quaternion);
    localMove.multiplyScalar(speed);

    const moveVector = new RAPIER.Vector3(
        localMove.x,
        gamePhysics.verticalVelocity * deltaTime,
        localMove.z
    );

    gamePhysics.characterController.computeColliderMovement(
        gamePhysics.characterCollider,
        moveVector,
        undefined,
        undefined,
        (collider) => !collider.isSensor()
    );

    gamePhysics.grounded = gamePhysics.characterController.computedGrounded();
    // Do not apply / accumulate gravity when grounded
    if(gamePhysics.grounded && gamePhysics.verticalVelocity < 0) {
      gamePhysics.verticalVelocity = 0;
    }

    // Read the result
    const translation = gamePhysics.characterController.computedMovement();
    const position = gamePhysics.characterRigidBody.translation();

    const nextPosition = {
      x: position.x + translation.x,
      y: position.y + translation.y,
      z: position.z + translation.z
    };

    gamePhysics.characterRigidBody.setNextKinematicTranslation(nextPosition);

    // Sync three.js mesh with rapier collider
    gameRenderer.player.position.set(position.x, position.y, position.z);
    gameRenderer.camera.position.set(position.x, position.y + 0.5, position.z);

    //DEBUG
    debugRenderer.update();

    gamePhysics.world.step(gamePhysics.eventQueue);
    if(gamePhysics.eventQueue) gamePhysics.eventQueue.drainCollisionEvents((collider1: number, collider2: number) => {
      const playerHandle = gamePhysics.characterCollider.handle;
      const finishHandle = gamePhysics.finishPoint.handle;
      const playerTouchedFinish = (collider1 === playerHandle && collider2 === finishHandle) || (collider1 === finishHandle && collider2 === playerHandle)

      if (playerTouchedFinish) {
        destroyGame();
      }
    })

  }
  gameRenderer.stats.update();

  playerStateMachine.update();
}

function startGame(){
  initializeThree();
  initializePhysics();

  playerStateMachine = new StateMachine();
  playerStateMachine.addState(PLAYER_STATE_TYPE.Idle, new IdleState());
  playerStateMachine.addState(PLAYER_STATE_TYPE.Move, new MoveState());
  playerStateMachine.addState(PLAYER_STATE_TYPE.Jump, new JumpState());

  gameStateMachine.changeState(GAME_STATE_TYPE.Active);
}

function pauseGame(){
  if(!document.pointerLockElement){
    gameStateMachine.changeState(GAME_STATE_TYPE.Paused);
  }
}

function resumeGame(){
  gameStateMachine.changeState(GAME_STATE_TYPE.Active);
}

function resetGame(){
  destroyGame();
  startGame();
}

function destroyGame(){
  gameStateMachine.changeState(GAME_STATE_TYPE.Inactive);

  gameRenderer.renderer.setAnimationLoop(null);

  window.removeEventListener( 'keydown', onKeydown)
  window.removeEventListener( 'keyup', onKeyUp);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('pointerlockchange', pauseGame);
  window.removeEventListener('click', onMouseClick);

  gamePhysics.world.free();

  gameRenderer.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  });
  gameRenderer.scene.clear();

  gameRenderer.renderer.dispose();
  gameRenderer.camera.clear();

  gamePhysics.eventQueue?.free();

}

// three.js init
function onMouseMove(event: MouseEvent) {
  if (!gameRenderer.controls.isLocked) return;

  gameRenderer.yaw -= event.movementX * 0.002;

  const rotation = new THREE.Quaternion();

  rotation.setFromEuler(
      new THREE.Euler(0, gameRenderer.yaw, 0)
  );

  gamePhysics.characterRigidBody.setNextKinematicRotation({
    x: rotation.x,
    y: rotation.y,
    z: rotation.z,
    w: rotation.w
  });
}

// three.js init
function onWindowResize() {
  gameRenderer.camera.aspect = window.innerWidth / window.innerHeight;
  gameRenderer.camera.updateProjectionMatrix();

  gameRenderer.renderer.setSize( window.innerWidth, window.innerHeight );
}

// three.js init
function onKeydown(event: KeyboardEvent) {
  if ( event.key === 'w' || event.key === 'ArrowUp' ) gamePhysics.movement.z = -1;
  if ( event.key === 's' || event.key === 'ArrowDown' ) gamePhysics.movement.z = 1;
  if ( event.key === 'a' || event.key === 'ArrowLeft' ) gamePhysics.movement.x = -1;
  if ( event.key === 'd' || event.key === 'ArrowRight' ) gamePhysics.movement.x = 1;
  if ( event.key === ' ' && gamePhysics.grounded) gamePhysics.verticalVelocity = 8;
}

// three.js init
function onKeyUp(event: KeyboardEvent){
  if ( event.key === 'w' || event.key === 's' || event.key === 'ArrowUp' || event.key === 'ArrowDown' ) gamePhysics.movement.z = 0;
  if ( event.key === 'a' || event.key === 'd' || event.key === 'ArrowLeft' || event.key === 'ArrowRight' ) gamePhysics.movement.x = 0;
}

// three.js init
function onMouseClick(){
  gameRenderer.controls.lock();
}

</script>

<template>
  <Menu
    :is-paused="gameStateMachine.isOnState(GAME_STATE_TYPE.Paused)"
    :show-menu="gameStateMachine.isOnState(GAME_STATE_TYPE.Inactive)"
    @start="startGame()"
    @resume="resumeGame()"
    @destroy="destroyGame()"
    @reset="resetGame()"
  />
  <div class="gameContainer">
    <canvas ref="gameCanvas"></canvas>
  </div>

</template>

<style scoped>
.gameContainer{
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
