import Phaser from 'phaser';

/**
 * CameraEffects
 *
 * Reusable wrapper around Phaser's built-in camera effect API.
 * All methods are safe to call at any time; they are no-ops if the camera
 * is already running an effect of the same type (Phaser dequeues them).
 *
 * Consumed by CameraManager.effects — do not instantiate directly.
 */
export class CameraEffects {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
  ) {}

  // ── Shake ─────────────────────────────────────────────────────────────────

  /**
   * Shake the camera.
   * @param intensity  Shake magnitude as a fraction of the camera size (0–1). Default 0.01.
   * @param duration   Duration in milliseconds. Default 250.
   */
  shake(intensity = 0.01, duration = 250): void {
    this.camera.shake(duration, intensity);
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  /**
   * Smoothly zoom to a target scale.
   * @param scale     Target zoom level (1 = 100 %). Default 1.
   * @param duration  Duration in milliseconds. Default 400.
   * @param callback  Optional callback when the zoom completes.
   */
  zoomTo(scale = 1, duration = 400, callback?: () => void): void {
    this.camera.zoomTo(scale, duration, 'Linear', false, callback
      ? (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
          if (progress === 1) callback();
        }
      : undefined);
  }

  // ── Fade ──────────────────────────────────────────────────────────────────

  /**
   * Fade the camera in from a solid colour.
   * @param duration  Duration in milliseconds. Default 500.
   * @param color     RGB hex colour to fade from. Default black (0x000000).
   * @param callback  Optional callback when the fade completes.
   */
  fadeIn(
    duration = 500,
    color = 0x000000,
    callback?: () => void,
  ): void {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8)  & 0xff;
    const b =  color        & 0xff;
    this.camera.fadeIn(duration, r, g, b, callback
      ? (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
          if (progress === 1) callback();
        }
      : undefined);
  }

  /**
   * Fade the camera out to a solid colour.
   * @param duration  Duration in milliseconds. Default 500.
   * @param color     RGB hex colour to fade to. Default black (0x000000).
   * @param callback  Optional callback when the fade completes.
   */
  fadeOut(
    duration = 500,
    color = 0x000000,
    callback?: () => void,
  ): void {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8)  & 0xff;
    const b =  color        & 0xff;
    this.camera.fadeOut(duration, r, g, b, callback
      ? (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
          if (progress === 1) callback();
        }
      : undefined);
  }

  // ── Pan ───────────────────────────────────────────────────────────────────

  /**
   * Smoothly pan the camera to a world position.
   * Note: this overrides startFollow while panning.  Call camera.startFollow()
   * again after the pan if you need tracking to resume.
   * @param worldX    Target world X coordinate.
   * @param worldY    Target world Y coordinate.
   * @param duration  Duration in milliseconds. Default 1000.
   * @param ease      Easing function name. Default 'Linear'.
   * @param callback  Optional callback when the pan completes.
   */
  panTo(
    worldX: number,
    worldY: number,
    duration = 1000,
    ease = 'Linear',
    callback?: () => void,
  ): void {
    this.camera.pan(worldX, worldY, duration, ease, false,
      callback
        ? (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
            if (progress === 1) callback();
          }
        : undefined);
  }
}
