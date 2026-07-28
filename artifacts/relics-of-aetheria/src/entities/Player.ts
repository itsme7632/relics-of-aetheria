import Phaser from 'phaser';

const MOVE_SPEED = 240;
const JUMP_VELOCITY = -560;
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 48;
const PLAYER_COLOR = 0x7ecdf7;

/**
 * Player
 *
 * A physics-enabled rectangle controlled by arrow keys or WASD.
 * Supports: left, right, jump (up arrow / W / space).
 *
 * The `declare body` override tells TypeScript the body is an Arcade physics
 * body (not a StaticBody) without emitting a redundant runtime assignment.
 */
export class Player extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_COLOR);

    scene.add.existing(this);
    scene.physics.world.enable(this);

    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocityX(MOVE_SPEED);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    };
  }

  update(): void {
    const onGround = this.body.blocked.down;

    const goLeft = this.cursors.left.isDown || this.wasd.left.isDown;
    const goRight = this.cursors.right.isDown || this.wasd.right.isDown;
    const jump =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up);

    if (goLeft) {
      this.body.setVelocityX(-MOVE_SPEED);
    } else if (goRight) {
      this.body.setVelocityX(MOVE_SPEED);
    } else {
      // Decelerate smoothly when no key is held
      this.body.setVelocityX(0);
    }

    if (jump && onGround) {
      this.body.setVelocityY(JUMP_VELOCITY);
    }
  }
}
