export type LogEntry = {
  readonly timestamp: number
  readonly level: 'info' | 'error' | 'warn'
  readonly message: string
}
