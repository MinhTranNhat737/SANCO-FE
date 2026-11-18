import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COMMANDER_SYMBOLS, commanderUnits } from '../commander-ui.ts';
import { disposeObject } from './pieces.ts';

export const COMMANDER_MODEL_TYPES = ['K', 'I', 'D', 'E', 'T', 'P', 'A', 'M', 'F', 'N', 'H'] as const;
export const COMMANDER_MODEL_PATH = '/models/commander/vietnam';
const downloads = new Map<string, Promise<ArrayBuffer>>();
export async function loadCommanderModels() {
  const results = await Promise.allSettled(COMMANDER_MODEL_TYPES.map(async type => {
    if (!downloads.has(type)) downloads.set(type, fetch(`${COMMANDER_MODEL_PATH}/${type}.glb`).then(r => { if (!r.ok) throw Error(`Model ${type}: ${r.status}`); return r.arrayBuffer(); }).catch(error => { downloads.delete(type); throw error; }));
    const buffer = await downloads.get(type)!;
    return [type, await parseCommanderModel(buffer)] as const;
  }));
  const failure = results.find(r => r.status === 'rejected');
  if (failure?.status === 'rejected') { for (const result of results) if (result.status === 'fulfilled') disposeObject(result.value[1]); throw failure.reason; }
  return new Map<string, T.Group>(results.flatMap(r => r.status === 'fulfilled' ? [r.value] : []));
}

// Bake static mesh poses and merge primitives by material to keep 38 miniatures inexpensive.
export async function parseCommanderModel(buffer: ArrayBuffer): Promise<T.Group> {
  const gltf = await new GLTFLoader().parseAsync(buffer, ''), scene = gltf.scene, result = new T.Group();
  scene.updateMatrixWorld(true);
  scene.traverse(o => { if (o.userData.vietnam) result.userData = { ...o.userData }; });
  const buckets = new Map<T.Material, T.BufferGeometry[]>();
  scene.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const source = object.geometry;
    if (!source.getAttribute('position')) return;
    if (Array.isArray(object.material)) throw Error('Unsupported multi-material primitive');
    const geometry = source.clone();
    if (object instanceof T.SkinnedMesh) {
      object.skeleton.update(); const positions = geometry.getAttribute('position'), v = new T.Vector3();
      for (let i = 0; i < positions.count; i++) { v.fromBufferAttribute(positions, i); object.applyBoneTransform(i, v); positions.setXYZ(i, v.x, v.y, v.z); }
      geometry.deleteAttribute('skinIndex'); geometry.deleteAttribute('skinWeight'); geometry.computeVertexNormals();
    }
    geometry.applyMatrix4(object.matrixWorld);
    for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) geometry.deleteAttribute(name);
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const count = geometry.getAttribute('position').count;
    if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(count * 2), 2));
    if (!geometry.getAttribute('color')) geometry.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    if (nonIndexed !== geometry) geometry.dispose();
    const list = buckets.get(object.material) || []; list.push(nonIndexed); buckets.set(object.material, list);
  });
  for (const [material, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false); geometries.forEach(g => g.dispose());
    if (!merged) throw Error('Could not merge model geometry');
    const mesh = new T.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true; result.add(mesh);
  }
  const originals = new Set<T.BufferGeometry>(); scene.traverse(o => { if (o instanceof T.Mesh) originals.add(o.geometry); }); originals.forEach(g => g.dispose());
  if (!result.children.length) throw Error('Model has no meshes');
  return result;
}

