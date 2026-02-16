import { Chunk, Effect, Stream } from 'effect'
import type { WorkerToMain } from '~/domain/messages'
import type { Vector2, Resolution } from '~/domain/uniform'
import { GpuWorker } from '~/infrastructure/gpu-client'

export const workerMessage$ = Stream.unwrap(
  Effect.map(GpuWorker, (worker) =>
    Stream.async<WorkerToMain>((emit) => {
      worker.addEventListener('message', (e: MessageEvent<WorkerToMain>) => {
        emit(Effect.succeed(Chunk.of(e.data)))
      })
    })
  )
)

export const mousemove$: Stream.Stream<Vector2> =
  Stream.async((emit) => {
    window.addEventListener('mousemove', (e) => {
      const pos: Vector2 = { x: e.clientX, y: e.clientY }
      emit(Effect.succeed(Chunk.of(pos)))
    })
  })

export const windowResize$: Stream.Stream<Resolution> =
  Stream.async((emit) => {
    window.addEventListener('resize', () => {
      emit(Effect.succeed(Chunk.of({
        width: window.innerWidth,
        height: window.innerHeight,
      })))
    })
  })

export const animationFrame$: Stream.Stream<number> =
  Stream.repeatEffect(
    Effect.async<number>((resume) => {
      requestAnimationFrame((t) => {
        resume(Effect.succeed(t / 1000))
      })
    })
  )
