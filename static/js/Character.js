import * as THREE from 'three'
import gsap, { CustomEase } from 'gsap'

class AnimatedChar {
  constructor ({ scene, camera, loader, modelPath, modelTexturePath, charName, customMaterial }) {
    // Set our main variables
    this.scene = scene
    this.camera = camera
    this.loader = loader
    this.modelPath = modelPath
    this.modelTexturePath = modelTexturePath
    this.charName = charName
    this.customMaterial = customMaterial
    
    this.modelTexture = null
    this.model = null
    this.neck = null
    this.waist = null
    this.possibleAnims = null
    this.mixer = null
    this.idle = null
    this.clock = new THREE.Clock()
    this.currentlyAnimating = false
    this.raycaster = new THREE.Raycaster()
    this.loaderAnim = document.getElementById('js-loader')

    this.actions = null
    // this.api = { state: 'idle' }
    this.api = { state: 'happy_walk' }
    this.previousAction = null
    this.activeAction = null

    this.theTemplateCap = null

    this.textureLoader = new THREE.TextureLoader()

    // console.log('here the scene: ', scene)
    // console.log('loader: ', this.loader)

    // console.log('received material')
    // console.log(this.customMaterial)

    // return
    this.init()

    this.setupEventListeners()
  }

  init () {
    var self = this

    // if (this.modelTexturePath !== '') {
    //   this.modelTexture = new THREE.TextureLoader().load(
    //     self.modelTexturePath
    //   )
    //   this.modelTexture.flipY = false
    // }

    // const stacy_mtl = new THREE.MeshPhongMaterial({
    //   color: 0xffffff,
    //   skinning: true
    // })

    // if (this.modelTexturePath !== '') {
    //   stacy_mtl.map = self.modelTexture
    // }

    self.loader.load(
      self.modelPath,
      gltf => {
        
        self.model = gltf.scene

        self.animations = gltf.animations

        // console.log('animations')
        // console.log(self.animations)
        // console.log(gltf)

        // Rotate the world
        self.model.rotation.y = Math.PI * 4

        let fileAnimations = gltf.animations

        self.model.traverse(o => {
          
          console.log(o.name)
          
          if (o.isMesh) {
            o.castShadow = true
            o.receiveShadow = true
            // o.material = stacy_mtl
          }
          
          // If beard
          if (o.name === 'beard003') {
            // o.scale.set(20, 20, 20)
            // o.visible = false
          }
          
          // If head001
          if (o.name === 'head001') {
            o.scale.set(1, 10, 1)
            // o.visible = false
          }
          
          // If cap
          // if (o.name === 'cap') {
          if (o.name === 'cap001') {
            const sFCap = 1.2
            o.scale.set(sFCap, sFCap, sFCap)
            self.theTemplateCap = o
            o.visible = false

            console.log( 'cap mesh' )
            console.log( o   )

          }

          // Reference the neck and waist bones
          if (o.isBone && o.name === 'mixamorigNeck') {
            this.neck = o
          }

          if (o.isBone && o.name === 'mixamorigSpine') {
            this.waist = o
          }

          // The whiteboard can be drawn upon
          if (o.name === 'body_upper_Vert017') {
            // o.visible = false
            // o.material = this.customMaterial
            // console.log(this.whiteBoard.position)
          }

          // self.upperBodyMesh = gltf.scene.children.find(
        //   child => child.name === 'body_upper_Vert017'
        // )
        // self.upperBodyMesh.material = self.portalLightMaterial
          
          // Check if body_upper
          // if (o.name === 'body_upper_Vert017') {
          //   const modelTexture = new THREE.TextureLoader().load(
          //     'textures/tattoos-skin-color-pink.png'
          //   )
          //   modelTexture.flipY = false
          //   const materialTattoo = new THREE.MeshPhongMaterial({ 
          //     map: modelTexture,
          //     // color: 0x290000,
          //     skinning: true
          //   })
          //   o.material = materialTattoo
          // }
        })

        console.log('this.charName')
        console.log(this.charName)

        if (this.charName === 'stacey') {
          self.model.scale.set(0.05, 0.05, 0.05)
          self.model.position.x = 3
          // console.log('charName is stacey')
        }

        else if (this.charName === 'Mixamo') {
          self.model.scale.set(1.0, 1.0, 1.0)
          self.model.position.x = 3

          // self.model.rotation.set( Math.PI * 4, 0, 0 )
          // console.log('charName is stacey')
        }

        else if (this.charName === 'nielskonrad') {
          let sF = 1.1
          self.model.scale.set(sF, sF, sF)

          // self.model.scale.set(80, 80, 80)
          // self.model.position.z += 0.15
          // self.model.position.y += 0.15
          // self.model.position.y -= 0.1
        }

        let modelGroup = new THREE.Group()
        modelGroup.add( self.model )
        this.scene.add(modelGroup)
        modelGroup.rotation.z = Math.PI * 4

        // this.loaderAnim.remove()

        this.mixer = new THREE.AnimationMixer(self.model)

        self.actions = {};

				for ( let i = 0; i < self.animations.length; i ++ ) {

					const clip = self.animations[ i ];
					const action = self.mixer.clipAction( clip );
					self.actions[ clip.name ] = action;

          console.log( 'the animations' )
          console.log( self.actions )

					// if ( emotes.indexOf( clip.name ) >= 0 || states.indexOf( clip.name ) >= 4 ) {

					// 	action.clampWhenFinished = true;
					// 	action.loop = THREE.LoopOnce;

					// }

				}

        let clips = fileAnimations.filter(val => val.name !== 'idle')
        self.possibleAnims = clips.map(val => {
          
          // console.log(this.charName)
          // console.log(val)

          let clip = THREE.AnimationClip.findByName(clips, val.name)

          clip.tracks.splice(3, 3)
          clip.tracks.splice(9, 3)

          clip = this.mixer.clipAction(clip)
          return clip
        })

        console.log('animations')
        console.log(fileAnimations[0].duration)

        // return
        // let idleAnim = null
        // let animName = null
        
        // idleAnim = THREE.AnimationClip.findByName(
        //   fileAnimations,
        //   animName
        // )
        let idleAnim = THREE.AnimationClip.findByName(
          fileAnimations,
          // 'idle'
          // 'happy_walk'
          'standing_playing'
        )
        
        // Have control over waist and neck of Stacey
        idleAnim.tracks.splice(3, 3)
        idleAnim.tracks.splice(9, 3)

        this.idle = this.mixer.clipAction(idleAnim)
        // this.idle.play()

        self.activeAction = self.actions['idle'];

        // console.log('self.activeAction self.activeAction')
        // console.log(self.activeAction)
        // self.activeAction = self.actions['happy_walk'];
        self.activeAction.play();

        // Start the update of frames
        // this.update()
      },
      undefined, // We don't need this function
      function (error) {
        console.error(error)
      }
    ) 

    // Add lights
    // let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61)
    // hemiLight.position.set(0, 50, 0)
    // // Add hemisphere light to scene
    // scene.add(hemiLight)

    // let d = 8.25
    // let dirLight = new THREE.DirectionalLight(0xffffff, 0.54)
    // dirLight.position.set(-8, 12, 8)
    // dirLight.castShadow = true
    // dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024)
    // dirLight.shadow.camera.near = 0.1
    // dirLight.shadow.camera.far = 1500
    // dirLight.shadow.camera.left = d * -1
    // dirLight.shadow.camera.right = d
    // dirLight.shadow.camera.top = d
    // dirLight.shadow.camera.bottom = d * -1
    // // Add directional Light to scene
    // this.scene.add(dirLight)

    // Floor
    // let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1)
    // let floorMaterial = new THREE.MeshPhongMaterial({
    //   color: 0xeeeeee,
    //   shininess: 0
    // })

    // let floor = new THREE.Mesh(floorGeometry, floorMaterial)
    // floor.rotation.x = -0.5 * Math.PI
    // floor.receiveShadow = true
    // floor.position.y = -11
    // this.scene.add(floor)

    // let geometry = new THREE.SphereGeometry(8, 32, 32)
    // let material = new THREE.MeshBasicMaterial({ color: 0x9bffaf }) // 0xf2ce2e
    // let sphere = new THREE.Mesh(geometry, material)

    // sphere.position.z = -15
    // sphere.position.y = -2.5
    // sphere.position.x = -0.25
    // this.scene.add(sphere)
  }

