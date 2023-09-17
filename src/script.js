import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Lenis from "@studio-freight/lenis";

import { mapValue } from "../static/js/helpers.js";

import FresnelShader from "./FresnelShader";
// import ASScroll from '@ashthornton/asscroll'
// import GSAP from 'gsap'
// import { map } from '../static/js/math'
// import { split } from '../static/js/text'

import "./assets/scss/index.scss";

// Misc helper functions
// import {
//   checkIfTouch,
//   map,
//   createPoints
// } from '../static/js/helpers.js'
// Longpress
// import LongPress from '../static/js/LongPress.js'

let scene, matDrop;
let materialPlane = null;
let theShader = {
  uniforms: {
    time: {
      value: 0,
    },
  },
};

function App() {
  const conf = {
    el: "canvas",
    fov: 75,
    cameraZ: 100,
  };

  // Calculate the total scroll height
  let totalScrollHeight = document.documentElement.scrollHeight;

  let renderer, scene, camera, cameraCtrl;
  let width, height, cx, cy, wWidth, wHeight;

  let ripple;
  let gridWWidth, gridWHeight;
  let gridWidth, gridHeight;

  let lastScrollPosition = 0;
  let lastTime = 0;

  // Should we show the grid lines or not?
  let should_draw_lines = false;
  // The mesh itself
  let thePlane = null;
  let matShader = null;

  const mouse = new THREE.Vector2();
  const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mousePosition = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  let mouseOver = false;

  init();

  let refractSphereCamera = null;
  let fresnelSphere = null;

  function init() {
    console.log("initing alright");
    // const gl = renderer.getContext();
    // const floatTextures = gl.getExtension('OES_texture_float');
    // if (!floatTextures) {
    //   alert('no floating point texture support');
    //   return;
    // }

    renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById(conf.el),
      antialias: true,
    });
    camera = new THREE.PerspectiveCamera(conf.fov);
    camera.position.x = 20;
    // camera.position.z = conf.cameraZ;
    // camera.lookAt(new THREE.Vector3(0,1,0))

    const lenis = new Lenis();

    lenis.on("scroll", (e) => {
      // console.log(e)

      onscroll(e);
      // onscroll(e.targetScroll)
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const htmlElement = document.getElementById("master-wrapper");
    htmlElement.addEventListener("mousemove", function (event) {
      // Manually trigger mousemove event on Three.js canvas
      const canvas = document.getElementById("canvas");
      const newEvent = new MouseEvent("mousemove", {
        clientX: event.clientX,
        clientY: event.clientY,
        // other properties here...
      });
      canvas.dispatchEvent(newEvent);
    });

    requestAnimationFrame(raf);

    updateSize();

    window.addEventListener("resize", updateSize, false);

    // gridWHeight = wHeight - 20;
    // gridWWidth = gridWHeight;
    gridWHeight = wHeight;
    gridWWidth = wWidth;
    gridWidth = (gridWWidth * width) / wWidth;
    gridHeight = (gridWHeight * height) / wHeight;

    ripple = new RippleEffect(renderer, width, height);

    const getGridMP = function (e) {
      const v = new THREE.Vector3();
      camera.getWorldDirection(v);
      v.normalize();
      mouse.x = (e.clientX / width) * 2 - 1;
      mouse.y = -(e.clientY / height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(mousePlane, mousePosition);
      return {
        x: (2 * mousePosition.x) / gridWWidth,
        y: (2 * mousePosition.y) / gridWHeight,
      };
    };

    renderer.domElement.addEventListener("mousemove", (e) => {
      mouseOver = true;
      const gp = getGridMP(e);
      ripple.addDrop(gp.x, gp.y, 0.05, 0.1);
    });
    renderer.domElement.addEventListener("mouseleave", (e) => {
      mouseOver = false;
    });

    // renderer.domElement.addEventListener('mouseup', e => {
    //   const gp = getGridMP(e);
    //   ripple.addDrop(gp.x, gp.y, 0.2, -3.0);
    // });

    initScene();
    animate();
  }

  function onscroll(e) {
    // Current time in milliseconds
    let currentTime = new Date().getTime();

    // Current scroll position
    let scrollPosition = parseFloat(e.targetScroll);

    // Time difference between now and the last time the event fired
    let timeDifference = currentTime - lastTime;

    // Difference in scroll position
    let scrollDifference = scrollPosition - lastScrollPosition;

    // Calculate velocity = Δscroll / Δtime
    // Multiply by 1000 to convert it to pixels per second
    let velocity = (scrollDifference / timeDifference) * 1000;

    // Map the value of scrollPosition to a new range for font weight
    const mappedValue = mapValue(scrollPosition, 0, totalScrollHeight, 0, 1000);
    const mappedValueSlant = mapValue(scrollPosition, 0, totalScrollHeight / 2, -10, 0);

    // Update font weight
    document.body.style.setProperty("--font-weight", mappedValue);
    
    // Update font slant
    document.body.style.setProperty("--text-slant", mappedValueSlant);

    // Update lastScrollPosition and lastTime for the next event
    lastScrollPosition = scrollPosition;
    lastTime = currentTime;

    // console.log(`Velocity: ${velocity} pixels/sec`);
    console.log(Math.abs(velocity));
  }

  function initScene() {
    scene = new THREE.Scene();

    let pointLight1 = new THREE.PointLight(0xffff80);
    pointLight1.position.set(-wWidth / 2, wHeight / 2, 50);
    scene.add(pointLight1);

    // Make a plane
    // const geometry = new THREE.SphereGeometry(wWidth, 100, 100)
    const geometry = new THREE.PlaneBufferGeometry(wWidth, wHeight, 100, 100);
    // Verify vertex positions
    const positions = geometry.getAttribute("position");
    console.log(positions);
    // Verify UV coordinates
    const uvs = geometry.getAttribute("uv");
    // console.log('renderer.domElement.width');
    // console.log(renderer.domElement.width);
    // materialPlane = new THREE.MeshPhongMaterial({
    materialPlane = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      metalness: 0.5,
      roughness: 0.5,
      emissive: new THREE.Color(0x0000ff).multiplyScalar(0.05),
      // shininess: 300,
      // wireframe: true,
      onBeforeCompile: (shader) => {
        shader.uniforms.hmap = { value: ripple.hMap.texture };
        shader.uniforms.time = { value: 0 };

        shader.uniforms.u_tex = {
          value: new THREE.TextureLoader().load("img/frame-1-4x.jpg"),
        };

        // shader.uniforms.u_tex = { value: new THREE.TextureLoader().load("https://s3-us-west-2.amazonaws.com/s.cdpn.io/2666677/sa1.jpg") }
        shader.uniforms.cursorPosition = { value: new THREE.Vector2(0, 0) };
        shader.uniforms.resolution = new THREE.Vector2(
          renderer.domElement.width,
          renderer.domElement.height
        );
        shader.vertexShader = `
          uniform sampler2D hmap;
          varying vec2 vUv;
          uniform vec2 resolution; // Add resolution uniform
          varying vec3 vPosition;

          void main() {
            vec3 displacedPosition = position;

            // Retrieve the displacement value from the height map texture
            vec4 texel = texture2D(hmap, uv);
            float displacement = 10.0 * texel.r;
            // float displacement = 10.0 * texel.g;

            // Apply the displacement to the vertex position
            displacedPosition += normal * displacement;

            vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            vUv = uv;
          }
        `;

        shader.fragmentShader = `
          uniform float time; // Add time uniform
          uniform sampler2D hmap; // Add hmap uniform
          uniform vec2 cursorPosition; // Add cursorPosition uniform
          uniform vec2 resolution; // Add resolution uniform
          varying vec2 vUv;
          varying vec3 vPosition;
          uniform sampler2D u_tex;
    
          // Function to convert HSV to RGB
          vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
          }
    
          void main() {
            // Calculate the distance from the cursor position
            vec2 normalizedCoords = gl_FragCoord.xy / resolution.xy;
            float distanceFromCursor = distance(normalizedCoords, cursorPosition);

            // Map the distance to a displacement factor
            float displacementFactor = smoothstep(0.0, 0.1, distanceFromCursor); // Adjust the threshold as needed

            // Apply the displacement factor to the fragment color or any other calculations
            vec3 dColor = vec3(displacementFactor); // Example: Set the color based on the displacement factor

            vec4 texel = texture2D(hmap, vUv);
    
            // Calculate hue based on time
            // float hue = fract(time * 0.1); // Adjust the factor as needed
            float hue = clamp(cos(time * 0.1), 0.0, 1.0); // Adjust the factor as needed
    
            // Convert hue to RGB
            vec3 rgb = hsv2rgb(vec3(hue, 1.0, 1.0));
    
            // Apply the new color
            // gl_FragColor = vec4(rgb, 1.0);
            // gl_FragColor = vec4(vec3(hue * 0.1, 1.0, 1.0), 1.0);
            
            float shift = sin(texel.r * (cos(time * 1.0)));
            float shift2 = sin(texel.r * (sin(time * 1.0)));
            vec3 shiftedColor = vec3((gl_FragColor.r + shift2), gl_FragColor.g - shift, gl_FragColor.b + shift);

            // Standard coloring
            // vec3 tColor = texture2D(u_tex, shiftedColor.rg).rgb;
            vec3 tColor = texture2D(u_tex, vUv).rgb;
            gl_FragColor = vec4(tColor.r *= shiftedColor.r, tColor.g /= shiftedColor.g, tColor.b /= shiftedColor.b, 1.0);
          }
        `;
        theShader = shader;
      },
    });

    // const materialPlane = new THREE.MeshPhongMaterial({ color: 0x2288ff, shininess: 100 })
    // materialPlane.onBeforeCompile = (shader) => {
    //   shader.uniforms.time = { value: 0 }
    //   shader.vertexShader = `
    //     uniform float time;
    // ` + shader.vertexShader

    //   const token = '#include <begin_vertex>'
    //   const customTransform = `
    //     vec3 transformed = vec3(position);
    //     float freq = 3.0;
    //     float amp = 0.1;
    //     float angle = (time + position.x)*freq;
    //     transformed.z += sin(angle)*amp;
    // `
    //   shader.vertexShader = shader.vertexShader.replace(token, customTransform)
    //   matShader = shader
    // }

    thePlane = new THREE.Mesh(geometry, materialPlane);
    scene.add(thePlane);

    // addSphere()
    // console.log(FresnelShader)

    // const geometry = new THREE.PlaneBufferGeometry(wWidth, wHeight);
    // // Make a sphere
    // // const geometry = new THREE.SphereBufferGeometry(wWidth, wWidth, wWidth);
    // thePlane = new THREE.Mesh(geometry, matDrop)
    // // Add new mesh
    // scene.add( thePlane )
    let light = new THREE.DirectionalLight(0xffffff, 0.25);
    light.position.setScalar(1);
    // let light2 = new THREE.HemisphereLight(0xffff00, 0x0000ff, 0.375);
    let light2 = new THREE.HemisphereLight(0xffffff, 0xfffff, 0.375);
    scene.add(light, light2, new THREE.AmbientLight(0xffffff, 0.5));

    let pointLight2 = new THREE.PointLight(0xde3578);
    pointLight2.position.set(wWidth / 2, wHeight / 2, 50);
    // scene.add(pointLight2);

    let pointLight3 = new THREE.PointLight(0xff4040);
    pointLight3.position.set(-wWidth / 2, -wHeight / 2, 50);
    // scene.add(pointLight3);

    let pointLight4 = new THREE.PointLight(0x0247e5);
    pointLight4.position.set(wWidth / 2, -wHeight / 2, 50);
    // scene.add(pointLight4);

    renderer.domElement.addEventListener("mouseup", (e) => {
      pointLight1.color = new THREE.Color(chroma.random().hex());
      pointLight2.color = new THREE.Color(chroma.random().hex());
      pointLight3.color = new THREE.Color(chroma.random().hex());
      pointLight4.color = new THREE.Color(chroma.random().hex());
    });

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      metalness: 0.5,
      roughness: 0.5,
      onBeforeCompile: (shader) => {
        shader.uniforms.hmap = { value: ripple.hMap.texture };
        shader.vertexShader = "uniform sampler2D hmap;\n" + shader.vertexShader;
        const token = "#include <begin_vertex>";
        const customTransform = `
        vec3 transformed = vec3(position);
        vec4 info = texture2D(hmap, uv);
        vNormal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a).xzy;
        transformed.z = 20. * info.r;
      `;
        shader.vertexShader = shader.vertexShader.replace(
          token,
          customTransform
        );
      },
    });

    let nx = Math.round(gridWidth / 2),
      ny = Math.round(gridHeight / 20);
    let dx = gridWWidth / nx,
      dy = gridWHeight / ny;
    for (let j = 0; j <= ny; j++) {
      const geometry = new THREE.BufferGeometry();
      const positions = [],
        uvs = [];
      const y = -gridWHeight / 2 + j * dy;
      for (let i = 0; i <= nx; i++) {
        positions.push(-gridWWidth / 2 + i * dx, y, 0);
        uvs.push(i / nx, j / ny);
      }
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geometry.computeBoundingSphere();

      // Draw lines on x axis
      if (should_draw_lines) {
        scene.add(new THREE.Line(geometry, material));
      }
    }

    nx = Math.round(gridWidth / 20);
    ny = Math.round(gridHeight / 2);
    dx = gridWWidth / nx;
    dy = gridWHeight / ny;
    for (let i = 0; i <= nx; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = [],
        uvs = [];
      const x = -gridWWidth / 2 + i * dx;
      for (let j = 0; j <= ny; j++) {
        positions.push(x, -gridWHeight / 2 + j * dy, 0);
        uvs.push(i / nx, j / ny);
      }
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geometry.computeBoundingSphere();

      // Draw lines on y axis
      if (should_draw_lines) {
        scene.add(new THREE.Line(geometry, material));
      }
    }
    // camera.position.set(0, -gridWHeight / 2, 100);
    camera.position.set(0, 0, 100);
    camera.lookAt(new THREE.Vector3(0, -gridWHeight / 6, 0));

    cameraCtrl = new OrbitControls(camera, renderer.domElement);
    cameraCtrl.enableDamping = true;
    cameraCtrl.dampingFactor = 0.1;
    cameraCtrl.rotateSpeed = 0.5;
  }

  function addSphere() {
    refractSphereCamera = new THREE.CubeCamera(
      0.1,
      5000,
      new THREE.WebGLCubeRenderTarget(512)
    );
    scene.add(refractSphereCamera);

    var fShader = FresnelShader;

    var fresnelUniforms = {
      mRefractionRatio: { value: 1.02 },
      mFresnelBias: { value: 0.1 },
      mFresnelPower: { value: 2.0 },
      mFresnelScale: { value: 1.0 },
      tCube: { value: refractSphereCamera.renderTarget.texture },
    };

    // create custom material for the shader
    var customMaterial = new THREE.ShaderMaterial({
      uniforms: fresnelUniforms,
      vertexShader: fShader.vertexShader,
      fragmentShader: fShader.fragmentShader,
    });

    var sphereGeometry = new THREE.SphereGeometry(100, 64, 32);
    fresnelSphere = new THREE.Mesh(sphereGeometry, customMaterial);
    fresnelSphere.position.set(0, 50, 100);
    scene.add(fresnelSphere);

    refractSphereCamera.position.copy(fresnelSphere.position);
  }

  function remap(value, inputMin, inputMax, outputMin, outputMax) {
    // Check for division by zero
    if (inputMin === inputMax) {
      throw new Error("Input range min and max should be different");
    }

    // Clamp the value within the input range
    const clampedValue = Math.max(Math.min(value, inputMax), inputMin);

    // Calculate the normalized value within the input range
    const normalizedValue = (clampedValue - inputMin) / (inputMax - inputMin);

    // Map the normalized value to the output range
    const mappedValue = normalizedValue * (outputMax - outputMin) + outputMin;

    return mappedValue;
  }

  function animate() {
    if (!mouseOver) {
      const time = Date.now() * 0.001;
      const x = Math.cos(time) * 0.2;
      const y = Math.sin(time) * 0.2;
      ripple.addDrop(x, y, 0.05, -0.04);

      // const convertedTime = time * 0.00000001
      const convertedTime = remap(x, -0.2, 0.2, 0, 1);
      // console.log(convertedTime)

      // Update the time uniform value
      // console.log(materialPlane)
      if (
        theShader.uniforms.time != null ||
        theShader.uniforms.time != undefined
      ) {
        // theShader.uniforms.time.value = time;
        theShader.uniforms.time.value = convertedTime;
        // console.log(time)
      }
      // if (materialPlane.uniforms.time != null || materialPlane.uniforms.time != undefined) {
      //   materialPlane.uniforms.time.value = time;
      // }

      // if(matShader) {
      //   matShader.uniforms.time.value = time * 1000;
      //   console.log(matShader)
      // }
    }

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

    console.log("on resize");
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
    // this.delta = new THREE.Vector2(this.width / Math.pow(width, 2), this.height / Math.pow(height, 2));
    this.delta = new THREE.Vector2(1 / this.width, 1 / this.height);

    this.hMap = new THREE.WebGLRenderTarget(this.width, this.height, {
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.hMap1 = new THREE.WebGLRenderTarget(this.width, this.height, {
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.fsQuad = new FullScreenQuad();

    this.initShaders();
  }

  RippleEffect.prototype.initShaders = function () {
    // default vertex shader
    const defaultVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    this.copyMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
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
        tDiffuse: { value: null },
        delta: new THREE.Uniform(this.delta),
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

    this.normalsMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        delta: new THREE.Uniform(this.delta),
      },
      vertexShader: defaultVertexShader,
      fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 delta;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 dx = vec3(delta.x, texture2D(tDiffuse, vec2(vUv.x + delta.x, vUv.y)).r - texel.r, 0.0);
        vec3 dy = vec3(0.0, texture2D(tDiffuse, vec2(vUv.x, vUv.y + delta.y)).r - texel.r, delta.y);
        texel.ba = normalize(cross(dy, dx)).xz;
        gl_FragColor = texel;
      }
    `,
    });

    this.dropMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        center: new THREE.Uniform(new THREE.Vector2()),
        radius: { value: 0.05 },
        strength: { value: 0.5 },
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
          // texel.r = clamp(texel.r, -2.0, 2.0);
          gl_FragColor = texel;
        }
      `,
    });

    matDrop = this.dropMat;
  };

  RippleEffect.prototype.update = function () {
    this.updateHMap();
    this.updateHMapNormals();
  };

  RippleEffect.prototype.updateHMap = function () {
    this.updateMat.uniforms.tDiffuse.value = this.hMap.texture;
    this.renderShaderMat(this.updateMat, this.hMap1);
    this.swapBuffers();
  };

  RippleEffect.prototype.updateHMapNormals = function () {
    this.normalsMat.uniforms.tDiffuse.value = this.hMap.texture;
    this.renderShaderMat(this.normalsMat, this.hMap1);
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

  // from https://threejs.org/examples/js/postprocessing/EffectComposer.js
  const FullScreenQuad = (function () {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneBufferGeometry(2, 2);

    const FullScreenQuad = function (material) {
      this._mesh = new THREE.Mesh(geometry, material);
    };

    Object.defineProperty(FullScreenQuad.prototype, "material", {
      get: function () {
        return this._mesh.material;
      },
      set: function (value) {
        this._mesh.material = value;
      },
    });

    Object.assign(FullScreenQuad.prototype, {
      render: function (renderer) {
        renderer.render(this._mesh, camera);
      },
    });

    return FullScreenQuad;
  })();

  return RippleEffect;
})();

const app = new App();
