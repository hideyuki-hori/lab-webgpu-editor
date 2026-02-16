import VERTEX_SHADER from './vertex.wgsl?raw'
import UNIFORM_PREFIX from './uniform.wgsl?raw'

const UNIFORM_BUFFER_SIZE = 32

export function createUniformBuffer(device: GPUDevice): GPUBuffer {
  return device.createBuffer({
    size: UNIFORM_BUFFER_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
}

export function writeUniforms(
  device: GPUDevice,
  buffer: GPUBuffer,
  time: number,
  resolution: { readonly width: number; readonly height: number },
  mouse: { readonly x: number; readonly y: number },
): void {
  const data = new Float32Array([
    time,
    0,
    resolution.width,
    resolution.height,
    mouse.x,
    mouse.y,
  ])
  device.queue.writeBuffer(buffer, 0, data)
}

export function createPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  fragmentCode: string,
  uniformBuffer: GPUBuffer,
): { pipeline: GPURenderPipeline; bindGroup: GPUBindGroup } {
  const shaderModule = device.createShaderModule({
    code: UNIFORM_PREFIX + fragmentCode,
  })

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
    ],
  })

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  })

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: device.createShaderModule({ code: VERTEX_SHADER }),
      entryPoint: 'vs',
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs',
      targets: [{ format }],
    },
  })

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
    ],
  })

  return { pipeline, bindGroup }
}
