import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, Transaction } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface TrailingNodeOptions {
  node: string // node name to append, e.g., 'paragraph'
  notAfter: string[] // node names after which we should NOT append
}

export const TrailingNode = Extension.create<TrailingNodeOptions>({
  name: 'trailingNode',

  addOptions() {
    return {
      node: 'paragraph',
      notAfter: ['paragraph'],
    }
  },

  addProseMirrorPlugins() {
    const key = new PluginKey('trailingNodePlugin')
    return [
      new Plugin({
        key,
        appendTransaction: (_transactions: readonly Transaction[], _oldState, newState) => {
          const { doc, tr, schema } = newState
          const nodeType = schema.nodes[this.options.node]
          if (!nodeType) return null

          const last: ProseMirrorNode | null = doc.lastChild
          const notAfter = this.options.notAfter || []

          const shouldAppend = !last || (last.type !== nodeType && !notAfter.includes(last.type.name))
          if (!shouldAppend) return null

          const endPos = doc.content.size
          const node = nodeType.create()
          return tr.insert(endPos, node)
        },
      }),
    ]
  },
})

export default TrailingNode
