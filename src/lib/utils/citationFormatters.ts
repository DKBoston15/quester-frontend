import type { Literature } from "$lib/types/literature";

export interface Citation {
  authors: string[];
  editors: string[];
  publicationYear: string;
  title: string;
  secondName: string;
  journalName: string;
  volumeNumber: string;
  issueNumber?: string;
  startPage: string;
  endPage: string;
  pageRange?: string;
  startDate: string;
  endDate: string;
  type: string;
  doi?: string;
  url?: string;
  city: string;
}

export function literatureToCitation(literature: Literature): Citation {
  // Handle type field - it might be a string or an object with { label, value }
  let typeValue = "";
  if (typeof literature?.type === "string") {
    typeValue = literature.type;
  } else if (literature?.type && typeof literature.type === "object" && "value" in literature.type) {
    typeValue = (literature.type as any).value;
  }

  return {
    authors: Array.isArray(literature?.authors)
      ? literature.authors
      : typeof literature?.authors === "string"
        ? JSON.parse(literature.authors || "[]")
        : [],
    editors: Array.isArray(literature?.editors)
      ? literature.editors
      : typeof literature?.editors === "string"
        ? JSON.parse(literature.editors || "[]")
        : [],
    publicationYear: literature?.publishYear ?? "n.d.",
    title: literature?.name ?? "",
    journalName: literature?.publisherName || "",
    volumeNumber: literature?.volume ?? "",
    issueNumber: literature?.issue ?? "",
    startPage: literature?.startPage ?? "",
    endPage: literature?.endPage ?? "",
    startDate: literature?.startDate ?? "",
    endDate: literature?.endDate ?? "",
    city: literature?.city ?? "",
    secondName: literature?.secondName ?? "",
    url: literature?.link ?? "",
    type: typeValue,
    doi: literature?.doi,
  };
}

function formatAuthorName(author: string): string {
  if (author) {
    const parts = author.split(", ");
    const lastName = parts[0] || "";
    const firstName = parts[1] || "";
    const formattedInitials = firstName
      .split(" ")
      .map((initial) => `${initial.charAt(0)}.`)
      .join(" ");
    return `${lastName}, ${formattedInitials}`;
  }
  return "";
}

