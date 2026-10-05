<script setup lang="ts">
import * as THREE from 'three'
import { ref, useTemplateRef} from 'vue'
import type { EventQueue, KinematicCharacterController} from "@dimforge/rapier3d-compat";
import RAPIER from "@dimforge/rapier3d-compat";
import Menu from "@/components/Menu.vue";
import GameRenderer from "@/game/GameRenderer.ts"

// Vue.js
const gameCanvas = useTemplateRef('gameCanvas');
const showMenu = ref(true);
const isPaused = ref(false);

//Three.js
let gameRenderer: GameRenderer;

// Rapier
let world: RAPIER.World;
let characterController: KinematicCharacterController;
let debugRenderer: RapierDebugRenderer;
let gravity = -9.81;
let verticalVelocity = 0;
let eventQueue: EventQueue | undefined;
let playerHandle: number;
let finishHandle: number;

async function initializeThree() {
  gameRenderer = new GameRenderer(gameCanvas.value!);
  gameRenderer.renderer.setAnimationLoop( animate );

  await initializePhysics();

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
  // This Vector indicates a constant force on the rigid body inside the world, pushing towards the negative y-axis.
  let gravity = { x: 0.0, y: -9.81, z: 0.0 };
  await RAPIER.init();
  world = new RAPIER.World(gravity);

  addCharacterController();
  addFloor();
  addBlocks();

  //Add both worlds to the debugger
  debugRenderer = new RapierDebugRenderer(gameRenderer.scene, world);
}

function addCharacterController() {
  // Rapier Character Capsule
  characterController = world.createCharacterController(0.01);
  characterController.setApplyImpulsesToDynamicBodies(true);
  characterController.setCharacterMass(3);
  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
  const rigidBody = world.createRigidBody(rigidBodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0);
  const collider = world.createCollider(colliderDesc, rigidBody);

  // Save Rapier pointers in the Three.js player object
  gameRenderer.player.userData.rigidBody = rigidBody;
  gameRenderer.player.userData.collider = collider;
  playerHandle = gameRenderer.player.userData.collider.handle;
}

function addFloor() {
  // Rapier
  const colliderDesc = RAPIER.ColliderDesc.cuboid(10,0.1,10);
  world.createCollider(colliderDesc);
}

function addBlocks() {
  // Rapier
  const finishPointDesc = RAPIER.ColliderDesc
      .cylinder(5,1)
      .setTranslation(0, 8.5, -12)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
      .setActiveCollisionTypes(
        RAPIER.ActiveCollisionTypes.DEFAULT |
        RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED
      );

  const finishPoint = world.createCollider(finishPointDesc);

  const platformColliders = [
    RAPIER.ColliderDesc.cuboid(1,0.5,1).setTranslation(0, 0, -2),
    RAPIER.ColliderDesc.cuboid(1,0.5,1).setTranslation(0, 1, -5),
    RAPIER.ColliderDesc.cuboid(1,0.5,1).setTranslation(0, 2, -8),
    RAPIER.ColliderDesc.cuboid(4,0.5,2).setTranslation(0, 3, -12),
  ];

  platformColliders.forEach((el) => world.createCollider(el))

  finishHandle = finishPoint.handle;
  eventQueue = new RAPIER.EventQueue(true);
}

