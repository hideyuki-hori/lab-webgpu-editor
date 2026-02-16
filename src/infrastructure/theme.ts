import { EditorView } from '@codemirror/view'
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import { syntaxHighlighting } from '@codemirror/language'

export const transparentTheme = EditorView.theme({
  '&': {
    background: 'transparent',
    height: '100%',
  },
  '.cm-gutters': {
    background: 'rgba(0,0,0,0.3)',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    background: 'rgba(255,255,255,0.05)',
  },
  '.cm-activeLine': {
    background: 'rgba(255,255,255,0.05)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'monospace',
  },
  '.cm-content': {
    color: '#abb2bf',
  },
}, { dark: true })

export const highlightStyle = syntaxHighlighting(oneDarkHighlightStyle)
