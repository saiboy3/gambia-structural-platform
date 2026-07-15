import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { ColumnInputs, ColumnResults } from '../../../types/structural';

interface Props { inputs: ColumnInputs; results: ColumnResults }

function ColumnMesh({ inputs, results }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.3;
  });

  const isCirc = inputs.shape === 'circular';
  const W = inputs.b / 100;
  const D = inputs.h / 100;
  const H = (inputs.height * 1000) / 100;
  const cover = inputs.cover / 100;
  const mainDia = results.mainBars.dia / 100;
  const linkDia = results.links.dia / 100;
  const linkSpacing = results.links.spacing / 100;
  const n = results.mainBars.count;

  // Bar positions
  const barPositions: [number, number][] = [];
  if (isCirc) {
    const r = W / 2 - cover - mainDia / 2;
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n - Math.PI / 2;
      barPositions.push([r * Math.cos(a), r * Math.sin(a)]);
    }
  } else {
    const hx = W / 2 - cover - mainDia / 2;
    const hz = D / 2 - cover - mainDia / 2;
    const corners: [number, number][] = [
      [-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz],
    ];
    if (n >= 4) {
      // Corners always present; extras distributed evenly across all 4 faces
      // (not just one) so the cage stays symmetric for any bar count.
      barPositions.push(...corners);
      const extras = n - 4;
      for (let i = 0; i < extras; i++) {
        const side = i % 4;
        const p = Math.floor(i / 4) + 1;
        const total = Math.ceil(extras / 4) + 1;
        const t = p / total;
        if (side === 0) barPositions.push([-hx + t * 2 * hx, -hz]);       // bottom face
        else if (side === 1) barPositions.push([hx, -hz + t * 2 * hz]);   // right face
        else if (side === 2) barPositions.push([-hx + t * 2 * hx, hz]);   // top face
        else barPositions.push([-hx, -hz + t * 2 * hz]);                  // left face
      }
    } else {
      // Fewer than 4 bars (rare, but chooseBars() can return as few as 2)
      // — use only the actual count instead of drawing all 4 corners.
      barPositions.push(...corners.slice(0, n));
    }
  }

  // Link positions (evenly spaced along height)
  const numLinks = Math.floor(H / linkSpacing) + 1;
  const linkYPositions = Array.from({ length: numLinks }, (_, i) => -H / 2 + i * linkSpacing);

  return (
    <group ref={groupRef}>
      {/* Concrete column — semi-transparent */}
      <mesh castShadow receiveShadow>
        {isCirc
          ? <cylinderGeometry args={[W / 2, W / 2, H, 32]} />
          : <boxGeometry args={[W, H, D]} />}
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        {isCirc
          ? <cylinderGeometry args={[W / 2, W / 2, H, 32]} />
          : <boxGeometry args={[W, H, D]} />}
        <meshStandardMaterial color="#475569" wireframe />
      </mesh>

      {/* Main bars (vertical, running full height) */}
      {barPositions.map(([bx, bz], i) => (
        <mesh key={`bar${i}`} position={[bx, 0, bz]} castShadow>
          <cylinderGeometry args={[mainDia / 2, mainDia / 2, H, 8]} />
          <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Horizontal links */}
      {linkYPositions.map((ly, i) => (
        <group key={`link${i}`} position={[0, ly, 0]}>
          {isCirc ? (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[W / 2 - cover + linkDia / 2, linkDia / 2, 6, 32]} />
              <meshStandardMaterial color="#3b82f6" metalness={0.7} roughness={0.3} />
            </mesh>
          ) : (
            // 4 straight link segments
            [
              { pos: [0, 0, -D / 2 + cover] as [number,number,number], rot: [0,0,0] as [number,number,number], len: W - 2 * cover },
              { pos: [0, 0,  D / 2 - cover] as [number,number,number], rot: [0,0,0] as [number,number,number], len: W - 2 * cover },
              { pos: [-W / 2 + cover, 0, 0] as [number,number,number], rot: [0,0,Math.PI/2] as [number,number,number], len: D - 2 * cover },
              { pos: [ W / 2 - cover, 0, 0] as [number,number,number], rot: [0,0,Math.PI/2] as [number,number,number], len: D - 2 * cover },
            ].map((seg, j) => (
              <mesh key={j} position={seg.pos} rotation={seg.rot}>
                <cylinderGeometry args={[linkDia / 2, linkDia / 2, seg.len, 6]} />
                <meshStandardMaterial color="#3b82f6" metalness={0.7} roughness={0.3} />
              </mesh>
            ))
          )}
        </group>
      ))}

      <Text position={[0, H / 2 + 0.4, 0]} fontSize={0.22} color="#1e293b" anchorX="center">
        {inputs.b}{isCirc ? 'mm ⌀' : `×${inputs.h}mm`} — {inputs.height}m
      </Text>
      <Text position={[0, -H / 2 - 0.35, 0]} fontSize={0.18} color="#1e40af" anchorX="center">
        {results.mainBars.count}T{results.mainBars.dia} — T{results.links.dia}@{results.links.spacing}
      </Text>
    </group>
  );
}

export default function Column3D(props: Props) {
  return (
    <div className="w-full rounded-xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 shadow-lg ring-1 ring-slate-700/50" style={{ height: 380 }}>
      <Canvas shadows camera={{ position: [6, 4, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <Suspense fallback={null}>
          <ColumnMesh {...props} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={3} maxDistance={18} autoRotate autoRotateSpeed={1} />
      </Canvas>
      <p className="text-center text-xs text-slate-400 py-1.5 bg-slate-900">Drag to orbit · Scroll to zoom</p>
    </div>
  );
}
