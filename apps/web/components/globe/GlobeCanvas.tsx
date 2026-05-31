"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Points, PointsMaterial } from "three";

import type { VoiceGlobeState } from "@/lib/voice/parse-voice-events";

/** ADR-015 amendment: ≤12k points budget. */
export const GLOBE_POINT_COUNT = 8192;

/** ADR-015 amendment: ≤8k tris for rings (3× torus @ 48×12 segments ≈ 6912 tris). */
export const GLOBE_RING_TRIANGLE_BUDGET = 8000;

const GLOBE_MODE = "point-cloud" as const;

function fibonacciSpherePositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    positions[i * 3] = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
  }

  return positions;
}

type GlobeSceneProps = {
  voiceState: VoiceGlobeState;
  outputLevel: number;
};

function PointCloudEarth({
  voiceState,
  outputLevel,
}: GlobeSceneProps): React.ReactElement {
  const pointsRef = useRef<Points>(null);
  const positions = useMemo(
    () => fibonacciSpherePositions(GLOBE_POINT_COUNT, 1.28),
    [],
  );

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current) return;

    const material = pointsRef.current.material as PointsMaterial;
    const t = clock.elapsedTime;

    pointsRef.current.rotation.y += delta * (voiceState === "thinking" ? 0.16 : 0.08);

    if (voiceState === "listening") {
      material.opacity = 0.95 + Math.sin(t * 4) * 0.05;
      pointsRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.02);
    } else if (voiceState === "thinking") {
      const pulse = 1 + Math.sin(t * 5) * 0.04;
      material.opacity = 0.75 + Math.sin(t * 5) * 0.15;
      pointsRef.current.scale.setScalar(pulse);
    } else if (voiceState === "speaking") {
      const scale = 1 + outputLevel * 0.18;
      material.opacity = 0.85 + outputLevel * 0.15;
      pointsRef.current.scale.setScalar(scale);
    } else {
      material.opacity = 0.88;
      pointsRef.current.scale.setScalar(1);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        color="#22d3ee"
        transparent
        opacity={0.88}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function CompassRings({ voiceState, outputLevel }: GlobeSceneProps): React.ReactElement {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const speed =
      voiceState === "thinking"
        ? 0.06
        : voiceState === "listening"
          ? 0.045
          : 0.03;

    groupRef.current.rotation.z -= delta * speed;
    groupRef.current.rotation.x += delta * speed * 0.5;

    const pulse =
      voiceState === "listening"
        ? 1 + Math.sin(t * 4) * 0.03
        : voiceState === "thinking"
          ? 1 + Math.sin(t * 5) * 0.05
          : voiceState === "speaking"
            ? 1 + outputLevel * 0.04
            : 1;
    groupRef.current.scale.setScalar(pulse);
  });

  const ringSpecs = [
    { radius: 1.72, tube: 0.012, opacity: 0.45, rotation: [Math.PI / 2.4, 0, 0] as const },
    { radius: 2.05, tube: 0.008, opacity: 0.3, rotation: [Math.PI / 3.1, 0.35, 0] as const },
    { radius: 2.38, tube: 0.006, opacity: 0.2, rotation: [Math.PI / 4.2, -0.25, 0.15] as const },
  ];

  return (
    <group ref={groupRef}>
      {ringSpecs.map((ring) => (
        <mesh key={ring.radius} rotation={ring.rotation}>
          <torusGeometry args={[ring.radius, ring.tube, 12, 48]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={ring.opacity} />
        </mesh>
      ))}
    </group>
  );
}

type GlobeCanvasProps = {
  voiceState?: VoiceGlobeState;
  outputLevel?: number;
};

export function GlobeCanvas({
  voiceState = "idle",
  outputLevel = 0,
}: GlobeCanvasProps): React.ReactElement {
  return (
    <Canvas
      data-testid="globe-canvas"
      data-globe-mode={GLOBE_MODE}
      data-globe-voice-state={voiceState}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 4.6], fov: 40 }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 4, 5]} intensity={0.85} color="#22d3ee" />
      <PointCloudEarth voiceState={voiceState} outputLevel={outputLevel} />
      <CompassRings voiceState={voiceState} outputLevel={outputLevel} />
    </Canvas>
  );
}

export { GLOBE_MODE };
