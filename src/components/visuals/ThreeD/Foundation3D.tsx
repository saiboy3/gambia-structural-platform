import { useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import FitCamera from './FitCamera';
import type { FoundationInputs, FoundationResults } from '../../../types/structural';

interface Props { inputs: FoundationInputs; results: FoundationResults }
type MeshProps = Props & { onFit?: (d: number) => void };

function FoundationMesh({ inputs, results, onFit }: MeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
  });

  // Scale: 1 unit = 300mm
  const S = 300;
  const FW = (results.B * 1000) / S;
  const FL = (results.L * 1000) / S;
  const FH = results.h / S;
  const colW = inputs.columnB / S;
  const colH = inputs.columnH / S;
  const colHeight = 1.5;  // fixed stub height in units
  const cover = inputs.cover / S;
  const diaBot = results.barsBot.dia / S;
  const spacingBot = results.barsBot.spacing / S;

  // Bottom X and Y bars (EW both directions)
  const numBarsX = Math.floor((FL - 2 * cover) / spacingBot) + 1;
  const numBarsY = Math.floor((FW - 2 * cover) / spacingBot) + 1;
  const barsX = Array.from({ length: numBarsX }, (_, i) => -FL / 2 + cover + i * spacingBot);
  const barsY = Array.from({ length: numBarsY }, (_, i) => -FW / 2 + cover + i * spacingBot);

  return (
    <group ref={groupRef}>
      {/* This model is asymmetric about the origin — soil sits just below the
          pad, but the column stub and its label reach well above. FitCamera
          frames symmetrically, so use the taller (upward) half doubled, or the
          stub gets cut off. Plan extents include the soil apron. */}
      <FitCamera
        sx={FW + 1.5}
        sy={2 * (FH / 2 + colHeight + 0.6)}
        sz={FL + 1.5}
        onFit={onFit}
      />

      {/* Soil below */}
      <mesh position={[0, -FH / 2 - 0.15, 0]} receiveShadow>
        <boxGeometry args={[FW + 1.5, 0.3, FL + 1.5]} />
        <meshStandardMaterial color="#92400e" roughness={1} />
      </mesh>

      {/* Foundation pad */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[FW, FH, FL]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <boxGeometry args={[FW, FH, FL]} />
        <meshStandardMaterial color="#475569" wireframe />
      </mesh>

      {/* Column stub */}
      <mesh position={[0, FH / 2 + colHeight / 2, 0]} castShadow>
        <boxGeometry args={[colW, colHeight, colH]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, FH / 2 + colHeight / 2, 0]}>
        <boxGeometry args={[colW, colHeight, colH]} />
        <meshStandardMaterial color="#334155" wireframe />
      </mesh>

      {/* Bottom X bars — span the pad width (X), so rotate the cylinder Y→X.
          Without it the bar renders as a spurious vertical through the pad. */}
      {barsX.map((bz, i) => (
        <mesh key={`bx${i}`} position={[0, -FH / 2 + cover + diaBot / 2, bz]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[diaBot / 2, diaBot / 2, FW, 6]} />
          <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Bottom Y bars — span the pad length (Z), so rotate the cylinder Y→Z */}
      {barsY.map((bx, i) => (
        <mesh key={`by${i}`} position={[bx, -FH / 2 + cover + diaBot * 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[diaBot / 2, diaBot / 2, FL, 6]} />
          <meshStandardMaterial color="#0369a1" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Labels */}
      <Text position={[0, FH / 2 + colHeight + 0.35, 0]} fontSize={0.2} color="#1e293b" anchorX="center">
        {results.L.toFixed(2)}×{results.B.toFixed(2)}m pad — {results.h}mm deep
      </Text>
      <Text position={[0, -FH / 2 - 0.3, 0]} fontSize={0.16} color="#1e40af" anchorX="center">
        T{results.barsBot.dia}@{results.barsBot.spacing} EW bottom
      </Text>
    </group>
  );
}

export default function Foundation3D(props: Props) {
  // Zoom limits must follow the fitted distance — fixed clamps would drag the
  // camera back in and re-crop the model. Stable callback + no-op guard so the
  // fit can't feed back into a render loop.
  const [dist, setDist] = useState(20);
  const handleFit = useCallback(
    (d: number) => setDist(prev => (Math.abs(prev - d) < 0.01 ? prev : d)), []);

  return (
    <div className="w-full rounded-xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 shadow-lg ring-1 ring-slate-700/50" style={{ height: 340 }}>
      <Canvas shadows camera={{ fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <Suspense fallback={null}>
          <FoundationMesh {...props} onFit={handleFit} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={dist * 0.35} maxDistance={dist * 2.5} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
      <p className="text-center text-xs text-slate-400 py-1.5 bg-slate-900">Drag to orbit · Scroll to zoom</p>
    </div>
  );
}
