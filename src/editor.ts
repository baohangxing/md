import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { tags } from '@lezer/highlight'
import type { ResolvedTheme } from './theme'

const themeCompartment = new Compartment()

const lightTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      color: '#14241f',
      backgroundColor: 'transparent',
    },
    '.cm-scroller': {
      overflow: 'auto',
      minHeight: '100%',
    },
    '.cm-content': {
      caretColor: '#0f766e',
      minHeight: '100%',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#0f766e',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(15, 118, 110, 0.2)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(15, 118, 110, 0.06)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: '#7a918a',
      border: 'none',
      minHeight: '100%',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: '#0f766e',
    },
  },
  { dark: false },
)

const editorHeightTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': { overflow: 'auto', minHeight: '100%' },
  '.cm-content': { minHeight: '100%' },
})

const lightHighlight = HighlightStyle.define([
  { tag: tags.heading, color: '#0f766e', fontWeight: '700' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.link, color: '#0f766e' },
  { tag: tags.url, color: '#0d9488' },
  { tag: tags.monospace, color: '#115e59' },
  { tag: tags.meta, color: '#64748b' },
  { tag: tags.comment, color: '#64748b', fontStyle: 'italic' },
])

function extensionsFor(theme: ResolvedTheme) {
  if (theme === 'dark') {
    return [oneDark, editorHeightTheme, syntaxHighlighting(defaultHighlightStyle)]
  }
  return [lightTheme, syntaxHighlighting(lightHighlight)]
}

export interface EditorApi {
  view: EditorView
  setTheme: (theme: ResolvedTheme) => void
  getValue: () => string
  setValue: (value: string) => void
  focus: () => void
  insertAround: (before: string, after?: string, placeholder?: string) => void
  insertBlock: (text: string) => void
}

export function createEditor(
  parent: HTMLElement,
  initialDoc: string,
  theme: ResolvedTheme,
  onChange: (value: string) => void,
): EditorApi {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: initialDoc,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        markdown(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        themeCompartment.of(extensionsFor(theme)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString())
        }),
        EditorView.lineWrapping,
      ],
    }),
  })

  return {
    view,
    setTheme(next) {
      view.dispatch({
        effects: themeCompartment.reconfigure(extensionsFor(next)),
      })
    },
    getValue() {
      return view.state.doc.toString()
    },
    setValue(value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    },
    focus() {
      view.focus()
    },
    insertAround(before, after = before, placeholder = '') {
      const { from, to } = view.state.selection.main
      const selected = view.state.sliceDoc(from, to) || placeholder
      view.dispatch({
        changes: { from, to, insert: `${before}${selected}${after}` },
        selection: {
          anchor: from + before.length,
          head: from + before.length + selected.length,
        },
      })
      view.focus()
    },
    insertBlock(text) {
      const { from } = view.state.selection.main
      const line = view.state.doc.lineAt(from)
      const needsNewline = line.text.trim().length > 0
      const insert = `${needsNewline ? '\n\n' : ''}${text}\n`
      const pos = needsNewline ? line.to : from
      view.dispatch({
        changes: { from: pos, insert },
        selection: { anchor: pos + insert.length },
      })
      view.focus()
    },
  }
}
