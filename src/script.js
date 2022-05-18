import './assets/scss/main.scss'
import * as dat from 'dat.gui'
import * as THREE from 'three'
import gsap, { TweenMax, TimelineMax, Sine, Power3, Power4, Expo } from 'gsap'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

import { SceneUtils } from 'three/examples/jsm/utils/SceneUtils.js'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

// import { BokehPass } from '../static/js/BokehPassMine.js';
// import { BokehShader, BokehDepthShader } from '~/assets/js/BokehShader2.js';

// import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
// Misc helper functions
import {
  checkIfTouch,
  map,
  createPoints,
  noise,
  generateRandomNumber
} from '../static/js/helpers.js'
// Longpress
import LongPress from '../static/js/LongPress.js'
// volumetric / godrays shaders
import godRaysShaders from '../static/js/godrays-shaders.js'
import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'
import { DoubleSide } from 'three'

// import SimplexNoise from 'simplex-noise'

import AnimatedChar from '../static/js/Character.js'

// require('../static/js/splitTextPlugin.js')
import * as SplitText from '../static/js/splitTextPlugin.js'

// Noise related - start
import { spline } from '@georgedoescode/spline'
// our <path> element
const path = document.querySelector("#circlePath")
// used to set our custom property values
const root = document.documentElement
let hueNoiseOffset = 0
let noiseStep = 0.005
const points = createPoints()
// Noise related - end


// import videoTexture from '../static/js/video-texture.js'
///////////
// VIDEO //
///////////

// alternative method -- 
// create DIV in HTML:
// <video id="myVideo" autoplay style="display:none">
//		<source src="videos/sintel.ogv" type='video/ogg; codecs="theora, vorbis"'>
// </video>
// and set JS variable:
// video = document.getElementById( 'myVideo' );

let video = null
let videoImage = null
let videoImageContext = null
let videoTexture = null
let movieMaterial = null
let neonLightOne = null

// Animation
// const stdTime = 1.25
const stdTime = 1.0

// the geometry on which the movie will be displayed;
// 		movie image will be scaled to fit these dimensions.

// /**
//  * Spector JS
//  */
// const SPECTOR = require('spectorjs')
// const spector = new SPECTOR.Spector()
// spector.displayUI()

// Audio example
// https://github.com/mrdoob/three.js/blob/master/examples/webaudio_sandbox.html

/**
 * Sizes
 */
 const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

let camera = null
let renderer = null
let controls = null
let effectComposer = null
let renderTarget = null
let clock = null

let posSpotLightTL = null

// Debug
let gui = new dat.GUI({
  width: 400
})

dat.GUI.toggleHide()

// Canvas
const canvas = document.querySelector('canvas.webgl')
// Preloader and play buttons
const preloaderOverlay = document.querySelector('.loader-overlay')
const playButton = document.querySelector('.sound-button')
// preloaderOverlay.style.display = 'none'
// preloaderOverlay.style.opacity = 0

// Scene
const scene = new THREE.Scene()
const color = 0x000000;
const near = 0;
const far = 60;
scene.fog = new THREE.Fog(color, near, far);
// scene.fog = new THREE.FogExp2( 0x000000, 0.1 );

const sounds = [
  {name: 'beat', path: 'captcha-music-orgel-drums.wav', volume: 0.5},
  // {name: 'NeonLight1', path: 'neonlight-highpitch-119845.mp3', volume: 0.5},
  // {name: 'boxLightSmall', path: 'hum-also-known-as-sun.mp3', volume: 0.05}
]
let canPassSound = false

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Textures
 */
// const bakedTexture = textureLoader.load('baked.jpg') // org. from Bruno Simon
// const bakedTexture = textureLoader.load('bakedMine.jpg') // Mine from landscape-playground.blend
// const bakedTexture = textureLoader.load('baked-industrial-space.jpg') // Mine from landscape-playground.blend
// const bakedFloorTexture = textureLoader.load('billund-transport-Q1.jpg') // Mine from landscape-playground.blend

const bakedFloorTexture = textureLoader.load( 'bakedFloor_captcha.jpg' ) // Mine from landscape-playground.blend
const bakedFloorTextureAlphaMap = textureLoader.load( 'bakedFloor_alphaMap.png' ) // Mine from landscape-playground.blend

bakedFloorTexture.flipY = false
bakedFloorTexture.encoding = THREE.sRGBEncoding

/**
 * Materials
 */
// Baked material
// const bakedFloorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
const bakedFloorMaterial = new THREE.MeshStandardMaterial({
  map: bakedFloorTexture,
  alphaMap: bakedFloorTextureAlphaMap,
  // aoMapIntensity: 1,
  transparent: true
})

// Portal light material
let portalLightMaterial = null
const boxLightSmallMaterial = new THREE.MeshBasicMaterial({ color: 0xffc0cb })
// const boxLightLargeMaterial = new THREE.MeshBasicMaterial({ 
//   color: 0xffffff
// })
let boxLightLargeMaterial = new THREE.MeshStandardMaterial({
  color: 0x333333,
  roughness: 0,
  metalness: 0,
  emissive: 0xffffff,
  flatShading: true
})

// Pole light material
const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })

export default class Setup {
  constructor() {
    // Godrays shaders
    this.godRaysMaterial = ''
    this.coneMesh = ''
    this.spotLight = ''
    this.coneRadius = {
      value: 7
    }
    this.godrayVShader = godRaysShaders.godrayVShader
    this.godrayFShader = godRaysShaders.godrayFShader
    this.allSpots = []
    this.coneHeight = 22

    this.debugObject = {}

    this.INTERSECTED = ''
    this.intS = null
    this.intersectedObject = null
    this.showAnnotation = false // true if we want to play tooltip animation
    this.meshes = []
    this.popover = document.querySelector('.popover')

    this.theCap = null
    this.curGuiObject = null
    this.mouseIsDown = false
    this.isDragging = false
    this.INTERSECTS = null

    this.realMouse = {x: 0, y: 0}
    this.currentX = 0
    this.dragDir = 0

    this.beamGuide = null
    this.randomSpinY = 0
    this.hasBeenSolved = false

    this.questionMark = null
    this.correctGuides = []

    this.window = { w: null, h: null }

    // Character related
    this.animatedCharacters = []

    // To store all sounds
    this.allSounds = []

    this.filmPass = null
    
    this.masterInit()

    // this.simplex = new SimplexNoise()

    // Add DOM events
    this.addDOMEvents()
  }

