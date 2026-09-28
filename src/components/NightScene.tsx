"use client";
import { useEffect, useRef, useState } from "react";

type Scene = "platform" | "cabin" | "tunnel" | "boarding";
export function NightScene({
  scene = "platform",
  carriage = "rain",
  debug = false,
}: {
  scene?: Scene;
  carriage?: string;
  debug?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"3d" | "2d">("2d");
  const [fps, setFps] = useState(60);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const noWebgl = new URLSearchParams(location.search).has("no-webgl");
    let cleanup = () => {};
    if (!reduced && !noWebgl) {
      try {
        const gl = canvas.getContext("webgl2");
        if (gl) {
          import("three")
            .then((THREE) => {
              const renderer = new THREE.WebGLRenderer({
                canvas,
                context: gl,
                antialias: false,
                powerPreference: "high-performance",
              });
              renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
              const world = new THREE.Scene();
              world.background = new THREE.Color(
                scene === "tunnel" ? 0x020305 : 0x04060a,
              );
              world.fog = new THREE.FogExp2(0x070a10, 0.045);
              const camera = new THREE.PerspectiveCamera(
                innerWidth < 600 ? 62 : innerWidth < 1200 ? 56 : 48,
                1,
                0.1,
                100,
              );
              camera.position.set(
                scene === "platform" ? 0 : 2.7,
                scene === "platform" ? 2.2 : 1.7,
                scene === "platform" ? 8 : 3.5,
              );
              camera.lookAt(0, 1.2, 0);
              world.add(new THREE.HemisphereLight(0x9fb7d2, 0x11100d, 1.2));
              const lamp = new THREE.PointLight(
                carriage === "moon" ? 0xdbe5ff : 0xffcf8a,
                4,
                18,
              );
              lamp.position.set(-3, 5, 2);
              world.add(lamp);
              const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(80, 30),
                new THREE.MeshStandardMaterial({
                  color: 0x0b1017,
                  roughness: 0.28,
                  metalness: 0.3,
                }),
              );
              floor.rotation.x = -Math.PI / 2;
              world.add(floor);
              const material = new THREE.MeshStandardMaterial({
                color: 0x18212a,
                roughness: 0.65,
              });
              const accent = new THREE.MeshStandardMaterial({
                color: 0xdcae6a,
                emissive: 0x6d4720,
              });
              if (scene === "platform") {
                for (let i = -8; i <= 8; i++) {
                  const post = new THREE.Mesh(
                    new THREE.BoxGeometry(0.14, 4.4, 0.14),
                    material,
                  );
                  post.position.set(i * 2.8, 2.2, -1);
                  world.add(post);
                  const light = new THREE.Mesh(
                    new THREE.BoxGeometry(1.5, 0.08, 0.18),
                    accent,
                  );
                  light.position.set(i * 2.8, 4.2, -1);
                  world.add(light);
                }
                const edge = new THREE.Mesh(
                  new THREE.BoxGeometry(50, 0.08, 0.5),
                  new THREE.MeshStandardMaterial({ color: 0xc8b796 }),
                );
                edge.position.set(0, 0.04, -3.5);
                world.add(edge);
                for (let i = 0; i < 45; i++) {
                  const drop = new THREE.Mesh(
                    new THREE.BoxGeometry(0.012, 0.45 + (i % 4) * 0.12, 0.012),
                    new THREE.MeshBasicMaterial({
                      color: 0xaac5d2,
                      transparent: true,
                      opacity: 0.35,
                    }),
                  );
                  drop.position.set(
                    (i % 15) * 2 - 14,
                    2 + (i % 7),
                    -2 - (i % 8),
                  );
                  world.add(drop);
                }
              } else {
                const frame = new THREE.Mesh(
                  new THREE.BoxGeometry(5.5, 3.4, 0.18),
                  material,
                );
                frame.position.set(0, 1.8, 0);
                world.add(frame);
                const glass = new THREE.Mesh(
                  new THREE.PlaneGeometry(4.5, 2.5),
                  new THREE.MeshPhysicalMaterial({
                    color: scene === "tunnel" ? 0x050505 : 0x10223a,
                    transmission: 0.25,
                    transparent: true,
                    opacity: 0.92,
                    roughness: 0.18,
                  }),
                );
                glass.position.set(0, 1.8, 0.11);
                world.add(glass);
                const table = new THREE.Mesh(
                  new THREE.BoxGeometry(2.4, 0.08, 0.7),
                  new THREE.MeshStandardMaterial({
                    color: 0x5a4535,
                    roughness: 0.8,
                  }),
                );
                table.position.set(0.6, 0.55, 1);
                world.add(table);
                for (let i = 0; i < 16; i++) {
                  const light = new THREE.Mesh(
                    new THREE.SphereGeometry(0.035, 8, 8),
                    accent,
                  );
                  light.position.set(-12 + i * 2.3, 1.6 + (i % 3) * 0.2, -3);
                  world.add(light);
                }
              }
              let frame = 0;
              let ready = false;
              let last = performance.now();
              let disposed = false;
              const resize = () => {
                const rect = canvas.getBoundingClientRect();
                renderer.setSize(rect.width, rect.height, false);
                camera.aspect = rect.width / Math.max(1, rect.height);
                camera.updateProjectionMatrix();
              };
              resize();
              addEventListener("resize", resize);
              const loop = (now: number) => {
                if (disposed) return;
                frame++;
                if (frame % 30 === 0) {
                  setFps(Math.round(30000 / Math.max(1, now - last)));
                  last = now;
                }
                if (!reduced) {
                  camera.position.y += Math.sin(now / 2200) * 0.0008;
                  if (scene !== "platform")
                    world.children
                      .filter(
                        (object) =>
                          object.type === "Mesh" && object.position.z === -3,
                      )
                      .forEach((object) => {
                        object.position.x += 0.08;
                        if (object.position.x > 12) object.position.x = -12;
                      });
                }
                renderer.render(world, camera);
                if (!ready) {
                  ready = true;
                  setMode("3d");
                }
                requestAnimationFrame(loop);
              };
              requestAnimationFrame(loop);
              cleanup = () => {
                disposed = true;
                removeEventListener("resize", resize);
                renderer.dispose();
                world.clear();
              };
            })
            .catch(() => {
              setMode("2d");
              draw2D(canvas, scene, reduced);
            });
          return () => cleanup();
        }
      } catch {
        /* 2D fallback below */
      }
    }
    cleanup = draw2D(canvas, scene, reduced);
    return cleanup;
  }, [scene, carriage]);
  return (
    <div className="night-scene" data-renderer={mode} aria-hidden="true">
      <canvas ref={canvasRef} />
      {debug && (
        <div className="debug-overlay">
          {mode.toUpperCase()} · {fps} FPS · DPR{" "}
          {typeof devicePixelRatio === "number"
            ? Math.min(devicePixelRatio, 1.5).toFixed(1)
            : "1"}{" "}
          · quality 1
        </div>
      )}
    </div>
  );
}