function labelTexture(units: string[], side: string) {
  const canvas = document.createElement('canvas'); canvas.width = 576; canvas.height = 224;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = side === 'r' ? '#811428' : '#10477d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f7cd81'; ctx.fillRect(0, 0, canvas.width, 8);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const single = units.length === 1, column = canvas.width / units.length;
  units.forEach((unit, index) => {
    const icon = COMMANDER_SYMBOLS[unit[1]];
    const center = (index + .5) * column;
    ctx.save();
    ctx.translate(single ? 85 : center - 55, single ? 19 : 10);
    ctx.scale(single ? 7.2 : 4.6, single ? 7.2 : 4.6);
    ctx.strokeStyle = '#fff7e4'; ctx.lineWidth = 2.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(icon.path));
    ctx.restore();
    ctx.fillStyle = '#fff7e4';
    ctx.font = `800 ${single ? 116 : 62}px "Be Vietnam Pro",sans-serif`;
    ctx.fillText(icon.notation === '★' ? 'TL' : icon.notation, single ? 395 : center, single ? 120 : 171, single ? 180 : column - 18);
    if (unit.endsWith('*')) {
      ctx.fillStyle = '#ffd677'; ctx.font = '700 39px sans-serif';
      ctx.fillText('★', (index + 1) * column - 27, 32);
    }
  });
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture;
}

export function commanderPiece(code: string, models: Map<string, T.Group>): T.Group {
  const units = commanderUnits(code), side = code[0], group = new T.Group(), tint = new T.Color(side === 'r' ? 0xb73249 : 0x2676b7);
  const base = new T.Mesh(new T.BoxGeometry(.895, .085, .895), new T.MeshStandardMaterial({ color: side === 'r' ? 0xb0213d : 0x155fa0, roughness: .5 }));
  base.position.y = .0425; base.castShadow = true; base.receiveShadow = true; group.add(base);
  units.forEach((unit, slot) => {
    const type = unit[1], source = models.get(type); if (!source) throw Error(`Missing commander model ${type}`);
    const model = source.clone(true);
    model.traverse(o => {
      if (o instanceof T.Mesh) {
        // Templates own their geometry/materials; their clones within this board can share them.
        const material = (o.material as T.MeshStandardMaterial).clone();
        if (material.color && !source.userData.vietnam) { const strength = material.map?.isTexture ? .24 : (material.color.getHSL({ h: 0, s: 0, l: 0 }).l < .13 ? .12 : .55); material.color.lerp(tint, strength); }
        material.roughness = Math.max(.45, material.roughness || 0); material.metalness = Math.min(.35, material.metalness || 0); o.material = material;
      }
    });
    const holder = new T.Group(); holder.add(model);
    let box = new T.Box3().setFromObject(model), size = box.getSize(new T.Vector3());
    if (!['K', 'I', 'D'].includes(type) && size.x > size.z * 1.25) { model.rotation.y = Math.PI / 2; model.updateMatrixWorld(true); box = new T.Box3().setFromObject(model); size = box.getSize(new T.Vector3()); }
    const human = ['K', 'I', 'D'].includes(type), maxX = slot ? .42 : human ? .68 : .86, maxZ = slot ? .42 : .51, maxHeight = slot ? .48 : human ? .96 : type === 'F' ? .52 : .82;
    const scale = Math.min(maxX / Math.max(size.x, .001), maxZ / Math.max(size.z, .001), maxHeight / Math.max(size.y, .001));
    model.scale.setScalar(scale); const center = box.getCenter(new T.Vector3()); model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    holder.rotation.y = side === 'r' ? Math.PI : 0;
    const baseZ = slot ? -.16 : -.18;
    holder.position.set(slot ? (slot === 1 ? -.19 : .19) : 0, slot ? .55 : .085 + (type === 'F' ? .12 : 0), baseZ);
    holder.userData.commanderUnit = true; holder.userData.baseZ = baseZ;
    group.add(holder);
  });
  const label = new T.Mesh(new T.PlaneGeometry(.89, .345), new T.MeshBasicMaterial({ map: labelTexture(units, side), toneMapped: false }));
  label.rotation.x = -Math.PI / 2; label.position.set(0, .098, .272); group.add(label);
  label.userData.commanderLabel = true; label.userData.baseZ = label.position.z;
  if (units.some(u => u.endsWith('*'))) {
    const star = new T.Mesh(new T.OctahedronGeometry(.085), new T.MeshStandardMaterial({ color: 0xffd471, metalness: .6, roughness: .25 })); star.position.set(.35, .18, -.35); group.add(star);
  }
  group.userData.commanderUnits = [...units]; return group;
}
