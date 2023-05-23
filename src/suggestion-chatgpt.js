import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, matDrop;

function App() {
  const conf = {
    el: 'canvas',
    fov: 75,
    cameraZ: 100,
  };

  let renderer, camera, cameraCtrl;
  let width, height, cx, cy, wWidth, wHeight;

  let ripple;
  let gridWWidth, gridWHeight;
  let gridWidth, gridHeight;

  let thePlane = null;

  init();

  function init() {
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById(conf.el), antialias: true });
    camera = new THREE.PerspectiveCamera(conf.fov);
    camera.position.x = 20;

    updateSize();
    window.addEventListener('resize', updateSize, false);

    gridWHeight = wHeight;
    gridWWidth = wWidth;
    gridWidth = gridWWidth * width / wWidth;
    gridHeight = gridWHeight * height / wHeight;

    ripple = new RippleEffect(renderer, width, height);

    const getGridMP = function (e) {
      const v = new THREE.Vector3();
      camera.getWorldDirection(v);
      v.normalize();
      const mouse = new THREE.Vector2();
      mouse.x = ((e.clientX / width) * 2 - 1);
      mouse.y = (-(e.clientY / height) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const mousePosition = new THREE.Vector3();
      raycaster.ray.intersectPlane(mousePlane, mousePosition);
      return { x: 2 * mousePosition.x / gridWWidth, y: 2 * mousePosition.y / gridWHeight };
    };

    renderer.domElement.addEventListener('mousemove', e => {
      const gp = getGridMP(e);
      ripple.addDrop(gp.x, gp.y, 0.05, 0.1);
    });
    renderer.domElement.addEventListener('mouseleave', e => { ripple.clearDrops(); });

    initScene();
    animate();
  }

  function initScene() {
    scene = new THREE.Scene();

    const pointLight1 = new THREE.PointLight(0xFFFF80);
    pointLight1.position.set(-wWidth / 2, wHeight / 2, 50);
    scene.add(pointLight1);

    const geometry = new THREE.PlaneBufferGeometry(wWidth, wHeight);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      metalness: 0.5,
      roughness: 0.5,
      onBeforeCompile: shader => {
        shader.uniforms.hmap = { value: ripple.hMap.texture };
        shader.vertexShader = `
          uniform sampler2D hmap;
          varying vec2 vUv;
          
          void main() {
            vec4 texel = texture2D(hmap, vUv);
            
            float displacement = 0.5;
            vec3 displacedPosition = position + normal * displacement * texel.r;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
            
            vUv = uv;
          }
        ` + shader.vertexShader;
        
        shader.fragmentShader = `
          uniform sampler2D hmap;
          varying vec2 vUv;
          
          void main() {
            vec4 texel = texture2D(hmap, vUv);
            
            float shift = sin(texel.r * 10.0);
            vec3 shiftedColor = vec3(gl_FragColor.r, gl_FragColor.g, gl_FragColor.b + shift);
            
            gl_FragColor = vec4(shiftedColor, 1.0);
          }
        ` + shader.fragmentShader;
      }
    });

    thePlane = new THREE.Mesh(geometry, material);
    scene.add(thePlane);

    const pointLight2 = new THREE.PointLight(0xde3578);
    pointLight2.position.set(wWidth / 2, wHeight / 2, 50);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xFF4040);
    pointLight3.position.set(-wWidth / 2, -wHeight / 2, 50);
    scene.add(pointLight3);

    const pointLight4 = new THREE.PointLight(0x0247e5);
    pointLight4.position.set(wWidth / 2, -wHeight / 2, 50);
    scene.add(pointLight4);

    renderer.domElement.addEventListener('mouseup', e => {
      pointLight1.color = new THREE.Color(chroma.random().hex());
      pointLight2.color = new THREE.Color(chroma.random().hex());
      pointLight3.color = new THREE.Color(chroma.random().hex());
      pointLight4.color = new THREE.Color(chroma.random().hex());
    });

    camera.position.set(0, 0, 100);
    camera.lookAt(new THREE.Vector3(0, -gridWHeight / 6, 0));

    cameraCtrl = new OrbitControls(camera, renderer.domElement);
    cameraCtrl.enableDamping = true;
    cameraCtrl.dampingFactor = 0.1;
    cameraCtrl.rotateSpeed = 0.5;
  }

  function animate() {
    ripple.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function updateSize() {
    width = window.innerWidth;
    cx = width / 2;
    height = window.innerHeight;
    cy = height / 2;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const wsize = getRendererSize();
    wWidth = wsize[0];
    wHeight = wsize[1];
  }

  function getRendererSize() {
    const cam = new THREE.PerspectiveCamera(camera.fov, camera.aspect);
    const vFOV = (cam.fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFOV / 2) * Math.abs(conf.cameraZ);
    const width = height * cam.aspect;
    return [width, height];
  }
}

