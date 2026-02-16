import { Context, Effect, Layer, Match, Queue, Stream } from 'effect'
import type { ShaderSource, CompilationResult } from '~/domain/shader'
import { MainToWorker } from '~/domain/messages'
import { GpuWorker } from '~/infrastructure/gpu-client'
import { workerMessage$ } from '~/infrastructure/events'
import { pushLog } from '~/usecases/log'

export class ShaderSourceQueue extends Context.Tag('ShaderSourceQueue')<
  ShaderSourceQueue,
  Queue.Queue<ShaderSource>
>() {}

export class CompilationResultQueue extends Context.Tag('CompilationResultQueue')<
  CompilationResultQueue,
  Queue.Queue<CompilationResult>
>() {}

export const ShaderSourceQueueLive = Layer.effect(
  ShaderSourceQueue,
  Queue.unbounded<ShaderSource>()
)

export const CompilationResultQueueLive = Layer.effect(
  CompilationResultQueue,
  Queue.unbounded<CompilationResult>()
)

export const shaderSource$ = Stream.unwrap(
  Effect.map(ShaderSourceQueue, (q) => Stream.fromQueue(q))
)

export const compileRequest$ = shaderSource$.pipe(
  Stream.debounce('300 millis')
)

export const compilationResult$ = Stream.unwrap(
  Effect.map(CompilationResultQueue, (q) => Stream.fromQueue(q))
)

export const compileAndSend$ = Stream.unwrap(
  Effect.map(GpuWorker, (worker) =>
    compileRequest$.pipe(
      Stream.tap((code) =>
        Effect.sync(() => worker.postMessage(MainToWorker.Shader({ code })))
      )
    )
  )
)

export const handleWorkerMessages$ = Stream.unwrap(
  Effect.map(CompilationResultQueue, (compilationQ) =>
    workerMessage$.pipe(
      Stream.tap((msg) =>
        Match.value(msg).pipe(
          Match.tag('CompileSuccess', () => {
            Queue.unsafeOffer(compilationQ, { _tag: 'success' })
            return pushLog('info', 'Shader compiled successfully')
          }),
          Match.tag('CompileError', (m) => {
            Queue.unsafeOffer(compilationQ, { _tag: 'error', error: m.error })
            return pushLog('error', m.error)
          }),
          Match.tag('Fps', (m) =>
            pushLog('info', `FPS: ${m.value}`)
          ),
          Match.exhaustive
        )
      )
    )
  )
)
