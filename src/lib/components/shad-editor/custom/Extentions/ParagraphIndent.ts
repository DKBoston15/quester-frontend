import { Extension, type Attributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphIndent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
      setIndent: (level: number) => ReturnType;
    };
  }
}

interface ParagraphIndentOptions {
  types: string[];
  maxIndent: number;
  indentStep: number;
  // CSS size per indent level (e.g., '2em', '24px')
  indentUnit: string;
}

export const ParagraphIndent = Extension.create<ParagraphIndentOptions>({
  name: 'paragraphIndent',

  addOptions() {
    return {
      types: ['paragraph'],
      maxIndent: 8,
      indentStep: 1,
      indentUnit: '2em',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const raw = element.getAttribute('data-indent');
              const parsed = raw ? parseInt(raw, 10) : 0;
              return Number.isFinite(parsed) ? parsed : 0;
            },
            renderHTML: (attributes) => {
              const level = attributes.indent ?? 0;
              if (!level || level <= 0) return {};
              return {
                'data-indent': String(level),
                style: `margin-left: calc(${level} * ${this.options.indentUnit});`,
              };
            },
          },
        } as Attributes,
      },
    ];
  },

  addCommands() {
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const updateParagraphsInRange = (adjust: (current: number) => number) => ({ state, dispatch }: any) => {
      const { from, to } = state.selection;
      let tr = state.tr;
      let changed = false;

      state.doc.nodesBetween(from, to, (node: any, pos: number) => {
        if (!node.isBlock) return;
        if (!this.options.types.includes(node.type.name)) return;

        const current = Number(node.attrs.indent) || 0;
        const next = clamp(adjust(current), 0, this.options.maxIndent);
        if (next !== current) {
          tr = tr.setNodeMarkup(pos, node.type, { ...node.attrs, indent: next });
          changed = true;
        }
      });

      if (changed && dispatch) {
        dispatch(tr);
        return true;
      }
      return false;
    };

    return {
      increaseIndent: () => updateParagraphsInRange((current) => current + this.options.indentStep),
      decreaseIndent: () => updateParagraphsInRange((current) => current - this.options.indentStep),
      setIndent:
        (level: number) =>
        ({ state, dispatch }: any) => {
          const target = clamp(level, 0, this.options.maxIndent);
          const { from, to } = state.selection;
          let tr = state.tr;
          let changed = false;

          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (!node.isBlock) return;
            if (!this.options.types.includes(node.type.name)) return;
            const current = Number(node.attrs.indent) || 0;
            if (current !== target) {
              tr = tr.setNodeMarkup(pos, node.type, { ...node.attrs, indent: target });
              changed = true;
            }
          });

          if (changed && dispatch) {
            dispatch(tr);
            return true;
          }
          return false;
        },
    };
  },
});

export default ParagraphIndent;