export function formatAPACitation(citation: Citation): string {
  let formattedAuthors;
  if (citation.authors.length > 20) {
    formattedAuthors = citation.authors
      .slice(0, 19)
      .map(formatAuthorName)
      .join(", ");
    formattedAuthors += `, . . .  ${formatAuthorName(
      citation.authors[citation.authors.length - 1]
    )}`;
  } else if (citation.authors.length > 1) {
    formattedAuthors = citation.authors
      .slice(0, -1)
      .map(formatAuthorName)
      .join(", ");
    formattedAuthors += `, & ${formatAuthorName(citation.authors[citation.authors.length - 1])}`;
  } else if (citation.authors.length === 1) {
    formattedAuthors = formatAuthorName(citation.authors[0]);
  } else {
    formattedAuthors = "";
  }

  let formattedDate = citation.publicationYear
    ? `(${citation.publicationYear}).`
    : "(n.d.).";

  let formattedTitle;
  if (citation.type === "Book") {
    formattedTitle =
      citation.title.endsWith("?") || citation.title.endsWith("!")
        ? `<i>${citation.title.charAt(0).toUpperCase() + citation.title.slice(1)}</i>`
        : `<i>${citation.title.charAt(0).toUpperCase() + citation.title.slice(1)}</i>.`;
  } else {
    formattedTitle =
      citation.title.endsWith("?") || citation.title.endsWith("!")
        ? `${citation.title.charAt(0).toUpperCase() + citation.title.slice(1)}`
        : `${citation.title.charAt(0).toUpperCase() + citation.title.slice(1)}.`;
  }

  let citationComponents = [];
  let formattedChapterTitle = `${citation.title}.`;
  let conferenceYear;

  if (citation.type === "Book Chapter") {
    let formattedEditors = citation.editors.map(formatAuthorName).join(", ");
    formattedEditors += citation.editors.length > 1 ? " (Eds.)," : " (Ed.),";

    let formattedBookTitle = `<i>${citation.secondName}</i>`;
    let pageRange =
      citation.startPage && citation.endPage
        ? `(pp. ${citation.startPage}-${citation.endPage})`
        : "";
    let publisher = citation.journalName;

    citationComponents.push(
      `In ${formattedEditors} ${formattedBookTitle} ${pageRange}. ${publisher}.`
    );
  } else if (citation.type === "Conference Presentation") {
    formattedTitle = `${citation.title} [Conference presentation].`;

    let startDate = new Date(citation.startDate);
    let endDate = new Date(citation.endDate);
    conferenceYear = startDate.getFullYear();
    let formattedDateRange = `${startDate.toLocaleString("default", {
      month: "long",
    })} ${startDate.getDate()}-${endDate.getDate()}`;

    let conferenceDetails = `${citation.journalName}, ${citation.city}, ${conferenceYear}, ${formattedDateRange}`;
    citationComponents.push(conferenceDetails);
  } else {
    let journalComponent;
    if (citation.journalName) {
      if (citation.type === "Book") {
        journalComponent = `${citation.journalName}`;
      } else {
        journalComponent = `<i>${citation.journalName}`;
      }
      if (citation.volumeNumber && !citation.issueNumber) {
        journalComponent += `, ${citation.volumeNumber},`;
      }
      if (citation.volumeNumber && citation.issueNumber) {
        journalComponent += `, ${citation.volumeNumber}</i>(<span>${citation.issueNumber}</span>),<i>`;
      }
      if (citation.type !== "Book") {
        journalComponent += "</i>";
      }

      citationComponents.push(journalComponent);
    }

    let hasPageNumbers = false;
    if (citation.startPage) {
      hasPageNumbers = true;
      let pageComponent = citation.endPage
        ? `${citation.startPage}-${citation.endPage}.`
        : `${citation.startPage}.`;
      citationComponents.push(pageComponent);
    }

    if (!hasPageNumbers && citationComponents.length > 0) {
      citationComponents[citationComponents.length - 1] += ".";
    }
  }

  if (citation.url) {
    let urlWithPeriod = `<a class="underline" href="${citation.url}" target="_blank">${citation.url}</a>`;
    citationComponents.push(urlWithPeriod);
  }

  if (citation.type === "Conference Presentation") {
    formattedDate = `(${conferenceYear}).`;
  }

  let formattedCitation = [
    formattedAuthors,
    formattedDate,
    citation.type === "Book Chapter"
      ? formattedChapterTitle
      : formattedTitle,
    ...citationComponents,
  ].join(" ");

  return formattedCitation;
}

