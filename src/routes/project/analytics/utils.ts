import type { Literature } from "$lib/types/literature";
import type { Note } from "$lib/types";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";

const nlp = winkNLP(model);
const its = nlp.its;

// Add proper type definitions
type WordCountKeys =
  | "nounsWordCounts"
  | "verbsWordCounts"
  | "adjectivesWordCounts";
type LiteratureWordCountKeys =
  | "literatureNounsWordCounts"
  | "literatureVerbsWordCounts"
  | "literatureAdjectivesWordCounts";

// Define proper types for wink-nlp functions
interface ItsFunction {
  (token: any, cache?: any): string;
}

const posIts = its.pos as ItsFunction;
const lemmaIts = its.lemma as ItsFunction;

export class AnalysisData {
  nounsWordCounts: Record<string, number> = {};
  verbsWordCounts: Record<string, number> = {};
  adjectivesWordCounts: Record<string, number> = {};
  literatureNounsWordCounts: Record<string, number> = {};
  literatureVerbsWordCounts: Record<string, number> = {};
  literatureAdjectivesWordCounts: Record<string, number> = {};
  authors: Record<string, number> = {};
  publishers: Record<string, number> = {};
  years: Record<string, number> = {};
  researchDesigns: Record<string, number> = {};
  analyticDesigns: Record<string, number> = {};
  samplingDesigns: Record<string, number> = {};
  measurementDesigns: Record<string, number> = {};
  keywords: Record<string, number> = {};
  literatureTypes: Record<string, number> = {};
  yearTypeMatrix: Record<string, Record<string, number>> = {};

  updateWordCount(
    type: "nouns" | "verbs" | "adjectives",
    words: string[],
    countType: "wordCounts" | "literatureWordCounts"
  ) {
    const key =
      countType === "wordCounts"
        ? (`${type}WordCounts` as WordCountKeys)
        : (`literature${
            type.charAt(0).toUpperCase() + type.slice(1)
          }WordCounts` as LiteratureWordCountKeys);

    const countObject = this[key];
    words.forEach((word) => {
      countObject[word] = (countObject[word] || 0) + 1;
    });
  }

  sortYearsChronologically(): { names: string[]; counts: number[] } {
    const yearEntries = Object.entries(this.years);
    const sortedYearEntries = yearEntries.sort(
      (a, b) => parseInt(a[0]) - parseInt(b[0])
    );
    return {
      names: sortedYearEntries.map((entry) => entry[0]),
      counts: sortedYearEntries.map((entry) => entry[1]),
    };
  }

  countOccurrences(items: string[], target: Record<string, number>) {
    if (!items || !Array.isArray(items)) return;
    items.forEach((item) => {
      if (item) {
        target[item] = (target[item] || 0) + 1;
      }
    });
  }

  sortAndFilter(
    target: Record<string, number>,
    threshold: number = 1,
    applyThreshold: boolean = false,
    minWordLength: number = 2
  ): { names: string[]; counts: number[] } {
    const filteredSortedEntries = Object.entries(target)
      .filter(
        ([word, count]) =>
          (!applyThreshold || count >= threshold) &&
          word.length >= minWordLength
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return {
      names: filteredSortedEntries.map((entry) => entry[0]),
      counts: filteredSortedEntries.map((entry) => entry[1]),
    };
  }

  addYearTypeEntry(year: string, type: string) {
    if (!this.yearTypeMatrix[year]) {
      this.yearTypeMatrix[year] = {};
    }
    this.yearTypeMatrix[year][type] =
      (this.yearTypeMatrix[year][type] || 0) + 1;
  }

  getStackedYearTypeData(): {
    years: string[];
    types: string[];
    datasets: { type: string; data: number[] }[];
  } {
    const years = Object.keys(this.yearTypeMatrix).sort();
    const allTypes = new Set<string>();

    Object.values(this.yearTypeMatrix).forEach((yearData) => {
      Object.keys(yearData).forEach((type) => allTypes.add(type));
    });

    const types = Array.from(allTypes).sort();

    const datasets = types.map((type) => ({
      type,
      data: years.map((year) => this.yearTypeMatrix[year]?.[type] || 0),
    }));

    return { years, types, datasets };
  }
}

async function processTextWithNLP(
  text: string,
  analysisData: AnalysisData,
  countType: "wordCounts" | "literatureWordCounts"
) {
  // Clean and normalize the text
  const cleanText = text
    .replace(/[^\w\s-]/g, " ") // Replace non-word chars (except hyphens) with spaces
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/-/g, " ") // Split hyphenated words for better processing
    .trim()
    .toLowerCase(); // Convert to lowercase for better NLP processing

  const doc = nlp.readDoc(cleanText);

