<script setup lang="ts">
import * as THREE from 'three'
import { onMounted, useTemplateRef } from 'vue'
import {OrbitControls, RapierPhysics, type RapierPhysicsObject} from 'three/examples/jsm/Addons.js'
import Stats from "three/examples/jsm/libs/stats.module.js";

const gameContainer = useTemplateRef('gameContainer')
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let stats: Stats;

let physics: RapierPhysicsObject;

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

  initializePhysics();

  onWindowResize();

  window.addEventListener('resize', onWindowResize, false);
}

async function initializePhysics() {
  physics = await RapierPhysics();

  physics.addScene(scene);

  addBody();
}

const geometries = [
  new THREE.BoxGeometry( 1, 1, 1 ),
  new THREE.SphereGeometry( 0.5 ),
]

function addBody() {
  const geometry = geometries[0];
  const material = new THREE.MeshStandardMaterial( { color: 0xFFFFFF } );
  const mesh = new THREE.Mesh(geometry, material);

  mesh.castShadow = true;
  mesh.position.set(Math.random() * 2 - 1, Math.random() * 3 + 6, Math.random() * 2 - 1);

  scene.add( mesh );

  physics.addMesh(mesh, 1, 0.5);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate(){
  controls.update();
  renderer.render( scene, camera );
  stats.update();
}

// function old() {
//   // Setup
//   const gameContainer = useTemplateRef('gameContainer')
//   const scene = new THREE.Scene();
//   const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//
//   const renderer = new THREE.WebGLRenderer();
//   renderer.setSize( window.innerWidth, window.innerHeight );
//   renderer.setAnimationLoop( animate );
//
// // Meshes
//   const geometry = new THREE.BoxGeometry(1,1,1);
//   const material = new THREE.MeshBasicMaterial( {color: 0x00ff00 } );
//   const cube = new THREE.Mesh(geometry, material );
//   scene.add(cube);
//
//   camera.position.z = 5;
//
// // Rendering
//   function animate( time:number ) {
//     // Animation
//     cube.rotation.x = time / 2000;
//     cube.rotation.y = time / 1000;
//
//     renderer.render( scene, camera );
//   }
// }


onMounted( () => {
  initializeThree();
})

</script>

<template>
  <div ref="gameContainer"></div>
</template>

<style scoped>
</style>