export function formatMLACitation(citation: Citation): string {
  function formatMLAAuthors(authors: string[]): string {
    if (authors.length === 0) return "";
    if (authors.length === 1) return authors[0];
    return `${authors[0]}, et al.`;
  }

  function capitalizeTitle(title: string): string {
    const minorWords = [
      "a",
      "an",
      "the",
      "at",
      "by",
      "for",
      "in",
      "of",
      "on",
      "to",
      "up",
      "and",
      "as",
      "but",
      "or",
      "nor",
    ];
    return title
      .split(" ")
      .map((word, index) =>
        index === 0 || !minorWords.includes(word.toLowerCase())
          ? word.charAt(0).toUpperCase() + word.slice(1)
          : word
      )
      .join(" ");
  }

  let components: string[] = [];

  // Authors
  if (citation.authors.length > 0) {
    components.push(formatMLAAuthors(citation.authors));
  }

  // Title
  switch (citation.type) {
    case "Book":
    case "Conference Proceedings":
      components.push(`<i>${capitalizeTitle(citation.title)}.</i>`);
      break;
    default:
      components.push(`"${capitalizeTitle(citation.title)}."`);
  }

  // Container (Journal name, Book title for chapters, Conference name, etc.)
  if (citation.journalName) {
    switch (citation.type) {
      case "Journal Article":
      case "Literature Review":
      case "Book Chapter":
      case "Conference Presentation":
      case "Other":
        components.push(`<i>${capitalizeTitle(citation.journalName)}</i>,`);
        break;
      case "Book":
      case "Conference Proceedings":
        break;
    }
  }

  // Additional information for specific types
  switch (citation.type) {
    case "Book Chapter":
      if (citation.editors && citation.editors.length > 0) {
        components.push(`edited by ${formatMLAAuthors(citation.editors)},`);
      }
      break;
    case "Conference Presentation":
      components.push("Conference Presentation,");
      break;
  }

  // Volume and issue for journal articles
  if (
    (citation.type === "Journal Article" ||
      citation.type === "Other") &&
    citation.volumeNumber
  ) {
    let volumeIssue = `vol. ${citation.volumeNumber}`;
    if (citation.issueNumber) {
      volumeIssue += `, no. ${citation.issueNumber}`;
    }
    components.push(volumeIssue + ",");
  }

  // Year
  components.push(`${citation.publicationYear},`);

  // Pages for articles and book chapters
  if (
    (citation.type === "Journal Article" ||
      citation.type === "Book Chapter" ||
      citation.type === "Other") &&
    citation.startPage
  ) {
    let pages = citation.endPage
      ? `pp. ${citation.startPage}-${citation.endPage}`
      : `p. ${citation.startPage}`;
    components.push(pages + ",");
  }

  // URL
  if (citation.url) {
    components.push(citation.url);
  }

  let formattedCitation = components.join(" ").trim();
  return formattedCitation.endsWith(".")
    ? formattedCitation
    : formattedCitation + ".";
}

export function formatChicagoCitation(citation: Citation): string {
  function formatChicagoAuthor(author: string): string {
    const parts = author.split(", ");
    return `${parts[0]}, ${parts[1]}`;
  }

  function formatChicagoAuthors(authors: string[]): string {
    if (authors.length === 0) return "";
    if (authors.length === 1) return formatChicagoAuthor(authors[0]);
    if (authors.length <= 10)
      return authors.map(formatChicagoAuthor).join(", ");
    return `${authors.slice(0, 7).map(formatChicagoAuthor).join(", ")}, et al.`;
  }

  let components: string[] = [];

  components.push(`${formatChicagoAuthors(citation.authors)}. `);

  switch (citation.type) {
    case "Book":
      components.push(`<i>${citation.title}</i>. `);
      components.push(
        `${citation.city}: ${citation.journalName}, ${citation.publicationYear}.`
      );
      break;

    case "Journal Article":
      components.push(`"${citation.title}." `);
      components.push(`<i>${citation.journalName}</i> `);
      if (citation.volumeNumber) {
        components.push(`${citation.volumeNumber}`);
        if (citation.issueNumber) {
          components.push(`, no. ${citation.issueNumber}`);
        }
        components.push(` `);
      }
      components.push(`(${citation.publicationYear}): `);
      if (citation.startPage && citation.endPage) {
        components.push(`${citation.startPage}-${citation.endPage}.`);
      } else if (citation.startPage) {
        components.push(`${citation.startPage}.`);
      }
      if (citation.doi) {
        components.push(` https://doi.org/${citation.doi}`);
      } else if (citation.url) {
        components.push(` ${citation.url}`);
      }
      break;

    case "Book Chapter":
      components.push(`"${citation.title}." `);
      components.push(`In <i>${citation.secondName}</i>, `);
      if (citation.editors.length > 0) {
        components.push(
          `edited by ${formatChicagoAuthors(citation.editors)}, `
        );
      }
      if (citation.startPage && citation.endPage) {
        components.push(`${citation.startPage}-${citation.endPage}. `);
      }
      components.push(
        `${citation.city}: ${citation.journalName}, ${citation.publicationYear}.`
      );
      break;

    case "Conference Presentation":
      components.push(`"${citation.title}." `);
      components.push(
        `Paper presented at ${citation.journalName}, ${citation.city}, ${citation.publicationYear}.`
      );
      break;

    default:
      components.push(`"${citation.title}." `);
      components.push(
        `${citation.journalName}, ${citation.publicationYear}. `
      );
      if (citation.url) {
        components.push(`${citation.url}`);
      }
  }

  return components.join("");
}