  // Custom patterns for scientific/technical text
  const verbPatterns = [
    "study",
    "analyze",
    "investigate",
    "observe",
    "measure",
    "calculate",
    "determine",
    "evaluate",
    "assess",
    "examine",
    "test",
    "verify",
    "simulate",
    "model",
    "predict",
    "demonstrate",
    "show",
    "indicate",
    "suggest",
    "propose",
    "develop",
    "improve",
    "enhance",
    "optimize",
  ];

  const adjPatterns = [
    "molecular",
    "atomic",
    "quantum",
    "theoretical",
    "experimental",
    "analytical",
    "numerical",
    "computational",
    "statistical",
    "dynamic",
    "kinetic",
    "thermal",
    "chemical",
    "physical",
    "structural",
    "mechanical",
    "electronic",
    "magnetic",
    "optical",
    "spectroscopic",
  ];

  // Get all tokens and their parts of speech for debugging
  const allTokens = doc.tokens().out();
  const allPos = doc.tokens().out(posIts);

  // Extract parts of speech with pattern matching
  const nouns = doc
    .tokens()
    .filter((t) => {
      const pos = t.out(posIts);
      const word = t.out();
      return pos === "NOUN" || pos === "PROPN";
    })
    .out(lemmaIts);

  // Combine POS tagging with pattern matching for verbs
  const verbs = doc
    .tokens()
    .filter((t) => {
      const pos = t.out(posIts);
      const word = t.out();
      return pos === "VERB" || verbPatterns.includes(word);
    })
    .out(lemmaIts);

  // Combine POS tagging with pattern matching for adjectives
  const adjectives = doc
    .tokens()
    .filter((t) => {
      const pos = t.out(posIts);
      const word = t.out();
      return pos === "ADJ" || adjPatterns.includes(word);
    })
    .out(lemmaIts);

  // Additional processing for hyphenated words
  const words = cleanText.split(" ");
  words.forEach((word) => {
    // Check for technical adjectives that might be part of hyphenated words
    if (word.endsWith("ic") || word.endsWith("al") || word.endsWith("ive")) {
      adjectives.push(word);
    }
    // Check for potential verbs with common suffixes
    if (word.endsWith("ate") || word.endsWith("ize") || word.endsWith("yze")) {
      verbs.push(word);
    }
  });

  // Update counts without deduplicating words
  if (nouns.length > 0) {
    analysisData.updateWordCount("nouns", nouns, countType);
  }
  if (verbs.length > 0) {
    analysisData.updateWordCount("verbs", verbs, countType);
  }
  if (adjectives.length > 0) {
    analysisData.updateWordCount("adjectives", adjectives, countType);
  }
}

function extractTextFromTipTap(content: any): string {
  try {
    if (!content) {
      return "";
    }

    // If it's a string that might be JSON
    if (typeof content === "string") {
      try {
        const parsed = JSON.parse(content);
        return extractTextFromTipTap(parsed);
      } catch (e) {
        // Not JSON, return as is
        return content;
      }
    }

    // If it's a text node
    if (content.type === "text" && content.text) {
      return content.text + " ";
    }

    // If it has content array
    if (content.content && Array.isArray(content.content)) {
      return content.content
        .map((node: any) => {
          const text = extractTextFromTipTap(node);
          return text;
        })
        .join(" ");
    }

    // For any other object
    if (typeof content === "object") {
      return Object.values(content)
        .map((value: any) => {
          if (Array.isArray(value)) {
            return value.map((item) => extractTextFromTipTap(item)).join(" ");
          }
          if (typeof value === "object" && value !== null) {
            return extractTextFromTipTap(value);
          }
          return "";
        })
        .filter((text) => text.trim())
        .join(" ");
    }

    return "";
  } catch (error) {
    console.error("Error extracting text from TipTap:", error);
    return "";
  }
}

