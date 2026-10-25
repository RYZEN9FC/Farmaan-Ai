// The logo SVG extruded into three flat blades. Mounted twice: the hero emblem spins on its own,
// the nav emblem turns with the page scroll. Geometry is loaded once and shared.
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Gradient glass: the same navy throughout, fully opaque at the front face and 50% translucent at the back.
// The fade runs along the extrusion depth (local z: -DEPTH/2 at the front, +DEPTH/2 at the back).
const DEPTH = 44;
const BEVEL = 3;   // fillet radius on the long edges, in SVG units
const material = new THREE.MeshPhysicalMaterial({
  color: 0x10203a, metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06,
  envMapIntensity: 1.3, transparent: true, side: THREE.DoubleSide, depthWrite: false,
});
material.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying float vDepth;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDepth = position.z;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float vDepth;")
    .replace("#include <color_fragment>", [
      "#include <color_fragment>",
      `float fade = smoothstep(-${DEPTH / 2}.0, ${DEPTH / 2}.0, vDepth);`,
      "diffuseColor.a *= mix(1.0, 0.5, fade);",   // opaque front, half-translucent back, colour unchanged
    ].join("\n"));
};

// straight prism extrusion, centred, normalised to ~2 units and flipped from SVG's y-down to y-up
const geometryReady = new Promise((resolve) => {
  new SVGLoader().load("images/logo.svg", (data) => {
    const group = new THREE.Group();
    for (const path of data.paths)
      for (const shape of SVGLoader.createShapes(path)) {
        // small rounded fillet along the face-to-side edges; the outline's pointed tips stay sharp
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: DEPTH - 2 * BEVEL, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4, curveSegments: 6,
        });
        geo.translate(0, 0, -(DEPTH - 2 * BEVEL) / 2);
        group.add(new THREE.Mesh(geo, material));
      }
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    group.position.sub(centre);
    const holder = new THREE.Group();
    holder.add(group);
    holder.scale.setScalar(2 / Math.max(size.x, size.y));
    holder.rotation.x = Math.PI;
    resolve(holder);
  });
});

function mount(host, { spin }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 4.6);

  // soft studio reflections + a hard key from the upper-left, where the hero's light falls from
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd3ea, 1.4); rim.position.set(3, -1, -4); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const pivot = new THREE.Group();
  pivot.rotation.x = 0.1;                       // slight tilt so the depth reads from the front
  scene.add(pivot);
  geometryReady.then((holder) => { pivot.add(holder.clone()); host.classList.add("is-3d"); });

  let size = 0;
  function resize() {
    const s = Math.round(host.clientWidth) || 1;
    if (s === size) return;
    size = s;
    renderer.setSize(s, s, false);
  }

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    resize();
    if (!reduceMotion) pivot.rotation.y = spin(clock.getElapsedTime());
    renderer.render(scene, camera);
  });
}

if (window.WebGLRenderingContext) {
  const hero = document.getElementById("logo3d");
  const nav = document.getElementById("navlogo3d");
  if (hero) mount(hero, { spin: (t) => t * 0.55 });                      // one turn ≈ 11.4s
  if (nav) mount(nav, { spin: () => window.scrollY * 0.007 });          // ≈ 0.4° per scrolled pixel
}
