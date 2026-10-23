import { SIZE } from './game.js';

export async function createScene(host) {
  // Keep Three.js 0.180.0 local so CDN delays cannot block startup.
  const THREE = await import('./vendor/three/three.module.min.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, .1, 50);
  camera.position.set(0, 8.4, 5.7);
  camera.lookAt(0, 1.05, 0);
  scene.add(new THREE.HemisphereLight(0xfff8e9, 0x96866a, 2.4));
  const light = new THREE.DirectionalLight(0xfff5df, 3.3);
  light.position.set(-3.5, 8, 4);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 20 });
  light.shadow.bias = -.0005;
  light.shadow.normalBias = .025;
  light.shadow.radius = 4;
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xffffff, 1.1);
  fill.position.set(4, 5, -4);
  scene.add(fill);

  const envCanvas = document.createElement('canvas');
  envCanvas.width = 512; envCanvas.height = 256;
  const env = envCanvas.getContext('2d');
  env.fillStyle = '#9a9185'; env.fillRect(0, 0, 512, 256);
  env.fillStyle = '#fffaf1'; env.fillRect(40, 0, 100, 180); env.fillRect(270, 20, 150, 150);
  env.fillStyle = '#d8d9d5'; env.fillRect(190, 0, 40, 220);
  const environment = new THREE.CanvasTexture(envCanvas);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  environment.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(environment).texture;
  pmrem.dispose(); environment.dispose();

  function material(color, roughness = .35, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }
  function mesh(geometry, mat, parent = scene) {
    const object = new THREE.Mesh(geometry, mat);
    object.castShadow = true; object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xb1c6ae, roughness: .23, clearcoat: .55, clearcoatRoughness: .25 });
  const cream = material(0xfbf3e1, .3);
  const floor = mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x665344, opacity: .16 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.03; floor.castShadow = false;
  const points = [[.77,.16],[.86,.17],[.97,.23],[1.15,.38],[1.33,.61],[1.48,.93],[1.58,1.23],[1.59,1.28],[1.56,1.32],[1.49,1.32],[1.47,1.26],[1.38,.95],[1.24,.66],[1.05,.45],[.86,.32],[0,.32]].map(([x,y]) => new THREE.Vector2(x,y));
  mesh(new THREE.LatheGeometry(points, 96), ceramic);
  const lip = mesh(new THREE.TorusGeometry(1.535, .047, 16, 96), cream);
  lip.position.y = 1.305; lip.rotation.x = -Math.PI / 2;
  const handle = mesh(new THREE.TorusGeometry(.46, .115, 16, 48), ceramic);
  handle.position.set(1.60, .79, 0); handle.scale.set(.92, .87, 1);

  const coffeeCanvas = document.createElement('canvas'); coffeeCanvas.width = coffeeCanvas.height = 512;
  const ctx = coffeeCanvas.getContext('2d');
  const foamCanvas = document.createElement('canvas'); foamCanvas.width = foamCanvas.height = SIZE;
  const foamContext = foamCanvas.getContext('2d');
  const foamImage = foamContext.createImageData(SIZE, SIZE);
  const coffeeTexture = new THREE.CanvasTexture(coffeeCanvas);
  coffeeTexture.colorSpace = THREE.SRGBColorSpace;
  const coffee = mesh(new THREE.CircleGeometry(1.475, 96), new THREE.MeshStandardMaterial({ map: coffeeTexture, roughness: .30, metalness: 0 }));
  coffee.position.y = 1.255; coffee.rotation.x = -Math.PI / 2; coffee.castShadow = false;

  function updateFoam(mask) {
    const gradient = ctx.createRadialGradient(215, 190, 15, 256, 256, 256);
    gradient.addColorStop(0, '#a66632'); gradient.addColorStop(.72, '#965326'); gradient.addColorStop(.93, '#b77a41'); gradient.addColorStop(1, '#cf9b60');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 100; i++) {
      const a = i * 2.39996, r = 238 + Math.sin(i * 13) * 12;
      ctx.fillStyle = i % 3 ? '#e2b97a50' : '#65381335';
      ctx.beginPath(); ctx.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 1 + (i % 3), 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < mask.length; i++) {
      const p = i * 4;
      foamImage.data[p] = 255; foamImage.data[p+1] = 248; foamImage.data[p+2] = 224;
      foamImage.data[p+3] = Math.round(mask[i] * 255);
    }
    foamContext.putImageData(foamImage, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(foamCanvas, 0, 0, 512, 512);
    coffeeTexture.needsUpdate = true;
  }
  updateFoam(new Float32Array(SIZE * SIZE));

  const pitcher = new THREE.Group(); scene.add(pitcher);
  const steel = material(0xd6dedb, .22, .78);
  const jugProfile = [[0,0],[.27,0],[.31,.04],[.36,.63],[.37,.72],[.34,.73],[.33,.66],[.28,.08],[0,.08]].map(([x,y])=>new THREE.Vector2(x,y));
  mesh(new THREE.LatheGeometry(jugProfile, 48), steel, pitcher);
  const jugHandle = mesh(new THREE.TorusGeometry(.22, .045, 10, 32), steel, pitcher);
  jugHandle.position.set(.43, .36, 0); jugHandle.scale.set(.8, 1.15, 1);
  const milk = mesh(new THREE.CircleGeometry(.315, 48), material(0xfff7e6), pitcher);
  milk.rotation.x = -Math.PI / 2; milk.position.y = .61; milk.castShadow = false;
  const spoutShape = new THREE.Shape();
  spoutShape.moveTo(-.32, .72); spoutShape.lineTo(-.53, .70); spoutShape.lineTo(-.32, .55); spoutShape.closePath();
  const spout = mesh(new THREE.ExtrudeGeometry(spoutShape, { depth: .16, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .015, bevelThickness: .015 }), steel, pitcher);
  spout.position.z = -.08;
  const tip = new THREE.Vector3(-.54, .70, 0);
  const stream = mesh(new THREE.CylinderGeometry(.022, .035, 1, 12), material(0xfff9e9, .3));
  stream.visible = false; stream.castShadow = false;
  const aimRing = mesh(new THREE.RingGeometry(.055, .068, 32), new THREE.MeshBasicMaterial({ color: 0xfff9e8, transparent: true, opacity: .6, side: THREE.DoubleSide }));
  aimRing.rotation.x = -Math.PI / 2; aimRing.position.y = 1.261; aimRing.castShadow = false;
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.255);
  const intersection = new THREE.Vector3();
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    const aspect = w / h;
    const viewHeight = Math.max(4.9, 4.5 / aspect);
    camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix(); renderer.setSize(w, h);
  }
  new ResizeObserver(resize).observe(host); resize();

  return {
    updateFoam,
    pointFromClient(x, y) {
      const rect = host.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), camera);
      if (!raycaster.ray.intersectPlane(plane, intersection)) return null;
      return [intersection.x / 2.95 + .5, intersection.z / 2.95 + .5];
    },
    render(point, pouring, active) {
      const x = (point[0] - .5) * 2.95, z = (point[1] - .5) * 2.95;
      const hoverHeight = pouring ? .75 : 1.03;
      pitcher.rotation.z = pouring ? .65 : -.12;
      start.set(x, 1.255 + hoverHeight, z);
      const localTip = tip.clone().applyQuaternion(pitcher.quaternion);
      pitcher.position.copy(start).sub(localTip);
      pitcher.visible = true;
      stream.visible = pouring;
      if (pouring) {
        end.set(x, 1.255, z);
        direction.copy(start).sub(end);
        stream.position.copy(start).add(end).multiplyScalar(.5);
        stream.scale.set(1.08, direction.length(), 1.08);
        stream.quaternion.setFromUnitVectors(up, direction.normalize());
      }
      aimRing.visible = active && !pouring;
      aimRing.position.set(x, 1.261, z);
      renderer.render(scene, camera);
    }
  };
}
