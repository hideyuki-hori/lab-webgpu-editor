import { Effect, Match, Ref, Queue, Stream } from 'effect'
import { createPipeline, createUniformBuffer, writeUniforms } from './pipeline'
import { type MainToWorker, WorkerToMain } from '~/domain/messages'

type GpuContext = {
  readonly device: GPUDevice
  readonly context: GPUCanvasContext
  readonly format: GPUTextureFormat
  readonly canvas: OffscreenCanvas
  readonly uniformBuffer: GPUBuffer
}

type PipelineState = {
  readonly pipeline: GPURenderPipeline
  readonly bindGroup: GPUBindGroup
} | null

type UniformState = {
  readonly time: number
  readonly resolution: { readonly width: number; readonly height: number }
  readonly mouse: { readonly x: number; readonly y: number }
}

type FpsState = {
  readonly frameCount: number
  readonly lastFpsTime: number
}

const post = (msg: WorkerToMain): void => {
  self.postMessage(msg)
}

const program = Effect.gen(function* () {
  const gpuRef = yield* Ref.make<GpuContext | null>(null)
  const pipelineRef = yield* Ref.make<PipelineState>(null)
  const uniformRef = yield* Ref.make<UniformState>({
    time: 0,
    resolution: { width: 1, height: 1 },
    mouse: { x: 0, y: 0 },
  })
  const fpsRef = yield* Ref.make<FpsState>({
    frameCount: 0,
    lastFpsTime: 0,
  })
  const runningRef = yield* Ref.make(false)
  const msgQueue = yield* Queue.unbounded<MainToWorker>()

  self.onmessage = (e: MessageEvent<MainToWorker>) => {
    Queue.unsafeOffer(msgQueue, e.data)
  }

  const render = (): void => {
    Effect.runSync(Effect.gen(function* () {
      const isRunning = yield* Ref.get(runningRef)
      if (!isRunning) return

      const gpu = yield* Ref.get(gpuRef)
      const ps = yield* Ref.get(pipelineRef)
      if (gpu && ps) {
        const u = yield* Ref.get(uniformRef)
        writeUniforms(gpu.device, gpu.uniformBuffer, u.time, u.resolution, u.mouse)

        const texture = gpu.context.getCurrentTexture()
        const encoder = gpu.device.createCommandEncoder()
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: texture.createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          }],
        })
        pass.setPipeline(ps.pipeline)
        pass.setBindGroup(0, ps.bindGroup)
        pass.draw(3)
        pass.end()
        gpu.device.queue.submit([encoder.finish()])
      }

      const now = performance.now()
      const fps = yield* Ref.get(fpsRef)
      const count = fps.frameCount + 1
      if (now - fps.lastFpsTime >= 1000) {
        const elapsed = (now - fps.lastFpsTime) / 1000
        post(WorkerToMain.Fps({ value: Math.round(count / elapsed) }))
        yield* Ref.set(fpsRef, { frameCount: 0, lastFpsTime: now })
      } else {
        yield* Ref.set(fpsRef, { frameCount: count, lastFpsTime: fps.lastFpsTime })
      }

      requestAnimationFrame(render)
    }))
  }

  const handleMessage = (msg: MainToWorker): Effect.Effect<void> =>
    Match.value(msg).pipe(
      Match.tag('Init', (m) => Effect.gen(function* () {
        const adapter = yield* Effect.promise(() => navigator.gpu.requestAdapter())
        if (!adapter) return yield* Effect.die(new Error('No GPU adapter found'))

        const device = yield* Effect.promise(() => adapter.requestDevice())
        const format = navigator.gpu.getPreferredCanvasFormat()
        const canvas = m.canvas
        const context = canvas.getContext('webgpu')!
        context.configure({ device, format, alphaMode: 'premultiplied' })
        const uniformBuffer = createUniformBuffer(device)

        yield* Ref.set(gpuRef, { device, context, format, canvas, uniformBuffer })
        yield* Ref.set(runningRef, true)
        yield* Ref.set(fpsRef, { frameCount: 0, lastFpsTime: performance.now() })
        requestAnimationFrame(render)
      })),
      Match.tag('Shader', (m) => Effect.gen(function* () {
        const gpu = yield* Ref.get(gpuRef)
        if (!gpu) return
        try {
          const result = createPipeline(gpu.device, gpu.format, m.code, gpu.uniformBuffer)
          yield* Ref.set(pipelineRef, result)
          post(WorkerToMain.CompileSuccess())
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e)
          post(WorkerToMain.CompileError({ error }))
        }
      })),
      Match.tag('Uniform', (m) => Ref.set(uniformRef, {
        time: m.time,
        resolution: m.resolution,
        mouse: m.mouse,
      })),
      Match.tag('Resize', (m) => Effect.gen(function* () {
        const gpu = yield* Ref.get(gpuRef)
        if (!gpu) return
        gpu.canvas.width = m.width
        gpu.canvas.height = m.height
        gpu.context.configure({
          device: gpu.device,
          format: gpu.format,
          alphaMode: 'premultiplied',
        })
      })),
      Match.exhaustive
    )

  yield* Stream.fromQueue(msgQueue).pipe(
    Stream.runForEach(handleMessage)
  )
})

Effect.runFork(program)