  fadeToAction( name, duration ) {
    var self = this

    self.previousAction = self.activeAction;
    self.activeAction = self.actions[ name ];
    
    console.log('self.actions[ name ]')
    console.log(self.actions[ name ])
    console.log('- - - - name - - - - ]')
    console.log( name )

    // console.log('self.actions')
    // console.log(self.actions)
    // console.log('typeof')
    // console.log(typeof name)

    if ( self.previousAction !== self.activeAction ) {

      self.previousAction.fadeOut( duration );

    }

    // console.log('self.activeAction')
    // console.log(self)
    // return

    gsap.to( self.model.position, 1.0, {
      z: 1.5,
      ease: 'none',
      delay: 0.1
      // ease: "power1.in"
      // delay: 0.2
      // ease: CustomEase.create("custom", "M0,0 C0.22,0 0.41,0.092 0.478,0.146 0.684,0.309 0.818,1.001 1,1 ")
    })

    self.activeAction
      .reset()
      .setEffectiveTimeScale( 1 )
      .setEffectiveWeight( 1 )
      .fadeIn( duration )
      // .fadeIn( 0.1 )
      .play()

    if (name !== 'happy_walk') {
      return
    }

    // After a short walk
    setTimeout(() => {

      this.fadeToAction( 'standing_playing', 0.4 )
      // setTimeout(() => {
      //   this.fadeToAction( 'standing_playing', 0.5 )
      // }, 5000)

    }, 1000)

  }

