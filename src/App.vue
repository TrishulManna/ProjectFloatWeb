<script setup lang="ts">
import * as THREE from 'three'
import {ref, useTemplateRef} from 'vue'
import {PointerLockControls} from 'three/examples/jsm/Addons.js'
import Stats from "three/examples/jsm/libs/stats.module.js";
import type { EventQueue, KinematicCharacterController} from "@dimforge/rapier3d-compat";
import RAPIER from "@dimforge/rapier3d-compat";

// Vue.js
const gameCanvas = useTemplateRef('gameCanvas');
const showMenu = ref(true);
const isPaused = ref(false);

//Three.js
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let stats: Stats;
let controls: PointerLockControls;
let yaw = 0;
let player: THREE.Object3D<THREE.Object3DEventMap>;


// Rapier
let world: RAPIER.World;
let characterController: KinematicCharacterController;
let debugRenderer: RapierDebugRenderer;
let gravity = -9.81;
let verticalVelocity = 0;
let movement = new THREE.Vector3();
let eventQueue: EventQueue | undefined;
let playerHandle: number;
let finishHandle: number;

async function initializeThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100 );
  camera.position.y = 1.5;

  const ambient = new THREE.HemisphereLight(0x555555, 0xFFFFFF );

  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xffffff,4 );

  light.position.set(0, 12.5, 12.5 );
  light.castShadow = true;
  light.shadow.radius = 3;
  light.shadow.blurSamples = 8;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;

  const size = 10;
  light.shadow.camera.left = - size;
  light.shadow.camera.bottom = - size;
  light.shadow.camera.right = size;
  light.shadow.camera.top = size;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 50;

  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true, canvas: gameCanvas.value! });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.setAnimationLoop( animate );

  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.object);

  stats = new Stats();

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
  let gravity = { x: 0.0, y: -9.81, z: 0.0 };
  await RAPIER.init();
  world = new RAPIER.World(gravity);

  // addBody();
  addCharacterController();
  addFloor();
  addBlocks();

  //Add both worlds to the debugger
  debugRenderer = new RapierDebugRenderer(scene, world);
}

function addCharacterController() {
  // Three.js Character Capsule
  const geometry = new THREE.CapsuleGeometry(0.3, 1, 8, 8);
  const material = new THREE.MeshStandardMaterial( { color: 0xFFFFFF } );
  player = new THREE.Mesh(geometry, material);
  player.castShadow = true;
  player.position.set(0, 0.8, 0);
  scene.add(player);

  // Rapier Character Capsule
  characterController = world.createCharacterController(0.01);
  characterController.setApplyImpulsesToDynamicBodies(true);
  characterController.setCharacterMass(3);
  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
  const rigidBody = world.createRigidBody(rigidBodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0);
  const collider = world.createCollider(colliderDesc, rigidBody);

  player.userData.rigidBody = rigidBody;
  player.userData.collider = collider;
  playerHandle = player.userData.collider.handle;
}

function addFloor() {
  // Three.js
  const geometry = new THREE.BoxGeometry(20, 0.2, 20 );
  const material = new THREE.MeshStandardMaterial( { color: 0xFFFFFF } );
  const floor = new THREE.Mesh( geometry, material );
  floor.receiveShadow = true;
  scene.add( floor );

  // Rapier
  const colliderDesc = RAPIER.ColliderDesc.cuboid(10,0.1,10);
  world.createCollider(colliderDesc);
}

