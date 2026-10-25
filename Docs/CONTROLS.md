# No Limits — Controls Guide

This document describes all supported control methods, default input mappings, and device arbitration rules for No Limits.

## Control Mappings

| Action                | Keyboard                | Gamepad (Standard Layout)                 | Touch Controls (Mobile)                  |
| :-------------------- | :---------------------- | :---------------------------------------- | :--------------------------------------- |
| **Steer Left**        | `A` or `Left Arrow`     | Left Stick Left / D-pad Left              | On-screen `LEFT` button (left side)      |
| **Steer Right**       | `D` or `Right Arrow`    | Left Stick Right / D-pad Right            | On-screen `RIGHT` button (left side)     |
| **Throttle (Gas)**    | `W` or `Up Arrow`       | Right Trigger (`RT` / `R2`) (analog 0..1) | On-screen `GAS` pedal (right side, 64px) |
| **Brake / Reverse**   | `S` or `Down Arrow`     | Left Trigger (`LT` / `L2`) (analog 0..1)  | On-screen `BRAKE` pedal (right side)     |
| **Nitro Boost**       | `Shift` (Left or Right) | `A` (Xbox) / `Cross` (PlayStation)        | On-screen `NITRO` button (right side)    |
| **Handbrake / Drift** | `Space`                 | `X` (Xbox) / `Square` (PlayStation)       | On-screen `DRIFT` button (right side)    |
| **Pause Menu**        | `Escape`                | `Start` / `Options`                       | Pause button / system pause              |
| **Dev Debug Overlay** | Backtick (`` ` ``)      | —                                         | —                                        |
| **Dev Tuning Panel**  | `F2`                    | —                                         | —                                        |

---

## Input Architecture & Details

### 1. Radial Deadzone

- Analog sticks feature a radial deadzone threshold of `0.15`.
- Values within `[-0.15, 0.15]` evaluate to `0.0`.
- Values beyond `0.15` are rescaled smoothly over `[0, 1]` with no jump or discontinuity at the deadzone boundary.

### 2. Digital Steering Ramp

- Touch steer buttons feature deterministic, fixed-timestep steering progression via `stepSteeringRamp()`.
- Steering ramps from `0.0` to `±1.0` over ~150 ms (~9 simulation steps at 60 Hz).
- Releasing buttons centers steering quickly over ~80 ms (~5 simulation steps).
- Holding opposing steer inputs cancels steering to `0.0`.

### 3. Simultaneous Input Merging

`InputManager` accepts multiple active providers (`KeyboardInput`, `GamepadInput`, `TouchInput`) simultaneously and merges them every poll cycle with zero heap allocations:

- **Steer:** Selected by largest absolute magnitude (`Math.abs(steer)`).
- **Throttle:** Maximum value among all providers (`Math.max(throttle)`).
- **Brake:** Maximum value among all providers (`Math.max(brake)`).
- **Booleans (`nitro`, `handbrake`, `pause`):** Logical `OR`.

### 4. Last-Used Device Tracking

- `InputManager.lastUsedDevice` tracks `'keyboard' | 'gamepad' | 'touch'` based on whichever device produced the most recent non-neutral input.
- Seamlessly drives dynamic button prompts and HUD layouts.

### 5. Mobile Layout & Safe Areas

- Touch controls automatically show on touch devices (`matchMedia('(pointer: coarse)')`) or when forced via `?touch=1`.
- When touch controls are active, the Speedometer and Nitro gauge relocate to the top corners to eliminate touch button occlusions.
- Respects CSS safe-area insets (`env(safe-area-inset-*)`) and dynamic viewport units (`100dvh`).
- When a mobile device is held in portrait mode, a full-screen `RotateHint` prompt displays and halts simulation progression until rotated to landscape.
