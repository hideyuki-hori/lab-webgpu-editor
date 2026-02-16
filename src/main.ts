import './style.css'
import { Effect, Layer, Queue, Stream } from 'effect'
import defaultShader from '~/infrastructure/default.wgsl?raw'
import { createEditor } from '~/infrastructure/editor'
import { MainToWorker } from '~/domain/messages'
import { GpuWorker, GpuWorkerLive } from '~/infrastructure/gpu-client'
import {
  ShaderSourceQueue,
  ShaderSourceQueueLive,
  CompilationResultQueueLive,
  compileAndSend$,
  handleWorkerMessages$,
} from '~/usecases/shader'
import {
  MouseQueueLive,
  ResizeQueueLive,
  TimeRefLive,
  mouseForward$,
  resizeForward$,
  animForward$,
  uniformToWorker$,
} from '~/usecases/uniform'
import {
  LogQueueLive,
  LogsStateLive,
  logsRender$,
} from '~/usecases/log'

const canvasEl = document.querySelector<HTMLCanvasElement>('#canvas')!
const editorEl = document.getElementById('editor')!
const logsEl = document.getElementById('logs')!

const program = Effect.gen(function* () {
  const shaderQ = yield* ShaderSourceQueue
  const worker = yield* GpuWorker

  createEditor(editorEl, defaultShader, (code) => {
    Queue.unsafeOffer(shaderQ, code)
  })

  worker.postMessage(MainToWorker.Shader({ code: defaultShader }))

  yield* Effect.all([
    Stream.runDrain(handleWorkerMessages$),
    Stream.runDrain(mouseForward$),
    Stream.runDrain(resizeForward$),
    Stream.runDrain(animForward$),
    Stream.runDrain(compileAndSend$),
    Stream.runDrain(uniformToWorker$),
    Stream.runDrain(logsRender$(logsEl)),
  ], { concurrency: 'unbounded' })
})

const MainLive = Layer.mergeAll(
  GpuWorkerLive(canvasEl),
  ShaderSourceQueueLive,
  CompilationResultQueueLive,
  MouseQueueLive,
  ResizeQueueLive,
  TimeRefLive,
  LogQueueLive,
  LogsStateLive,
)

Effect.runFork(program.pipe(Effect.provide(MainLive)))
