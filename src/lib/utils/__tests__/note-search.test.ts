import { describe, expect, it } from "vitest";
import {
  extractNoteContentText,
  getNotePreview,
  noteMatchesQuery,
} from "$lib/utils/note-search";

describe("note-search", () => {
  it("extracts text from nested rich-text note content", () => {
    const nestedContent = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          content: [{ type: "text", text: "Interview Findings" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Theoretical sampling notes" }],
                },
              ],
            },
          ],
        },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell observation" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(extractNoteContentText(nestedContent)).toContain("Interview Findings");
    expect(extractNoteContentText(nestedContent)).toContain("Theoretical sampling notes");
    expect(extractNoteContentText(nestedContent)).toContain("Cell observation");
  });

  it("matches search terms from note body content, not just the title", () => {
    const note = {
      name: "Field memo",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Participants raised trust concerns" }],
                  },
                ],
              },
            ],
          },
        ],
      }),
      section_type: { value: "Methods", label: "Methods" },
      updated_at: "2026-05-23T12:00:00.000Z",
    };

    expect(noteMatchesQuery(note, "trust concerns", "Other")).toBe(true);
    expect(noteMatchesQuery(note, "field memo", "Other")).toBe(true);
    expect(noteMatchesQuery(note, "nonexistent phrase", "Other")).toBe(false);
  });

  it("builds previews from html content", () => {
    expect(getNotePreview("<p>Alpha <strong>Beta</strong> Gamma</p>", 20)).toBe(
      "Alpha Beta Gamma"
    );
  });
});
