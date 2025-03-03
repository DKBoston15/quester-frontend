See the recommendations.md file for suggested OpenAI prompt improvements.

# Recommendations for Improving the Keyword Analysis Report

## Improved OpenAI Prompt

Replace the current prompt in `openai_service.ts` with this enhanced version:

```javascript
const prompt = `Analyze the provided keyword frequency data and generate a detailed, structured report with proper HTML formatting.
      
Research Purpose: "${data.researchPurpose}"

Individual Keywords:
${data.univariateData
  .map((d) => `${d.term}: ${d.frequency.toLocaleString()} citations`)
  .join("\n")}

Statistical Summary:
- Individual Keywords Mean: ${data.univariateMean.toLocaleString()} citations
- Individual Keywords SD: ${data.univariateSD.toLocaleString()}
- Keyword Pairs Mean: ${data.bivariateMean.toLocaleString()} co-citations
- Keyword Pairs SD: ${data.bivariateSD.toLocaleString()}
${
  data.combinedFrequency
    ? `- All Keywords Together: ${data.combinedFrequency.toLocaleString()} citations`
    : ""
}

Co-occurrence Data:
${data.bivariateData
  .map(
    (d) =>
      `${d.term1} + ${d.term2}: ${d.frequency.toLocaleString()} co-citations`
  )
  .join("\n")}

Generate a report with these sections using proper HTML formatting:

<h3>Frequency Analysis</h3>
<p>
In this section:
- Identify the highest and lowest frequency terms with exact citation counts
- Calculate the percentage each term represents of the total citations
- Analyze distribution patterns across terms
- Interpret what the mean and standard deviation tell us about the data
</p>

<h3>Co-occurrence Analysis</h3>
<p>
In this section:
- Identify the strongest and weakest keyword pairs with exact co-citation counts
- Calculate what percentage each pair represents of total co-citations
- Analyze potential research gaps based on co-occurrence patterns
- Interpret what the co-occurrence statistics suggest about relationships between terms
</p>

<h3>Research Alignment</h3>
<p>
In this section:
- Evaluate how relevant the current keywords are to the research purpose
- Identify any coverage gaps in the current keyword selection
- Assess how well the keywords align with the stated research goals
</p>

<h3>Recommendations</h3>
<p>
Based on the analysis, suggest:
</p>
<ul>
<li>3-5 specific new keywords that would enhance the research</li>
<li>Research angles that appear underexplored based on the data</li>
<li>Specific literature gaps that could be addressed in future work</li>
</ul>

<p>
Each section should include specific numbers, percentages, and concrete insights.
Ensure all suggestions are directly relevant to the stated research purpose.
</p>
`;
```

## Frontend Styling Improvements

The following changes have been made to `AnalysisResults.svelte`:

1. Added a `report-content` class to the container div for the report
2. Added CSS styling for better formatting of headings, paragraphs, and lists
3. Improved spacing between elements for better readability

These changes will ensure that the HTML in the report is properly styled and easy to read.
