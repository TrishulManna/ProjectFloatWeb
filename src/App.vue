<script setup lang="ts">
import * as THREE from 'three'
import {onMounted, ref, useTemplateRef} from 'vue'
import {OrbitControls, PointerLockControls, RapierPhysics, type RapierPhysicsObject} from 'three/examples/jsm/Addons.js'
import Stats from "three/examples/jsm/libs/stats.module.js";
import type { EventQueue, KinematicCharacterController} from "@dimforge/rapier3d-compat";

// Vue.js
const gameContainer = useTemplateRef('gameContainer')
const showMenu = ref(true);
const isPaused = ref(false);
// const gameDestroyed = ref(false);

//Three.js
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
// let oldControls: OrbitControls;
let stats: Stats;
let controls: PointerLockControls;
// let prevTime = performance.now();
// const velocity = new THREE.Vector3();
// let direction = new THREE.Vector3();
//
// let moveForward = false;
// let moveBackward = false;
// let moveLeft = false;
// let moveRight = false;
// let canJump = false;
let yaw = 0;
let player: THREE.Object3D<THREE.Object3DEventMap>;


// Rapier
let physics: RapierPhysicsObject;
let characterController: KinematicCharacterController;
let debugRenderer: RapierDebugRenderer;
let gravity = -9.81;
let verticalVelocity = 0;
// let oldMovement: { forward: any; right: any;};
let movement = new THREE.Vector3();
let eventQueue: EventQueue | undefined;
let playerHandle: number;
let finishHandle: number;

async function initializeThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100 );
  camera.position.y = 1.5;
  // camera.position.set(0, 3, 10);
  // camera.position.y(3);

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

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  gameContainer.value?.appendChild(renderer.domElement);
  renderer.setAnimationLoop( animate );

  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.object);
  //
  // oldControls = new OrbitControls( camera, renderer.domElement);
  // oldControls.enableDamping = true;
  // oldControls.target = new THREE.Vector3(0, 2, 0);
  // oldControls.update();

  const geometry = new THREE.BoxGeometry(10, 0.5, 10 );
  const material = new THREE.MeshStandardMaterial( { color: 0xFFFFFF } );

  const floor = new THREE.Mesh( geometry, material );
  floor.receiveShadow = true;

  floor.position.y = - 0.25;
  floor.userData.physics = { mass: 0 };

  scene.add( floor );

  stats = new Stats();
  gameContainer.value?.appendChild(renderer.domElement);

  await initializePhysics();

  onWindowResize();

  // Movement input
  // oldMovement = { forward: 0, right: 0 };
  //
  // window.addEventListener( 'keydown', ( event ) => {
  //   if ( event.key === 'w' || event.key === 'ArrowUp' ) oldMovement.forward = 1;
  //   if ( event.key === 's' || event.key === 'ArrowDown' ) oldMovement.forward = - 1;
  //   if ( event.key === 'a' || event.key === 'ArrowLeft' ) oldMovement.right = - 1;
  //   if ( event.key === 'd' || event.key === 'ArrowRight' ) oldMovement.right = 1;
  //   if ( event.key === ' ') console.log('jhaa', event);
  // })
  //
  // window.addEventListener( 'keyup', ( event ) => {
  //   if ( event.key === 'w' || event.key === 's' || event.key === 'ArrowUp' || event.key === 'ArrowDown' ) oldMovement.forward = 0;
  //   if ( event.key === 'a' || event.key === 'd' || event.key === 'ArrowLeft' || event.key === 'ArrowRight' ) oldMovement.right = 0;
  // } );

  window.addEventListener( 'keydown', onKeydown)
  window.addEventListener( 'keyup', onKeyUp);
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', pauseGame)

  // Hides the pointer
  if(gameContainer.value) {
    gameContainer.value.addEventListener( 'click', function () {
      controls.lock();
    } );
  }


  // const onKeyDown = function ( event:KeyboardEvent ) {
  //   switch ( event.code ) {
  //     case 'ArrowUp':
  //     case 'KeyW':
  //       moveForward = true;
  //       break;
  //
  //     case 'ArrowLeft':
  //     case 'KeyA':
  //       moveLeft = true;
  //       break;
  //
  //     case 'ArrowDown':
  //     case 'KeyS':
  //       moveBackward = true;
  //       break;
  //
  //     case 'ArrowRight':
  //     case 'KeyD':
  //       moveRight = true;
  //       break;
  //
  //     // case 'Space':
  //     //   if ( canJump === true ) velocity.y += 350;
  //     //   canJump = false;
  //     //   break;
  //   }
  // };
  //
  // const onKeyUp = function ( event:KeyboardEvent ) {
  //   switch ( event.code ) {
  //     case 'ArrowUp':
  //     case 'KeyW':
  //       moveForward = false;
  //       break;
  //
  //     case 'ArrowLeft':
  //     case 'KeyA':
  //       moveLeft = false;
  //       break;
  //
  //     case 'ArrowDown':
  //     case 'KeyS':
  //       moveBackward = false;
  //       break;
  //
  //     case 'ArrowRight':
  //     case 'KeyD':
  //       moveRight = false;
  //       break;
  //   }
  // };

  // window.addEventListener( 'keydown', onKeyDown );
  // window.addEventListener( 'keyup', onKeyUp );



}