  masterInit() {
    let self = this
    self.window = { w: window.innerWidth, h: window.innerHeight }

    this.makeShaderMaterial() // First lets make the shader material since dat gui needs it
    this.setupTweakGui() // Secondly lets setup tweak gui
    this.init()
    // this.setupMovie()
    this.setupNecessaryAudio()
    
    this.loadModel()

    this.addLights()
    
    // this.addFog()

    // this.addGodRays()
    this.initPostprocessing()
    
    // Tooltip animation
    this.initTooltipAnim()
    // Question animation
    this.initQuestionAnim()

    // Setup long press logic
    this.setupLongPressLogic()
    // this.tick()

    // this.initBokeh()
  }

  // initBokeh() {
  //   let self = this
  //   self.effectController = {
  //     focus: 1.0, /* 500.0 */
  //     aperture: 100, /* 5 */
  //     maxblur: 0.005, /* 0.01, slightly more: 0.014 */
  //     // maxblur: 0.0005, /* 0.01, slightly more: 0.014 */
  //   };
  //   self.postprocessing.bokeh.uniforms["focus"].value =
  //     self.effectController.focus;
  //   self.postprocessing.bokeh.uniforms["aperture"].value =
  //     self.effectController.aperture * 0.00001;
  //   self.postprocessing.bokeh.uniforms["maxblur"].value =
  //     self.effectController.maxblur;
  // }

  addLights() {

    const light = new THREE.PointLight( 0xffffff, 1, 100 );
    light.position.set( -1.5, 50, 0 );
    light.castShadow = true
    scene.add( light );


    var lightAmbient = new THREE.AmbientLight( 0xf0f0f0 )
    scene.add( lightAmbient )
  }

  addFog() {
    // var self = this
    // Add fog
    let fogColor = new THREE.Color(0x000000);

    scene.background = fogColor;
    scene.fog = new THREE.Fog(fogColor, 0, 40);
  }

  init() {
    var self = this

    /**
     * Camera
     */
    // Base camera
    camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 1000)
    
    // camera.position.x = -10
    // camera.position.y = 2
    // camera.position.z = -10
    
    // Camera values ideally as set in Blender project "konradstudio-space-1a", but not yet
    // camera.position.set(-5.5, 3.4, 7.6)
    camera.position.set(-3.3, 3.05, 4.41)
    
    // camera.position.set(9.55, 7.98, 11.06)
    
    scene.add(camera)

    this.addOrbitControls()

    /**
     * Renderer
     */
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputEncoding = THREE.sRGBEncoding

    // Make clock
    clock = new THREE.Clock()

    self.characterCapGuy = new AnimatedChar({
      scene,
      camera,
      // loader: this.gltfLoader,
      loader: gltfLoader,
      // modelPath: 'models/character_male_nielskonrad_rigged_with_anim_typing.glb',
      // modelPath: 'models/character_male_capguy_Standing_Idle.glb',
      // modelPath: 'models/character_male_capguy_with_animations.glb',
      modelPath: 'models/character_male_capguy_with_animations_1b.glb',
      modelTexturePath: '',
      charName: 'nielskonrad',
      customMaterial: this.portalLightMaterial
    })

    // Add each child to the meshes array
    // self.meshes.push( self.characterCapGuy.model.children[ 1 ].children[ 3 ] )
    
    setTimeout(_ => {
      // self.meshes.push( self.characterCapGuy.model )
      // self.meshes.push( self.characterCapGuy.model.children[ 1 ].children[ 3 ] )
      console.log( 'self.characterCapGuy.model' )
      // console.log( self.characterCapGuy.model )
      console.log( self.characterCapGuy.model.children[ 0 ] )
      // self.meshes.push( self.characterCapGuy.model.children[ 0 ] )

      // console.log( 'self.characterCapGuy' )
      // console.log( typeof self.characterCapGuy )
      for (const [key, value] of Object.entries(self.characterCapGuy)) {
        
        // console.log(`${key}: ${value}`);
      }

      self.placeCap()

      // console.log('theTemplateCap.position')
      // console.log(bestPosition)
    
      // self.meshes.push( self.theCap )
      // console.log( 'theCap model - - - - - ' )
      // console.log( self.characterCapGuy.model.children[ 1 ] )
      // console.log( self.theCap )

      // self.characterCapGuy.model.rotation.set( Math.PI * 4, 0, 0 )
    }, 1000)

    this.animatedCharacters.push( self.characterCapGuy )