const RippleEffect = (function () {
  function RippleEffect(renderer, width, height) {
    this.renderer = renderer;
    this.width = 512;
    this.height = 512;
    this.delta = new THREE.Vector2(1 / this.width, 1 / this.height);

    this.hMap = new THREE.WebGLRenderTarget(this.width, this.height, { type: THREE.FloatType, depthBuffer: false, stencilBuffer: false });
    this.hMap1 = new THREE.WebGLRenderTarget(this.width, this.height, { type: THREE.FloatType, depthBuffer: false, stencilBuffer: false });
    this.fsQuad = new FullScreenQuad();

    this.initShaders();
  }

  RippleEffect.prototype.initShaders = function () {
    const defaultVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    this.copyMat = new THREE.ShaderMaterial({
      uniforms: { 'tDiffuse': { value: null } },
      vertexShader: defaultVertexShader,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
        }
      `,
    });

    this.updateMat = new THREE.ShaderMaterial({
      uniforms: {
        'tDiffuse': { value: null },
        'delta': new THREE.Uniform(this.delta),
      },
      vertexShader: defaultVertexShader,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 delta;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);

          vec2 dx = vec2(delta.x, 0.0);
          vec2 dy = vec2(0.0, delta.y);
          float average = (
            texture2D(tDiffuse, vUv - dx).r +
            texture2D(tDiffuse, vUv - dy).r +
            texture2D(tDiffuse, vUv + dx).r +
            texture2D(tDiffuse, vUv + dy).r
          ) * 0.25;
          texel.g += (average - texel.r) * 2.0;
          texel.g *= 0.995;
          texel.r += texel.g;

          gl_FragColor = texel;
        }
      `,
    });

    this.dropMat = new THREE.ShaderMaterial({
      uniforms: {
        'tDiffuse': { value: null },
        'center': new THREE.Uniform(new THREE.Vector2()),
        'radius': { value: 0.05 },
        'strength': { value: 0.5 },
      },
      vertexShader: defaultVertexShader,
      fragmentShader: `
        const float PI = 3.1415926535897932384626433832795;
        uniform sampler2D tDiffuse;
        uniform vec2 center;
        uniform float radius;
        uniform float strength;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          float drop = max(0.0, 1.0 - length(center * 0.5 + 0.5 - vUv) / radius);
          drop = 0.5 - cos(drop * PI) * 0.5;
          texel.r += drop * strength;
          gl_FragColor = texel;
        }
      `,
    });
  };

  RippleEffect.prototype.update = function () {
    this.updateHMap();
  };

  RippleEffect.prototype.updateHMap = function () {
    this.updateMat.uniforms.tDiffuse.value = this.hMap.texture;
    this.renderShaderMat(this.updateMat, this.hMap1);
    this.swapBuffers();
  };

  RippleEffect.prototype.addDrop = function (x, y, radius, strength) {
    this.dropMat.uniforms.tDiffuse.value = this.hMap.texture;
    this.dropMat.uniforms.center.value.set(x, y);
    this.dropMat.uniforms.radius.value = radius;
    this.dropMat.uniforms.strength.value = strength;
    this.renderShaderMat(this.dropMat, this.hMap1);
    this.swapBuffers();
  };

  RippleEffect.prototype.clearDrops = function () {
    this.hMap1 = new THREE.WebGLRenderTarget(this.width, this.height, { type: THREE.FloatType, depthBuffer: false, stencilBuffer: false });
    this.hMap = new THREE.WebGLRenderTarget(this.width, this.height, { type: THREE.FloatType, depthBuffer: false, stencilBuffer: false });
  };

  RippleEffect.prototype.renderBuffer = function (buffer, target) {
    target = target ? target : null;
    this.copyMat.uniforms.tDiffuse.value = buffer.texture;
    this.renderShaderMat(this.copyMat, target);
  };

  RippleEffect.prototype.renderShaderMat = function (mat, target) {
    this.fsQuad.material = mat;
    const oldTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(target);
    this.fsQuad.render(this.renderer);
    this.renderer.setRenderTarget(oldTarget);
  };

  RippleEffect.prototype.swapBuffers = function () {
    const temp = this.hMap;
    this.hMap = this.hMap1;
    this.hMap1 = temp;
  };

  const FullScreenQuad = (function () {
    const camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
    const geometry = new THREE.PlaneBufferGeometry(2, 2);

    const FullScreenQuad = function (material) {
      this._mesh = new THREE.Mesh(geometry, material);
    };

    Object.defineProperty(FullScreenQuad.prototype, 'material', {
      get: function () { return this._mesh.material; },
      set: function (value) { this._mesh.material = value; }
    });

    Object.assign(FullScreenQuad.prototype, {
      render: function (renderer) {
        renderer.render(this._mesh, camera);
      }
    });

    return FullScreenQuad;
  })();

  return RippleEffect;
})();

const app = new App();
