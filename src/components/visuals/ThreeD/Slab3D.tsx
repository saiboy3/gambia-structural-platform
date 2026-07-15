import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { SlabInputs, SlabResults } from '../../../types/structural';

interface Props { inputs: SlabInputs; results: SlabResults }

function SlabMesh({ inputs, results }: Props) {
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
      {/* Concrete slab — semi-transparent */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[LX, H, LY]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <boxGeometry args={[LX, H, LY]} />
        <meshStandardMaterial color="#475569" wireframe />
      </mesh>

      {/* Bottom X bars */}
      {barsX.map((bz, i) => (
        <mesh key={`bx${i}`} position={[0, -H / 2 + cover + diaX / 2, bz]} castShadow>
          <cylinderGeometry args={[diaX / 2, diaX / 2, LX, 6]} />
          <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
            <cylinderGeometry args={[diaX / 2, diaX / 2, LX, 6]} />
            <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
          </mesh>
        </mesh>
      ))}

      {/* Top Y bars (distribution) */}
      {barsY.map((bx, i) => (
        <mesh key={`by${i}`} position={[bx, H / 2 - cover - diaY / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <cylinderGeometry args={[diaY / 2, diaY / 2, LY, 6]} />
          <meshStandardMaterial color="#6366f1" metalness={0.8} roughness={0.2} />
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[diaY / 2, diaY / 2, LY, 6]} />
            <meshStandardMaterial color="#6366f1" metalness={0.8} roughness={0.2} />
          </mesh>
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
  return (
    <div className="w-full rounded-xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 shadow-lg ring-1 ring-slate-700/50" style={{ height: 320 }}>
      <Canvas shadows camera={{ position: [6, 5, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <Suspense fallback={null}>
          <SlabMesh {...props} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={3} maxDistance={20} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
      <p className="text-center text-xs text-slate-400 py-1.5 bg-slate-900">Drag to orbit · Scroll to zoom</p>
    </div>
  );
}
