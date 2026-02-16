import { Context, Effect, Layer, Queue, Ref, Stream } from 'effect'
import type { Vector2, Resolution, UniformData } from '~/domain/uniform'
import { MainToWorker } from '~/domain/messages'
import { GpuWorker } from '~/infrastructure/gpu-client'
import { mousemove$, windowResize$, animationFrame$ } from '~/infrastructure/events'

export class MouseQueue extends Context.Tag('MouseQueue')<
  MouseQueue,
  Queue.Queue<Vector2>
>() {}

export class ResizeQueue extends Context.Tag('ResizeQueue')<
  ResizeQueue,
  Queue.Queue<Resolution>
>() {}

export class TimeRef extends Context.Tag('TimeRef')<
  TimeRef,
  Ref.Ref<number>
>() {}

export const MouseQueueLive = Layer.effect(
  MouseQueue,
  Queue.unbounded<Vector2>()
)

export const ResizeQueueLive = Layer.effect(
  ResizeQueue,
  Effect.tap(
    Queue.unbounded<Resolution>(),
    (q) => q.offer({ width: window.innerWidth, height: window.innerHeight })
  )
)

export const TimeRefLive = Layer.effect(
  TimeRef,
  Ref.make(0)
)

const mouse$ = Stream.unwrap(
  Effect.map(MouseQueue, (q) => Stream.fromQueue(q))
)

const resize$ = Stream.unwrap(
  Effect.map(ResizeQueue, (q) => Stream.fromQueue(q))
)

const time$ = Stream.unwrap(
  Effect.map(TimeRef, (ref) =>
    Stream.repeatEffect(Ref.get(ref))
  )
)

export const uniform$ = Stream.unwrap(
  Effect.gen(function* () {
    const mouseRef = Ref.unsafeMake<Vector2>({ x: 0, y: 0 })
    const resolutionRef = Ref.unsafeMake<Resolution>({ width: 800, height: 600 })

    const mouseUpdater = mouse$.pipe(
      Stream.tap((pos) => Ref.set(mouseRef, pos))
    )

    const resizeUpdater = resize$.pipe(
      Stream.tap((r) => Ref.set(resolutionRef, r))
    )

    const ticker = time$.pipe(
      Stream.mapEffect((t) =>
        Effect.map(
          Effect.all([Ref.get(mouseRef), Ref.get(resolutionRef)]),
          ([m, r]) => ({
            time: t,
            resolution: r,
            mouse: m,
          } satisfies UniformData)
        )
      )
    )

    return Stream.merge(
      Stream.merge(Stream.drain(mouseUpdater), Stream.drain(resizeUpdater)),
      ticker
    )
  })
)

export const mouseForward$ = Stream.unwrap(
  Effect.map(MouseQueue, (q) =>
    mousemove$.pipe(
      Stream.tap((pos) => Effect.sync(() => Queue.unsafeOffer(q, pos)))
    )
  )
)

export const resizeForward$ = Stream.unwrap(
  Effect.gen(function* () {
    const q = yield* ResizeQueue
    const worker = yield* GpuWorker
    return windowResize$.pipe(
      Stream.tap((r) =>
        Effect.sync(() => {
          Queue.unsafeOffer(q, r)
          worker.postMessage(MainToWorker.Resize({ width: r.width, height: r.height }))
        })
      )
    )
  })
)

export const animForward$ = Stream.unwrap(
  Effect.map(TimeRef, (ref) =>
    animationFrame$.pipe(
      Stream.tap((t) => Ref.set(ref, t))
    )
  )
)

export const uniformToWorker$ = Stream.unwrap(
  Effect.map(GpuWorker, (worker) =>
    uniform$.pipe(
      Stream.tap((data) =>
        Effect.sync(() =>
          worker.postMessage(MainToWorker.Uniform({
            time: data.time,
            resolution: data.resolution,
            mouse: data.mouse,
          }))
        )
      )
    )
  )
)