function random( min: number, max: number ) {
  return Math.random() * ( max - min ) + min;
}

async function initializePhysics() {
  physics = await RapierPhysics();

  physics.addScene(scene);

  // addBody();
  addCharacterController();
  addFloor();
  addBlocks();

  //Add both worlds to the debugger
  debugRenderer = new RapierDebugRenderer(scene, physics.world);
}

function addCharacterController() {
  // Character Capsule
  const geometry = new THREE.CapsuleGeometry(0.3, 1, 8, 8);
  const material = new THREE.MeshStandardMaterial( { color: 0xFFFFFF } );
  player = new THREE.Mesh(geometry, material);
  player.castShadow = true;
  player.position.set(0, 0.8, 0);
  scene.add(player);

  // Rapier Character Controller
  characterController = physics.world.createCharacterController(0.01);
  characterController.setApplyImpulsesToDynamicBodies(true);
  characterController.setCharacterMass(3);

  // Rigid body
  const rigidBodyDesc = physics.RAPIER.RigidBodyDesc.kinematicPositionBased();
  const rigidBody = physics.world.createRigidBody(rigidBodyDesc);

  // Collider
  const colliderDesc = physics.RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0);
  const collider = physics.world.createCollider(colliderDesc, rigidBody);

  player.userData.rigidBody = rigidBody;
  player.userData.collider = collider;

  // const rotation = new THREE.Quaternion();
  // rotation.setFromEuler(
  //     new THREE.Euler(0, THREE.MathUtils.degToRad(30), 0)
  // );
  //
  // rigidBody.setNextKinematicRotation(rotation);

  // player.userData.collider = physics.world.createCollider( colliderDesc);
  playerHandle = player.userData.collider.handle;
}

function addFloor() {
  const colliderDesc = physics.RAPIER.ColliderDesc.cuboid(10,0.1,10);
  physics.world.createCollider(colliderDesc);
}

function addBlocks() {
  const finishPointDesc = physics.RAPIER.ColliderDesc
      .cylinder(5,1)
      .setTranslation(0, 8.5, -12)
      .setSensor(true)
      .setActiveEvents(physics.RAPIER.ActiveEvents.COLLISION_EVENTS)
      .setActiveCollisionTypes(
        physics.RAPIER.ActiveCollisionTypes.DEFAULT |
        physics.RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED
      );

  const finishPoint = physics.world.createCollider(finishPointDesc);

  const colliderDesc = [
    physics.RAPIER.ColliderDesc.cuboid(1,0.5,1).setTranslation(0, 0, -2),
    physics.RAPIER.ColliderDesc.cuboid(1,0.5,1).setTranslation(0, 1, -5),
    physics.RAPIER.ColliderDesc.cuboid(1,0.5,1).setTranslation(0, 2, -8),
    physics.RAPIER.ColliderDesc.cuboid(4,0.5,2).setTranslation(0, 3, -12),
  ];

  colliderDesc.forEach((el) => physics.world.createCollider(el))
  finishHandle = finishPoint.handle;
  eventQueue = new physics.RAPIER.EventQueue(true);
}

// const geometries = [
//   new THREE.BoxGeometry( 1, 1, 1 ),
//   new THREE.SphereGeometry( 0.5 ),
// ]

// function addBody() {
//   const geometry = geometries[0];
//   const material = new THREE.MeshStandardMaterial( { color: 0xFFFFFF } );
//   const mesh = new THREE.Mesh(geometry, material);
//
//   mesh.castShadow = true;
//   mesh.position.set(Math.random() * 2 - 1, Math.random() * 3 + 6, Math.random() * 2 - 1);
//
//   scene.add( mesh );
//
//   physics.addMesh(mesh, 1, 0.5);
// }


