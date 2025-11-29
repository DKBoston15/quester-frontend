<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Select from "$lib/components/ui/select";
  import { Copy, CopyCheck } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import type { Literature } from "$lib/types/literature";
  import { _ } from "svelte-i18n";
  import { get } from "svelte/store";

  // Helper for imperative translation access
  const t = (key: string, options?: { values?: Record<string, unknown> }) => get(_)(key, options);

  const { literature } = $props<{ literature: Literature }>();

  const citationStyles = [
    { value: "APA", label: $_("citationFormats.apa") },
    { value: "MLA", label: $_("citationFormats.mla") },
    { value: "Chicago", label: $_("citationFormats.chicago") },
    { value: "Harvard", label: $_("citationFormats.harvard") },
    { value: "IEEE", label: $_("citationFormats.ieee") },
    { value: "ASA", label: $_("citationFormats.asa") },
  ];

  let citationStyle = $state(citationStyles[0]);
  let hasCopied = $state(false);

  type APAJournalCitation = {
    authors: string[];
    editors: string[];
    publicationYear: string;
    title: string;
    secondName: string;
    chapterTitle: string;
    journalName: string;
    volumeNumber: string;
    issueNumber?: string;
    startPage: string;
    endPage: string;
    pageRange?: string;
    startDate: string;
    endDate: string;
    type: { label: string; value: string };
    doi?: string;
    url?: string;
    city: string;
  };

  let citation = $state<APAJournalCitation>({
    authors: [],
    editors: [],
    publicationYear: "",
    title: "",
    secondName: "",
    chapterTitle: "",
    journalName: "",
    volumeNumber: "",
    issueNumber: "",
    startPage: "",
    endPage: "",
    startDate: "",
    endDate: "",
    city: "",
    url: "",
    type: { label: "", value: "" },
  });

  $effect(() => {
    citation = {
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
      publicationYear: literature?.publishYear ?? t("reference.noDate"),
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
      chapterTitle: literature?.chapterTitle ?? "",
      url: literature?.link ?? "",
      type:
        typeof literature?.type === "string"
          ? { label: literature.type, value: literature.type }
          : (literature?.type ?? { label: "", value: "" }),
    };
  });

  function formatAuthorName(author: string) {
    if (author) {
      const parts = author.split(", ");
      const lastName = parts[0] || "";
      const firstName = parts[1] || "";

      if (!firstName || firstName.trim() === "") {
        return lastName;
      }

      const formattedInitials = firstName
        .trim()
        .split(" ")
        .filter((name) => name.length > 0)
        .map((initial) => `${initial.charAt(0)}.`)
        .join(" ");
      return `${lastName}, ${formattedInitials}`;
    }
    return "";
  }

  function formatEditorName(editor: string) {
    if (editor) {
      const parts = editor.split(", ");
      const lastName = parts[0] || "";
      const firstName = parts[1] || "";

      if (!firstName || firstName.trim() === "") {
        return lastName;
      }

      const formattedInitials = firstName
        .trim()
        .split(" ")
        .filter((name) => name.length > 0)
        .map((initial) => `${initial.charAt(0)}.`)
        .join(" ");
      return `${formattedInitials} ${lastName}`;
    }
    return "";
  }

  function formatAPACitation(citation: APAJournalCitation): string {
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

    // If Book with editors but no authors, use editors as author-equivalent (APA)
    const isBookType = citation.type.value === "Book";
    const hasNoAuthors = !citation.authors || citation.authors.length === 0;
    const hasEditors = citation.editors && citation.editors.length > 0;

    if (isBookType && hasNoAuthors && hasEditors) {
      if (citation.editors.length === 1) {
        formattedAuthors = `${formatEditorName(citation.editors[0])} (Ed.)`;
      } else {
        const editorsList = citation.editors
          .slice(0, -1)
          .map(formatEditorName)
          .join(", ");
        const lastEditor = formatEditorName(
          citation.editors[citation.editors.length - 1]
        );
        formattedAuthors = `${editorsList}, & ${lastEditor} (Eds.)`;
      }
    }

    let formattedDate = citation.publicationYear
      ? `(${citation.publicationYear}).`
      : `(${t("reference.noDate")}).`;

    let formattedTitle;
    if (citation.type.value === "Book") {
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

    if (citation.type.value === "Book Chapter") {
      // For book chapters, citation.chapterTitle contains the chapter title and citation.title contains book title
      formattedChapterTitle = `${citation.chapterTitle || ""}.`; // Chapter title comes from chapterTitle field

      let formattedEditors = "";
      if (citation.editors && citation.editors.length > 0) {
        if (citation.editors.length === 1) {
          formattedEditors = `${formatEditorName(citation.editors[0])} (Ed.),`;
        } else if (citation.editors.length === 2) {
          formattedEditors = `${formatEditorName(citation.editors[0])} & ${formatEditorName(citation.editors[1])} (Eds.),`;
        } else {
          // For 3 or more editors
          const formattedEditorsList = citation.editors
            .slice(0, -1)
            .map(formatEditorName)
            .join(", ");
          const lastEditor = formatEditorName(
            citation.editors[citation.editors.length - 1]
          );
          formattedEditors = `${formattedEditorsList}, & ${lastEditor} (Eds.),`;
        }
      }

      let formattedBookTitle = `<i>${citation.title}</i>`; // Book title
      let pageRange =
        citation.startPage && citation.endPage
          ? `(pp. ${citation.startPage}–${citation.endPage})`
          : citation.startPage
            ? `(p. ${citation.startPage})`
            : "";
      let publisher = citation.journalName;

      citationComponents.push(
        `In ${formattedEditors} ${formattedBookTitle} ${pageRange}. ${publisher}.`
      );
    } else if (citation.type.value === "Conference Presentation") {
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
        if (citation.type.value === "Book") {
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
        if (citation.type.value !== "Book") {
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
      let urlWithPeriod = `<a class="underline break-words" href="${citation.url}" target="_blank">${citation.url}</a>`;
      citationComponents.push(urlWithPeriod);
    }

    if (citation.type.value === "Conference Presentation") {
      formattedDate = `(${conferenceYear}).`;
    }

    let formattedCitation = [
      formattedAuthors,
      formattedDate,
      citation.type.value === "Book Chapter"
        ? formattedChapterTitle
        : formattedTitle,
      ...citationComponents,
    ].join(" ");

    return formattedCitation;
  }

  function formatMLACitation(citation: APAJournalCitation): string {
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

    // Authors or editors for Book when no authors
    if (citation.authors.length > 0) {
      components.push(formatMLAAuthors(citation.authors));
    } else if (citation.type.value === "Book" && citation.editors.length > 0) {
      // For editor-only books, MLA places editors after title; we also show here if no authors
      // We'll add the explicit 'edited by' later after title to match MLA
    }

    // Title
    switch (citation.type.value) {
      case "Book":
      case "Conference Proceedings":
        components.push(`<i>${capitalizeTitle(citation.title)}.</i>`);
        break;
      default:
        components.push(`"${capitalizeTitle(citation.title)}."`);
    }

    // Container (Journal name, Book title for chapters, Conference name, etc.)
    if (citation.journalName) {
      switch (citation.type.value) {
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
    switch (citation.type.value) {
      case "Book Chapter":
        if (citation.editors && citation.editors.length > 0) {
          components.push(`edited by ${formatMLAAuthors(citation.editors)},`);
        }
        break;
      case "Book":
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
      (citation.type.value === "Journal Article" ||
        citation.type.value === "Other") &&
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
      (citation.type.value === "Journal Article" ||
        citation.type.value === "Book Chapter" ||
        citation.type.value === "Other") &&
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

  function formatChicagoCitation(citation: APAJournalCitation): string {
    function formatChicagoAuthor(author: string): string {
      const parts = author.split(", ");
      const lastName = parts[0] || "";
      const firstName = (parts[1] || "").replace(/\.$/, ""); // Remove trailing period if present
      return firstName ? `${lastName}, ${firstName}` : lastName;
    }

    function formatChicagoAuthors(authors: string[]): string {
      if (authors.length === 0) return "";
      if (authors.length === 1) return formatChicagoAuthor(authors[0]);
      if (authors.length <= 10)
        return authors.map(formatChicagoAuthor).join(", ");
      return `${authors.slice(0, 7).map(formatChicagoAuthor).join(", ")}, et al.`;
    }

    let components: string[] = [];

    // Use authors if present; otherwise, for Books with editors only, use editors with ed./eds.
    if (citation.authors && citation.authors.length > 0) {
      components.push(`${formatChicagoAuthors(citation.authors)}. `);
    } else if (citation.type.value === "Book" && citation.editors && citation.editors.length > 0) {
      const edLabel = citation.editors.length > 1 ? "eds." : "ed.";
      components.push(`${formatChicagoAuthors(citation.editors)}, ${edLabel}. `);
    }

    switch (citation.type.value) {
    case "Book":
      components.push(`<i>${citation.title}</i>. `);
      if (citation.editors && citation.editors.length > 0 && citation.authors && citation.authors.length > 0) {
        components.push(`Edited by ${formatChicagoAuthors(citation.editors)}. `);
      }
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

  function formatHarvardCitation(citation: APAJournalCitation): string {
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
    } else if (citation.type.value === "Book" && citation.editors && citation.editors.length > 0) {
      const edLabel = citation.editors.length > 1 ? "(eds.)" : "(ed.)";
      components.push(`${formatHarvardAuthors(citation.editors)} ${edLabel}`);
    }

    components.push(`(${citation.publicationYear})`);

    switch (citation.type.value) {
      case "Book":
      case "Conference Proceedings":
        components.push(`<i>${citation.title}</i>,`);
        if (citation.type.value === "Book" && citation.editors && citation.editors.length > 0) {
          const edLabel = citation.editors.length > 1 ? "(eds.)," : "(ed.),";
          components.push(`${formatHarvardAuthors(citation.editors)} ${edLabel}`);
        }
        break;
      default:
        components.push(`'${citation.title}',`);
    }

    if (citation.journalName) {
      switch (citation.type.value) {
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
      citation.type.value === "Journal Article" ||
      citation.type.value === "Literature Review"
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
      citation.type.value === "Book Chapter" &&
      citation.startPage &&
      citation.endPage
    ) {
      components.push(`pp. ${citation.startPage}-${citation.endPage}.`);
    }

    if (
      citation.type.value === "Book" ||
      citation.type.value === "Book Chapter"
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

  function formatIEEECitation(citation: APAJournalCitation): string {
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
    } else if (citation.type.value === "Book" && citation.editors && citation.editors.length > 0) {
      components.push(formatIEEEAuthors(citation.editors) + ", Ed.,");
    }

    components.push(`"${citation.title},"`);

    switch (citation.type.value) {
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

  function formatASACitation(citation: APAJournalCitation): string {
    function formatASAAuthor(author: string): string {
      const parts = author.split(", ");
      const lastName = parts[0] || "";
      const firstName = (parts[1] || "").replace(/\.$/, ""); // Remove trailing period if present
      return firstName ? `${lastName}, ${firstName}` : lastName;
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
    } else if (citation.type.value === "Book" && citation.editors && citation.editors.length > 0) {
      const edLabel = citation.editors.length > 1 ? "eds." : "ed.";
      components.push(`${formatASAAuthors(citation.editors)}, ${edLabel}.`);
    }

    // 2. Year
    components.push(citation.publicationYear + ".");

    // 3. Title with appropriate formatting based on type
    switch (citation.type.value) {
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
      citation.type.value !== "Book" &&
      citation.type.value !== "Book Chapter"
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

  let formattedCitation = $state("");

  $effect(() => {
    switch (citationStyle.value) {
      case "APA":
        formattedCitation = formatAPACitation(citation);
        break;
      case "MLA":
        formattedCitation = formatMLACitation(citation);
        break;
      case "Chicago":
        formattedCitation = formatChicagoCitation(citation);
        break;
      case "Harvard":
        formattedCitation = formatHarvardCitation(citation);
        break;
      case "IEEE":
        formattedCitation = formatIEEECitation(citation);
        break;
      case "ASA":
        formattedCitation = formatASACitation(citation);
        break;
      default:
        formattedCitation = formatAPACitation(citation);
        break;
    }
  });

  async function copyToClipboard() {
    try {
      const textToCopy = formattedCitation.replace(/<[^>]*>/g, "");
      await navigator.clipboard.writeText(textToCopy);
      hasCopied = true;
      setTimeout(() => {
        hasCopied = false;
      }, 2000);
      toast.success($_("reference.copiedSuccess"));
    } catch (err) {
      toast.error($_("reference.copyFailed"));
    }
  }
</script>

<Card.Root
  class="border-2  dark:border-dark-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(44,46,51,0.1)]"
>
  <Card.Header>
    <Card.Title class="flex items-center justify-between">
      <span>{$_("reference.heading")}</span>
      <div class="flex items-center gap-2">
        <Select.Root
          type="single"
          value={citationStyle.value}
          onValueChange={(value) => {
            const newStyle = citationStyles.find(
              (style) => style.value === value
            );
            if (newStyle) {
              citationStyle = newStyle;
            }
          }}
        >
          <Select.Trigger id="lit-ref-style-selector" class="w-[180px]">
            <span>{citationStyle.label}</span>
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              {#each citationStyles as style}
                <Select.Item value={style.value}>
                  {style.label}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
        <Button
          variant="outline"
          id="lit-ref-copy-button"
          size="icon"
          onclick={copyToClipboard}
          class="h-8 w-8"
        >
          {#if hasCopied}
            <CopyCheck class="h-4 w-4" />
          {:else}
            <Copy class="h-4 w-4" />
          {/if}
        </Button>
      </div>
    </Card.Title>
  </Card.Header>

  <Card.Content>
    <div class="space-y-4">
      <div id="lit-ref-text" class="prose dark:prose-invert max-w-none break-words">
        {@html formattedCitation}
      </div>
    </div>
  </Card.Content>
</Card.Root>
