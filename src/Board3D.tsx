import { useEffect, useRef, useState } from 'react';
import { MoveUpRight } from 'lucide-react';
import type { BufferGeometry, NormalBufferAttributes, Material } from 'three';

export default function Board3D() {
  const mount = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    let disposed = false, cleanup = () => {};
    import('three').then(THREE => {
      if (disposed || !mount.current) return;
      const host = mount.current;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
      catch { setSupported(false); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.9;
      host.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-6, 6, 5, -5, 0.1, 100);
      camera.position.set(10, 13, 13); camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xc9dec9, 1.35));
      const light = new THREE.DirectionalLight(0xffe4b8, 3.2);
      light.position.set(-5, 12, 8); light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -9; light.shadow.camera.right = 9; light.shadow.camera.top = 9; light.shadow.camera.bottom = -9;
      light.shadow.normalBias = 0.03; scene.add(light);
      const fill = new THREE.DirectionalLight(0xa8dac5, 1.1); fill.position.set(7, 6, -5); scene.add(fill);
      const group = new THREE.Group(); scene.add(group);
      const wood = new THREE.MeshStandardMaterial({ color: 0x695236, roughness: 0.7 });
      const ivory = new THREE.MeshStandardMaterial({ color: 0x9c8866, roughness: 0.75 });
      const green = new THREE.MeshStandardMaterial({ color: 0x123c2c, roughness: 0.36, metalness: 0.08 });
      const clay = new THREE.MeshStandardMaterial({ color: 0xeec495, roughness: 0.4, metalness: 0.04 });
      const grid = new THREE.MeshStandardMaterial({ color: 0x4d4630, roughness: 0.8 });
      const mesh = (geometry: BufferGeometry<NormalBufferAttributes>, material: Material, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
      };
      mesh(new THREE.BoxGeometry(8.4, 0.35, 8.4), wood, 0, 0, 0);
      mesh(new THREE.BoxGeometry(8.15, 0.12, 8.15), ivory, 0, 0.23, 0);
      for (let i = -3; i <= 3; i++) {
        mesh(new THREE.BoxGeometry(0.018, 0.009, 7), grid, i, 0.298, 0);
        mesh(new THREE.BoxGeometry(7, 0.009, 0.018), grid, 0, 0.298, i);
      }
      const tokens: [number, number, string][] = [[0, 0, 'X'], [1, 0, 'O'], [0, 1, 'X'], [-1, 1, 'O'], [0, -1, 'X'], [1, 1, 'O'], [-1, -1, 'X'], [2, 2, 'O'], [0, 2, 'X']];
      for (const [x, z, mark] of tokens) {
        if (mark === 'O') {
          const ring = mesh(new THREE.TorusGeometry(0.3, 0.105, 16, 40), clay, x, 0.43, z); ring.rotation.x = -Math.PI / 2;
        } else {
          for (const angle of [-Math.PI / 4, Math.PI / 4]) { const stroke = mesh(new THREE.BoxGeometry(0.78, 0.17, 0.15), green, x, 0.4, z); stroke.rotation.y = angle; }
        }
      }
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.3 }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -0.6; ground.receiveShadow = true; scene.add(ground);
      group.rotation.y = -0.12;
      let frame = 0, active = true, drag = false, previousX = 0, lastRender = 0;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const resize = () => {
        const { width, height } = host.getBoundingClientRect();
        renderer.setSize(width, height);
        const aspect = width / Math.max(height, 1); camera.left = -5.4 * aspect; camera.right = 5.4 * aspect; camera.top = 5.4; camera.bottom = -5.4; camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };
      const loop = (time: number) => {
        if (disposed) return;
        if (active && time - lastRender > 32) {
          if (!reduceMotion && !drag) group.position.y = Math.sin(time * 0.0007) * 0.09;
          renderer.render(scene, camera); lastRender = time;
        }
        frame = requestAnimationFrame(loop);
      };
      const down = (e: PointerEvent) => { drag = true; previousX = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); };
      const move = (e: PointerEvent) => { if (drag) { group.rotation.y += (e.clientX - previousX) * 0.007; previousX = e.clientX; } };
      const up = () => { drag = false; };
      renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', move); renderer.domElement.addEventListener('pointerup', up); renderer.domElement.addEventListener('pointercancel', up);
      const observer = new ResizeObserver(resize); observer.observe(host);
      const intersection = new IntersectionObserver(entries => { active = entries[0].isIntersecting; }); intersection.observe(host);
      resize(); frame = requestAnimationFrame(loop);
      cleanup = () => {
        cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
        renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('pointercancel', up);
        scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; for (const material of materials) material.dispose(); } });
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => setSupported(false));
    return () => { disposed = true; cleanup(); };
  }, []);
  return <div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
    <span className="art-note">Một bàn cờ.<br/>Vạn câu chuyện.</span>
    <div ref={mount} className="three-mount" aria-hidden="true"/>
    {!supported && <div className="three-fallback"><span>×</span><span>○</span><span>×</span></div>}
    <span className="art-caption"><MoveUpRight size={13}/>{supported ? 'Kéo nhẹ để ngắm bàn cờ' : 'Gặp nhau trên bàn cờ'}</span>
  </div>;
}
