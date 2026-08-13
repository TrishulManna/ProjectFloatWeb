<script setup lang="ts">
import * as THREE from 'three'
import { onMounted, useTemplateRef } from 'vue'
import {OrbitControls, RapierPhysics, type RapierPhysicsObject} from 'three/examples/jsm/Addons.js'
import Stats from "three/examples/jsm/libs/stats.module.js";
import type { KinematicCharacterController } from "@dimforge/rapier3d-compat";

const gameContainer = useTemplateRef('gameContainer')

//Three.js
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let stats: Stats;

// Rapier
let physics: RapierPhysicsObject;
let characterController: KinematicCharacterController;

let player: THREE.Object3D<THREE.Object3DEventMap>;
let movement: { forward: any; right: any; };

async function initializeThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd1e5);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100 );
  camera.position.set(0, 3, 10);

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

  controls = new OrbitControls( camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target = new THREE.Vector3(0, 2, 0);
  controls.update();

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
  const colliderDesc = physics.RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0);
  player.userData.collider = physics.world.createCollider( colliderDesc);
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

function animate(){
  controls.update();
  renderer.render( scene, camera );

  if(physics && characterController ) {
    const deltaTime = 1 /60;
    // Character movement
    const speed = 2.5 * deltaTime;
    const moveVector = new physics.RAPIER.Vector3( movement.right * speed, 0,- movement.forward * speed);

    characterController.computeColliderMovement(player.userData.collider, moveVector);

    // Read the result
    const translation = characterController.computedMovement();
    const position = player.userData.collider.translation();

    position.x += translation.x;
    position.y += translation.y;
    position.z += translation.z;

    player.userData.collider.setTranslation(position);

    // Sync three.js mesh with rapier collider
    player.position.set(position.x, position.y, position.z);
  }
  stats.update();
}

onMounted( () => {
  initializeThree();
})

</script>

<template>
  <div ref="gameContainer"></div>
</template>

<style scoped>
</style>