function draw2D(canvas: HTMLCanvasElement, scene: Scene, reduced: boolean) {
  const context = canvas.getContext("2d")!;
  let stopped = false;
  let frame = 0;
  const render = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 1.5);
    if (
      canvas.width !== rect.width * dpr ||
      canvas.height !== rect.height * dpr
    ) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width,
      h = rect.height;
    const gradient = context.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#04060a");
    gradient.addColorStop(0.65, scene === "tunnel" ? "#030405" : "#0b151c");
    gradient.addColorStop(1, "#10171f");
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
    if (scene === "platform") {
      context.fillStyle = "#131a20";
      context.fillRect(0, h * 0.6, w, h * 0.4);
      context.fillStyle = "#c8b796";
      context.fillRect(0, h * 0.63, w, 5);
      context.strokeStyle = "#202c33";
      context.lineWidth = 6;
      for (let x = 40; x < w; x += 140) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, h * 0.62);
        context.stroke();
        context.fillStyle = "#dcae6a";
        context.fillRect(x - 36, 32, 72, 4);
      }
      context.fillStyle = "#0b1017";
      context.fillRect(w * 0.12, h * 0.34, w * 0.24, h * 0.17);
      context.fillStyle = "#efe6d3";
      context.font = "600 12px IBM Plex Mono";
      context.fillText("NOCTURNE", w * 0.15, h * 0.42);
      context.fillStyle = "rgba(220,174,106,.12)";
      for (let x = 20; x < w; x += 90)
        context.fillRect(x, h * 0.68, 40, h * 0.2);
    } else {
      context.strokeStyle = "#3a444b";
      context.lineWidth = 30;
      context.strokeRect(w * 0.12, h * 0.08, w * 0.76, h * 0.68);
      context.fillStyle = scene === "tunnel" ? "#020304" : "#07131d";
      context.fillRect(w * 0.15, h * 0.12, w * 0.7, h * 0.6);
      for (let x = -100 + (frame % 200); x < w; x += 200) {
        context.fillStyle = "#dcae6a";
        context.fillRect(x, h * 0.35, 10, 45);
      }
      context.fillStyle = "#5a4535";
      context.fillRect(w * 0.48, h * 0.76, w * 0.4, 12);
      context.fillStyle = "rgba(239,230,211,.08)";
      context.fillRect(w * 0.15, h * 0.12, w * 0.7, h * 0.6);
    }
    context.strokeStyle = "rgba(190,215,225,.25)";
    context.lineWidth = 1;
    for (let x = (frame * 3) % 36; x < w; x += 36) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x - 14, h * 0.64);
      context.stroke();
    }
    if (!reduced && !stopped) {
      frame++;
      requestAnimationFrame(render);
    }
  };
  render();
  return () => {
    stopped = true;
  };
}
