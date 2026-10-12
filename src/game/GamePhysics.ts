import type { EventQueue, KinematicCharacterController} from "@dimforge/rapier3d-compat";
import * as RAPIER from "@dimforge/rapier3d-compat";

export default class GamePhysics {
    world: RAPIER.World;
    characterController: KinematicCharacterController;
    gravity = -9.81;
    verticalVelocity = 0;
    eventQueue: EventQueue | undefined;
    characterRigidBody: RAPIER.RigidBody;
    characterCollider: RAPIER.Collider;
    finishPoint: RAPIER.Collider;
    movement = new RAPIER.Vector3(0,0,0);
    grounded= false;

    constructor() {
        // This Vector indicates a constant force on the rigid body inside the world, pushing towards the negative y-axis.
        let gravity = {x: 0.0, y: -9.81, z: 0.0};
        this.world = new RAPIER.World(gravity);

        this.characterController = this.world.createCharacterController(0.01);
        this.configureCharacterController();

        const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
        this.characterRigidBody = this.world.createRigidBody(rigidBodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0);
        this.characterCollider = this.world.createCollider(colliderDesc, this.characterRigidBody);

        this.addFloor();
        this.addBlocks();
        this.finishPoint = this.createFinishPoint();

        this.eventQueue = new RAPIER.EventQueue(true);
    }

    configureCharacterController() {
        this.characterController.setApplyImpulsesToDynamicBodies(true);
        this.characterController.setCharacterMass(3);
    }

    addFloor() {
        const colliderDesc = RAPIER.ColliderDesc.cuboid(10,0.1,10);
        this.world.createCollider(colliderDesc);
    }

    addBlocks() {
        const platformColliders = [
            RAPIER.ColliderDesc.cuboid(1, 0.5, 1).setTranslation(0, 0, -2),
            RAPIER.ColliderDesc.cuboid(1, 0.5, 1).setTranslation(0, 1, -5),
            RAPIER.ColliderDesc.cuboid(1, 0.5, 1).setTranslation(0, 2, -8),
            RAPIER.ColliderDesc.cuboid(4, 0.5, 2).setTranslation(0, 3, -12),
        ];

        platformColliders.forEach((el) => this.world.createCollider(el))
    }

    createFinishPoint() {
        const finishPointDesc = RAPIER.ColliderDesc
            .cylinder(5, 1)
            .setTranslation(0, 8.5, -12)
            .setSensor(true)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
            .setActiveCollisionTypes(
                RAPIER.ActiveCollisionTypes.DEFAULT |
                RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED
            );

        return this.world.createCollider(finishPointDesc);
    }

    // idle(){
    //     console.log('entering Idle')
    // }
}