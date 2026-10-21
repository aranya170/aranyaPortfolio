import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import "../styles/RoboticCell.css";

// Hero visual: a vision-guided robotic sorting cell, rendered in 3D.
//
// Autopilot: items ride a conveyor past a camera gantry, get classified
// (plastic / metal / paper, echoing the waste-classification research) and a
// 3-axis arm picks each one and drops it in the matching bin.
//
// Manual: hovering the cell hands the arm to the visitor. The arm follows the
// cursor; clicking an item picks it up, clicking a bin drops it there (with a
// right / wrong verdict), clicking elsewhere sets it down. Clicking the belt
// adds an item. After a few idle seconds the autopilot takes back over.
//
// Motion is driven by critically-damped-ish springs on the gripper position
// and on every joint, so the arm accelerates, decelerates and settles like a
// real servo-driven machine instead of following fixed timelines.

// ---------- Geometry ----------
const SHOULDER_Y = 0.62;
const L1 = 1.1; // upper arm
const L2 = 1.0; // forearm
const TOOL_LEN = 0.42; // wrist pivot → fingertips
const HOME = new THREE.Vector3(0.5, 1.15, 0.7);
const SAFE_Y = 1.0; // travel height for pick-and-place moves
const MIN_REACH = 0.55;
const MAX_REACH = 1.95;

const BELT = { y: 0.34, z: 1.35, xStart: -2.55, xEnd: 2.45, speed: 0.28, width: 0.62 };
const SCAN_X = -1.25;
const MAX_ITEMS = 7;
const MANUAL_TIMEOUT = 3.5;

const CLASSES = {
  plastic: { label: "PLASTIC", half: 0.13 },
  metal: { label: "METAL", half: 0.1 },
  paper: { label: "PAPER", half: 0.08 },
};
const CLASS_KEYS = Object.keys(CLASSES);

