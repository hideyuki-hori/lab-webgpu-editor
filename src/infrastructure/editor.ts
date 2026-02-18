import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { wgsl } from '@iizukak/codemirror-lang-wgsl'
import { transparentTheme, highlightStyle } from './theme'

export const createEditor = (
  parent: HTMLElement,
  initialDoc: string,
  onChange: (code: string) => void,
): EditorView => {
  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      basicSetup,
      wgsl(),
      transparentTheme,
      highlightStyle,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString())
        }
      }),
    ],
  })

  return new EditorView({ state, parent })
}
