# Enemy System — Relics of Aetheria

Implemented in **M17**.

---

## Architecture

Enemies are independent `Entity` subclasses that own their own physics body and
visual representation.  They are **not** managed by `EntityManager` — they live
in a dedicated `snakes: SnakeEnemy[]` array in `GameScene` and receive manual
`update(delta)` calls each frame.

```
Entity (abstract base — id, active, enabled, spawn/destroy lifecycle)
  └─ SnakeEnemy   (M17 — patrolling ground snake)
```

`GameScene` responsibilities:

| Responsibility | Where |
|---|---|
| Spawn from Tiled | `GameScene._spawnSnakes()` |
| Per-frame update | `GameScene.update()` — manual loop |
| Player overlap (stomp / touch) | `GameScene._wireSnakeOverlap()` |
| Debug snapshot | `GameScene._buildEnemyDebugInfo()` |
| Cleanup on scene shutdown | `SHUTDOWN` event handler |

---

## SnakeEnemy

**File:** `src/entities/enemy/SnakeEnemy.ts`

A ground-patrolling snake that bounces between two patrol limits.

### Lifecycle

1. `new SnakeEnemy(scene, tiledObject, collisionLayer)` — parses Tiled custom
   properties; no scene objects created yet.
2. `snake.spawn(x, y)` — creates the invisible physics rectangle, the graphics
   visual, and registers a tilemap collider.  Sets `_active = true`.
3. `snake.update(delta)` — called every frame by `GameScene` while `!isDefeated`.
4. `snake.defeat()` — triggered by a stomp.  Squish-tweens the graphic and calls
   `destroy()` when the tween completes.
5. `snake.destroy()` — removes all owned scene objects.

### Patrol Behaviour

```
     ←──── patrolDistance ────→
     │                         │
  leftLimit              rightLimit
```

Each frame the snake moves at `speed` px/s in its current direction.  It pauses
for `IDLE_DURATION` (420 ms) before reversing in three situations:

| Condition | Detected by |
|---|---|
| Reached patrol limit | `rect.x >= rightLimit` or `rect.x <= leftLimit` |
| Platform edge ahead | `getTileAtWorldXY(leadFoot)` returns `null` |
| Wall ahead | `body.blocked.right` / `body.blocked.left` |

The graphics object is drawn once facing **right**; direction is applied via
`setScale(direction, 1)` — no redraw on turn.

### Player Interaction

| Interaction | Condition | Result |
|---|---|---|
| **Stomp** | Player falling (`vy > 50`) AND player bottom ≤ snake top + 14 px | Snake → `defeat()`; player bounces up at −360 px/s |
| **Touch** | Any other overlap | `player.takeDamage(knockVX, −300)`; camera shake |

`takeDamage` is a no-op while `player.isInvulnerable` — the 1 500 ms window
prevents damage-spam.  Kai flashes every 120 ms during invulnerability.

---

## Tiled Object Setup

1. Open `level1.json` in Tiled (or edit the JSON directly).
2. Create or select the **Enemies** object layer.
3. Place a **Rectangle** or **Point** object; set **Name = Snake**.
4. Add the following **Custom Properties** as needed:

| Property | Type | Default | Description |
|---|---|---|---|
| `patrolDistance` | int | 160 | Total patrol width in pixels |
| `speed` | int | 64 | Movement speed in px/s |
| `facing` | string | `"right"` | Initial direction: `"left"` or `"right"` |

The spawn position (`x`, `y`) is the Tiled object coordinate — the snake's
physics body is centred there and falls with gravity to the ground.

---

## Debug Panel (F4)

Press **F4** in-game to toggle the entity + enemy debug overlay.

```
─────────────────
[Enemies F4]
Total    3        ← snakes placed in this level (includes defeated)
Active   2        ← alive and enabled
Sleeping 0        ← alive but disabled (outside wake radius, future)
Defeated 1        ← stomped
  #1 move→        ← per-snake patrol summary
  #2 idle(210ms)
  #3 defeated
```

The always-visible player section also shows:

```
Invul  yes        ← player invulnerability window active
```

---

## Future Enemy Guidelines

When adding a new enemy type:

1. Create `src/entities/enemy/YourEnemy.ts` extending `Entity`.
2. Implement `spawn(x, y)`, `update(delta)`, `destroy()`.
3. Add a `physicsRect` accessor for overlap registration.
4. Add a `getDebugSummary(): string` method for the F4 panel.
5. Extend `EnemyDebugInfo` in `SnakeEnemy.ts` if new stats are needed, or
   create a separate `YourEnemyDebugInfo` interface.
6. In `GameScene`:
   - Add `private yourEnemies: YourEnemy[] = []`
   - Spawn from a Tiled object layer (name the objects `"YourEnemy"`)
   - Wire overlaps with `_wireYourEnemyOverlap(enemy)`
   - Update in the enemy update loop
   - Clean up in the `SHUTDOWN` handler
