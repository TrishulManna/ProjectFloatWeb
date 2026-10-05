import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import {PointerLockControls} from 'three/examples/jsm/Addons.js'

export default class GameRenderer {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    stats: Stats;
    controls: PointerLockControls;
    yaw = 0;
    // player: THREE.Object3D<THREE.Object3DEventMap>;
    movement = new THREE.Vector3();

    constructor(gameCanvas: HTMLCanvasElement){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xbfd1e5);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100 );
        this.camera.position.y = 1.5;

        const ambient = new THREE.HemisphereLight(0x555555, 0xFFFFFF );

        this.scene.add(ambient);

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

        this.scene.add(light);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: gameCanvas });
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        //Should be done separately?
        // this.renderer.setAnimationLoop( animate );

        this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
        this.scene.add(this.controls.object);

        this.stats = new Stats();
    }
}