export function formatHarvardCitation(citation: Citation): string {
  function formatHarvardAuthor(author: string): string {
    if (!author) return "";
    const parts = author.split(", ");
    if (parts.length < 2) return author;
    return `${parts[0]}, ${parts[1][0] || ""}.`;
  }

  function formatHarvardAuthors(authors: string[]): string {
    if (!authors || !Array.isArray(authors) || authors.length === 0)
      return "";
    if (authors.length === 1) return formatHarvardAuthor(authors[0]);
    if (authors.length === 2)
      return `${formatHarvardAuthor(authors[0])} and ${formatHarvardAuthor(authors[1])}`;
    if (authors.length === 3)
      return `${formatHarvardAuthor(authors[0])}, ${formatHarvardAuthor(authors[1])} and ${formatHarvardAuthor(authors[2])}`;
    return `${formatHarvardAuthor(authors[0])} et al.`;
  }

  let components: string[] = [];

  if (citation.authors && citation.authors.length > 0) {
    components.push(`${formatHarvardAuthors(citation.authors)}`);
  }

  components.push(`(${citation.publicationYear})`);

  switch (citation.type) {
    case "Book":
    case "Conference Proceedings":
      components.push(`<i>${citation.title}</i>,`);
      break;
    default:
      components.push(`'${citation.title}',`);
  }

  if (citation.journalName) {
    switch (citation.type) {
      case "Journal Article":
      case "Literature Review":
        components.push(`<i>${citation.journalName}</i>,`);
        break;
      case "Book Chapter":
        components.push(
          `in ${formatHarvardAuthors(citation.editors)} (ed.) <i>${citation.secondName}</i>,`
        );
        break;
      case "Conference Presentation":
        components.push(`${citation.journalName},`);
        break;
    }
  }

  if (
    citation.type === "Journal Article" ||
    citation.type === "Literature Review"
  ) {
    if (citation.volumeNumber) {
      components.push(`${citation.volumeNumber}(${citation.issueNumber}),`);
    }
    if (citation.startPage && citation.endPage) {
      components.push(`pp. ${citation.startPage}-${citation.endPage}.`);
    } else if (citation.startPage) {
      components.push(`p. ${citation.startPage}.`);
    }
  } else if (
    citation.type === "Book Chapter" &&
    citation.startPage &&
    citation.endPage
  ) {
    components.push(`pp. ${citation.startPage}-${citation.endPage}.`);
  }

  if (
    citation.type === "Book" ||
    citation.type === "Book Chapter"
  ) {
    components.push(`${citation.city}: ${citation.journalName}.`);
  }

  if (citation.url) {
    components.push(`Available at: ${citation.url}`);
    components.push(
      `(Accessed: ${new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })})`
    );
  }

  return components.join(" ");
}

