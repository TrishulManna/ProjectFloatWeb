import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";

export default class RapierDebugRenderer {
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