    window.addEventListener('resize', this.onResize)
  }

  // place cap follow character
  placeCap() {
    var self = this
    // Add each child to the meshes array
    const theTemplateCap = self.characterCapGuy.model.children[ 1 ].children[ 3 ]
    // const theTemplateCapWorlPos = theTemplateCap.getWorldPosition()
    // console.log( 'theTemplateCap' )
    // console.log( theTemplateCap )
    // console.log( 'self.theCap' )
    // console.log( self.theCap )

    const bestPosition = theTemplateCap.geometry.boundingBox.max
    self.bestPositionCorrected = bestPosition
    // self.bestPositionCorrected = bestPosition.sub(new THREE.Vector3(0.12, -0.06, 0.32))

    // console.log( 'self.characterCapGuy' )
    // console.log( self.characterCapGuy.theTemplateCap )

    var geometry = self.characterCapGuy.theTemplateCap.geometry;
    var position = geometry.attributes.position;
    // console.log( 'position' )
    // console.log( position )

    // console.log( 'self.bestPositionCorrected' )
    // console.log( self.bestPositionCorrected )
    // console.log( 'self.theTemplateCapWorlPos' )
    // console.log( theTemplateCapWorlPos )
    // console.log( 'theTemplateCap' )
    // console.log( theTemplateCap )

    // Working on placement of cap
    const nearestBonePoint = theTemplateCap.skeleton.bones[ 7 ]
    // self.theCap.position.clone( theTemplateCap.position )
    // self.theCap.position.copy( nearestBonePoint.position )
    
    // SceneUtils.detach( self.theCap, self.theCap.parent, scene );
    // SceneUtils.attach( self.theCap, scene, theTemplateCap );
    // scene.remove( self.theCap )

    // let newO = self.theCap.clone()
    // 

    // theTemplateCap.skeleton.bones[ 7 ].add( self.theCap )
    
    // let bone = theTemplateCap.skeleton.bones[ 7 ]
    // this.updateMatrixWorld(true);
    // // assuming this is a SkinnedMesh
    // var meshGlobal = new THREE.Vector3().setFromMatrixPosition(this.scene);
    // this.traverse(function (bone) {
    //     if (bone instanceof THREE.Bone) {
    //         var twinGlobalPos = new THREE.Vector3().setFromMatrixPosition(bone.skinMatrix).add(meshGlobal);
    //         console.log(typeof (bone), "GlobalPos", twinGlobalPos.x, twinGlobalPos.y, twinGlobalPos.z);
    //     }
    // })
    const boneRot = theTemplateCap.skeleton.bones[ 5 ];

    const bone = theTemplateCap.skeleton.bones[ 6 ];
    const clonedPos = bone.position.clone()
    const bonePosGlobal = bone.getWorldPosition( clonedPos );
    // const bonePosGlobal = new THREE.Vector3(0,0,0);
    // console.log( 'self.theCap' )
    // console.log(self.theCap)

    const offset = {
      x: -0.025,
      y: -0.1,
      z: -0.025
      // x: -0.015,
      // y: 0.2,
      // z: -0.015
    }
    // console.log( 'bonePosGlobal' )
    // console.log(bonePosGlobal)
    // Copy positions with offset
    self.theCap.position.x = bonePosGlobal.x + offset.x
    self.theCap.position.y = bonePosGlobal.y + offset.y
    self.theCap.position.z = bonePosGlobal.z + offset.z
    
    var quaternion = new THREE.Quaternion()
    theTemplateCap.getWorldQuaternion( quaternion )
    // console.log(quaternion)
    let rotation = new THREE.Euler()
    rotation.setFromQuaternion(quaternion)
    
    // console.log(rotation)
    // console.log(bone.rotation)

    if (self.hasBeenSolved) {

      // Turn the hat
      self.theCap.rotation.copy( boneRot.rotation )
      // self.theCap.rotation.y += self.dragDir

      // self.theCap.position.y -= 0.01
      // self.theCap.position.z -= 0.045
    }
    
    // self.theCap.rotation.set( rotation )
    // self.theCap.setFromQuaternion(quaternion)

    // bone.add( self.theCap )
    // self.theCap.rotation.set(0,0,0)
    // self.theCap.position.set(0,0,0)
    // Copy rotation
    // console.log('theTemplateCap.skeleton.bones')
    // console.log(theTemplateCap.skeleton.bones)
    // console.log('bone')
    // console.log(bone)
    // console.log('bone.rotation')
    // console.log(bone.rotation)
    
    // self.theCap.rotation.x = bone.rotation.x
    // self.theCap.rotation.y = bone.rotation.y
    // self.theCap.rotation.z = bone.rotation.z
    
    // self.theCap.rotation.copy(bone.rotation)
    // self.theCap.rotation.x = 4
    // Set cap position


    // self.theCap.position.copy( theTemplateCap.position )
    // theTemplateCap.add( self.theCap )
    // theTemplateCap.add( newO )
    // self.meshes.push( self.theCap )
    // self.theCap.visible = true

    // console.log( self.theCap )

    // self.theCap.position.copy( self.bestPositionCorrected )
    // self.theCap.rotation.copy( self.bestPositionCorrected )
  }

  setupLongPressLogic() {
    var self = this
    let longPrss = new LongPress();
    // TODO: Look into webgl-mouse-hover or something, to see
    // how to handle callbacks and return functions
  }

  setupNecessaryAudio() {
    var self = this
    // Create a listener
    this.listener = new THREE.AudioListener()
    camera.add( this.listener )
    // Create sound loader
    this.audioLoader = new THREE.AudioLoader()
  }

  loadSound(soundIndex, parent) {
    var self = this
    var sound = new THREE.PositionalAudio( self.listener );
    console.log('sound index: ', 'sound/' + sounds[ soundIndex ])
    // return
    this.audioLoader.load( 'sound/' + sounds[ soundIndex ].path, function ( buffer ) {
      sound.setBuffer( buffer )
      sound.setRefDistance( 20 )
      sound.setLoop( true )
      sound.setVolume( sounds[ soundIndex ].volume )
      sound.play() 
      parent.add( sound )
      // sounds.audio = sound
      // console.log('its working alright')
    })
    //
    // store sound and add to global array
    const analyser = new THREE.AudioAnalyser( sound, 32 );
    this.allSounds.push( {snd: sound, analyser: analyser, parent: parent} )
    // console.log()
  }
  
  loadModel() {
    var self = this
    /**
     * Model
     */
    gltfLoader.load(
      // 'portal.glb', // org. from Bruno Simon
      // 'landscape-playground.glb', // Mine from landscape-playground.blend
      // 'industrial-space-1.glb', // Mine from landscape-playground.blend
      // 'models/industrial-space-1c.glb', // Mine from landscape-playground.blend
      
      // 'models/konradstudio-space-1a.glb', // Mine from landscape-playground.blend
      'models/captcha-1a.glb', // Mine from landscape-playground.blend
      (gltf) =>
      {
          // Bruno Simons 'portal.blend' model
          // const bakedMesh = gltf.scene.children.find(child => child.name === 'baked')
          // const portalLightMesh = gltf.scene.children.find(child => child.name === 'portalLight')
          // const poleLightAMesh = gltf.scene.children.find(child => child.name === 'poleLightA')
          // const poleLightBMesh = gltf.scene.children.find(child => child.name === 'poleLightB')
          
          // bakedMesh.material = bakedMaterial
          // portalLightMesh.material = portalLightMaterial
          // portalLightMesh.material = portalLightMaterial
          // poleLightAMesh.material = poleLightMaterial
          // poleLightBMesh.material = poleLightMaterial

          // My 'landscape-playground.blend' model
          // Traverse scene if wanting to look for things and names
          gltf.scene.traverse( child => {
            
            // console.log(child)
            console.log(child.name)
            
            // child.material = bakedFloorMaterial
            
            // Add each child to the meshes array
            self.meshes.push(child)
            // Assign ID to mesh
            child.userData.id = 0

            // Floor
            if (
              child.name === 'Floor'
            ) {
              child.material = bakedFloorMaterial
              child.receiveShadow = true
            }
            
            // Hide arrows for now
            if (
              child.name === 'arrow-one' ||
              child.name === 'arrow-two' ||
              child.name === 'ringExtrudeCube'
            ) {
              child.visible = false
            }
            
            // Put questionmark in global var
            if (
              child.name === 'questionmark'
            ) {
              self.questionMark = child
            }
            
            // cap
            if (
              child.name === 'cap'
            ) {
              self.theCap = child

              // Spin the cap
              // self.randomSpinY = generateRandomNumber(10, 20)
              self.randomSpinY = 0
              // gsap.to( self.theCap.rotation, 5.0, {
              //   y: self.randomSpinY
              // })

              // Scale it up a bit
              const sFCap = 1.3
              self.theCap.scale.set(sFCap, sFCap, sFCap)

              // child.visible = false
              // alert('cap')
              // child.position.clone( self.theCap.position )
              // if (self.theCap != null) {
              //   child.position.clone( self.theCap.position )
              // }
            }

            if (child.name === 'beamguide') {
              self.beamGuide = child
              self.beamGuide.visible = false
              self.beamGuide.material.transparent = true
            }
            
            if (
              child.name === 'arrow-correct-left' ||
              child.name === 'arrow-correct-right' ||
              child.name === 'checkmark'
            ) {
              self.correctGuides.push( child )
              self.correctGuides.forEach(element => {
                element.visible = false
              })
            }

            // Floor
            // if (
            //   child.name != 'Floor'
            // ) {
            //   child.visible = false
            // }

            // If there are walls hide them for now. Until single side material so cam can look through each of them
            if (
              child.name === 'Wall1' || child.name === 'Wall2' || 
              child.name === 'Wall3' || child.name === 'Wall4'
            ) {
              child.visible = false 
            }

            // If there is a spotlight then place the shader that fits it
            if (
              child.name === 'SpotLightTL' ||
              child.name === 'SpotLightTR' 
            ) {
              // Clone pos of spotLightTL
              posSpotLightTL = child.position.clone()
              // console.log(posSpotLightTL)
              // setup.addGodRays(posSpotLightTL)
            }

            // Add the sounds
            let id = null
            if (child.name === 'pac_man_machine') {
              id = 0
              canPassSound = true
            }
            if (canPassSound) {
              // here we start the sound
              // self.loadSound(id, child)
              canPassSound = false
            }
            // if (child.name === 'lightBoxSmall') {              
            //   id = 1
            //   canPassSound = true
            // }
          })

          // // box lights from industrial space - start
          // const boxLightSmall = gltf.scene.children.find(child => child.name === 'boxLightSmall')
          // const boxLightLarge = gltf.scene.children.find(child => child.name === 'boxLightLarge')
          // const lightBoxLarge = gltf.scene.children.find(child => child.name === 'lightBoxLarge')
          // neonLightOne = gltf.scene.children.find(child => child.name === 'NeonLight1')
          // // const spotLightTL = gltf.scene.children.find(child => child.name === 'SpotLightTL')

          // boxLightSmall.material = boxLightSmallMaterial
          // // boxLightLarge.material = boxLightLargeMaterial
          // // boxLightLarge.material = portalLightMaterial
          // // boxLightLarge.material = movieMaterial
          // // console.log('boxLightLarge: ')
          // // console.log(boxLightLarge)
          // this.lightBoxLarge = lightBoxLarge
          // neonLightOne.material = boxLightLargeMaterial
          // // box lights from industrial space - end

          // hide lightBoxLarge for testing
          // lightBoxLarge.visible = false
          // boxLightLarge.visible = false

          scene.add(gltf.scene)

          // this.setupMovie()
          this.tickTock()
      }
    )
  }

  setupMovie() {
    // create the video element
    video = document.createElement( 'video' );
    // video.id = 'video';
    // video.type = ' video/ogg; codecs="theora, vorbis" ';
    video.src = "video/teenage-conflict-1960-xs-comp.mp4";
    video.load(); // must call after setting/changing source
    video.loop = true

    videoImage = document.createElement( 'canvas' );
    videoImage.width = 675;
    videoImage.height = 540;

    videoImageContext = videoImage.getContext( '2d' );
    // background color if no video present
    videoImageContext.fillStyle = '#000000';
    videoImageContext.fillRect( 0, 0, videoImage.width, videoImage.height );

    videoTexture = new THREE.Texture( videoImage );
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
    const videoSize = {w: 4, h: 4}
    var movieGeometry = new THREE.PlaneGeometry( videoSize.w, videoSize.h, 4, 4 );
    var movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
    movieScreen.position.copy(this.lightBoxLarge.position)
    movieScreen.position.y += movieScreen.scale.y / 2
    movieScreen.position.x -= 0.4
    movieScreen.position.z -= 0.2
    // movieScreen.rotation.copy(this.lightBoxLarge.rotation * new THREE.Vector3(Math.PI / 2, Math.PI / 2, Math.PI / 2))
    movieScreen.rotation.y = 1.1
    // movieScreen.rotation.set(new THREE.Vector3( 0, Math.PI / 2, 0));
    movieScreen.scale.copy(this.lightBoxLarge.scale)
    movieScreen.scale.x /= 4
    movieScreen.scale.y /= 4
    scene.add(movieScreen);
    console.log('setting up movie alright')
  }

  setupTweakGui() {
    var self = this
    /**
     * Base
     */
    const parameters = {
      color: 0xff0000
    }
    // Pole light material
    const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })

    // Portal light material
    this.debugObject.portalColorStart = '#ff0000'
    this.debugObject.portalColorEnd = '#0000ff'

    gui
      .addColor(this.debugObject, 'portalColorStart')
      .onChange(() => {
        portalLightMaterial.uniforms.uColorStart.value.set(this.debugObject.portalColorStart)
      })

    gui
      .addColor(this.debugObject, 'portalColorEnd')
      .onChange(() => {
        portalLightMaterial.uniforms.uColorEnd.value.set(this.debugObject.portalColorEnd)
      })

    portalLightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorStart: { value: new THREE.Color(this.debugObject.portalColorStart) },
        uColorEnd: { value: new THREE.Color(this.debugObject.portalColorEnd) }
      },
      vertexShader: portalVertexShader,
      fragmentShader: portalFragmentShader
    })

    gui.add( self.coneRadius, 'value' ).min(1).max(10).step(0.1).name('Cone Radius')
    // gui.add( self.coneHeight, 'value').min(1).max(30).step(0.1).name('Cone height')
    gui.add( self.godRaysMaterial.uniforms['anglePower'], 'value').min(0.1).max(20).step(0.1).name('Angle Power')
    gui.add( self.godRaysMaterial.uniforms['attenuation'], 'value').min(0).max(30).step(0.1).name('Attenuation')
    gui.addColor(parameters, 'color')
      .onChange(() => {
        // material.color.set(parameters.color)
        self.allSpots[0].coneMesh.material.uniforms.lightColor.value = new THREE.Color(parameters.color)
      })
  }

  initPostprocessing() {
    var self = this
    // Post processing
    let RenderTargetClass = null

    if(renderer.getPixelRatio() === 1 && renderer.capabilities.isWebGL2) {
      RenderTargetClass = THREE.WebGLMultisampleRenderTarget
      console.log('Using WebGLMultisampleRenderTarget')
    }
    else {
      RenderTargetClass = THREE.WebGLRenderTarget
      console.log('Using WebGLRenderTarget')
    }

    renderTarget = new RenderTargetClass(
      800,
      600, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        encoding: THREE.sRGBEncoding
      }
    )

    // FXAA to avoid pixelated
    let fxaaPass = new ShaderPass( FXAAShader );

    // Effect composer
    effectComposer = new EffectComposer(renderer, renderTarget)
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    effectComposer.setSize(sizes.width, sizes.height)

    // FXAA shader
    effectComposer.addPass( fxaaPass ) 

    // Render pass
    const renderPass = new RenderPass(scene, camera)
    effectComposer.addPass(renderPass)

    // var bokehPass = new BokehPass(scene, camera, {
    //   focus: 1.0,
    //   aperture: 0.025,
    //   maxblur: 0.01,
    //   width: self.window.w,
    //   height: self.window.h,
    // });

    // effectComposer.addPass( bokehPass )

    self.filmPass = new FilmPass(
      0.00,   // noise intensity. org: 0.35
      0.25,   // scanline intensity
      648,    // scanline count
      false,  // grayscale
    )
    self.filmPass.renderToScreen = true
    effectComposer.addPass(self.filmPass)

    // Antialias pass
    if (renderer.getPixelRatio() === 1 && !renderer.capabilities.isWebGL2) {
        const smaaPass = new SMAAPass()
        effectComposer.addPass(smaaPass)

        console.log('Using SMAA')
    }

    // Unreal Bloom pass
    const unrealBloomPass = new UnrealBloomPass()
    // unrealBloomPass.enabled = false
    effectComposer.addPass(unrealBloomPass)

    // unrealBloomPass.strength = 0.622
    unrealBloomPass.strength = 0.75 // 1, or 0.4
    // unrealBloomPass.radius = 1
    unrealBloomPass.radius = 0.1
    unrealBloomPass.threshold = 0.6

    gui.add(unrealBloomPass, 'enabled')
    gui.add(unrealBloomPass, 'strength').min(0).max(2).step(0.001)
    gui.add(unrealBloomPass, 'radius').min(0).max(2).step(0.001)
    gui.add(unrealBloomPass, 'threshold').min(0).max(1).step(0.001)
  }

  makeShaderMaterial() {
    var self = this
    var volParams = {
      anglePower: 2.7,
      attenuation: 13,
    }
    self.godRaysMaterial = new THREE.ShaderMaterial({
      uniforms: { 
        attenuation: {
          type: 'f',
          value: volParams.attenuation
        },
        anglePower: {
          type: 'f',
          value: volParams.anglePower
        },
        spotPosition: {
          type: 'v3',
          value: new THREE.Vector3( 0, 0, 0 )
        },
        lightColor: {
          type: 'c',
          value: new THREE.Color('cyan')
        },
      },
      vertexShader: self.godrayVShader,
      fragmentShader: self.godrayFShader,
      // side		: THREE.DoubleSide,
      // blending	: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  }

  addGodRays( colonePos ) {
    var self = this
    // add spot light
    console.log('should add god ray')
    // self.coneRadius = 7
    var lightAngle = self.coneRadius.value / 12
    var cone = new THREE.CylinderBufferGeometry( 0.1, self.coneRadius.value, self.coneHeight, 32 * 2, 20, true)
    // var cone = new THREE.BoxBufferGeometry( 100, 100, 100 )

    // cone.applyMatrix4( new THREE.Matrix4().makeTranslation( 0, -cone.parameters.height/2, 0 ) )
    // cone.applyMatrix4( new THREE.Matrix4().makeRotationX( -Math.PI / 2 ) )

    const coneMesh = new THREE.Mesh( cone, self.godRaysMaterial )
    // self.coneMesh.position.set( colonePos )
    coneMesh.position.set( colonePos.x, colonePos.y, colonePos.z )
    // coneMesh.position.set( 0, 5, 0 )

    coneMesh.lookAt( colonePos )
    self.godRaysMaterial.uniforms.lightColor.value.set('blue')
    self.godRaysMaterial.uniforms.spotPosition.value	= coneMesh.position
    coneMesh.renderOrder = 10
    scene.add( coneMesh )

    const spotLight = new THREE.SpotLight()
    spotLight.color = coneMesh.material.uniforms.lightColor.value
    spotLight.exponent = 30
    spotLight.angle = lightAngle
    spotLight.intensity = 0.2
  
    // Soften the edge of the light contact
    spotLight.penumbra = 0.52

    spotLight.position.copy(coneMesh.position)
    coneMesh.add( spotLight )
    
    self.allSpots.push( {coneMesh: coneMesh, spotLight: spotLight} )
  }

  animateNoise() {
    path.setAttribute("d", spline(points, 1, true));

    // for every point...
    for (let i = 0; i < points.length; i++) {
      const point = points[i]

      // return a pseudo random value between -1 / 1 based on this point's current x, y positions in "time"
      const nX = noise(point.noiseOffsetX, point.noiseOffsetX)
      const nY = noise(point.noiseOffsetY, point.noiseOffsetY)
      // map this noise value to a new value, somewhere between it's original location -20 and it's original location + 20
      const x = map(nX, -1, 1, point.originX - 20, point.originX + 20)
      const y = map(nY, -1, 1, point.originY - 20, point.originY + 20)

      // update the point's current coordinates
      point.x = x
      point.y = y

      // progress the point's x, y values through "time"
      point.noiseOffsetX += noiseStep
      point.noiseOffsetY += noiseStep
    }

    const hueNoise = noise(hueNoiseOffset, hueNoiseOffset)
    const hue = map(hueNoise, -1, 1, 0, 360)

    root.style.setProperty("--startColor", `hsl(${hue}, 100%, 75%)`)
    root.style.setProperty("--stopColor", `hsl(${hue + 60}, 100%, 75%)`)
    document.body.style.background = `hsl(${hue + 60}, 75%, 5%)`

    hueNoiseOffset += noiseStep / 6
  }

  pulse(time) {
    const pi = 3.14;
    const frequency = 10; // Frequency in Hz
    return 0.5 * (1 + Math.sin(2 * pi * frequency * time))
  }

  tickTock() {
    var self = this
    const elapsedTime = clock.getElapsedTime()

    // Change the position of the beamGuide - start
    self.pulseValue = self.pulse(elapsedTime * 0.01)
    let pulseValueMappedToOpacity = map(self.pulseValue, 0, 1, 0.2, 0.6)
    let pulseValueMapped = map(self.pulseValue, 0, 1, -0.1, 0.1)
    // self.beamGuide.position.y = 2 + ( 1.0 * pulseValueMapped ) // Set position y
    // console.log(self.pulseValue)
    // console.log('pulseValueMapped')
    // console.log(pulseValueMapped)
    self.beamGuide.material.opacity = pulseValueMappedToOpacity
    // console.log(self.beamGuide.material)
    // Change the position of the beamGuide - end

    // console.log('self.characterCapGuy')
    // console.log(self.characterCapGuy)
    // let root = self.characterCapGuy.mixer.getRoot()
    // console.log('root')
    // console.log(root)

    // let noise = self.simplex.noise3D(x / 160, x / 160, self.tT/mouseY) * fx1 + fx2;
    // TODO Implenting noise and need to use it for something
    // let noise = self.simplex.noise2D(elapsedTime, 1)
    // console.log('noise')
    // console.log(noise)

    // Update materials
    portalLightMaterial.uniforms.uTime.value = elapsedTime

    // Set intensity based on sound volume - start
    self.allSounds.forEach( (sound, index) => {
      // console.log(sound.parent)
      if (sound.parent.name === 'NeonLight1') {
        var freq = sound.analyser.getFrequencyData()[0]
        var scaledVal = map(freq, 0, 256, 0.0, 1.0)
        // console.log(scaledVal)
        // Set boxLightMaterial emissive intensity
        neonLightOne.material.emissiveIntensity = scaledVal;
      }
    });
    // var freq = sounds[index].analyser.getFrequencyData()[0]
    // var scaledVal = map(freq, 0, 256, 1, scaleVal)
    // TweenMax.to(element.shape.scale, self.easeTime, {
    //   x: scaledVal,
    //   y: scaledVal,
    //   z: scaledVal,
    //   ease: Sine.easeOut
    // })
    // Set intensity based on sound volume - end

    // Video material
    // videoImageContext.drawImage( video, 0, 0 );
    // videoTexture.needsUpdate = true;
    // if ( video.readyState === video.HAVE_ENOUGH_DATA ) {
    //   videoImageContext.drawImage( video, 0, 0 );
    //   if ( videoTexture ) {
    //     videoTexture.needsUpdate = true;
    //   }
    // }
    // console.log('rendering')

    // Update controls
    controls.update()
    
    // ?? Where do we animate noise?
    // this.animateNoise()
  
    // Render
    // renderer.render(scene, camera)
    effectComposer.render()
  
    if (self.intersectedObject) {
      self.updateScreenPosition();
    }

    // Call tick again on the next frame
    window.requestAnimationFrame( () => {
      this.tickTock()
    } )

    // Update the characters and their animation
    if (this.animatedCharacters.length > 0) {
      this.animatedCharacters.map( anim => {
        anim.update()
      })
    }

    self.placeCap()
  }
  
  onResize() {
    var self = this
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  // Add DOM events
  addDOMEvents() {
    var self = this
    playButton.addEventListener('click', () => {
      console.log('play')
      self.listener.context.resume()
      preloaderOverlay.classList.add('loaded')
      
      // video.play();
      // self.masterInit()
    })
    window.addEventListener( 'keydown', function ( event ) {
      console.log('key code: ', event.keyCode)
      switch ( event.keyCode ) {
        case 71: // H for header and hide
        dat.GUI.toggleHide()
        break
      }
    })

    // Add event listener
    // Start
    window.addEventListener('pointerdown', (e) => {
      self.onMouseDown(e)
    }, false)
    window.addEventListener('touchstart', (e) => {
      self.onMouseDown(e)
    }, false)

    // On moving
    window.addEventListener('touchmove', (e) => {
      self.onMouseMove(e)
    }, false);
    window.addEventListener('pointermove', (e) => {
      self.onMouseMove(e)
    }, false)

    // End
    window.addEventListener('pointerup', (e) => {
      self.onMouseUp(e)
    })
    window.addEventListener('touchend', (e) => {
      self.onMouseUp(e)
    })
    
    // window.addEventListener('mousedown', self.onMouseMove, false);

  }

  // Function that returns a raycaster to use to find intersecting objects
  // in a scene given screen pos and a camera, and a projector
  getRayCasterFromScreenCoord (screenX, screenY, camera) {
    var self = this
    var raycaster = new THREE.Raycaster()
    var mouse3D = new THREE.Vector3();
    // Get 3D point form the client x y
    mouse3D.x = (screenX / window.innerWidth) * 2 - 1;
    mouse3D.y = -(screenY / window.innerHeight) * 2 + 1;
    mouse3D.z = 0.5;
    raycaster.setFromCamera(mouse3D, camera)
    return raycaster
  }

  onMouseDown(e) {
    var self = this
    
    console.log('pointer down')

    // console.log('pointer down')
    // console.log(self.INTERSECTS.length)
    self.mouseIsDown = true

    console.log( self.mouseIsDown )
    // console.log('self.INTERSECTS[0].object.name')
    // console.log(self.INTERSECTS[0].object.name)
    if (self.INTERSECTS.length > 0) {

      // console.log( 'intersects item' )
      // console.log( self.INTERSECTS[ 0 ].object.name )

      if (self.INTERSECTS[ 0 ].object.name === 'cap') {
        controls.enabled = false
        self.curGuiObject = self.INTERSECTS[0].object
      }

      // if (
      //   self.INTERSECTS[0].object.name === 'cap'
      // ) {
      // }
    }
  }

  onMouseUp(e) {
    let self = this
    console.log('mouse up')
    this.mouseIsDown = false
    this.isDragging = false
    this.curGuiObject = null
    controls.enabled = true

    // If we let go of the mouse or trackpad and the hat is facing the correct direction we should trigger walk animation
    if (
      self.correctGuides[0].visible &&
      !self.hasBeenSolved
    ) {
      self.hasBeenSolved = true
      self.characterCapGuy.callAnimationFromParent()

      gsap.to(
        '.solved-overlay', 1, {
          height: '100%',
          autoAlpha: 1
        }
      )

      // let tlSolved = new TimelineMax()
      // // .staggerFrom(".lineChild", 0.75, {y:50}, 0.25)
      // .staggerTo('.question-explanation h1 span', stdTime, {y: 20, autoAlpha: 1, ease: Power4.easeInOut}, 0.1, `start`)
      // .to('.question-overlay', stdTime, {height: '100%', autoAlpha: 1}, `start+=${0}`)
      // .to('.question-explanation', stdTime, {y: 20}, `start+=${0}`)

      // // Set material of cap to green
      // self.theCap.material.emissive.setHex( 0x55FF73 );
      // self.theCap.material.emissiveIntensity = 0.5
    }
  }

  // Add event listener
  onMouseMove(e) {
    var self = this

    var mouseCoords = checkIfTouch(e)

    self.realMouse.x = e.touches ? e.touches[0].pageX : e.clientX
    self.realMouse.y = e.touches ? e.touches[0].pageY : e.clientY

    if (self.gplane && self.mouseConstraint) {
      var pos = self.projectOntoPlane(mouseCoords.x, mouseCoords.y, self.gplane, self.camera);
      if (pos) {
        var yDiff = self.mouseDownPos.y - pos.y
        self.setClickMarker(pos.x - yDiff**2, pos.y, pos.z, self.scene);
        self.moveJointToPoint(pos.x - yDiff**2, pos.y, pos.z);
      }
    }
    // https://stackoverflow.com/questions/38314521/change-color-of-mesh-using-mouseover-in-three-js
    // Get the picking ray from the point. https://jsfiddle.net/wilt/52ejur45/
    // console.log(checkIfTouch(e))
    // return
    var mouseCoords = checkIfTouch(e)
    var raycaster = self.getRayCasterFromScreenCoord(mouseCoords.x, mouseCoords.y, camera);
    // Find the closest intersecting object
    // Now, cast the ray all render objects in the scene to see if they collide. Take the closest one.
    var intersects = raycaster.intersectObjects(self.meshes);
    self.INTERSECTS = intersects
    
    // console.log('self.mouseIsDown')
    // console.log(self.mouseIsDown)
    // if (self.mouseIsDown) {
    //   console.log('self.mouseIsDown')
    // }

    // The rules for how the GUI behave when dragged
    if (self.mouseIsDown && self.curGuiObject !== null) {
      
      // console.log('self.mouseIsDown')
      // console.log(self.mouseIsDown)
      // console.log('self.curGuiObject')
      // console.log(self.curGuiObject)
      
      // Rotate the cap. Turn the cap
      
      console.log('this is full-filled')

      if (this.currentX < self.realMouse.x) {
        console.log('up')
        self.dragDir = 0.075
      }
      else if (this.currentX > self.realMouse.x) {
        console.log('down')
        self.dragDir = -0.075
      }
      this.currentX = self.realMouse.x
      // self.curGuiObject.rotation.y -= rotValue

      // Turn the hat
      self.curGuiObject.rotation.y += self.dragDir

      // console.log('self.curGuiObject.rotation')
      // console.log(self.curGuiObject.rotation.y)

      // beamGuide reveal show - start
      self.capRot = {
        y: self.curGuiObject.rotation.y
      }

      const minRotY = -0.25
      const maxRotY = 0.08

      // Check if the cap is facing the correct direction
      // It is
      if (
        self.capRot.y > (self.randomSpinY + minRotY) &&
        self.capRot.y < (self.randomSpinY + maxRotY)
      ) {
        // Show the guide line
        // self.beamGuide.visible = true
        // Show the 'correct' guide
        self.correctGuides.forEach(element => {
          element.visible = true
        })

        // Assign green color to the cap
        // Set material of cap to green
        self.theCap.material.color.setHex( 0x55FF73 )
        // self.theCap.material.emissive.setHex( 0x55FF73 );
        // self.theCap.material.emissive.setHex( 0x000000 );
        // self.theCap.material.emissiveIntensity = 0

        // // Tween the material
        // gsap.to( self.beamGuide.material, 1.0, {
        //   alpha: 0.5
        // })
      }
      // It is not
      else {
        // self.beamGuide.visible = false
        // Show the 'correct' guide
        self.correctGuides.forEach(element => {
          element.visible = false
        })
      }
      // beamGuide reveal show - end
    }

    // Intersected object
    self.intS = self.INTERSECTED
    // self.intersectedObject = self.INTERSECTED // Because intS follows specific hover rules

    // This is where an intersection is detected
    if ( intersects.length > 0 ) {

      // Set gui object
      // self.curGuiObject = intersects[0].object

      if ( self.intS != intersects[ 0 ].object ) {
        // if ( self.intS ) {
        //   self.intS.material.emissive.setHex( self.intS.currentHex );
        // }

        self.INTERSECTS

        // If it is the plane then nevermind
        if (
          intersects[ 0 ].object.name === 'Plane' ||
          intersects[ 0 ].object.name === 'Floor'
        ) {
          self.intS = null;
          if (self.showAnnotation) {
            
            // This part shows the tooltip - start
            self.popover.classList.remove('visible')
            self.playAnnotationAnim('backward')
            // This part shows the tooltip - end

          }
          return
        }

        self.intS = intersects[ 0 ].object;
        // self.intS.currentHex = self.intS.material.emissive.getHex();
        // self.intS.material.emissive.setHex( 0xffffff ); // Hover / highlight material
        // Store the intersected id
        // self.currentId = self.intS.userData.id
        // self.currentObj = sounds[self.currentId]

        // Are we hovering the question mark?
        if (
          intersects[ 0 ].object.name === 'questionmark'
        ) {
          console.log('it is questionmark')
          self.playQuestionAnim('forward')
          self.intS.currentHex = self.intS.material.emissive.getHex();
          self.intS.material.emissive.setHex( 0xffffff ); // Hover / highlight material
          self.intS.material.emissiveIntensity = 4
          // Store the intersected id
          self.currentId = self.intS.userData.id
        }
        else {
          self.playQuestionAnim('backward')

          // Turn down material emissive again
          // self.questionMark.material.emissive.setHex( 0x808080 );
          self.questionMark.material.emissiveIntensity = 0.5
        }
        
        // Are we hovering the cap?
        if (
          intersects[ 0 ].object.name === 'cap' &&
          !self.mouseIsDown
        ) {
          console.log('it is the cap')
          // self.playQuestionAnim('forward')
          self.intS.currentHex = self.intS.material.emissive.getHex();
          self.intS.material.emissive.setHex( 0xffffff ); // Hover / highlight material
          self.intS.material.emissiveIntensity = 4
          // Store the intersected id
          self.currentId = self.intS.userData.id
        }
        else {
          // Turn down material emissive again
          console.log('left again')
          self.theCap.material.emissive.setHex( 0x000000 );
          self.theCap.material.emissiveIntensity = 0
        }

        if (self.showAnnotation) {

          // Log the details
          // console.log(self.intS.name)
          // console.log(self.intS)

          const annotationTitleText = document.querySelector('.annotation__title__text')
          annotationTitleText.innerHTML = `${self.intS.name}`

          self.popover.classList.add('visible')
          self.playAnnotationAnim('forward')
        }
        
        // console.log('intS type: ', self.intS.userData.id)
        // console.log('self.intS: ', self.intS.userData.id)
        
        // If type of event is mousemove do not play sound. Only on mousedown
        // if (e.type === 'mousedown' || e.type === 'touchstart') {
        //   if (sounds[self.currentId].isPlaying) {
        //     self.stopMusic(self.currentId)
        //   }
        //   else {
        //     self.startMusic(self.currentId)
        //   }
        // }
      }

      // ?? WHere do we detect an object with raycaster?
      self.intersectedObject = self.intS
      // console.log(self.intersectedObject)

      // Change cursor
      document.body.style.cursor = 'pointer'
    }
    else {
      // if ( self.intS ) {
      //   self.intS.material.emissive.setHex( self.intS.currentHex );
      // }
      self.intS = null;
      // self.currentId = null;
      // self.intersectedObject = null;

      if (self.showAnnotation) {
        // alert('should remove')
        self.popover.classList.remove('visible')
        self.playAnnotationAnim('backward')
      }
      
      // Change cursor
      document.body.style.cursor = 'default'
    }
    // self.highlightShape(closest)
    self.meshes.forEach(element => {
      // console.log(element.material)
      // if (element != self.intS) {
      //   element.material.emissive.setHex( 0x000000 );
      // }
      // console.log(element.currentHex)
    }); 

  }

  initQuestionAnim () {
    var self = this
    // console.log('SplitText')
    // console.log(SplitText)
    // return
    // let a = new SplitText("anim-type-axis-y", { type: "lines", linesClass: "lineChild" });
    // let b = new SplitText("anim-type-axis-y", { type: "lines", linesClass: "lineParent" });
    self.tlQuestion = new TimelineMax()
      // .staggerFrom(".lineChild", 0.75, {y:50}, 0.25)
      .staggerTo('.question-explanation h1 span', stdTime, {y: 20, autoAlpha: 1, ease: Power4.easeInOut}, 0.1, `start`)
      .to('.question-overlay', stdTime, {height: '100%', autoAlpha: 1}, `start+=${0}`)
      .to('.question-explanation', stdTime, {y: 20}, `start+=${0}`)
      // .staggerFrom('.question-explanation h1 span', stdTime, {y: 20, autoAlpha: 0, ease: Power4.easeInOut}, 0.1, `start+=${stdTime/2}`)
      // .from('.anim--nav-tl', stdTime, {y: -120, autoAlpha: 0, ease: Power4.easeInOut}, 0.1, `start+=${stdTime}`)
      // .from('.anim--nav-tr', stdTime, {x: 120, autoAlpha: 0, ease: Power4.easeInOut}, 0.1)
      // .from('.anim--nav-br', stdTime, {y: 120, autoAlpha: 0, ease: Power4.easeInOut}, 0.1)
      // .from('.anim--nav-bl', stdTime, {x: -120, autoAlpha: 0, ease: Power4.easeInOut}, 0.1)
      .pause()
  }

  playQuestionAnim (kind) {
    var self = this      
    if (kind === 'forward') {
      self.tlQuestion.play()
    }
    else if (kind === 'backward') {
      self.tlQuestion.reverse()
    }      
    // .staggerTo(`#${self.content.id} .anim-selfaware`, 2, {autoAlpha: 1, ease: Sine.easeOut}, 0.25)
  }

  initTooltipAnim () {
    var self = this
    console.log('SplitText')
    console.log(SplitText)
    // return
    // let a = new SplitText("anim-type-axis-y", { type: "lines", linesClass: "lineChild" });
    // let b = new SplitText("anim-type-axis-y", { type: "lines", linesClass: "lineParent" });
    self.tlTooltip = new TimelineMax()
      .to('.info-line', stdTime, {height: '100%', ease: Power3.easeInOut}, 'start')
      // .staggerFrom(".lineChild", 0.75, {y:50}, 0.25)
      .staggerFrom('.anim', stdTime, {y: 20, autoAlpha: 0, ease: Power4.easeInOut}, 0.1, `start+=${stdTime/2}`)
      .from('.anim--nav-tl', stdTime, {y: -120, autoAlpha: 0, ease: Power4.easeInOut}, 0.1, `start+=${stdTime}`)
      .from('.anim--nav-tr', stdTime, {x: 120, autoAlpha: 0, ease: Power4.easeInOut}, 0.1)
      .from('.anim--nav-br', stdTime, {y: 120, autoAlpha: 0, ease: Power4.easeInOut}, 0.1)
      .from('.anim--nav-bl', stdTime, {x: -120, autoAlpha: 0, ease: Power4.easeInOut}, 0.1)
      .pause()
  }

  playAnnotationAnim (kind) {
    var self = this      
    if (kind === 'forward') {
      self.tlTooltip.play()
    }
    else if (kind === 'backward') {
      self.tlTooltip.reverse()
    }      
    // .staggerTo(`#${self.content.id} .anim-selfaware`, 2, {autoAlpha: 1, ease: Sine.easeOut}, 0.25)
  }

  updateScreenPosition() {
    var self = this;

    // console.log('update screen position')
  
    // const vector = new THREE.Vector3(0, 0, 0);
    if (self.intersectedObject === null) {
      return
    }
    var mesh = self.intersectedObject;
    // var mesh = self.meshes[0];
    const vector = mesh.position.clone();
    const canvas = renderer.domElement;
  
    vector.project(camera);
  
    vector.x = Math.round((0.5 + vector.x / 2) * (canvas.width / window.devicePixelRatio));
    vector.y = Math.round((0.5 - vector.y / 2) * (canvas.height / window.devicePixelRatio));
  
    if (self.showAnnotation) {
      // console.log('update screen position')
      // self.annotation.innerHTML = sounds[self.currentId].name;
      // Place little popover
      var popoverAttr = self.popover.getBoundingClientRect();
  
      self.popover.style.top = `${vector.y - (popoverAttr.height / 2)}px`;
      self.popover.style.left = `${vector.x - (popoverAttr.width / 2)}px`;
    }
  }

  addOrbitControls() {
    // Controls
    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    // controls.enablePan = false
    // Set max polar angle
    // controls.maxPolarAngle = (Math.PI * 0.5) * 0.99
    controls.minDistance = 6
    controls.maxDistance = 100
    
    // Set target of orbit controls
    controls.target = new THREE.Vector3(1, 1.5, 1)

    controls.addEventListener('change', _ => {
      // console.log('camera pos')
      // console.log(camera.position)
    })
  }

}

const setup = new Setup()
