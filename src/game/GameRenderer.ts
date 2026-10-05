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
    player: THREE.Object3D<THREE.Object3DEventMap>;
    movement = new THREE.Vector3();

    constructor(gameCanvas: HTMLCanvasElement){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xbfd1e5);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100 );
        this.camera.position.y = 1.5;

        this.renderer = this.createRenderer(gameCanvas);

        this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
        this.scene.add(this.controls.object);

        this.stats = new Stats();

        this.player = this.createCharacterController();
        this.scene.add(this.player);

        this.addLight();
        this.addFloor();
        this.addBlocks();
    }

    private createCharacterController() {
        const geometry = new THREE.CapsuleGeometry(0.3, 1, 8, 8);
        const material = new THREE.MeshStandardMaterial( { color: 0xFFFFFF } );
        const player = new THREE.Mesh(geometry, material);

        player.castShadow = true;
        player.position.set(0, 0.8, 0);

        return player;
    }

    private createRenderer(gameCanvas: HTMLCanvasElement) {
        const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: gameCanvas });

        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;

        return renderer;
    }

    private addLight(){
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
    }

    private addFloor() {
        const geometry = new THREE.BoxGeometry(20, 0.2, 20 );
        const material = new THREE.MeshStandardMaterial( { color: 0xFFFFFF } );
        const floor = new THREE.Mesh( geometry, material );

        floor.receiveShadow = true;
        this.scene.add( floor );
    }

    private addBlocks() {
        const finishPointGeometry = new THREE.CylinderGeometry(1, 1,10);
        const material = new THREE.MeshStandardMaterial( { color: 0x00FF00, opacity:0.3, transparent: true } );
        const finishPointMesh = new THREE.Mesh(finishPointGeometry, material);

        finishPointMesh.position.set(0, 8.5, -12);
        this.scene.add(finishPointMesh);

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
        platformMeshes.forEach(el => this.scene.add(el.mesh));
    }
}