// let angle = 0;
function animate(){
  // const time = performance.now();
  // const delta = ( time - performance.now() ) / 1000;
  // // controls.object.position.y += ( velocity.y * delta ); // new behavior
  //
  // // oldControls.update();
  // velocity.x -= velocity.x * 10.0 * delta;
  // velocity.z -= velocity.z * 10.0 * delta;
  //
  // velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass
  //
  // // direction.z = Number( moveForward ) - Number( moveBackward );
  // // direction.x = Number( moveRight ) - Number( moveLeft );
  // // direction.normalize(); // this ensures consistent movements in all directions
  //
  // // if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
  // // if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;
  // if ( movement ) velocity.z -= movement.forward * 400.0 * delta;
  // if ( movement ) velocity.x -= movement.right * 400.0 * delta;
  //
  // controls.moveRight( - velocity.x * delta );
  // controls.moveForward( - velocity.z * delta );
  //
  // controls.object.position.y += ( velocity.y * delta ); // new behavior
  // if(gameDestroyed.value){return}

  controls.update;
  renderer.render( scene, camera );

  if(physics && characterController && !isPaused.value ) {
    const deltaTime = 1 /60;
    // angle += 1 * deltaTime;
    // Character movement
    const speed = 2.5 * deltaTime;
    // const localMove = new THREE.Vector3(
    //     oldMovement.right,
    //     0,
    //     -oldMovement.forward
    // );
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

    // const moveVector = new physics.RAPIER.Vector3(
    //     localMove.x,
    //     localMove.y,
    //     localMove.z
    // );

    // const verticalMovement =
    //     verticalVelocity * deltaTime;

    const moveVector = new physics.RAPIER.Vector3(
        localMove.x,
        verticalVelocity * deltaTime,
        localMove.z
    );

    // const moveVector = new physics.RAPIER.Vector3( movement.right * speed, 0,- movement.forward * speed);

    characterController.computeColliderMovement(
        player.userData.collider,
        moveVector,
        undefined,
        undefined,
        (collider) => !collider.isSensor()
    );

    // Read the result
    const translation = characterController.computedMovement();
    const position = player.userData.rigidBody.translation();

    const nextPosition = {
      x: position.x + translation.x,
      y: position.y + translation.y,
      z: position.z + translation.z
    };

    player.userData.rigidBody.setNextKinematicTranslation(nextPosition);
    // const position = player.userData.collider.translation();
    //
    // position.x += translation.x;
    // position.y += translation.y;
    // position.z += translation.z;
    //
    // player.userData.collider.setTranslation(position);

    // const rotation = new THREE.Quaternion();
    // rotation.setFromEuler(
    //     new THREE.Euler(0, angle, 0)
    // );
    //
    // player.userData.rigidBody.setNextKinematicRotation(rotation);

    // Sync three.js mesh with rapier collider
    player.position.set(position.x, position.y, position.z);
    camera.position.set(position.x, position.y + 0.5, position.z);

    // Apply constant gravity on the Y of the character
    verticalVelocity += gravity * deltaTime;

    //DEBUG
    debugRenderer.update();

    physics.world.step(eventQueue);
    if(eventQueue) eventQueue.drainCollisionEvents((collider1, collider2, started) => {
      const playerTouchedFinish = (collider1 === playerHandle && collider2 === finishHandle) || (collider1 === finishHandle && collider2 === playerHandle)
      console.log(playerTouchedFinish && started);
    })

  }
  stats.update();
}

function startGame(){
  showMenu.value = false;
  console.log(isPaused.value)
  initializeThree();
}

function pauseGame(){
  if(!document.pointerLockElement){
    showMenu.value = true;
    isPaused.value = true;
  }
}

function resumeGame(){
    showMenu.value = false;
    isPaused.value = false;
}

function resetGame(){

}

function destroyGame(){
  // gameDestroyed.value = true;
  // renderer.setAnimationLoop(null);
  //
  // window.removeEventListener( 'keydown', onKeydown)
  // window.removeEventListener( 'keyup', onKeyUp);
  // window.removeEventListener('resize', onWindowResize);
  // window.removeEventListener('mousemove', onMouseMove);
  // document.removeEventListener('pointerlockchange', pauseGame);
  //
  // eventQueue?.free();
  // eventQueue = null;
  //
  // // physics.world.free();
  // // physics.world = null;
  //
  // scene.traverse((object) => {
  //   object.clear();
  // });
  //
  // renderer.dispose();
  // scene.clear();
  // camera.clear();
  //
  // camera = null;
  // renderer = null;
  // scene = null;
  // physics = null;
  //
  // isPaused.value = false;
}

onMounted( () => {
  // initializeThree();

  // window.addEventListener('mousemove', onMouseMove);

  // // Hides the pointer
  // if(gameContainer.value) {
  //   gameContainer.value.addEventListener( 'click', function () {
  //     controls.lock();
  //   } );
  // }
})

class RapierDebugRenderer {
  private mesh: THREE.LineSegments

  constructor(
      scene: THREE.Scene,
      private world: RapierPhysicsObject["world"]
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
</script>

<template>
  <div class="menu-container" v-if="showMenu">
    <span class="title">Project Float</span>
    <div class="menu">
      <button v-if="!isPaused" @click="startGame()">Play</button>
      <button v-if="isPaused" @click="resumeGame()">Resume</button>
      <button v-if="isPaused">Reset</button>
      <button v-if="isPaused" @click="destroyGame()">Quit</button>
    </div>
  </div>
  <div ref="gameContainer"></div>
</template>

<style scoped>
.menu-container{
  position: absolute;
  background-color: rgb(0 0 0 / 70%);
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-rows: min-content 1fr;
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
</style>
