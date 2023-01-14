import { default as Dijkstra } from 'node-dijkstra'
import { Square, WallSquare, GroundSquare, Pair } from '../../type/ponyEscape'
import { createArray2d } from '../../util/array2d'
import { LoadProp } from '../core'
import { kruskal } from './kruskal'
import { shuffle } from './shuffle'
import { pairScale, pairAdd, pairToString } from '../../util/pair'

export interface LocalizedWall {
   x: number
   y: number
   wall: WallSquare
}

export interface LocalizedGround {
   x: number
   y: number
   ground: GroundSquare
}

export let generateLabyrinth = (prop: LoadProp) => {
   let { config, size, random } = prop

   let twiceSize = { x: size.x * 2, y: size.y * 2 }

   let groundList: LocalizedGround[] = []
   let wallList: LocalizedWall[] = []
   let oddWallList: LocalizedWall[] = []
   let evenWallList: LocalizedWall[] = []

   let grid = createArray2d<Square>(twiceSize, ({ y, x }) => {
      let isOddWall = (x + y) % 2 === 1
      let isGround = x % 2 === 1 && y % 2 === 1
      let isMapBorder =
         x <= 0 || y <= 0 || x >= twiceSize.x - 2 || y >= twiceSize.y - 2

      if (x >= size.x * 2 - 1 || y >= size.y * 2 - 1) {
         // bottom and right side shall be left unused
         return {
            type: 'exterior',
         }
      }

      if (isGround) {
         let me: GroundSquare = {
            type: 'ground',
         }
         groundList.push({ x, y, ground: me })
         return me
      }

      let me: WallSquare = {
         type: 'wall',
         filled: 'filled',
         visibility: 'visible',
      }

      if (!isMapBorder) {
         let localizedWall = { x, y, wall: me }
         wallList.push(localizedWall)

         if (isOddWall) {
            oddWallList.push(localizedWall)
         } else {
            evenWallList.push(localizedWall)
         }
      }

      return me
   })

   let wallGrid = grid as WallSquare[][]

   let shuffledOddWalllist = oddWallList

   shuffle(random, shuffledOddWalllist)

   let smallEnough

   if (config.maxCycleSize > 0) {
      smallEnough = (setSize: number) => {
         return (
            random() >= config.cycleRejectionFrequency &&
            setSize <= config.maxCycleSize
         )
      }
   }

   let selectedWallList = kruskal({
      linkList: oddWallList,
      getNodePair: (wall: LocalizedWall) => {
         if (wall.x % 2 === 0) {
            return [grid[wall.y][wall.x - 1], grid[wall.y][wall.x + 1]]
         } else if (wall.y % 2 === 0) {
            return [grid[wall.y - 1][wall.x], grid[wall.y + 1][wall.x]]
         } else throw new Error()
      },
      smallEnough,
   })

   selectedWallList.forEach(({ wall }) => {
      wall.filled = 'empty'
   })

   //////////////
   // Dijkstra //
   //////////////
   let dijkstra = new Dijkstra()

   let directionList: Pair[] = [
      { y: -1, x: 0 },
      { y: +1, x: 0 },
      { y: 0, x: -1 },
      { y: 0, x: +1 },
   ]

   let getNeigboorPairList = (pos: Pair) => {
      return directionList
         .filter((direction) => {
            let { x, y } = pairAdd(pos, direction)
            return wallGrid[y][x].filled === 'empty'
         })
         .map((direction) => pairAdd(pos, pairScale(direction, 2)))
   }

   groundList.forEach((localized) => {
      let label = pairToString(localized)
      let siblingObj: Record<string, number> = {}

      getNeigboorPairList(localized).forEach((neighboor) => {
         siblingObj[pairToString(neighboor)] = 1
      })

      dijkstra.addNode(label, siblingObj)
   })

   return { grid, wallGrid, wallList, oddWallList, evenWallList, dijkstra }
}
