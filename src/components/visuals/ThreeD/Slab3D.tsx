import { useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import FitCamera from './FitCamera';
import type { SlabInputs, SlabResults } from '../../../types/structural';

interface Props { inputs: SlabInputs; results: SlabResults }
type MeshProps = Props & { onFit?: (d: number) => void };

function SlabMesh({ inputs, results, onFit }: MeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.2;
  });

  // Scale: 1 unit = 500mm
  const LX = (inputs.lx * 1000) / 500;
  const LY = (inputs.ly * 1000) / 500;
  const H  = inputs.thickness / 500;
  const cover = inputs.cover / 500;
  const diaX = results.barsX.dia / 500;
  const diaY = results.barsY.dia / 500;
  const spacingX = results.barsX.spacing / 500;
  const spacingY = results.barsY.spacing / 500;

  // Bottom X bars (along X axis)
  const numBarsX = Math.floor((LY - 2 * cover) / spacingX) + 1;
  const barsX = Array.from({ length: numBarsX }, (_, i) => -LY / 2 + cover + i * spacingX);

  // Top Y bars (along Y axis, distribution)
  const numBarsY = Math.floor((LX - 2 * cover) / spacingY) + 1;
  const barsY = Array.from({ length: numBarsY }, (_, i) => -LX / 2 + cover + i * spacingY);

  return (
    <group ref={groupRef}>
      {/* Frame the full panel (+ headroom for the labels above/below) */}
      <FitCamera sx={LX} sy={H + 1} sz={LY} onFit={onFit} />

      {/* Concrete slab — semi-transparent */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[LX, H, LY]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <boxGeometry args={[LX, H, LY]} />
        <meshStandardMaterial color="#475569" wireframe />
      </mesh>

      {/* Bottom X bars — span the lx direction (X). Cylinders default to a Y
          axis, so each is rotated Y→X; without it they render as spurious
          vertical bars stabbing through the slab. */}
      {barsX.map((bz, i) => (
        <mesh key={`bx${i}`} position={[0, -H / 2 + cover + diaX / 2, bz]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[diaX / 2, diaX / 2, LX, 6]} />
          <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Top Y bars (distribution) — span the ly direction (Z), so rotate Y→Z */}
      {barsY.map((bx, i) => (
        <mesh key={`by${i}`} position={[bx, H / 2 - cover - diaY / 2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[diaY / 2, diaY / 2, LY, 6]} />
          <meshStandardMaterial color="#6366f1" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Dimension labels */}
      <Text position={[0, H / 2 + 0.25, 0]} fontSize={0.2} color="#1e293b" anchorX="center">
        {inputs.lx}×{inputs.ly}m — {inputs.thickness}mm thick
      </Text>
      <Text position={[0, -H / 2 - 0.25, 0]} fontSize={0.15} color="#1e40af" anchorX="center">
        T{results.barsX.dia}@{results.barsX.spacing} (bot) / T{results.barsY.dia}@{results.barsY.spacing} (top)
      </Text>
    </group>
  );
}

export default function Slab3D(props: Props) {
  // Zoom limits must follow the fitted distance — fixed clamps would drag the
  // camera back in and re-crop the model. Stable callback + no-op guard so the
  // fit can't feed back into a render loop.
  const [dist, setDist] = useState(20);
  const handleFit = useCallback(
    (d: number) => setDist(prev => (Math.abs(prev - d) < 0.01 ? prev : d)), []);

  return (
    <div className="w-full rounded-xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 shadow-lg ring-1 ring-slate-700/50" style={{ height: 320 }}>
      <Canvas shadows camera={{ fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <Suspense fallback={null}>
          <SlabMesh {...props} onFit={handleFit} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={dist * 0.35} maxDistance={dist * 2.5} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
      <p className="text-center text-xs text-slate-400 py-1.5 bg-slate-900">Drag to orbit · Scroll to zoom</p>
    </div>
  );
}