export function formatIEEECitation(citation: Citation): string {
  function formatIEEEAuthors(authors: string[]): string {
    if (!authors || !Array.isArray(authors) || authors.length === 0)
      return "";

    if (authors.length > 3) {
      const firstAuthor = (authors[0] || "").split(", ");
      if (firstAuthor.length < 2) return "et al.";
      return `${(firstAuthor[1] || "")
        .split(" ")
        .map((n) => (n[0] || "") + ".")
        .join(" ")} ${firstAuthor[0]} et al.`;
    }

    return authors
      .map((author) => {
        if (!author) return "";
        const parts = author.split(", ");
        if (parts.length < 2) return author;
        return `${(parts[1] || "")
          .split(" ")
          .map((n) => (n[0] || "") + ".")
          .join(" ")} ${parts[0]}`;
      })
      .filter((a) => a)
      .join(", ");
  }

  let components: string[] = [];

  if (citation.authors && citation.authors.length > 0) {
    components.push(formatIEEEAuthors(citation.authors) + ",");
  }

  components.push(`"${citation.title},"`);

  switch (citation.type) {
    case "Journal Article":
    case "Literature Review":
      components.push(`<i>${citation.journalName}</i>,`);
      if (citation.volumeNumber) {
        components.push(`vol. ${citation.volumeNumber},`);
        if (citation.issueNumber) {
          components.push(`no. ${citation.issueNumber},`);
        }
      }
      if (citation.startPage && citation.endPage) {
        components.push(`pp. ${citation.startPage}-${citation.endPage},`);
      } else if (citation.startPage) {
        components.push(`p. ${citation.startPage},`);
      }
      break;
    case "Book":
      components.push(`<i>${citation.title}</i>,`);
      components.push(`${citation.city}: ${citation.journalName},`);
      break;
    case "Book Chapter":
      components.push(`in <i>${citation.secondName}</i>,`);
      if (citation.editors.length > 0) {
        components.push(`${formatIEEEAuthors(citation.editors)}, Ed.,`);
      }
      components.push(`${citation.city}: ${citation.journalName},`);
      if (citation.startPage && citation.endPage) {
        components.push(`pp. ${citation.startPage}-${citation.endPage},`);
      }
      break;
    case "Conference Presentation":
      components.push(`in <i>Proc. ${citation.journalName}</i>,`);
      if (citation.city) {
        components.push(`${citation.city},`);
      }
      break;
    case "Dissertation":
      components.push(`"${citation.title}," Ph.D. dissertation,`);
      components.push(`<i>${citation.journalName}</i>,`);
      if (citation.city) {
        components.push(`${citation.city},`);
      }
      break;
  }

  components.push(citation.publicationYear + ".");

  if (citation.doi) {
    components.push(`[Online]. Available: https://doi.org/${citation.doi}`);
  } else if (citation.url) {
    components.push(`[Online]. Available: ${citation.url}`);
  }

  return components.join(" ");
}

