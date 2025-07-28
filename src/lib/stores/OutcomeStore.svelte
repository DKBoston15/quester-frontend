<!-- src/lib/stores/OutcomeStore.svelte -->
<script lang="ts" module>
  import { API_BASE_URL } from "$lib/config";

  interface Outcome {
    id: string;
    name: string;
    projectId: string;
    type: string;
    content: string | null;
    sectionType: string | null;
    createdAt: string;
    updatedAt: string;
    userId: string;
  }

  let outcomes = $state<Outcome[]>([]);
  let currentOutcome = $state<Outcome | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  // Predefined outcome templates
  const outcomeTemplates = [
    {
      name: "Link",
      content: "",
      type: "LINK",
    },
    {
      name: "Research Question",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "textStyle", attrs: { fontSize: "1.5rem" } }],
                text: "Research Question",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Primary Research Question",
              },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                attrs: { textAlign: null, class: null },
                content: [
                  {
                    type: "text",
                    marks: [{ type: "italic" }],
                    text: "State your main research question here - ensure it is specific, measurable, and answerable",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Research Question Components",
              },
            ],
          },
          {
            type: "taskList",
            content: [
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      {
                        type: "text",
                        text: "Define research scope and boundaries",
                      },
                    ],
                  },
                ],
              },
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      {
                        type: "text",
                        text: "Identify key variables and their relationships",
                      },
                    ],
                  },
                ],
              },
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      {
                        type: "text",
                        text: "Specify target population or context",
                      },
                    ],
                  },
                ],
              },
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      { type: "text", text: "Define timeframe of the study" },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Sub-questions",
              },
            ],
          },
          {
            type: "orderedList",
            attrs: { tight: true, start: 1 },
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      {
                        type: "text",
                        text: "What specific aspects or dimensions need to be investigated?",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      {
                        type: "text",
                        text: "What contextual factors need to be considered?",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      {
                        type: "text",
                        text: "What methodological approaches will be used?",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Research Hypotheses (if applicable)",
              },
            ],
          },
          {
            type: "bulletList",
            attrs: { tight: true },
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "H1: " }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "H2: " }],
                  },
                ],
              },
            ],
          },
        ],
      }),
      type: "QUESTION",
    },
    {
      name: "Research Finding",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "textStyle", attrs: { fontSize: "1.5rem" } }],
                text: "Research Finding",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Key Finding",
              },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                attrs: { textAlign: null, class: null },
                content: [
                  {
                    type: "text",
                    marks: [{ type: "italic" }],
                    text: "State your main finding clearly and concisely",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Evidence and Analysis",
              },
            ],
          },
          {
            type: "bulletList",
            attrs: { tight: true },
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "Primary evidence:" }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "Supporting data:" }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      {
                        type: "text",
                        text: "Statistical significance (if applicable):",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Implications and Impact",
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
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Domain",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Impact",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Recommendations",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: "tableRow",
                content: [
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                        content: [{ type: "text", text: "Theory" }],
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                      },
                    ],
                  },
                ],
              },
              {
                type: "tableRow",
                content: [
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                        content: [{ type: "text", text: "Practice" }],
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                      },
                    ],
                  },
                ],
              },
              {
                type: "tableRow",
                content: [
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                        content: [{ type: "text", text: "Policy" }],
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Limitations and Future Research",
              },
            ],
          },
          {
            type: "bulletList",
            attrs: { tight: true },
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "Limitations:" }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      { type: "text", text: "Future research directions:" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
      type: "FINDING",
    },
    {
      name: "Research Gap",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "textStyle", attrs: { fontSize: "1.5rem" } }],
                text: "Research Gap",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Gap Identification",
              },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                attrs: { textAlign: null, class: null },
                content: [
                  {
                    type: "text",
                    marks: [{ type: "italic" }],
                    text: "Clearly articulate the gap in current research literature",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Literature Review Summary",
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
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Current Knowledge",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                        content: [
                          {
                            type: "text",
                            marks: [{ type: "bold" }],
                            text: "Knowledge Gaps",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: "tableRow",
                content: [
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    attrs: { colspan: 1, rowspan: 1, colwidth: null },
                    content: [
                      {
                        type: "paragraph",
                        attrs: { textAlign: null, class: null },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Gap Analysis",
              },
            ],
          },
          {
            type: "taskList",
            content: [
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      { type: "text", text: "Theoretical gaps identified" },
                    ],
                  },
                ],
              },
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      { type: "text", text: "Methodological gaps identified" },
                    ],
                  },
                ],
              },
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      { type: "text", text: "Empirical gaps identified" },
                    ],
                  },
                ],
              },
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      {
                        type: "text",
                        text: "Practical/applied gaps identified",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Significance of the Gap",
              },
            ],
          },
          {
            type: "bulletList",
            attrs: { tight: true },
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      { type: "text", text: "Theoretical significance:" },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      { type: "text", text: "Practical significance:" },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      {
                        type: "text",
                        text: "Potential impact of addressing this gap:",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
      type: "GAP",
    },
    {
      name: "Research Abstract",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "textStyle", attrs: { fontSize: "1.5rem" } }],
                text: "Research Abstract",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Background",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "Provide context and identify the research problem",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Objectives",
              },
            ],
          },
          {
            type: "bulletList",
            attrs: { tight: true },
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "Primary objective:" }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "Secondary objectives:" }],
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Methods",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "Describe research design, methodology, and analysis approach",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Results",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "Summarize key findings and their significance",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Conclusions",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "State main conclusions and implications",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Keywords",
              },
            ],
          },
          {
            type: "bulletList",
            attrs: { tight: true },
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "Keyword 1" }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "Keyword 2" }],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "Keyword 3" }],
                  },
                ],
              },
            ],
          },
        ],
      }),
      type: "ABSTRACT",
    },
    {
      name: "Research Grant",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "textStyle", attrs: { fontSize: "1.5rem" } }],
                text: "Research Grant",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Project Description",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "Provide context and identify the research problem",
              },
            ],
          },
          { type: "horizontalRule" },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Relevant Literature",
              },
            ],
          },
          {
            type: "taskList",
            content: [
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "Primary objective:" }],
                  },
                ],
              },
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [{ type: "text", text: "Secondary objectives:" }],
                  },
                ],
              },
              {
                type: "taskItem",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    attrs: { textAlign: null, class: null },
                    content: [
                      {
                        type: "text",
                        text: "Conceptual, Theoretical, or Empirical model",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          { type: "horizontalRule" },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Summary of Designs",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "Describe research, sampling, measurement, and analytic designs",
              },
            ],
          },
          { type: "horizontalRule" },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Knowledge Gained",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "Summarize expected findings and their significance",
              },
            ],
          },
          { type: "horizontalRule" },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Principal Investigators",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "Identify and describe expertise of Principal and Co-Principal Investigators",
              },
            ],
          },
          { type: "horizontalRule" },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "Word Count",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "Provide word count for draft",
              },
            ],
          },
          { type: "horizontalRule" },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "References",
              },
            ],
          },
          {
            type: "paragraph",
            attrs: { textAlign: null, class: null },
            content: [
              {
                type: "text",
                marks: [{ type: "italic" }],
                text: "List references using a consistent format",
              },
            ],
          },
        ],
      }),
      type: "GRANT",
    },
  ];

  export const outcomeStore = {
    get outcomes() {
      return outcomes;
    },
    get currentOutcome() {
      return currentOutcome;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get templates() {
      return outcomeTemplates;
    },

    setError(newError: string | null) {
      error = newError;
    },

    setOutcomes(newOutcomes: Outcome[]) {
      outcomes = newOutcomes;
    },

    async loadOutcomes(projectId: string) {
      if (!projectId) {
        error = "No project ID provided";
        isLoading = false;
        return;
      }

      isLoading = true;
      error = null;

      try {
        const response = await fetch(
          `${API_BASE_URL}/outcome/project/${projectId}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load outcomes (${response.status})`);
        }

        const data = await response.json();
        outcomes = data;
      } catch (err) {
        console.error("Error loading outcomes:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        outcomes = [];
      } finally {
        isLoading = false;
      }
    },

    async loadOutcome(outcomeId: string) {
      if (!outcomeId) {
        this.setError("No outcome ID provided");
        isLoading = false;
        return;
      }

      // Don't reload if we already have the outcome loaded
      if (currentOutcome?.id === outcomeId) {
        return currentOutcome;
      }

      isLoading = true;
      this.setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/outcome/${outcomeId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to load outcome (${response.status})`);
        }

        const data = await response.json();
        if (!data) {
          throw new Error("Outcome not found");
        }

        currentOutcome = data;
        return data;
      } catch (err) {
        console.error("Error loading outcome:", err);
        this.setError(err instanceof Error ? err.message : "An error occurred");
        currentOutcome = null;
      } finally {
        isLoading = false;
      }
    },

    async createOutcome(
      data: Partial<Outcome>,
      templateName?: string | string[]
    ) {
      isLoading = true;
      error = null;

      try {
        // If a template is specified, find and apply it
        if (templateName && templateName !== "") {
          const templateNameStr = Array.isArray(templateName)
            ? templateName[0]
            : templateName;
          const template = outcomeTemplates.find(
            (t) => t.name === templateNameStr
          );
          if (template) {
            data.content = template.content;
            data.type = template.type;
          }
        } else if (data.type === "LINK") {
          // For LINK type, ensure content is passed through
          data.content = data.content || "";
        } else if (data.type && templateName === undefined) {
          // Only apply default template if no template parameter was passed (undefined)
          // If templateName is "" (empty string), user explicitly chose no template
          const defaultTemplate = outcomeTemplates.find(
            (t) => t.type === data.type
          );
          if (defaultTemplate) {
            data.content = defaultTemplate.content;
          }
        }

        const response = await fetch(`${API_BASE_URL}/outcome`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Failed to create outcome (${response.status})`);
        }

        const newOutcome = await response.json();
        outcomes = [newOutcome, ...outcomes];
        currentOutcome = newOutcome;
        return newOutcome;
      } catch (err) {
        console.error("Error creating outcome:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async updateOutcome(id: string, data: Partial<Outcome>) {
      try {
        const response = await fetch(`${API_BASE_URL}/outcome/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Failed to update outcome (${response.status})`);
        }

        const result = await response.json();
        const updatedOutcome = result.outcome || result; // Handle both wrapped and unwrapped responses

        // Update the outcomes array
        const updatedOutcomes = [...outcomes];
        const index = updatedOutcomes.findIndex((outcome) => outcome.id === id);
        if (index !== -1) {
          updatedOutcomes[index] = updatedOutcome;
          outcomes = updatedOutcomes;
        }

        if (currentOutcome?.id === id) {
          currentOutcome = updatedOutcome;
        }
        return updatedOutcome;
      } catch (err) {
        console.error("Error updating outcome:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        throw err;
      }
    },

    async deleteOutcome(id: string) {
      try {
        const response = await fetch(`${API_BASE_URL}/outcome/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete outcome (${response.status})`);
        }

        outcomes = outcomes.filter((outcome) => outcome.id !== id);
        if (currentOutcome?.id === id) {
          currentOutcome = null;
        }
      } catch (err) {
        console.error("Error deleting outcome:", err);
        error = err instanceof Error ? err.message : "An error occurred";
        throw err;
      }
    },

    clearOutcome() {
      currentOutcome = null;
      error = null;
      isLoading = false;
    },

    clearAll() {
      outcomes = [];
      currentOutcome = null;
      error = null;
      isLoading = false;
    },
  };
</script>
