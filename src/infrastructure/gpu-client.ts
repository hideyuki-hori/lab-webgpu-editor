import { Context, Effect, Layer } from 'effect'
import { MainToWorker } from '~/domain/messages'

export class GpuWorker extends Context.Tag('GpuWorker')<
  GpuWorker,
  Worker
>() {}

export const GpuWorkerLive = (canvas: HTMLCanvasElement) =>
  Layer.effect(GpuWorker, Effect.sync(() => {
    const worker = new Worker(
      new URL('./worker.ts', import.meta.url),
      { type: 'module' }
    )
    const offscreen = canvas.transferControlToOffscreen()
    worker.postMessage(MainToWorker.Init({ canvas: offscreen }), [offscreen])
    worker.postMessage(MainToWorker.Resize({ width: window.innerWidth, height: window.innerHeight }))
    return worker
  }))
