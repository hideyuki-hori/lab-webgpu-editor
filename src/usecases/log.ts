import { Context, Effect, Layer, Queue, Ref, Stream } from 'effect'
import type { LogEntry } from '~/domain/log'
import { renderLogCards } from '~/infrastructure/log-cards'

export class LogQueue extends Context.Tag('LogQueue')<
  LogQueue,
  Queue.Queue<LogEntry>
>() {}

export class LogsState extends Context.Tag('LogsState')<
  LogsState,
  Ref.Ref<Array<LogEntry>>
>() {}

export const LogQueueLive = Layer.effect(
  LogQueue,
  Queue.unbounded<LogEntry>()
)

export const LogsStateLive = Layer.effect(
  LogsState,
  Ref.make<Array<LogEntry>>([])
)

const log$ = Stream.unwrap(
  Effect.map(LogQueue, (q) => Stream.fromQueue(q))
)

export const logsState$ = Stream.unwrap(
  Effect.gen(function* () {
    const state = yield* LogsState
    return log$.pipe(
      Stream.tap((entry) =>
        Ref.update(state, (logs) => {
          const next = [...logs, entry]
          return next.length > 20 ? next.slice(-20) : next
        })
      ),
      Stream.map(() => state)
    )
  })
)

export const pushLog = (level: LogEntry['level'], message: string) =>
  Effect.flatMap(LogQueue, (q) =>
    q.offer({
      timestamp: Date.now(),
      level,
      message,
    })
  )

export const logsRender$ = (container: HTMLElement) =>
  logsState$.pipe(
    Stream.mapEffect((stateRef) => Ref.get(stateRef)),
    Stream.tap((logs) =>
      Effect.sync(() => renderLogCards(container, logs))
    )
  )
