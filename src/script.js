import ASScroll from '@ashthornton/asscroll'
import GSAP from 'gsap'
import { map } from '../static/js/math'
import { split } from '../static/js/text'

import './assets/scss/index.scss'

// Misc helper functions
// import {
//   checkIfTouch,
//   map,
//   createPoints
// } from '../static/js/helpers.js'
// Longpress
// import LongPress from '../static/js/LongPress.js'

// import article from '../static/json/text-article.json'

export default class Setup {
  constructor() {
    // Debug object if needed
    this.debugObject = {}
    
    // General
    this.isMouseDown = false
    // The total time for the time line
    this.totalTime = 10

    this.elements = {
      progressLine: document.querySelector('.progress-line')
    }
    
    this.getNecessaryDimensions()

    this.makeSplitText()

    // Use Smooth scroll instead of native scroll option
    this.initASScroll()

    this.introTimeline()

    this.makeTimeline()

    // this.debugger()

    // Add DOM events
    this.addEventListeners()

    // console.log('article')
    // console.log(article)

    this.update()

    window.scrollTo(0, 0)
    this.timeline.progress(0)

    // Lets say that everything is rad yto be shown
    this.onPreloaded()
    
    this.setupIntersectionObserver()

  }

  setupIntersectionObserver() {
    let allTriggers = [...document.querySelectorAll('.block-quote__trigger')]

    console.log('allTriggers')
    console.log(allTriggers)

    this.observer = new IntersectionObserver( (entries) => {
      console.log('entries')
      console.log(entries)
      entries.forEach( (entry, entryIndex) => {
        if (entry.intersectionRatio > 0) {
          //
          if (window.scrollY < 100)
            return
          console.log(`target - ${entryIndex} - enter`)
          console.log(entry.target)
          let triggerID = parseInt(entry.target.getAttribute('data-trigger-index'))
          // document.querySelector(`.block-quote[data-index="${entryIndex}"]`).classList.add('block-quote--present')
          document.querySelector(`.block-quote[data-index="${triggerID}"]`).style.animation = `fadeIn 1s forwards ease-out`
        }
        else {
          if (window.scrollY < 100)
            return
          console.log(`target - ${entryIndex} - exit`)
          // console.log(entry.target)
          let triggerID = parseInt(entry.target.getAttribute('data-trigger-index'))
          // document.querySelector(`.block-quote[data-index="${entryIndex}"]`).classList.remove('block-quote--present')
          document.querySelector(`.block-quote[data-index="${triggerID}"]`).style.animation = `fadeOut 1s forwards ease-out`
        }
      })
    })

    allTriggers.forEach( trigger => {
      this.observer.observe(trigger)
    })
  }

  onPreloaded() {
    document.body.classList.add('is-loaded')
  }

  debugger() {
    let self = this
    let debuggerNode = document.querySelector('.debugger')
    let valueSec4Height = document.querySelector('#sec4Height')
    valueSec4Height.innerHTML = this.secThreeOuterContainer.attributes.height
    // debugArray.forEach( (row, index) => {
      
    // })
  }

  // We use these for values in the timeline
  getNecessaryDimensions() {
    this.secThreeOuterContainer = {
      domElem: document.querySelector('.section--three .container--outer'),
      attributes: document.querySelector('.section--three .container--outer').getBoundingClientRect()
    }
    this.secFourOuterContainer = {
      domElem: document.querySelector('.section--four .container--outer'),
      // attributes: document.querySelector('.section--four .container--outer').getBoundingClientRect()
      offsetHeight: document.querySelector('.section--four .container--outer').offsetHeight
    }
    console.log('secThreeOuterContainer')
    console.log(document.querySelector('.section--four .container--outer').offsetHeight)
    // console.log('secThreeOuterContainer')
    // console.log(this.secThreeOuterContainer.attributes)
  }

  makeSplitText() {
    split({
      element: document.querySelector('.section--one__title'),
      // expression: '<br>'
      expression: ' '
    })
    split({
      element: document.querySelector('.section--one__subtitle'),
      // expression: '<br>'
      expression: ' '
    })
  }

