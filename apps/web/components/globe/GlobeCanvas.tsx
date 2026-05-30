"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import type { Mesh } from "three";

/** Icosahedron detail 3 ≈ 5k triangles — under ADR-015 50k budget. */
function GlobeMesh(): React.ReactElement {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.12;
      meshRef.current.rotation.x += delta * 0.04;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.35, 3]} />
      <MeshDistortMaterial
        attach="material"
        color="#0e7490"
        emissive="#22d3ee"
        emissiveIntensity={0.55}
        wireframe
        distort={0.28}
        speed={1.2}
        transparent
        opacity={0.65}
      />
    </mesh>
  );
}

export function GlobeCanvas(): React.ReactElement {
  return (
    <Canvas
      data-testid="globe-canvas"
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 4, 4]} intensity={0.9} color="#22d3ee" />
      <GlobeMesh />
    </Canvas>
  );
}