  update () {
    let self = this
    if (self.mixer) {
      self.mixer.update(this.clock.getDelta())
    }
    
    // console.log('self.activeAction')
    // console.log(self.activeAction)
    // console.log('self.model')
    // console.log(self.model)
    // console.log(self.model.parent.parent)
    // console.log(self.model.parent.parent)

    // console.log('updating')

    // if (resizeRendererToDisplaySize(renderer)) {
    //   const canvas = renderer.domElement
    //   this.camera.aspect = canvas.clientWidth / canvas.clientHeight
    //   this.camera.updateProjectionMatrix()
    // }

    // renderer.render(this.scene, camera)
    // requestAnimationFrame(this.update.bind(this))
  }

  raycast (e, touch = false) {
    var mouse = {}
    if (touch) {
      mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1
      mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight)
    } else {
      mouse.x = 2 * (e.clientX / window.innerWidth) - 1
      mouse.y = 1 - 2 * (e.clientY / window.innerHeight)
    }
    // update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(mouse, this.camera)

    // calculate objects intersecting the picking ray
    var intersects = this.raycaster.intersectObjects(this.scene.children, true)

    if (intersects[0]) {
      var object = intersects[0].object

      if (object.name === 'stacy') {
        if (!this.currentlyAnimating) {
          this.currentlyAnimating = true
          this.playOnClick()
        }
      }
    }
  }

  // Get a random animation, and play it
  playOnClick () {
    var self = this
    let anim = Math.floor(Math.random() * self.possibleAnims.length) + 0
    this.playModifierAnimation(this.idle, 0.25, self.possibleAnims[anim], 0.25)
  }

  playModifierAnimation (from, fSpeed, to, tSpeed) {
    to.setLoop(THREE.LoopOnce)
    to.reset()
    to.play()
    from.crossFadeTo(to, fSpeed, true)
    setTimeout(() => {
      from.enabled = true
      to.crossFadeTo(from, tSpeed, true)
      this.currentlyAnimating = false
    }, to._clip.duration * 1000 - (tSpeed + fSpeed) * 1000)
  }

  getMousePos (e) {
    return { x: e.clientX, y: e.clientY }
  }

  moveJoint (mouse, joint, degreeLimit) {
    let degrees = this.getMouseDegrees(mouse.x, mouse.y, degreeLimit)
    joint.rotation.y = THREE.Math.degToRad(degrees.x)
    joint.rotation.x = THREE.Math.degToRad(degrees.y)
  }

  getMouseDegrees (x, y, degreeLimit) {
    let dx = 0,
      dy = 0,
      xdiff,
      xPercentage,
      ydiff,
      yPercentage

    let w = { x: window.innerWidth, y: window.innerHeight }

    // Left (Rotates neck left between 0 and -degreeLimit)
    // 1. If cursor is in the left half of screen
    if (x <= w.x / 2) {
      // 2. Get the difference between middle of screen and cursor position
      xdiff = w.x / 2 - x
      // 3. Find the percentage of that difference (percentage toward edge of screen)
      xPercentage = (xdiff / (w.x / 2)) * 100
      // 4. Convert that to a percentage of the maximum rotation we allow for the neck
      dx = ((degreeLimit * xPercentage) / 100) * -1
    }

    // Right (Rotates neck right between 0 and degreeLimit)
    if (x >= w.x / 2) {
      xdiff = x - w.x / 2
      xPercentage = (xdiff / (w.x / 2)) * 100
      dx = (degreeLimit * xPercentage) / 100
    }
    // Up (Rotates neck up between 0 and -degreeLimit)
    if (y <= w.y / 2) {
      ydiff = w.y / 2 - y
      yPercentage = (ydiff / (w.y / 2)) * 100
      // Note that I cut degreeLimit in half when she looks up
      dy = ((degreeLimit * 0.5 * yPercentage) / 100) * -1
    }
    // Down (Rotates neck down between 0 and degreeLimit)
    if (y >= w.y / 2) {
      ydiff = y - w.y / 2
      yPercentage = (ydiff / (w.y / 2)) * 100
      dy = (degreeLimit * yPercentage) / 100
    }
    return { x: dx, y: dy }
  }

  callAnimationFromParent() {
    let self = this
    self.fadeToAction( self.api.state, 0.5 )
  }

  onKeyUp(e) {
    var self = this
    // fadeToAction( api.state, 0.5 )
    console.log( 'the pressed key' )
    console.log( e )
    
    if (e.key === 'k') {
      //
      self.fadeToAction( self.api.state, 0.5 )
      // self.fadeToAction( 'happy_walking', 0.5 )
    }
    if (e.key === 'i') {
      //
      self.fadeToAction( 'idle', 0.5 )
      // self.fadeToAction( 'happy_walking', 0.5 )
    }
  }

  setupEventListeners () {
    var self = this

    window.addEventListener('click', e => this.raycast(e))
    window.addEventListener('touchend', e => this.raycast(e, true))

    window.addEventListener('keyup', e => this.onKeyUp(e))

    document.addEventListener('mousemove', function (e) {
      var mousecoords = self.getMousePos(e)
      if (this.neck && this.waist) {
        this.moveJoint(mousecoords, this.neck, 50)
        this.moveJoint(mousecoords, this.waist, 30)
      }
    })
  }
}

export default AnimatedChar