function animate(){
  gameRenderer.renderer.render( gameRenderer.scene, gameRenderer.camera );

  if(world && characterController && !isPaused.value ) {
    const deltaTime = 1 /60;
    // Character movement
    const speed = 2.5 * deltaTime;
    const localMove = new THREE.Vector3(gameRenderer.movement.x, gameRenderer.movement.y, gameRenderer.movement.z);
    const rotation = gameRenderer.player.userData.rigidBody.rotation();
    const quaternion = new THREE.Quaternion(
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w
    );

    localMove.applyQuaternion(quaternion);
    localMove.multiplyScalar(speed);

    // Apply gravity
    verticalVelocity += gravity * deltaTime

    const moveVector = new RAPIER.Vector3(
        localMove.x,
        verticalVelocity * deltaTime,
        localMove.z
    );

    characterController.computeColliderMovement(
        gameRenderer.player.userData.collider,
        moveVector,
        undefined,
        undefined,
        (collider) => !collider.isSensor()
    );

    const grounded = characterController.computedGrounded();
    // Do not apply / accumulate gravity when grounded
    if(grounded && verticalVelocity < 0) {
      verticalVelocity = 0;
    }

    // Read the result
    const translation = characterController.computedMovement();
    const position = gameRenderer.player.userData.rigidBody.translation();

    const nextPosition = {
      x: position.x + translation.x,
      y: position.y + translation.y,
      z: position.z + translation.z
    };

    gameRenderer.player.userData.rigidBody.setNextKinematicTranslation(nextPosition);

    // Sync three.js mesh with rapier collider
    gameRenderer.player.position.set(position.x, position.y, position.z);
    gameRenderer.camera.position.set(position.x, position.y + 0.5, position.z);

    //DEBUG
    debugRenderer.update();

    world.step(eventQueue);
    if(eventQueue) eventQueue.drainCollisionEvents((collider1, collider2) => {
      const playerTouchedFinish = (collider1 === playerHandle && collider2 === finishHandle) || (collider1 === finishHandle && collider2 === playerHandle)
      if (playerTouchedFinish) {
        destroyGame();
      }
    })

  }
  gameRenderer.stats.update();
}

function startGame(){
  showMenu.value = false;
  initializeThree();
}

function pauseGame(){
  if(!document.pointerLockElement){
    isPaused.value = true;
  }
}

function resumeGame(){
    isPaused.value = false;
}

function resetGame(){
  destroyGame();
  startGame();
}

function destroyGame(){
  showMenu.value = true;

  gameRenderer.renderer.setAnimationLoop(null);

  window.removeEventListener( 'keydown', onKeydown)
  window.removeEventListener( 'keyup', onKeyUp);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('pointerlockchange', pauseGame);
  window.removeEventListener('click', onMouseClick);

  world.free();

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

  eventQueue?.free();

  isPaused.value = false;
}

// Standalone class for rapier
class RapierDebugRenderer {
  private readonly mesh: THREE.LineSegments

  constructor(
      scene: THREE.Scene,
      private world: RAPIER.World
  ) {

    const geometry = new THREE.BufferGeometry()
    const material = new THREE.LineBasicMaterial({
      vertexColors: true
    })

    this.mesh = new THREE.LineSegments(geometry, material)
    this.mesh.frustumCulled = false
    scene.add(this.mesh)

  }

  update() {
    const { vertices, colors } = this.world.debugRender()
    this.mesh.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(vertices, 3)
    )

    this.mesh.geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 4)
    )
  }

}

// three.js init
function onMouseMove(event: MouseEvent) {
  if (!gameRenderer.controls.isLocked) return;

  gameRenderer.yaw -= event.movementX * 0.002;

  const rotation = new THREE.Quaternion();

  rotation.setFromEuler(
      new THREE.Euler(0, gameRenderer.yaw, 0)
  );

  gameRenderer.player.userData.rigidBody.setNextKinematicRotation({
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
  if ( event.key === 'w' || event.key === 'ArrowUp' ) gameRenderer.movement.setZ(-1);
  if ( event.key === 's' || event.key === 'ArrowDown' ) gameRenderer.movement.setZ(1);
  if ( event.key === 'a' || event.key === 'ArrowLeft' ) gameRenderer.movement.setX(-1);
  if ( event.key === 'd' || event.key === 'ArrowRight' ) gameRenderer.movement.setX(1);
  if ( event.key === ' ') verticalVelocity = 8;
}

// three.js init
function onKeyUp(event: KeyboardEvent){
  if ( event.key === 'w' || event.key === 's' || event.key === 'ArrowUp' || event.key === 'ArrowDown' ) gameRenderer.movement.setZ(0);
  if ( event.key === 'a' || event.key === 'd' || event.key === 'ArrowLeft' || event.key === 'ArrowRight' ) gameRenderer.movement.setX(0);
}

// three.js init
function onMouseClick(){
  gameRenderer.controls.lock();
}

</script>

<template>
  <Menu
    :is-paused="isPaused"
    :show-menu="showMenu"
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
