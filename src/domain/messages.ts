import { Data } from 'effect'

export type MainToWorker = Data.TaggedEnum<{
  Init: { readonly canvas: OffscreenCanvas }
  Shader: { readonly code: string }
  Uniform: { readonly time: number; readonly resolution: { readonly width: number; readonly height: number }; readonly mouse: { readonly x: number; readonly y: number } }
  Resize: { readonly width: number; readonly height: number }
}>

export const MainToWorker = Data.taggedEnum<MainToWorker>()

export type WorkerToMain = Data.TaggedEnum<{
  CompileSuccess: {}
  CompileError: { readonly error: string }
  Fps: { readonly value: number }
}>

export const WorkerToMain = Data.taggedEnum<WorkerToMain>()