const BINS = {
  plastic: { x: -1.15, z: -1.35 },
  metal: { x: 0, z: -1.45 },
  paper: { x: 1.15, z: -1.35 },
};
const BIN_SIZE = { w: 0.62, h: 0.42, d: 0.62 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------- Springs ----------
// Second-order system: frequency f (Hz), damping zeta (1 = no overshoot)
function springStep(s, target, f, zeta, dt) {
  const w = 2 * Math.PI * f;
  s.v += (w * w * (target - s.x) - 2 * zeta * w * s.v) * dt;
  s.x += s.v * dt;
}

function springVec(pos, vel, target, f, zeta, maxSpeed, dt) {
  const w = 2 * Math.PI * f;
  const ax = w * w * (target.x - pos.x) - 2 * zeta * w * vel.x;
  const ay = w * w * (target.y - pos.y) - 2 * zeta * w * vel.y;
  const az = w * w * (target.z - pos.z) - 2 * zeta * w * vel.z;
  vel.x += ax * dt;
  vel.y += ay * dt;
  vel.z += az * dt;
  const speed = vel.length();
  if (speed > maxSpeed) vel.multiplyScalar(maxSpeed / speed);
  pos.addScaledVector(vel, dt);
}

// Keep a gripper target inside the arm's reachable ring and above the bench
function clampToWorkspace(v) {
  const r = Math.hypot(v.x, v.z);
  if (r < MIN_REACH) {
    const k = r < 1e-4 ? 0 : MIN_REACH / r;
    v.x = r < 1e-4 ? MIN_REACH : v.x * k;
    v.z *= k;
  } else if (r > MAX_REACH) {
    v.x *= MAX_REACH / r;
    v.z *= MAX_REACH / r;
  }
  v.y = clamp(v.y, 0.12, 1.4);
  return v;
}

// Base yaw + planar two-link solve, elbow up, tool kept vertical
function solveIK(target, out) {
  const wy = target.y + TOOL_LEN - SHOULDER_Y;
  const r = Math.hypot(target.x, target.z);
  const d = clamp(Math.hypot(r, wy), Math.abs(L1 - L2) + 0.02, L1 + L2 - 0.02);
  out.yaw = Math.atan2(-target.z, target.x);
  out.s = Math.atan2(wy, r) + Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  out.e = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
}

function binUnder(x, z) {
  return CLASS_KEYS.find(
    (cls) => Math.abs(x - BINS[cls].x) < BIN_SIZE.w / 2 - 0.04 && Math.abs(z - BINS[cls].z) < BIN_SIZE.d / 2 - 0.04
  );
}

const onBeltArea = (x, z) =>
  x > BELT.xStart && x < BELT.xEnd && Math.abs(z - BELT.z) < BELT.width / 2;

// ---------- Store ----------
function createStore() {
  const spring = (x) => ({ x, v: 0 });
  return {
    now: 0,
    nextId: 1,
    items: [],
    labelEls: {},
    binEls: {},
    hudEls: {},
    stats: { plastic: 0, metal: 0, paper: 0, wrong: 0 },
    cycle: { last: 0 },
    pagePointer: { x: 0, y: 0 },
    hoverPoint: new THREE.Vector3(),
    hasHover: false,
    lastInteract: -Infinity,
    hoverItem: null,
    hoverBin: null,
    hoverBelt: false,
    binFlash: {},
    lastSpawn: 0,
    scan: null,
    reduceMotion: false,
    isTouch: false,
    notify: () => {},
    arm: {
      phase: "home",
      phaseT: 0,
      item: null,
      manualTask: false,
      dropBin: null,
      placePoint: new THREE.Vector3(),
      ee: HOME.clone(),
      eeVel: new THREE.Vector3(),
      goal: HOME.clone(),
      grip: spring(0),
      gripTarget: 0,
      joints: { yaw: spring(0), s: spring(1.2), e: spring(1.6), roll: spring(0) },
    },
  };
}

const isManual = (store) => store.now - store.lastInteract < MANUAL_TIMEOUT;

function spawnItem(store, atX) {
  if (store.items.length >= MAX_ITEMS) return;
  const cls = CLASS_KEYS[Math.floor(Math.random() * CLASS_KEYS.length)];
  const half = CLASSES[cls].half;
  // Anything spawned past the scanner would never be classified, so keep it upstream
  const x = atX === undefined ? BELT.xStart : clamp(atX, BELT.xStart, SCAN_X - 0.25);
  store.items.push({
    id: store.nextId++,
    cls,
    half,
    pos: new THREE.Vector3(x, BELT.y + half, BELT.z + (Math.random() - 0.5) * 0.2),
    rotY: Math.random() * Math.PI,
    tilt: 0,
    spin: 0,
    confidence: (0.9 + Math.random() * 0.09).toFixed(2),
    born: store.now,
    onBelt: true,
    scanned: false,
    scanAt: 0,
    held: false,
    falling: false,
    vy: 0,
    bounced: false,
    done: false,
    doneAt: 0,
    scale: 0,
  });
  store.lastSpawn = store.now;
  store.notify();
}

// ---------- Simulation, camera, overlays ----------
function Controller({ store }) {
  const { camera, size, gl } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const solved = useMemo(() => ({ yaw: 0, s: 0, e: 0 }), []);
  const camLook = useMemo(() => new THREE.Vector3(-0.3, 0.4, 0.1), []);
  const camOffset = useMemo(() => new THREE.Vector3(3.4, 2.05, 4.0), []);
  const camGoal = useMemo(() => new THREE.Vector3(), []);
  const lastHud = useRef(0);
  const lastHint = useRef("");

  const setPhase = (phase) => {
    const arm = store.arm;
    arm.phase = phase;
    arm.phaseT = 0;
    const item = arm.item;
    if (phase === "grip") arm.gripTarget = 1;
    if (phase === "lift" && item) {
      item.held = true;
      item.onBelt = false;
    }
    if (phase === "release" && item) {
      arm.gripTarget = 0;
      item.held = false;
      item.falling = true;
      item.vy = 0;
      item.bounced = false;
      item.spin = (Math.random() - 0.5) * 6;
    }
    if (phase === "return") {
      arm.item = null;
      arm.manualTask = false;
      arm.dropBin = null;
    }
    if (phase === "approach" && item) item.pickStart = store.now;
  };
  store.setPhase = setPhase;

  const project = (v, el, yOffset, keepInside) => {
    ndc.set(v.x, v.y + yOffset, v.z).project(camera);
    let x = (ndc.x * 0.5 + 0.5) * size.width;
    const y = (-ndc.y * 0.5 + 0.5) * size.height;
    if (keepInside) {
      const half = el.offsetWidth / 2 + 8;
      x = clamp(x, half, size.width - half);
    }
    el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  };

  // One fixed-size physics/logic step. Called several times per frame when the
  // frame rate is low, so the cell runs at the same speed on every device.
  const simulate = (dt, instant) => {
    store.now += dt;
    const now = store.now;
    const { arm, items } = store;
    const manual = isManual(store);

    // ----- Items: belt, scanner, falling, settling -----
    let onBeltCount = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.held) {
        it.pos.copy(arm.ee);
        it.rotY = arm.joints.yaw.x * -1 + arm.joints.roll.x;
        it.tilt *= 0.8;
      } else if (it.falling) {
        it.vy -= 9 * dt;
        it.pos.y += it.vy * dt;
        it.tilt += it.spin * dt;
        const bin = binUnder(it.pos.x, it.pos.z);
        const beltHere = onBeltArea(it.pos.x, it.pos.z);
        const floor = (bin ? 0.025 : beltHere ? BELT.y : 0) + it.half;
        if (it.pos.y <= floor) {
          it.pos.y = floor;
          if (!it.bounced && it.vy < -1.2) {
            it.vy = -it.vy * 0.28; // one small bounce
            it.bounced = true;
            it.spin *= 0.4;
          } else {
            it.falling = false;
            it.vy = 0;
            if (beltHere && !bin) {
              it.onBelt = true; // set back on the belt: it keeps riding
            } else {
              it.done = true;
              it.doneAt = now;
              if (bin) {
                const correct = bin === it.cls;
                if (correct) store.stats[it.cls] += 1;
                else store.stats.wrong += 1;
                store.binFlash[bin] = { at: now, correct };
                if (correct && it.pickStart) store.cycle.last = now - it.pickStart;
              }
            }
          }
        }
      } else if (it.done) {
        it.tilt += wrapAngle(Math.round(it.tilt / (Math.PI / 2)) * (Math.PI / 2) - it.tilt) * 0.2;
        const age = now - it.doneAt;
        it.scale = clamp(1 - (age - 1.4) / 0.4, 0, 1);
        if (age > 1.8) {
          items.splice(i, 1);
          store.notify();
          continue;
        }
      } else if (it.onBelt) {
        onBeltCount += 1;
        it.pos.x += BELT.speed * dt;
        it.tilt += wrapAngle(Math.round(it.tilt / (Math.PI / 2)) * (Math.PI / 2) - it.tilt) * 0.2;
        if (!it.scanned && it.pos.x >= SCAN_X) {
          it.scanned = true;
          it.scanAt = now;
          store.scan = { item: it, start: now };
        }
        if (it.pos.x > BELT.xEnd + 0.1) {
          if (arm.item === it) setPhase("return");
          items.splice(i, 1);
          store.notify();
          continue;
        }
      }
      if (!it.done) it.scale = instant ? 1 : Math.min(1, it.scale + dt / 0.25);
    }
    if (store.scan && now - store.scan.start > 0.55) store.scan = null;
    if (!instant && now - store.lastSpawn > 2.8 && onBeltCount < 3) spawnItem(store);

    // ----- Arm task logic -----
    arm.phaseT += dt;
    const item = arm.item;
    const goal = arm.goal;
    const hover = store.hoverPoint;

    // Aim slightly ahead of items that are still moving on the belt
    const lead = (it, t) => (it.onBelt ? BELT.speed * t : 0);

    switch (arm.phase) {
      case "home": {
        if (manual && store.hasHover) {
          goal.set(hover.x, 0.75, hover.z);
        } else {
          // Idle "breathing" so the machine never looks frozen
          goal.set(HOME.x + Math.sin(now * 0.6) * 0.05, HOME.y + Math.sin(now * 0.9) * 0.03, HOME.z);
        }
        if (!manual) {
          let best = null;
          for (const it of items) {
            if (it.scanned && now - it.scanAt > 0.6 && it.onBelt && !it.falling && !it.done) {
              if (it.pos.x > -0.6 && it.pos.x < 1.4 && (!best || it.pos.x > best.pos.x)) best = it;
            }
          }
          if (best) {
            arm.item = best;
            arm.manualTask = false;
            setPhase("approach");
          }
        }
        break;
      }
      case "approach":
        goal.set(item.pos.x + lead(item, 0.45), SAFE_Y, item.pos.z);
        if (arm.ee.distanceTo(goal) < 0.08) setPhase("descend");
        break;
      case "descend":
        goal.set(item.pos.x + lead(item, 0.12), item.pos.y, item.pos.z);
        if (arm.ee.distanceTo(goal) < 0.035 && arm.eeVel.length() < 0.6) setPhase("grip");
        break;
      case "grip":
        goal.set(item.pos.x, item.pos.y, item.pos.z);
        if (item.onBelt) item.onBelt = false; // clamped: belt no longer drives it
        if (arm.phaseT > 0.16) setPhase("lift");
        break;
      case "lift":
        goal.set(arm.ee.x, SAFE_Y, arm.ee.z);
        if (Math.abs(arm.ee.y - SAFE_Y) < 0.06) {
          if (arm.manualTask) setPhase("hold");
          else {
            arm.dropBin = item.cls;
            setPhase("carry");
          }
        }
        break;
      case "hold":
        // Carrying for the visitor: follow the cursor at travel height
        goal.set(store.hasHover ? hover.x : arm.ee.x, SAFE_Y - 0.1, store.hasHover ? hover.z : arm.ee.z);
        if (!manual) {
          arm.dropBin = item.cls; // visitor walked away: the autopilot finishes the job
          setPhase("carry");
        }
        break;
      case "carry": {
        const bin = BINS[arm.dropBin];
        goal.set(bin.x, 0.82, bin.z);
        if (arm.ee.distanceTo(goal) < 0.05 && arm.eeVel.length() < 0.5) setPhase("release");
        break;
      }
      case "place":
        goal.set(arm.placePoint.x, Math.max(arm.placePoint.y, 0.55), arm.placePoint.z);
        if (arm.ee.distanceTo(goal) < 0.05 && arm.eeVel.length() < 0.5) setPhase("release");
        break;
      case "release":
        if (arm.phaseT > 0.22) setPhase("return");
        break;
      case "return":
        goal.set(arm.ee.x, SAFE_Y, arm.ee.z);
        if (arm.ee.y > SAFE_Y - 0.08 || arm.phaseT > 0.6) setPhase("home");
        break;
      default:
        break;
    }
    clampToWorkspace(goal);

    // ----- Motion: spring the gripper toward the goal, then the joints toward the IK pose -----
    const careful = arm.phase === "descend" || arm.phase === "grip";
    if (instant) {
      arm.ee.copy(goal);
      arm.eeVel.set(0, 0, 0);
    } else {
      springVec(arm.ee, arm.eeVel, goal, careful ? 2.6 : 1.5, careful ? 1 : 0.82, careful ? 1.2 : 2.5, dt);
    }

    solveIK(arm.ee, solved);
    const j = arm.joints;
    const rollTarget = item && !item.held && (arm.phase === "approach" || arm.phase === "descend" || arm.phase === "grip")
      ? wrapAngle(((item.rotY + solved.yaw) % Math.PI + Math.PI) % Math.PI - Math.PI / 2)
      : arm.phase === "home"
      ? 0
      : j.roll.x;
    if (instant) {
      j.yaw.x = solved.yaw;
      j.s.x = solved.s;
      j.e.x = solved.e;
      j.roll.x = rollTarget;
      arm.grip.x = arm.gripTarget;
    } else {
      // Unwrap yaw so the base never spins the long way round
      const yawTarget = j.yaw.x + wrapAngle(solved.yaw - j.yaw.x);
      springStep(j.yaw, yawTarget, 4, 0.9, dt);
      springStep(j.s, solved.s, 5, 0.9, dt);
      springStep(j.e, solved.e, 5, 0.9, dt);
      springStep(j.roll, rollTarget, 3, 1, dt);
      springStep(arm.grip, arm.gripTarget, 7, 1, dt);
    }

  };

  useFrame((state, rawDt) => {
    const instant = store.reduceMotion;
    const { arm, items } = store;

    // ----- Where is the cursor on the bench? -----
    if (store.hasHover) {
      ray.setFromCamera(state.pointer, camera);
      if (ray.ray.intersectPlane(plane, tmp)) store.hoverPoint.copy(tmp);
    }

    if (instant) {
      simulate(0, true);
    } else {
      // Fixed 1/60 s substeps; skip ahead at most 0.25 s after a stall (e.g. tab switch)
      let remaining = Math.min(rawDt, 0.25);
      while (remaining > 1e-6) {
        const step = Math.min(remaining, 1 / 60);
        simulate(step, false);
        remaining -= step;
      }
    }
    const now = store.now;
    const manual = isManual(store);
    const dt = instant ? 0 : Math.min(rawDt, 0.25);

    // ----- Camera: frame the whole cell for the panel's aspect ratio, plus a little parallax -----
    const aspect = size.width / Math.max(size.height, 1);
    const fit = clamp(1.42 / aspect, 1.08, 1.9);
    const px = store.pagePointer.x;
    const py = store.pagePointer.y;
    camGoal.copy(camOffset).multiplyScalar(fit).add(camLook);
    camGoal.x += px * 0.35;
    camGoal.y += py * 0.2;
    if (instant) camera.position.copy(camGoal);
    else camera.position.lerp(camGoal, 1 - Math.exp(-dt * 3));
    camera.lookAt(camLook);

    // ----- DOM overlays -----
    const narrow = size.width < 440;
    for (const it of items) {
      const el = store.labelEls[it.id];
      if (!el) continue;
      const identified = it.scanned && now - it.scanAt > 0.55;
      const relevant =
        !narrow || store.scan?.item === it || arm.item === it || store.hoverItem === it.id;
      const visible = it.scanned && !it.done && !it.held && !it.falling && relevant;
      el.classList.toggle("is-visible", visible);
      el.classList.toggle("is-identified", identified);
      el.classList.toggle("is-hovered", store.hoverItem === it.id);
      if (visible) project(it.pos, el, it.half + 0.1, true);
    }
    for (const cls of CLASS_KEYS) {
      const el = store.binEls[cls];
      if (!el) continue;
      const flash = store.binFlash[cls];
      const flashing = flash && now - flash.at < 0.9;
      el.classList.toggle("is-correct", Boolean(flashing && flash.correct));
      el.classList.toggle("is-wrong", Boolean(flashing && !flash.correct));
      el.classList.toggle("is-target", Boolean(arm.item?.held && (store.hoverBin === cls || arm.dropBin === cls)));
      project(tmp.set(BINS[cls].x, 0, BINS[cls].z), el, BIN_SIZE.h + 0.1, false);
    }

    // Cursor feedback
    const holding = Boolean(arm.item?.held);
    gl.domElement.style.cursor =
      store.hoverItem && !holding ? "grab" : holding ? (store.hoverBin ? "copy" : "grabbing") : store.hoverBelt ? "copy" : "crosshair";

    if (now - lastHud.current > 0.15) {
      lastHud.current = now;
      const h = store.hudEls;
      for (const cls of CLASS_KEYS) if (h[cls]) h[cls].textContent = String(store.stats[cls]).padStart(2, "0");
      if (h.wrong) h.wrong.textContent = String(store.stats.wrong).padStart(2, "0");
      if (h.cycle) h.cycle.textContent = store.cycle.last ? `${store.cycle.last.toFixed(1)}s` : "--";
      if (h.mode) {
        h.mode.textContent = manual ? "manual" : "autopilot";
        h.mode.parentElement.classList.toggle("is-manual", manual);
      }
      if (h.hint) {
        const tap = store.isTouch ? "tap" : "click";
        let hint;
        if (holding && (arm.phase === "hold" || manual)) hint = `${tap} a bin to sort it · ${tap} anywhere to set it down`;
        else if (manual) hint = `${tap} an item to pick it up · ${tap} the belt to add one`;
        else hint = store.isTouch ? "tap an item to take control" : "hover to take control";
        if (hint !== lastHint.current) {
          h.hint.textContent = hint;
          lastHint.current = hint;
        }
      }
    }
  });

  return null;
}