function addBlocks() {
  const finishPointGeometry = new THREE.CylinderGeometry(1, 1,10);
  const material = new THREE.MeshStandardMaterial( { color: 0x00FF00, opacity:0.3, transparent: true } );
  const finishPointMesh = new THREE.Mesh(finishPointGeometry, material);
  finishPointMesh.position.set(0, 8.5, -12);
  scene.add(finishPointMesh);

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
  // Refactor eventually
  const platformMeshes = [
    { mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 1,2), new THREE.MeshStandardMaterial( { color: 0x808080 })),
      pos: new THREE.Vector3(0,0,-2)
    },
    { mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 1,2), new THREE.MeshStandardMaterial( { color: 0x808080 })),
      pos: new THREE.Vector3(0,1,-5)
    },
    { mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 1,2), new THREE.MeshStandardMaterial( { color: 0x808080 })),
      pos: new THREE.Vector3(0,2,-8)
    },
    { mesh: new THREE.Mesh(new THREE.BoxGeometry(8, 1,4), new THREE.MeshStandardMaterial( { color: 0x808080 })),
      pos: new THREE.Vector3(0,3,-12)
    },
  ]

  platformMeshes.forEach(el => el.mesh.position.copy(el.pos));
  platformMeshes.forEach(el => scene.add(el.mesh));


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
  renderer.render( scene, camera );

  if(world && characterController && !isPaused.value ) {
    const deltaTime = 1 /60;
    // Character movement
    const speed = 2.5 * deltaTime;
    const localMove = new THREE.Vector3(movement.x, movement.y, movement.z);
    const rotation = player.userData.rigidBody.rotation();
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
        player.userData.collider,
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
    const position = player.userData.rigidBody.translation();

    const nextPosition = {
      x: position.x + translation.x,
      y: position.y + translation.y,
      z: position.z + translation.z
    };

    player.userData.rigidBody.setNextKinematicTranslation(nextPosition);

    // Sync three.js mesh with rapier collider
    player.position.set(position.x, position.y, position.z);
    camera.position.set(position.x, position.y + 0.5, position.z);

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
  stats.update();
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

  renderer.setAnimationLoop(null);

  window.removeEventListener( 'keydown', onKeydown)
  window.removeEventListener( 'keyup', onKeyUp);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('pointerlockchange', pauseGame);
  window.removeEventListener('click', onMouseClick);

  world.free();

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  });
  scene.clear();

  renderer.dispose();
  camera.clear();

  eventQueue?.free();

  isPaused.value = false;
}

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

function onMouseMove(event: MouseEvent) {
  if (!controls.isLocked) return;

  yaw -= event.movementX * 0.002;

  const rotation = new THREE.Quaternion();

  rotation.setFromEuler(
      new THREE.Euler(0, yaw, 0)
  );

  player.userData.rigidBody.setNextKinematicRotation({
    x: rotation.x,
    y: rotation.y,
    z: rotation.z,
    w: rotation.w
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}

function onKeydown(event: KeyboardEvent) {
  if ( event.key === 'w' || event.key === 'ArrowUp' ) movement.setZ(-1);
  if ( event.key === 's' || event.key === 'ArrowDown' ) movement.setZ(1);
  if ( event.key === 'a' || event.key === 'ArrowLeft' ) movement.setX(-1);
  if ( event.key === 'd' || event.key === 'ArrowRight' ) movement.setX(1);
  if ( event.key === ' ') verticalVelocity = 8;
}

function onKeyUp(event: KeyboardEvent){
  if ( event.key === 'w' || event.key === 's' || event.key === 'ArrowUp' || event.key === 'ArrowDown' ) movement.setZ(0);
  if ( event.key === 'a' || event.key === 'd' || event.key === 'ArrowLeft' || event.key === 'ArrowRight' ) movement.setX(0);
}

function onMouseClick(){
  controls.lock();
}
</script>

<template>
  <div class="menu-container" v-if="showMenu">
    <span class="title">Project Float</span>
    <div class="menu">
      <button @click="startGame()">Play</button>
    </div>
  </div>
  <div class="menu-container paused" v-if="isPaused">
    <span class="title">Paused</span>
    <div class="menu">
      <button @click="resumeGame()">Resume</button>
      <button @click="resetGame()">Reset</button>
      <button @click="destroyGame()">Quit</button>
    </div>
  </div>
  <div class="gameContainer">
    <canvas ref="gameCanvas"></canvas>
  </div>

</template>

<style scoped>
.menu-container{
  position: absolute;
  background-color: rgb(0 0 0 / 100%);
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-rows: min-content 1fr;
}

.menu-container.paused{
  background-color: rgb(0 0 0 / 70%);
}

.menu{
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 15vh;
}

.title{
  color: white;
  font-size: 4rem;
  height: fit-content;
  place-self: center;
  margin-top: 10vh;
}

button{
  font-size: 1.5rem;
  height: 3rem;
  width: 8rem;
}

.gameContainer{
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
