import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BoardTheme } from '../board-palette.ts';

export const COMMANDER_SCENERY_PADDING = 3.8;
const colors = { light: { earth: 0x645e42, grass: 0x7e9563, leaf: 0x376744, leafLight: 0x639052, bark: 0x746446, rock: 0x8e9984, water: 0x2e8b9c, deep: 0x175c7b }, dark: { earth: 0x303c32, grass: 0x405f43, leaf: 0x214c39, leafLight: 0x3f7050, bark: 0x514f3c, rock: 0x566c61, water: 0x236b80, deep: 0x123e5c } };
type Tone = keyof typeof colors.light;
const waterVertex = `uniform float time;uniform float amplitude;varying vec3 world;void main(){vec3 p=position;p.z+=sin(p.x*3.1+time*.8)*cos(p.y*2.3-time*.65)*amplitude;vec4 w=modelMatrix*vec4(p,1.);world=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const waterFragment = `uniform float time;uniform vec3 shallow;uniform vec3 deep;uniform float opacity;varying vec3 world;void main(){float ripple=sin(world.x*14.+world.z*8.+time*1.3)*sin(world.z*11.-time*.9);float sparkle=pow(max(0.,ripple),16.);float band=.5+.5*sin(world.x*.9+world.z*1.2+time*.15);vec3 c=mix(deep,shallow,.35+.25*band)+vec3(.19,.26,.23)*sparkle;gl_FragColor=vec4(c,opacity);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`;

export function buildCommanderScenery(theme: BoardTheme = 'dark') {
  const root = new T.Group(), exterior = new T.Group(), water = new T.Group(), details = new T.Group(); root.name = 'commander-vietnam-scenery'; exterior.name = 'tropical-exterior'; water.name = 'sea-and-river'; root.add(exterior, water, details);
  const materials = new Map<Tone, T.MeshStandardMaterial>(), waterMaterials: T.ShaderMaterial[] = [];
  function material(tone: Tone) { if (!materials.has(tone)) materials.set(tone, new T.MeshStandardMaterial({ color: colors[theme][tone], roughness: .95 })); return materials.get(tone)!; }
  function mesh(geometry: T.BufferGeometry, tone: Tone, x: number, y: number, z: number, parent: T.Group = exterior) { const m = new T.Mesh(geometry, material(tone)); m.position.set(x, y, z); m.receiveShadow = true; parent.add(m); return m; }
  function rod(a: T.Vector3, b: T.Vector3, r: number, tone: Tone, parent: T.Group) { const d = b.clone().sub(a), m = mesh(new T.CylinderGeometry(r * .72, r, d.length(), 6), tone, 0, 0, 0, parent); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return m; }
  function body(parent: T.Group, tone: Tone, x: number, y: number, z: number, sx: number, sy: number, sz: number) { const m = mesh(new T.IcosahedronGeometry(1, 1), tone, x, y, z, parent); m.scale.set(sx, sy, sz); return m; }
  mesh(new T.BoxGeometry(84, .19, 64), 'earth', 0, -.41, 0);
  mesh(new T.BoxGeometry(45, .035, 64), 'grass', 19.3, -.296, 0);
  function surface(w: number, h: number, x: number, y: number, z: number, alpha: number, amplitude: number, parent: T.Group) {
    const m = new T.ShaderMaterial({ uniforms: { time: { value: 0 }, amplitude: { value: amplitude }, shallow: { value: new T.Color(colors[theme].water) }, deep: { value: new T.Color(colors[theme].deep) }, opacity: { value: alpha } }, vertexShader: waterVertex, fragmentShader: waterFragment, transparent: true, depthWrite: false, side: T.DoubleSide });
    const object = new T.Mesh(new T.PlaneGeometry(w, h, Math.min(48, Math.ceil(w * 2)), Math.min(48, Math.ceil(h * 2))), m); object.rotation.x = -Math.PI / 2; object.position.set(x, y, z); object.renderOrder = 1; parent.add(object); waterMaterials.push(m); return object;
  }
  // Exterior coast and the board's actual sea/river share a single world-space wave phase.
  surface(39.3, 64, -22.35, -.278, 0, .96, .028, exterior);
  surface(3, 12, -4, .296, 0, .28, .003, water);
  surface(8, 1, 1.5, .296, 0, .28, .003, water);
  for (const x of [0, 2]) for (let j = 0; j < 5; j++) { const stone = mesh(new T.BoxGeometry(.3, .025, .115), 'rock', x, .315, -.33 + j * .165, details); stone.rotation.y = (j % 2 - .5) * .08; }
  // Rocks and tropical vegetation stay outside every playable intersection.
  const treeLocations: [[number, number], ...[number, number][]] = [[6.85, -6.3], [7.45, -4.2], [6.9, -1.8], [7.35, .6], [7.1, 3.1], [6.7, 6.2], [4.1, -7.6], [1.8, -7.7], [-.8, -7.55], [4.5, 7.55], [1.9, 7.7], [-.5, 7.65]];
  const treeRoots: T.Group[] = [];
  function bamboo(x: number, z: number, seed: number) {
    const g = new T.Group(); g.position.set(x, -.28, z); g.userData.feature = 'bamboo'; exterior.add(g); treeRoots.push(g);
    for (let s = 0; s < 4; s++) {
      const a = s * 1.8 + seed, bx = Math.sin(a) * .17, bz = Math.cos(a) * .17, h = 1.1 + (s % 3) * .13;
      rod(new T.Vector3(bx, 0, bz), new T.Vector3(bx + .08, h, bz), .022, 'leafLight', g);
      for (let n = 1; n < 5; n++) { const ring = mesh(new T.CylinderGeometry(.027, .027, .019, 6), 'bark', bx + .08 * n / 5, h * n / 5, bz, g); ring.rotation.z = -.06; }
      for (let l = 0; l < 4; l++) { const leaf = body(g, l % 2 ? 'leaf' : 'leafLight', bx + Math.cos(l * 1.6) * .22, h - .1 + l * .045, bz + Math.sin(l * 1.6) * .22, .31, .065, .095); leaf.rotation.y = l * 1.6; leaf.rotation.z = .22; }
    }
  }
  function palm(x: number, z: number, seed: number) {
    const g = new T.Group(); g.position.set(x, -.28, z); g.userData.feature = 'palm'; exterior.add(g); treeRoots.push(g);
    rod(new T.Vector3(0, 0, 0), new T.Vector3(.09, .62, .035), .065, 'bark', g); rod(new T.Vector3(.09, .62, .035), new T.Vector3(.19, 1.23, .04), .048, 'bark', g);
    for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7 + seed; const leaf = body(g, i % 2 ? 'leaf' : 'leafLight', .19 + Math.cos(a) * .28, 1.23, .04 + Math.sin(a) * .28, .48, .065, .13); leaf.rotation.y = -a; leaf.rotation.z = .13 * Math.cos(a); }
    for (let i = 0; i < 3; i++)body(g, 'bark', .16 + Math.cos(i * 2) * .08, 1.17, .04 + Math.sin(i * 2) * .08, .055, .065, .055);
  }
  treeLocations.forEach(([x, z], i) => i % 3 === 0 ? palm(x, z, i * .7) : bamboo(x, z, i * .7));
  for (let i = 0; i < 18; i++) {
    const x = i < 9 ? -6.72 - (i % 3) * .37 : 6.75 + (i % 3) * .28, z = i < 9 ? -7.6 + (i % 9) * 1.85 : -7.1 + Math.floor((i - 9) / 3) * 7.1;
    const rock = body(exterior, 'rock', x, -.17, z, .18 + (i % 3) * .08, .14 + (i % 2) * .12, .21); rock.rotation.y = i * 2;
  }
  // Small rice-field banks and a footpath give the land edge a Vietnamese countryside character.
  for (const z of [-2.9, -1.5, 0, 1.5, 2.9]) {
    mesh(new T.BoxGeometry(.72, .025, 1.18), 'leafLight', 7.65, -.265, z);
    mesh(new T.BoxGeometry(.82, .04, .055), 'earth', 7.65, -.25, z - .62);
    for (let j = 0; j < 4; j++)mesh(new T.BoxGeometry(.018, .035, 1.1), 'leaf', 7.38 + j * .16, -.24, z);
  }
  mesh(new T.BoxGeometry(.24, .025, 13.5), 'earth', 6.48, -.265, 0);
  // Bake vegetation/rocks into one draw per shared material; the bounding metadata stays inspectable.
  const decorationBounds = treeRoots.map(g => new T.Box3().setFromObject(g).clone());
  const temporary = exterior.children.filter(o => !(o instanceof T.Mesh && o.material instanceof T.ShaderMaterial));
  exterior.updateMatrixWorld(true);
  const buckets = new Map<T.Material, T.BufferGeometry[]>();
  for (const object of temporary) object.traverse(o => { if (o instanceof T.Mesh) { const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); const list = buckets.get(o.material as T.Material) || []; list.push(geo.index ? geo.toNonIndexed() : geo); buckets.set(o.material as T.Material, list); } });
  for (const object of temporary) { exterior.remove(object); object.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); }); }
  for (const [mat, geometries] of buckets) { const merged = mergeGeometries(geometries, false)!; geometries.forEach(g => g.dispose()); const m = new T.Mesh(merged, mat); m.receiveShadow = true; exterior.add(m); }
  root.userData.treeBounds = decorationBounds.map(b => ({ min: b.min.toArray(), max: b.max.toArray() }));
  root.userData.style = 'Vietnamese tropical coast: palms, bamboo, paddies, rocks, sea and river';
  function setTheme(next: BoardTheme) { theme = next; for (const [tone, mat] of materials) mat.color.setHex(colors[next][tone]); for (const m of waterMaterials) { m.uniforms.shallow.value.setHex(colors[next].water); m.uniforms.deep.value.setHex(colors[next].deep); } }
  function update(seconds: number, reducedMotion = false) { for (const m of waterMaterials) m.uniforms.time.value = reducedMotion ? 0 : seconds; }
  return { root, exterior, water, details, setTheme, update };
}