// ---------- Robot arm ----------
function Arm({ store, mats }) {
  const turret = useRef();
  const upper = useRef();
  const elbow = useRef();
  const wrist = useRef();
  const roll = useRef();
  const fingerL = useRef();
  const fingerR = useRef();
  const led = useRef();

  useFrame(() => {
    const j = store.arm.joints;
    turret.current.rotation.y = j.yaw.x;
    upper.current.rotation.z = j.s.x;
    elbow.current.rotation.z = -j.e.x;
    wrist.current.rotation.z = -Math.PI / 2 - (j.s.x - j.e.x);
    roll.current.rotation.x = j.roll.x;
    const g = clamp(store.arm.grip.x, 0, 1);
    const gap = 0.05 + (1 - g) * 0.075;
    fingerL.current.position.z = gap;
    fingerR.current.position.z = -gap;
    led.current.material = g > 0.5 ? mats.ledRed : mats.ledGreen;
  });

  return (
    <group>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow material={mats.dark}>
        <cylinderGeometry args={[0.5, 0.58, 0.2, 48]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.accent}>
        <torusGeometry args={[0.45, 0.01, 8, 72]} />
      </mesh>

      <group ref={turret} position={[0, 0.2, 0]}>
        <mesh position={[0, 0.2, 0]} castShadow material={mats.body}>
          <cylinderGeometry args={[0.3, 0.37, 0.4, 32]} />
        </mesh>
        <mesh ref={led} position={[0.3, 0.26, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
        </mesh>

        <group position={[0, SHOULDER_Y - 0.2, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={mats.joint}>
            <cylinderGeometry args={[0.17, 0.17, 0.48, 32]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.accent}>
            <torusGeometry args={[0.17, 0.007, 8, 48]} />
          </mesh>

          <group ref={upper}>
            <mesh position={[L1 / 2, 0, 0]} castShadow material={mats.body}>
              <boxGeometry args={[L1, 0.2, 0.2]} />
            </mesh>
            <mesh position={[L1 / 2, 0.101, 0]} material={mats.accent}>
              <boxGeometry args={[L1 * 0.6, 0.004, 0.02]} />
            </mesh>

            <group ref={elbow} position={[L1, 0, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={mats.joint}>
                <cylinderGeometry args={[0.13, 0.13, 0.34, 32]} />
              </mesh>
              <mesh position={[L2 / 2, 0, 0]} castShadow material={mats.body}>
                <boxGeometry args={[L2, 0.15, 0.15]} />
              </mesh>

              <group ref={wrist} position={[L2, 0, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={mats.joint}>
                  <cylinderGeometry args={[0.095, 0.095, 0.24, 24]} />
                </mesh>
                <mesh position={[0.12, 0, 0]} material={mats.body}>
                  <boxGeometry args={[0.12, 0.1, 0.1]} />
                </mesh>
                {/* Roll axis: the gripper turns to match each item */}
                <group ref={roll} position={[0.18, 0, 0]}>
                  <mesh rotation={[0, 0, Math.PI / 2]} material={mats.joint}>
                    <cylinderGeometry args={[0.06, 0.06, 0.04, 20]} />
                  </mesh>
                  <mesh position={[0.07, 0, 0]} castShadow material={mats.joint}>
                    <boxGeometry args={[0.06, 0.09, 0.3]} />
                  </mesh>
                  <mesh ref={fingerL} position={[0.16, 0, 0.1]} castShadow material={mats.finger}>
                    <boxGeometry args={[0.16, 0.05, 0.028]} />
                  </mesh>
                  <mesh ref={fingerR} position={[0.16, 0, -0.1]} castShadow material={mats.finger}>
                    <boxGeometry args={[0.16, 0.05, 0.028]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// ---------- Cursor target ring on the bench ----------
function HoverReticle({ store, mats }) {
  const ref = useRef();
  useFrame(() => {
    const show = store.hasHover && isManual(store) && !store.hoverItem;
    ref.current.visible = show;
    if (show) {
      tmpReticle.copy(store.hoverPoint);
      clampToWorkspace(tmpReticle);
      ref.current.position.set(tmpReticle.x, 0.006, tmpReticle.z);
      ref.current.rotation.z += 0.02;
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={mats.reticle} visible={false}>
      <ringGeometry args={[0.1, 0.12, 32, 1, 0, Math.PI * 1.6]} />
    </mesh>
  );
}
const tmpReticle = new THREE.Vector3();

// ---------- Conveyor with moving belt texture ----------
function Conveyor({ store, mats, onBeltClick }) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 32;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1a2521";
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = "#243330";
    ctx.fillRect(0, 0, 10, 32);
    ctx.fillStyle = "#121a17";
    ctx.fillRect(64, 0, 4, 32);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(14, 1);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  useFrame((_, dt) => {
    if (!store.reduceMotion) texture.offset.x -= (BELT.speed * Math.min(dt, 1 / 30) * 14) / 5.1;
  });

  const length = BELT.xEnd - BELT.xStart + 0.2;
  const cx = (BELT.xStart + BELT.xEnd) / 2;

  return (
    <group position={[cx, 0, BELT.z]}>
      <mesh
        position={[0, BELT.y - 0.03, 0]}
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onBeltClick(e.point);
        }}
        onPointerOver={() => (store.hoverBelt = true)}
        onPointerOut={() => (store.hoverBelt = false)}
      >
        <boxGeometry args={[length, 0.06, BELT.width]} />
        <meshStandardMaterial map={texture} roughness={0.85} metalness={0.1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, BELT.y - 0.02, side * (BELT.width / 2 + 0.03)]} castShadow material={mats.body}>
          <boxGeometry args={[length, 0.11, 0.05]} />
        </mesh>
      ))}
      {[-1, 1].map((end) => (
        <mesh key={end} position={[end * (length / 2), BELT.y - 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.joint}>
          <cylinderGeometry args={[0.06, 0.06, BELT.width + 0.1, 20]} />
        </mesh>
      ))}
      {[-length / 2 + 0.25, 0, length / 2 - 0.25].map((x) => (
        <mesh key={x} position={[x, (BELT.y - 0.06) / 2, 0]} material={mats.dark}>
          <boxGeometry args={[0.08, BELT.y - 0.06, BELT.width - 0.1]} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Camera gantry + scan line ----------
function Scanner({ store, mats }) {
  const line = useRef();
  const light = useRef();
  const lens = useRef();

  useFrame(() => {
    const scan = store.scan;
    line.current.visible = Boolean(scan);
    if (scan) {
      const t = clamp((store.now - scan.start) / 0.55, 0, 1);
      line.current.position.x = scan.item.pos.x - 0.3 + t * 0.6;
      light.current.intensity = 2.2 * Math.sin(t * Math.PI);
    } else {
      light.current.intensity = 0.15;
    }
    lens.current.material = scan ? mats.ledRed : mats.lensIdle;
  });

  const postH = 1.15;
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[SCAN_X, postH / 2, BELT.z + side * 0.5]} castShadow material={mats.dark}>
          <boxGeometry args={[0.07, postH, 0.07]} />
        </mesh>
      ))}
      <mesh position={[SCAN_X, postH, BELT.z]} castShadow material={mats.dark}>
        <boxGeometry args={[0.1, 0.07, 1.07]} />
      </mesh>
      <mesh position={[SCAN_X, postH - 0.14, BELT.z]} castShadow material={mats.body}>
        <boxGeometry args={[0.2, 0.2, 0.26]} />
      </mesh>
      <mesh ref={lens} position={[SCAN_X, postH - 0.25, BELT.z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 20]} />
      </mesh>
      <pointLight ref={light} position={[SCAN_X, 0.8, BELT.z]} color="#f43f5e" intensity={0.15} distance={2.2} />
      <mesh ref={line} position={[SCAN_X, BELT.y + 0.004, BELT.z]} rotation={[-Math.PI / 2, 0, 0]} material={mats.scan}>
        <planeGeometry args={[0.014, BELT.width - 0.04]} />
      </mesh>
    </group>
  );
}

function Bin({ cls, store, mats, onBinClick }) {
  const { w, h, d } = BIN_SIZE;
  const { x, z } = BINS[cls];
  const t = 0.025;
  const rim = useRef();

  useFrame(() => {
    const flash = store.binFlash[cls];
    const flashing = flash && store.now - flash.at < 0.9;
    const holding = store.arm.item?.held;
    rim.current.children.forEach((m) => {
      m.material = flashing ? (flash.correct ? mats.ledGreen : mats.ledRed) : holding && store.hoverBin === cls ? mats.ledGreen : mats.accent;
    });
  });

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onBinClick(cls);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        store.hoverBin = cls;
      }}
      onPointerOut={() => {
        if (store.hoverBin === cls) store.hoverBin = null;
      }}
    >
      <mesh position={[0, t / 2, 0]} receiveShadow material={mats.binFloor}>
        <boxGeometry args={[w, t, d]} />
      </mesh>
      {[
        [0, h / 2, d / 2, w, t],
        [0, h / 2, -d / 2, w, t],
        [w / 2, h / 2, 0, t, d],
        [-w / 2, h / 2, 0, t, d],
      ].map(([px, py, pz, sx, sz], i) => (
        <mesh key={i} position={[px, py, pz]} castShadow receiveShadow material={mats.bin}>
          <boxGeometry args={[sx, h, sz]} />
        </mesh>
      ))}
      <group ref={rim}>
        {[
          [0, d / 2, w + 0.02, 0.02],
          [0, -d / 2, w + 0.02, 0.02],
          [w / 2, 0, 0.02, d + 0.02],
          [-w / 2, 0, 0.02, d + 0.02],
        ].map(([px, pz, sx, sz], i) => (
          <mesh key={i} position={[px, h, pz]} material={mats.accent}>
            <boxGeometry args={[sx, 0.008, sz]} />
          </mesh>
        ))}
      </group>
      {/* Transparent volume makes the whole bin easy to click */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Item({ item, store, mats, onItemClick }) {
  const ref = useRef();
  useFrame(() => {
    const m = ref.current;
    m.position.copy(item.pos);
    m.rotation.set(item.tilt, item.rotY, 0);
    const hovered = store.hoverItem === item.id && !store.arm.item?.held;
    m.scale.setScalar(Math.max(0.001, item.scale) * (hovered ? 1.12 : 1));
  });
  const h = item.half * 2;
  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
      material={mats.items[item.cls]}
      onClick={(e) => {
        e.stopPropagation();
        onItemClick(item);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        store.hoverItem = item.id;
      }}
      onPointerOut={() => {
        if (store.hoverItem === item.id) store.hoverItem = null;
      }}
    >
      {item.cls === "plastic" && <capsuleGeometry args={[0.065, h - 0.13, 6, 16]} />}
      {item.cls === "metal" && <cylinderGeometry args={[0.08, 0.08, h, 24]} />}
      {item.cls === "paper" && <boxGeometry args={[0.2, h, 0.16]} />}
    </mesh>
  );
}

function Scene({ store, handlers }) {
  const mats = useMemo(
    () => ({
      dark: new THREE.MeshStandardMaterial({ color: "#121b18", roughness: 0.75, metalness: 0.35 }),
      body: new THREE.MeshStandardMaterial({ color: "#1e2a26", roughness: 0.5, metalness: 0.55 }),
      joint: new THREE.MeshStandardMaterial({ color: "#2b3936", roughness: 0.35, metalness: 0.85 }),
      finger: new THREE.MeshStandardMaterial({ color: "#8a9a94", roughness: 0.4, metalness: 0.9 }),
      accent: new THREE.MeshStandardMaterial({ color: "#10b981", emissive: "#10b981", emissiveIntensity: 0.35, roughness: 0.4 }),
      ledGreen: new THREE.MeshStandardMaterial({ color: "#34d399", emissive: "#34d399", emissiveIntensity: 1.6 }),
      ledRed: new THREE.MeshStandardMaterial({ color: "#f43f5e", emissive: "#f43f5e", emissiveIntensity: 1.8 }),
      lensIdle: new THREE.MeshStandardMaterial({ color: "#0b1210", roughness: 0.2, metalness: 0.6 }),
      scan: new THREE.MeshBasicMaterial({ color: "#f43f5e", transparent: true, opacity: 0.9 }),
      reticle: new THREE.MeshBasicMaterial({ color: "#34d399", transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
      bin: new THREE.MeshStandardMaterial({ color: "#16211d", roughness: 0.7, metalness: 0.3, transparent: true, opacity: 0.88 }),
      binFloor: new THREE.MeshStandardMaterial({ color: "#0e1513", roughness: 0.9 }),
      floor: new THREE.MeshStandardMaterial({ color: "#0c1412", roughness: 0.95 }),
      items: {
        plastic: new THREE.MeshPhysicalMaterial({ color: "#34d399", roughness: 0.15, metalness: 0, transmission: 0.35, thickness: 0.3, transparent: true, opacity: 0.9 }),
        metal: new THREE.MeshStandardMaterial({ color: "#c3ccc8", roughness: 0.25, metalness: 0.95 }),
        paper: new THREE.MeshStandardMaterial({ color: "#b39f78", roughness: 0.95, metalness: 0 }),
      },
    }),
    []
  );

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[3.5, 6, 3]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[-4, 3, -4]} intensity={0.55} color="#5eead4" />
      <hemisphereLight args={["#2a3330", "#05080a", 0.45]} />

      <mesh
        position={[0, -0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        material={mats.floor}
        onClick={(e) => {
          e.stopPropagation();
          handlers.onFloorClick(e.point);
        }}
      >
        <planeGeometry args={[7.2, 4.6]} />
      </mesh>
      <gridHelper args={[7.2, 24, "#1c2824", "#141d1a"]} position={[0, 0.002, 0]} />

      <Arm store={store} mats={mats} />
      <HoverReticle store={store} mats={mats} />
      <Conveyor store={store} mats={mats} onBeltClick={handlers.onBeltClick} />
      <Scanner store={store} mats={mats} />
      {CLASS_KEYS.map((cls) => (
        <Bin key={cls} cls={cls} store={store} mats={mats} onBinClick={handlers.onBinClick} />
      ))}
      {store.items.map((item) => (
        <Item key={item.id} item={item} store={store} mats={mats} onItemClick={handlers.onItemClick} />
      ))}
      <Controller store={store} />
    </>
  );
}

// ---------- Component ----------
export default function RoboticCell() {
  const storeRef = useRef(null);
  if (!storeRef.current) storeRef.current = createStore();
  const store = storeRef.current;

  const wrapRef = useRef(null);
  const viewportRef = useRef(null);
  const [, setVersion] = useState(0);
  const [active, setActive] = useState(true);
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  store.reduceMotion = reduceMotion;
  store.isTouch = window.matchMedia("(hover: none)").matches;
  store.notify = useCallback(() => setVersion((v) => v + 1), []);

  const touch = useCallback(() => {
    store.lastInteract = store.now;
  }, [store]);

  // With reduced motion there is no loop, so redraw after each interaction
  const invalidateRef = useRef(null);
  const redraw = useCallback(() => invalidateRef.current?.(), []);

  const handlers = useMemo(() => {
    const holding = () => Boolean(store.arm.item?.held);
    return {
      onItemClick: (item) => {
        touch();
        const arm = store.arm;
        if (holding() || arm.phase === "grip" || item.held || item.done || item.falling) return;
        // Abandon an autopilot pick that has not grabbed anything yet
        const previous = arm.item;
        if (previous && previous !== item && !previous.held && !previous.done && !previous.falling) {
          previous.onBelt = true;
        }
        store.arm.item = item;
        store.arm.manualTask = true;
        store.arm.dropBin = null;
        store.setPhase?.("approach");
        redraw();
      },
      onBinClick: (cls) => {
        touch();
        if (!holding()) return;
        store.arm.dropBin = cls;
        store.setPhase?.("carry");
        redraw();
      },
      onBeltClick: (point) => {
        touch();
        if (holding()) {
          store.arm.placePoint.set(point.x, BELT.y + 0.35, point.z);
          store.setPhase?.("place");
        } else {
          spawnItem(store, point.x);
        }
        redraw();
      },
      onFloorClick: (point) => {
        touch();
        if (!holding()) return;
        store.arm.placePoint.set(point.x, 0.55, point.z);
        store.setPhase?.("place");
        redraw();
      },
    };
  }, [store, touch, redraw]);

  // Reduced motion: a populated still frame instead of an empty bench
  useEffect(() => {
    if (!reduceMotion || store.items.length) return;
    [-1.9, -0.4, 0.6].forEach((x, i) => {
      spawnItem(store);
      const it = store.items[store.items.length - 1];
      it.pos.x = x;
      it.scale = 1;
      if (i > 0) {
        it.scanned = true;
        it.scanAt = -5;
      }
    });
  }, [reduceMotion, store]);

  useEffect(() => {
    const el = wrapRef.current;
    const vp = viewportRef.current;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting && !document.hidden));
    io.observe(el);
    const onVis = () => setActive(!document.hidden && el.getBoundingClientRect().bottom > 0);
    document.addEventListener("visibilitychange", onVis);

    const onPageMove = (e) => {
      store.pagePointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      store.pagePointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPageMove, { passive: true });

    // Hovering the cell with a mouse hands the arm to the visitor
    const onEnter = (e) => {
      if (e.pointerType === "mouse") store.hasHover = true;
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      store.hasHover = true;
      touch();
      if (reduceMotion) redraw();
    };
    const onLeave = () => {
      store.hasHover = false;
      store.hoverItem = null;
      store.hoverBin = null;
      store.hoverBelt = false;
    };
    // Touch has no hover: a tap moves the reticle there
    const onDown = (e) => {
      if (e.pointerType === "mouse") return;
      store.hasHover = true;
      touch();
    };
    vp.addEventListener("pointerenter", onEnter);
    vp.addEventListener("pointermove", onMove);
    vp.addEventListener("pointerleave", onLeave);
    vp.addEventListener("pointerdown", onDown);

    const onKey = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        spawnItem(store);
        redraw();
      }
    };
    vp.addEventListener("keydown", onKey);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onPageMove);
      vp.removeEventListener("pointerenter", onEnter);
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("pointerleave", onLeave);
      vp.removeEventListener("pointerdown", onDown);
      vp.removeEventListener("keydown", onKey);
    };
  }, [store, touch, redraw, reduceMotion]);

  const frameloop = active && !reduceMotion ? "always" : "demand";

  return (
    <figure className="robotic-cell" ref={wrapRef}>
      <div
        className="cell-viewport"
        ref={viewportRef}
        tabIndex={0}
        role="img"
        aria-label="Interactive 3D robotic sorting cell. A camera classifies items on a conveyor as plastic, metal or paper and a robot arm sorts them into bins. Hover to control the arm, click an item to pick it up and a bin to drop it. Press Space to add an item."
      >
        <Canvas
          shadows
          frameloop={frameloop}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ fov: 34, position: [3.4, 2.5, 4.05], near: 0.1, far: 40 }}
          onCreated={({ invalidate }) => {
            invalidateRef.current = invalidate;
          }}
        >
          <Scene store={store} handlers={handlers} />
        </Canvas>

        {/* Vision labels, projected from 3D each frame */}
        <div className="cell-overlay" aria-hidden="true">
          {store.items.map((item) => (
            <div
              key={item.id}
              className="cell-label"
              ref={(el) => {
                if (el) store.labelEls[item.id] = el;
                else delete store.labelEls[item.id];
              }}
            >
              <span className="cell-label-scan">scanning</span>
              <span className="cell-label-cls">
                {CLASSES[item.cls].label} <b>{item.confidence}</b>
              </span>
            </div>
          ))}
          {CLASS_KEYS.map((cls) => (
            <div
              key={cls}
              className="cell-bin-label"
              ref={(el) => {
                if (el) store.binEls[cls] = el;
              }}
            >
              {CLASSES[cls].label}
            </div>
          ))}
        </div>

        <p className="cell-hint" aria-hidden="true" ref={(el) => el && (store.hudEls.hint = el)}>
          {store.isTouch ? "tap an item to take control" : "hover to take control"}
        </p>
      </div>

      <figcaption className="cell-hud">
        <span className="hud-group">
          <span className="hud-key">sorted</span>
          {CLASS_KEYS.map((cls) => (
            <span key={cls} className="hud-stat" data-cls={cls}>
              <span className="hud-swatch" />
              <span ref={(el) => el && (store.hudEls[cls] = el)}>00</span>
            </span>
          ))}
          <span className="hud-stat hud-wrong" title="Items dropped in the wrong bin">
            <span className="hud-cross" aria-hidden="true">×</span>
            <span ref={(el) => el && (store.hudEls.wrong = el)}>00</span>
          </span>
        </span>
        <span className="hud-group hud-cycle">
          <span className="hud-key">cycle</span>
          <span ref={(el) => el && (store.hudEls.cycle = el)}>--</span>
        </span>
        <span className="hud-status">
          <span className="hud-dot" />
          <span ref={(el) => el && (store.hudEls.mode = el)}>autopilot</span>
        </span>
      </figcaption>
    </figure>
  );
}