export function formatASACitation(citation: Citation): string {
  function formatASAAuthor(author: string): string {
    const parts = author.split(", ");
    const lastName = parts[0] || "";
    const firstName = parts[1] || "";
    return `${lastName}, ${firstName}`;
  }

  function formatASAAuthors(authors: string[]): string {
    if (authors.length === 0) return "";
    if (authors.length === 1) return formatASAAuthor(authors[0]);
    if (authors.length === 2) {
      return `${formatASAAuthor(authors[0])} and ${formatASAAuthor(authors[1])}`;
    }
    let authorsText = authors.slice(0, -1).map(formatASAAuthor).join(", ");
    return `${authorsText}, and ${formatASAAuthor(authors[authors.length - 1])}`;
  }

  let components: string[] = [];

  // 1. Authors
  if (citation.authors.length > 0) {
    components.push(formatASAAuthors(citation.authors) + ".");
  }

  // 2. Year
  components.push(citation.publicationYear + ".");

  // 3. Title with appropriate formatting based on type
  switch (citation.type) {
    case "Book":
      components.push(`<i>${citation.title}</i>.`);
      if (citation.city) {
        components.push(
          `${citation.city}${citation.journalName ? ":" : "."}`
        );
      }
      if (citation.journalName) {
        components.push(`${citation.journalName}.`);
      }
      break;

    case "Journal Article":
    case "Literature Review":
      components.push(`"${citation.title}."`);
      components.push(`<i>${citation.journalName}</i>`);
      if (citation.volumeNumber) {
        components.push(
          citation.issueNumber
            ? `${citation.volumeNumber}(${citation.issueNumber}):`
            : `${citation.volumeNumber}:`
        );
        if (citation.startPage && citation.endPage) {
          components.push(`${citation.startPage}-${citation.endPage}.`);
        } else if (citation.startPage) {
          components.push(`${citation.startPage}.`);
        }
      }
      break;

    case "Book Chapter":
      components.push(`"${citation.title}."`);
      components.push(`Pp. ${citation.startPage}-${citation.endPage} in`);
      components.push(`<i>${citation.secondName}</i>,`);
      if (citation.editors && citation.editors.length > 0) {
        components.push(`edited by ${formatASAAuthors(citation.editors)}.`);
      }
      if (citation.city) {
        components.push(`${citation.city}:`);
      }
      if (citation.journalName) {
        components.push(`${citation.journalName}.`);
      }
      break;

    case "Magazine Article":
      components.push(`"${citation.title}."`);
      components.push(`${citation.journalName},`);
      if (citation.startDate) {
        const date = new Date(citation.startDate);
        components.push(
          `${date.toLocaleString("default", { month: "long" })} ${citation.publicationYear},`
        );
      }
      if (citation.startPage && citation.endPage) {
        components.push(`pp. ${citation.startPage}-${citation.endPage}.`);
      }
      break;

    case "Gray Literature":
      components.push(`"${citation.title}."`);
      components.push(`${citation.journalName},`);
      if (citation.startDate) {
        const date = new Date(citation.startDate);
        components.push(
          `${date.toLocaleString("default", { month: "long" })} ${date.getDate()},`
        );
      }
      if (citation.startPage) {
        components.push(`p. ${citation.startPage}.`);
      }
      break;

    default:
      components.push(`"${citation.title}."`);
      if (citation.journalName) {
        components.push(`${citation.journalName}.`);
      }
  }

  // Add URL for electronic resources
  if (
    citation.url &&
    citation.type !== "Book" &&
    citation.type !== "Book Chapter"
  ) {
    const retrievedDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    components.push(`Retrieved ${retrievedDate} (${citation.url}).`);
  }

  // Add DOI if available
  if (citation.doi) {
    components.push(`doi:${citation.doi}`);
  }

  return components.join(" ");
}

export type CitationStyle = "APA" | "MLA" | "Chicago" | "Harvard" | "IEEE" | "ASA";

export const citationStyles = [
  { value: "APA", label: "APA" },
  { value: "MLA", label: "MLA" },
  { value: "Chicago", label: "Chicago" },
  { value: "Harvard", label: "Harvard" },
  { value: "IEEE", label: "IEEE" },
  { value: "ASA", label: "ASA" },
] as const;

export function formatCitation(literature: Literature, style: CitationStyle): string {
  const citation = literatureToCitation(literature);
  
  switch (style) {
    case "APA":
      return formatAPACitation(citation);
    case "MLA":
      return formatMLACitation(citation);
    case "Chicago":
      return formatChicagoCitation(citation);
    case "Harvard":
      return formatHarvardCitation(citation);
    case "IEEE":
      return formatIEEECitation(citation);
    case "ASA":
      return formatASACitation(citation);
    default:
      return formatAPACitation(citation);
  }
}

export function stripHtmlTags(html: string): string {
  if (!html) return "";
  
  return html
    // Replace common HTML elements with appropriate spacing
    .replace(/<br\s*\/?>/gi, '\n')           // Line breaks
    .replace(/<\/p>/gi, '\n\n')              // Paragraph ends
    .replace(/<p[^>]*>/gi, '')               // Paragraph starts
    .replace(/<\/div>/gi, '\n')              // Div ends
    .replace(/<div[^>]*>/gi, '')             // Div starts
    .replace(/<\/li>/gi, '\n')               // List item ends
    .replace(/<li[^>]*>/gi, '• ')            // List item starts
    .replace(/<[^>]*>/g, "")                 // All other HTML tags
    .replace(/&nbsp;/g, ' ')                 // Non-breaking spaces
    .replace(/&amp;/g, '&')                  // HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')       // Multiple line breaks to double
    .trim();
}