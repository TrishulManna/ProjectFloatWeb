<script setup lang="ts">
import * as THREE from 'three'
import { onMounted, useTemplateRef } from 'vue'
import {OrbitControls, PointerLockControls, RapierPhysics, type RapierPhysicsObject} from 'three/examples/jsm/Addons.js'
import Stats from "three/examples/jsm/libs/stats.module.js";
import type { KinematicCharacterController } from "@dimforge/rapier3d-compat";

const gameContainer = useTemplateRef('gameContainer')

//Three.js
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
// let oldControls: OrbitControls;
let stats: Stats;
let controls: PointerLockControls;
let prevTime = performance.now();
// const velocity = new THREE.Vector3();
// let direction = new THREE.Vector3();
//
// let moveForward = false;
// let moveBackward = false;
// let moveLeft = false;
// let moveRight = false;
// let canJump = false;
let yaw = 0;


// Rapier
let physics: RapierPhysicsObject;
let characterController: KinematicCharacterController;
let debugRenderer: RapierDebugRenderer;

let player: THREE.Object3D<THREE.Object3DEventMap>;
let movement: { forward: any; right: any;};

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
  movement = { forward: 0, right: 0 };

  window.addEventListener( 'keydown', ( event ) => {
    if ( event.key === 'w' || event.key === 'ArrowUp' ) movement.forward = 1;
    if ( event.key === 's' || event.key === 'ArrowDown' ) movement.forward = - 1;
    if ( event.key === 'a' || event.key === 'ArrowLeft' ) movement.right = - 1;
    if ( event.key === 'd' || event.key === 'ArrowRight' ) movement.right = 1;
  })

  window.addEventListener( 'keyup', ( event ) => {
    if ( event.key === 'w' || event.key === 's' || event.key === 'ArrowUp' || event.key === 'ArrowDown' ) movement.forward = 0;
    if ( event.key === 'a' || event.key === 'd' || event.key === 'ArrowLeft' || event.key === 'ArrowRight' ) movement.right = 0;
  } );

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

  window.addEventListener('resize', onWindowResize, false);

}

function random( min: number, max: number ) {
  return Math.random() * ( max - min ) + min;
}

async function initializePhysics() {
  physics = await RapierPhysics();

  physics.addScene(scene);

  // addBody();
  addCharacterController();

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

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}

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
  controls.update;
  renderer.render( scene, camera );

  if(physics && characterController ) {
    const deltaTime = 1 /60;
    // angle += 1 * deltaTime;
    // Character movement
    const speed = 2.5 * deltaTime;
    const localMove = new THREE.Vector3(
        movement.right,
        0,
        -movement.forward
    );
    const rotation = player.userData.rigidBody.rotation();
    const quaternion = new THREE.Quaternion(
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w
    );

    localMove.applyQuaternion(quaternion);
    localMove.multiplyScalar(speed);

    const moveVector = new physics.RAPIER.Vector3(
        localMove.x,
        localMove.y,
        localMove.z
    );

    // const moveVector = new physics.RAPIER.Vector3( movement.right * speed, 0,- movement.forward * speed);

    characterController.computeColliderMovement(player.userData.collider, moveVector);

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

    //DEBUG
    debugRenderer.update();
  }
  stats.update();
}

onMounted( () => {
  initializeThree();

  window.addEventListener('mousemove', onMouseMove);

  // Hides the pointer
  if(gameContainer.value) {
    gameContainer.value.addEventListener( 'click', function () {
      controls.lock();
    } );
  }
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

</script>

<template>
  <div ref="gameContainer"></div>
</template>

<style scoped>
</style>
