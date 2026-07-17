/**
 * FitCamera — frames the whole model instead of relying on a hardcoded camera.
 *
 * The 3D views are drawn at 1 unit = 100 mm (500 mm for slabs), so real members
 * are far bigger than the fixed camera positions assumed: a 6 m beam is 60 units
 * long, a 3.5 m column 35 units tall, yet the cameras sat ~10 units away. Every
 * view was cropped, and the OrbitControls maxDistance clamps meant simply moving
 * the camera back wasn't enough.
 *
 * This computes the distance needed to fit the model's swept bounding box for
 * the canvas's *actual* aspect ratio — so the same component frames correctly
 * both in its on-page panel and in the larger off-screen canvas used to capture
 * the PDF report figure.
 */
import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type * as THREE from 'three';

interface Props {
  /** Model extents in scene units. */
  sx: number;
  sy: number;
  sz: number;
  /** Headroom around the model (1.1 ≈ 10% padding for labels). */
  margin?: number;
  /** Reports the fitted distance so OrbitControls clamps can be derived from it. */
  onFit?: (distance: number) => void;
}

export default function FitCamera({ sx, sy, sz, margin = 1.1, onFit }: Props) {
  const camera = useThree(s => s.camera);
  const width  = useThree(s => s.size.width);
  const height = useThree(s => s.size.height);

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera || !width || !height) return;

    const aspect = width / height;
    const halfV = ((cam.fov * Math.PI) / 180) / 2;
    const halfH = Math.atan(Math.tan(halfV) * aspect);

    // The model spins about Y, so treat its silhouette as a bounding cylinder:
    // swept radius R horizontally, half-height sy/2. Fitting the static width
    // would clip it as it turns.
    const R = 0.5 * Math.hypot(sx, sz);

    // Horizontal: tangent to the cylinder subtends asin(R/d) ≤ halfH.
    const distH = R / Math.sin(halfH);
    // Vertical: the top edge nearest the camera sits at depth (d − R).
    const distV = R + (sy / 2) / Math.tan(halfV);

    const dist = Math.max(distV, distH) * margin;

    // A 3/4 view: equal X/Z with a modest elevation.
    const k = dist / Math.hypot(0.72, 0.42, 0.72);
    cam.position.set(0.72 * k, 0.42 * k, 0.72 * k);
    cam.lookAt(0, 0, 0);
    cam.near = Math.max(0.1, dist / 100);
    cam.far  = dist * 6;
    cam.updateProjectionMatrix();

    onFit?.(dist);
  }, [camera, width, height, sx, sy, sz, margin, onFit]);

  return null;
}