  // Init the smooth scroll library
  initASScroll() {
    this.asscroll = new ASScroll({
      disableRaf: true,
      containerElement: document.querySelector(
        '[asscroll-container]'
      ),
      // ease: 0.025 // The ease amount for the transform lerp. Default is 0.075
    })
    window.addEventListener('load', () => {
      this.asscroll.enable()
    })
  }

  // Tell the story
  introTimeline() {
    // this.timeline = GSAP.timeline({ paused: true })
    this.tlIntro = GSAP.timeline()
    // Section One - Title.
    this.tlIntro
      .to('.section--one__title span', {
        duration: 4,
        delay: 1,
        ease: 'linear',
        opacity: 1,
        stagger: 0.35
      }, 'start')
      .to('.section--one__image', { // Section One - image fade in
        duration: 5,
        attr: { stdDeviation: 10 },
        // y: -100,
        // ease: 'linear',
        // autoAlpha: 1,
        opacity: 1,
        scale: 1.025
      }, 'start+=2.5')
      .to('.section--one__subtitle span', { // Section One - Subtitle.
        duration: 3.5,
        ease: 'linear',
        opacity: 1,
        stagger: 0.2,
        onComplete: () => {
          // grab scroll teaser and animate it
          document.querySelector('.scroll-teaser').classList.add('scroll-teaser--animate')
        }
      }, 'start+=3.5')
      // .to('.scroll-teaser', {
      //   duration: 3,
      //   opacity: 1
      // })
    // }, 'start+=0.1')
  }

  // Tell the story
  makeTimeline() {
    // Set defaults
    GSAP.defaults({
      ease: "power0.easeNone"
    })

    let windowHeight = window.innerHeight

    this.timeline = GSAP.timeline({ paused: true })
    // this.timeline = GSAP.timeline()
    // Section One - Title.
    // this.timeline.to('.section--one__title span', {
    //   duration: 0.5 / this.totalTime,
    //   ease: 'linear',
    //   opacity: 1,
    //   stagger: 0.1
    // }, 'start')
    // // Section One - Subtitle.
    // this.timeline.to('.section--one__subtitle span', {
    //   duration: 0.5 / this.totalTime,
    //   ease: 'linear',
    //   opacity: 1,
    //   stagger: 0.1
    // })
    // // Section One - image fade in
    // this.timeline.to('.section--one__image', {
    //   duration: 20 / this.totalTime,
    //   ease: 'linear',
    //   opacity: 1,
    // }, 'start+=0.1')

    // Section One - image fade out and scale down
    this.timeline.to('.section--one__image', {
      duration: 30 / this.totalTime,
      ease: 'linear',
      opacity: 0,
      attr: { stdDeviation: 40 },
      onComplete: () => {
        // grab scroll teaser and hide it again
        document.querySelector('.scroll-teaser').classList.remove('scroll-teaser--animate')
      }
    }, 'start')
    this.timeline.to('.scroll-teaser', {
      duration: 1,
      opacity: 0
    }, 'start+=1')
    // Section One - image filter
    this.timeline.to('#feGaussianBlur', {
      duration: 30 / this.totalTime,
      ease: 'linear',
      attr: { stdDeviation: 80 }
    }, 'start+=1')
    // Section One - Title.
    this.timeline.to('.section--one__title span', {
      duration: 0.5 / this.totalTime,
      ease: 'linear',
      opacity: 0,
      // filter: "blur(10px)",
      stagger: {
        each: 0.1,
        from: "random"
      }
    })
    // Section One - Subtitle.
    this.timeline.to('.section--one__subtitle span', {
      duration: 0.5 / this.totalTime,
      opacity: 0,
      // filter: "blur(10px)",
      stagger: {
        each: 0.1,
        from: "random"
      }
    })
    // Section 1 - Fade out
    this.timeline.to('.section--one', {
      // duration: 5 / this.totalTime,
      opacity: 0,
      ease: 'linear',
      // transform: `translateY(-${ windowHeight * 1 }px)`,
    })
    // Section 2 - move up
    this.timeline.to('.section--two', {
      duration: 4 / this.totalTime,
      ease: 'linear',
      opacity: 1
    })
    // Section 2 - fade out
    this.timeline.to('.section--two', {
      duration: 2,
      opacity: 0,
      delay: 2,
      filter: "blur(10px)",
      scale: 1.15,
      ease: 'Power1.easeIn',
      transform: `translateY(-${ 60 }px)`,
    }, 'intro-text-blur')
    // Section 3 - roll in
    this.timeline.to('.section--three', {
      duration: 60 / this.totalTime,
      ease: 'linear',
      transform: `translateY(-${ ((this.secThreeOuterContainer.attributes.height / 1) + (window.innerHeight * 0.2)) }px)`,
    }, 'intro-text-blur+=2')
    // Section 3 - image-pairs top fade in
    this.timeline.to('.section--three__image.image-pair__image.image-top', {
      duration: 20 / this.totalTime,
      ease: 'linear',
      opacity: 1
    })
    // Section 3 - roll out and fade out
    this.timeline.to('.section--three', {
      duration: 10,
      opacity: 0,
      ease: 'linear',
      // transform: `translateY(-${ (this.secThreeOuterContainer.attributes.height * 2) }px)`,
    }, 'sec-three-end')

    // Section 4 - roll in
    this.timeline.to('.section--four', {
      duration: 25,
      ease: 'linear',
      // transform: `translateY(-${ (this.secFourOuterContainer.attributes.height + (windowHeight)) }px)`,
      transform: `translateY(-${ (this.secFourOuterContainer.offsetHeight * 1.2) }px)`,
    }, `sec-three-end+=${8}`)
    // })

    // this.timeline.totalDuration(this.totalTime)
    // this.timeline.progress(0)
    // this.timeline.play()
  }

