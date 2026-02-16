export type Vector2 = { readonly x: number; readonly y: number }

export type Resolution = { readonly width: number; readonly height: number }

export type UniformData = {
  readonly time: number
  readonly resolution: Resolution
  readonly mouse: Vector2
}
