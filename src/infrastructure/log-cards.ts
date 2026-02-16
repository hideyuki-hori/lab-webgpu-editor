import type { LogEntry } from '~/domain/log'

const levelColors: Record<LogEntry['level'], string> = {
  info: 'cyan',
  error: 'red',
  warn: 'yellow',
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export const renderLogCards = (
  container: HTMLElement,
  logs: ReadonlyArray<LogEntry>,
): void => {
  container.innerHTML = ''

  const reversed = [...logs].reverse()

  for (const log of reversed) {
    const card = document.createElement('div')
    card.className = 'log-card'
    card.style.borderLeft = `3px solid ${levelColors[log.level]}`

    const time = document.createElement('span')
    time.className = 'log-time'
    time.textContent = formatTime(log.timestamp)

    const msg = document.createElement('span')
    msg.className = 'log-message'
    msg.textContent = log.message

    card.appendChild(time)
    card.appendChild(msg)
    container.appendChild(card)
  }
}