  setPosition () {
    // console.log('setPosition')
    // console.log('this.asscroll.currentPos')
    // console.log(this.asscroll.currentPos)
    
    // Map value ex.
    // map(valueToMap, inMin, inMax, outMin, outMax)
    let progressValue = map(this.asscroll.currentPos, 0, 6000, 0, 1)
    
    // console.log('progressValue')
    // console.log(progressValue)
    
    // Are we navigating by scroll and on update. Otherwise we can navigate by clicking the tabs
    this.timeline.progress(progressValue)

    // console.log(this.timeline.progress())
    // if (this.navigatingOnScroll) {
    //   this.timeline.progress(progressValue)
    // }
  }

  onResize() {
    var self = this
    // Update sizes
    // sizes.width = window.innerWidth
    // sizes.height = window.innerHeight
  }

  onTouchDown() {
    //
  }
  
  onTouchMove() {
    //
  }

  onTouchUp() {
    //
  }

  onWheel(e) {
    // console.log(e)
  }

  // Add DOM events
  addEventListeners() {
    var self = this

    // // preloader
    // playButton.addEventListener('click', () => {
    //   console.log('play')
    //   self.listener.context.resume()
    //   preloaderOverlay.classList.add('loaded')
    //   // video.play();
    //   // self.masterInit()
    // })
    // // preloader

    window.addEventListener( 'keydown', function ( event ) {
      console.log('key code: ', event.keyCode)
      switch ( event.keyCode ) {
        case 71: // H
        // Do something
        break
      }
    })

    // Add event listener
    window.addEventListener('touchmove', (e) => {
      // this.onTouchMove(e)
    }, false);
    window.addEventListener('mousemove', (e) => {
      // this.onTouchMove(e)
    }, false);

    window.addEventListener('pointermove', self.onTouchMove.bind(this), false);
    window.addEventListener('touchstart', self.onTouchDown.bind(this), false);
    window.addEventListener('pointerdown', self.onTouchDown.bind(this), false);
    window.addEventListener('touchend', self.onTouchUp.bind(this), false);
    window.addEventListener('pointerup', self.onTouchUp.bind(this), false);
    
    window.addEventListener('wheel', self.onWheel.bind(this), false);

  }

  update () {
    
    // console.log('update')
    this.asscroll.update()
    this.setPosition()

    // Set width of progress
    this.elements.progressLine.style.width = `${this.timeline.progress() * 100}%`

    this.frame = window.requestAnimationFrame(this.update.bind(this))
  }

}

const setup = new Setup()
