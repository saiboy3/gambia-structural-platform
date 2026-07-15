import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { BeamInputs, BeamResults } from '../../../types/structural';

interface Props { inputs: BeamInputs; results: BeamResults }

function BeamMesh({ inputs, results }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.3;
  });

  // Scale: 1 unit = 100mm
  const L = (inputs.span * 1000) / 100;   // beam length in units
  const W = inputs.width / 100;
  const H = inputs.depth / 100;

  const cover = inputs.cover / 100;
  const mainDia = results.mainBars.dia / 100;
  const stirDia = results.stirrups.dia / 100;
  const n = results.mainBars.count;
  const stirSpacing = results.stirrups.spacing / 100;

  // Main bar positions (bottom)
  const barSpacing = (W - 2 * cover) / Math.max(n - 1, 1);
  const barY = -H / 2 + cover + mainDia / 2;
  const bars = Array.from({ length: n }, (_, i) => -W / 2 + cover + i * barSpacing);

  // Stirrup positions along length
  const numStir = Math.floor(L / stirSpacing) + 1;
  const stirPositions = Array.from({ length: numStir }, (_, i) => -L / 2 + i * stirSpacing);

  return (
    <group ref={groupRef}>
      {/* Concrete beam — semi-transparent */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[L, H, W]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      {/* Beam outline wireframe */}
      <mesh>
        <boxGeometry args={[L, H, W]} />
        <meshStandardMaterial color="#475569" wireframe />
      </mesh>

      {/* Main tension bars */}
      {bars.map((bz, i) => (
        <mesh key={`bar${i}`} position={[0, barY, bz]} castShadow>
          <cylinderGeometry args={[mainDia / 2, mainDia / 2, L, 8]} />
          <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
            <cylinderGeometry args={[mainDia / 2, mainDia / 2, L, 8]} />
            <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
          </mesh>
        </mesh>
      ))}

      {/* 2 compression bars top */}
      {[-W / 2 + cover + mainDia / 2 * 0.6, W / 2 - cover - mainDia / 2 * 0.6].map((bz, i) => (
        <mesh key={`top${i}`} position={[0, H / 2 - cover - mainDia / 2 * 0.6, bz]} castShadow>
          <cylinderGeometry args={[mainDia * 0.4, mainDia * 0.4, L, 8]} />
          <meshStandardMaterial color="#6366f1" metalness={0.8} roughness={0.2} />
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[mainDia * 0.4, mainDia * 0.4, L, 8]} />
            <meshStandardMaterial color="#6366f1" metalness={0.8} roughness={0.2} />
          </mesh>
        </mesh>
      ))}

      {/* Stirrups */}
      {stirPositions.map((sx, i) => (
        <group key={`stir${i}`} position={[sx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          {/* 4 sides of stirrup */}
          {[
            { pos: [0, H / 2 - cover, 0] as [number,number,number], rot: [Math.PI/2,0,0] as [number,number,number], len: W - 2*cover },
            { pos: [0, -(H / 2 - cover), 0] as [number,number,number], rot: [Math.PI/2,0,0] as [number,number,number], len: W - 2*cover },
            { pos: [0, 0, W/2 - cover] as [number,number,number], rot: [0,0,0] as [number,number,number], len: H - 2*cover },
            { pos: [0, 0, -(W/2 - cover)] as [number,number,number], rot: [0,0,0] as [number,number,number], len: H - 2*cover },
          ].map((seg, j) => (
            <mesh key={j} position={seg.pos} rotation={seg.rot}>
              <cylinderGeometry args={[stirDia / 2, stirDia / 2, seg.len, 6]} />
              <meshStandardMaterial color="#3b82f6" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Labels */}
      <Text position={[0, H / 2 + 0.4, 0]} fontSize={0.25} color="#1e293b" anchorX="center">
        {inputs.width}×{inputs.depth}mm — {inputs.span}m span
      </Text>
      <Text position={[0, barY - 0.3, 0]} fontSize={0.18} color="#1e40af" anchorX="center">
        {results.mainBars.count}T{results.mainBars.dia} bottom
      </Text>
    </group>
  );
}

export default function Beam3D(props: Props) {
  return (
    <div className="w-full rounded-xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 shadow-lg ring-1 ring-slate-700/50" style={{ height: 320 }}>
      <Canvas shadows camera={{ position: [8, 4, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <Suspense fallback={null}>
          <BeamMesh {...props} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={4} maxDistance={20} autoRotate autoRotateSpeed={1} />
      </Canvas>
      <p className="text-center text-xs text-slate-400 py-1.5 bg-slate-900">Drag to orbit · Scroll to zoom</p>
    </div>
  );
}
