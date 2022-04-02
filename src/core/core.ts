import { prng } from '../lib/seedrandom'
import { PonyEscapeConfig } from '../type/ponyEscapeConfig'
import {
   Pair,
   Player,
   PonyDisplay,
   PonyInput,
   WallSquare,
   Monster,
   PonyRenderProp,
} from '../type/ponyEscape'
import { w } from '../util/window'
import { generateLabyrinth } from './labyrinth/generateLabyrinth'
import { pairEqual, pairToString, pairFromString } from '../util/pair'
import { Observable } from 'rxjs'

export interface LoadProp {
   config: PonyEscapeConfig
   display: PonyDisplay
   input: PonyInput
   random: prng
   size: Pair
   revealLabyrinth$: Observable<Event>
   setRevealButtonVisibility: (value: boolean) => void
}

export let core = (prop: LoadProp) => {
   let { config, display, input, size } = prop
   let { revealLabyrinth$, setRevealButtonVisibility } = prop

   let { grid, wallGrid, dijkstra, oddWallList, evenWallList } =
      generateLabyrinth(prop)
   let score: PonyRenderProp['score'] = '<score screen>'
   let screen: PonyRenderProp['screen'] = 'play'

   w.grid = grid

   let player: Player = {
      x: 1,
      y: Math.ceil(size.y / 4) * 2 - 1,
   }

   let smooze: Monster = { ...player }

   let destination: Pair = {
      x: size.x * 2 - 1,
      y: 2 * size.y - 2 - player.y,
   }

   wallGrid[player.y][0].filled = 'empty'
   wallGrid[destination.y][destination.x - 1].filled = 'empty'

   let moveCount = 0

   let hideAllWalls = () => {
      oddWallList.concat(evenWallList).forEach(({ wall }) => {
         wall.visibility = 'invisible'
      })
      setRevealButtonVisibility(true)
   }

   let makeWallVisible = (pos: Pair) => {
      let wallList: WallSquare[] = [wallGrid[pos.y][pos.x]]
      if (pos.x % 2 === 1) {
         wallList.push(wallGrid[pos.y][pos.x - 1], wallGrid[pos.y][pos.x + 1])
      } else if (pos.y % 2 === 1) {
         wallList.push(wallGrid[pos.y - 1][pos.x], wallGrid[pos.y + 1][pos.x])
      } else throw new Error()

      wallList.forEach((wall) => {
         wall.visibility = 'visible'
      })
   }

   revealLabyrinth$.subscribe(() => {
      oddWallList.forEach(makeWallVisible)
      setRevealButtonVisibility(false)
      render()
   })

   /**
    * move
    * Let the player do a move
    *
    * @param direction The delta Pair that leads the player to an odd wall
    */
   let move = (direction: Pair) => {
      let moveCountIncrement = false
      let destinationReached = false

      if (pairEqual(player, destination) && direction.x === 1) {
         destinationReached = true
      }

      player.x += direction.x
      player.y += direction.y

      if (
         player.x > 0 &&
         player.y > 0 &&
         wallGrid[player.y]?.[player.x]?.filled === 'empty'
      ) {
         wallGrid[player.y][player.x].visibility = 'visible'
         player.x += direction.x
         player.y += direction.y
         moveCountIncrement = true
      } else if (destinationReached) {
         screen = 'score'
         if (score === 'defeat') {
            score = 'defeat-plus'
         } else {
            score = 'victory'
         }
      } else {
         if (wallGrid[player.y]?.[player.x]?.filled === 'filled') {
            makeWallVisible(player)
         }
         player.x -= direction.x
         player.y -= direction.y
      }

      moveCount += +moveCountIncrement

      if (moveCount === config.hideDelay) {
         hideAllWalls()
      }
      if (moveCount >= config.smoozeDelay) {
         if (moveCount > config.smoozeDelay) {
            moveSmooze()
         }
         if (pairEqual(smooze, player)) {
            score = 'defeat'
            screen = 'score'
         }
      }
      render()
   }

   let moveSmooze = () => {
      let path: string[] = dijkstra.path(
         pairToString(smooze),
         pairToString(player),
      )

      smooze = {
         ...pairFromString(path?.[1] ?? pairToString(smooze)),
      }
   }

   /**
    * move_
    *
    * Prepare a move for the given delta
    *
    * @param direction The delta Pair; see `move()`
    */
   let move_ = (direction: Pair) => {
      if (Math.abs(direction.x) + Math.abs(direction.y) !== 1) throw new Error()
      return () => move(direction)
   }

   input.left.subscribe(move_({ x: -1, y: 0 }))
   input.right.subscribe(move_({ x: 1, y: 0 }))
   input.up.subscribe(move_({ x: 0, y: -1 }))
   input.down.subscribe(move_({ x: 0, y: 1 }))

   let render = () => {
      display.render({
         grid,
         monster: moveCount >= config.smoozeDelay ? smooze : undefined,
         player,
         score,
         screen,
      })
   }

   render()
}