export async function analyzeLiterature(
  literature: Literature[],
  notes: Note[]
) {
  if (!literature?.length && !notes?.length) return null;

  const analysisData = new AnalysisData();

  // Process literature
  literature.forEach((lit) => {
    if (lit.keywords) {
      let keywordsArray: string[];
      if (Array.isArray(lit.keywords)) {
        // Filter for string elements if it's potentially any[]
        keywordsArray = lit.keywords.filter(
          (k): k is string => typeof k === "string"
        );
      } else if (typeof lit.keywords === "string") {
        keywordsArray = [lit.keywords];
      } else {
        keywordsArray = []; // Handle unexpected types gracefully
      }
      analysisData.countOccurrences(keywordsArray, analysisData.keywords);
    }
    if (lit.name && typeof lit.name === "string" && lit.name.trim()) {
      processTextWithNLP(lit.name.trim(), analysisData, "literatureWordCounts");
    }
    if (lit.authors) {
      let authorsArray: string[];
      if (Array.isArray(lit.authors)) {
        // Filter for string elements if it's potentially any[]
        authorsArray = lit.authors.filter(
          (a): a is string => typeof a === "string"
        );
      } else if (typeof lit.authors === "string") {
        authorsArray = [lit.authors];
      } else {
        authorsArray = []; // Handle unexpected types gracefully
      }
      analysisData.countOccurrences(authorsArray, analysisData.authors);
    }
    if (lit.publisherName) {
      analysisData.countOccurrences(
        [lit.publisherName],
        analysisData.publishers
      );
    }
    if (lit.researchDesign) {
      analysisData.countOccurrences(
        [lit.researchDesign],
        analysisData.researchDesigns
      );
    }
    if (lit.analyticDesign) {
      analysisData.countOccurrences(
        [lit.analyticDesign],
        analysisData.analyticDesigns
      );
    }
    if (lit.samplingDesign) {
      analysisData.countOccurrences(
        [lit.samplingDesign],
        analysisData.samplingDesigns
      );
    }
    if (lit.measurementDesign) {
      analysisData.countOccurrences(
        [lit.measurementDesign],
        analysisData.measurementDesigns
      );
    }
    if (lit.publishYear) {
      analysisData.countOccurrences([lit.publishYear], analysisData.years);
    }
    if (lit.type) {
      analysisData.countOccurrences([lit.type], analysisData.literatureTypes);
    }

    // Add year-type combination entry
    if (lit.publishYear && lit.type) {
      analysisData.addYearTypeEntry(lit.publishYear, lit.type);
    }
  });

  // Process notes
  notes.forEach((note, index) => {
    if (note.content) {
      const plainText = extractTextFromTipTap(note.content);

      if (plainText.trim()) {
        processTextWithNLP(plainText.trim(), analysisData, "wordCounts");
      }
    }
  });

  const publicationYearsSorted = analysisData.sortYearsChronologically();

  return {
    totalLiteratureCount: literature.length,
    totalNotesCount: notes.length,
    keywords: analysisData.sortAndFilter(analysisData.keywords),
    topAuthors: analysisData.sortAndFilter(analysisData.authors),
    topPublishers: analysisData.sortAndFilter(analysisData.publishers),
    publicationYears: publicationYearsSorted,
    literatureTypes: analysisData.sortAndFilter(
      analysisData.literatureTypes,
      1,
      false
    ),
    researchDesigns: analysisData.sortAndFilter(analysisData.researchDesigns),
    analyticDesigns: analysisData.sortAndFilter(analysisData.analyticDesigns),
    samplingDesigns: analysisData.sortAndFilter(analysisData.samplingDesigns),
    measurementDesigns: analysisData.sortAndFilter(
      analysisData.measurementDesigns
    ),
    nounsWordCounts: analysisData.sortAndFilter(
      analysisData.nounsWordCounts,
      1,
      false
    ),
    verbsWordCounts: analysisData.sortAndFilter(
      analysisData.verbsWordCounts,
      1,
      false
    ),
    adjectivesWordCounts: analysisData.sortAndFilter(
      analysisData.adjectivesWordCounts,
      1,
      false
    ),
    literatureNounsWordCounts: analysisData.sortAndFilter(
      analysisData.literatureNounsWordCounts,
      1,
      false
    ),
    literatureVerbsWordCounts: analysisData.sortAndFilter(
      analysisData.literatureVerbsWordCounts,
      1,
      false
    ),
    literatureAdjectivesWordCounts: analysisData.sortAndFilter(
      analysisData.literatureAdjectivesWordCounts,
      1,
      false
    ),
    yearTypeMatrix: analysisData.getStackedYearTypeData(),
  };
}

export function createHorizontalChartObject(
  title: string,
  data: { names: string[]; counts: number[] },
  color: string,
  themeColor: string
) {
  return {
    title: {
      text: title,
      left: "center",
      textStyle: {
        color: themeColor,
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    grid: {
      top: 80,
      bottom: 30,
      left: 100,
    },
    xAxis: {
      type: "value",
      position: "top",
      splitLine: { lineStyle: { type: "dashed" } },
      axisLabel: {
        show: true,
        margin: 20,
        color: themeColor,
      },
    },
    yAxis: {
      type: "category",
      data: data.names,
      inverse: true,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        show: true,
        margin: 20,
        color: themeColor,
        formatter: (value: string) =>
          value.length > 15 ? `${value.slice(0, 15)}...` : value,
      },
    },
    series: [
      {
        name: title,
        type: "bar",
        data: data.counts,
        label: {
          show: true,
          position: "right",
          formatter: "{c}",
          color: themeColor,
        },
        itemStyle: {
          color: color,
        },
      },
    ],
  };
}

export function createVerticalChartObject(
  title: string,
  data: { names: string[]; counts: number[] },
  color: string,
  themeColor: string
) {
  return {
    title: {
      text: title,
      left: "center",
      textStyle: {
        color: themeColor,
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    xAxis: {
      type: "category",
      data: data.names,
      axisLabel: {
        color: themeColor,
        rotate: 45,
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: themeColor,
      },
    },
    series: [
      {
        data: data.counts,
        type: "bar",
        itemStyle: {
          color: color,
        },
      },
    ],
  };
}
