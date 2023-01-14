import { PonyEscapeConfig } from '../type/ponyEscapeConfig'
import { randomSeed } from '../util/randomSeed'
import { getUrlParam } from '../util/urlParam'
import { ButtonSet } from './buttonSet'
import { h } from './lib/hyper'
import { githubCornerHTML } from '../lib/githubCorner'

interface InitProp {
   document: Document
   location: Location
}

let getConfig = (prop: InitProp) => {
   let { location } = prop

   let config = getUrlParam<PonyEscapeConfig>(location, {
      seed: () => randomSeed(),
      easy: () => false,
      hard: () => false,
      smooze: () => false,
      justSmooze: ({ smooze }) => smooze(),
      hide: ({ smooze }) => smooze(),
      hideDelay: ({ hide }) => (hide() ? 4 : -1),
      highlight: () => false,
      smoozeDelay: ({ justSmooze }) => (justSmooze() ? 5 : -1),
      size: ({ easy, hard, hideDelay }) => {
         let difficulty = easy() ? 0 : hard() ? 2 : 1
         return (hideDelay() >= 0 ? [7, 8, 10] : [12, 15, 21])[difficulty]
      },
      cycle: () => -1,
      maxCycleSize: ({ cycle, size }) => {
         if (cycle() >= 0) {
            return cycle() * cycle() * size()
         } else {
            return 0
         }
      },
      cycleRejectionFrequency: () => 0,
   })

   if (config.hideDelay === -1) {
      config.hideDelay = Infinity
   }
   if (config.smoozeDelay === -1) {
      config.smoozeDelay = Infinity
   }

   console.info(`?seed=${config.seed}?`)

   console.info(config)

   return config
}

export let init = (prop: InitProp) => {
   let { document, location } = prop
   let config = getConfig(prop)
   let buttonSet = ButtonSet({ location, seed: config.seed })

   let canvas = h('canvas')
   canvas.width = 800
   canvas.height = 600

   let corner = h('i', {
      innerHTML: githubCornerHTML('https://github.com/ponydevs/pony-escape'),
   })

   document.body.append(
      h('h1', {
         textContent: document.title,
         className: 'inline',
      }),
      buttonSet.elem,
      h('div', {}, [canvas]),
      corner,
   )

   return {
      canvas,
      config,
      revealLabyrinth$: buttonSet.revealLabyrinth$,
      setRevealButtonVisibility: buttonSet.setRevealButtonVisibility,
   }
}
