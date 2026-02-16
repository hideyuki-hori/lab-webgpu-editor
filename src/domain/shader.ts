export type ShaderSource = string

export type CompilationResult =
  | { readonly _tag: 'success' }
  | { readonly _tag: 'error'; readonly error: string }
