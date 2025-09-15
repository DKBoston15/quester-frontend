import { projectStore } from "$lib/stores/ProjectStore";
import { literatureStore } from "$lib/stores/LiteratureStore";
import { notesStore } from "$lib/stores/NotesStore";

export const groupColorMap = {
  1: "#006eff",
  2: "#0d52f5",
  3: "#8b00ff",
  4: "#f8f408",
  5: "#e4e118",
  6: "#b81312",
  7: "#ed0a0b",
  8: "#04FF00",
  9: "#ff8000",
  10: "#6F4A95",
  11: "#8B4513", // Color for models
  12: "#708090", // Color for project
};

const getNodeSize = (group: string) => {
  switch (group) {
    case "keyword":
      return 5;
    case "publisher":
      return 3;
    case "literature":
      return 1;
    case "year":
      return 5;
    case "authors":
      return 1;
    case "analytic_design":
      return 2;
    case "research_design":
      return 2;
    case "sampling_design":
      return 2;
    case "measurement_design":
      return 2;
    case "type":
      return 1;
    case "note":
      return 2;
    case "tag":
      return 2;
    case "model":
      return 3;
    case "project":
      return 4;
    default:
      return 10;
  }
};

function stripHtmlTags(content: string) {
  if (content) {
    return content.replace(/<[^>]*>/g, "");
  }
  return content;
}

async function retrieveGraphData(urlProjectId: string) {
  // Check if data is already loaded in stores
  const storesLoaded = {
    project:
      projectStore.currentProject &&
      projectStore.currentProject.id === urlProjectId,
    // Ensure literature and notes are loaded for this specific project
    literature:
      literatureStore.loadedProjectId === urlProjectId,
    notes:
      notesStore.loadedProjectId === urlProjectId,
  };

  // Load any missing data from stores
  const loadPromises = [];

  if (!storesLoaded.project) {
    loadPromises.push(projectStore.loadProject(urlProjectId));
  }

  if (!storesLoaded.literature) {
    loadPromises.push(literatureStore.loadLiterature(urlProjectId));
  }

  if (!storesLoaded.notes) {
    loadPromises.push(notesStore.loadNotes(urlProjectId));
  }

  // Comment out model fetching
  /* 
  // Fetch models directly since they don't appear to have a dedicated store
  const fetchModels = async () => {
    const response = await fetch(`${API_URL}/model/project/${urlProjectId}`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  loadPromises.push(fetchModels());
  */

  try {
    // Wait for all data to be loaded
    await Promise.all(loadPromises);

    // Get literature and notes from the stores
    const literatureRecords = literatureStore.data;
    const noteRecords = notesStore.notes;

    // Comment out model records
    const modelRecords: any[] = []; // Empty array as placeholder

    // Return or process the data as needed
    return {
      literatureRecords,
      noteRecords,
      modelRecords,
      // Removed tag-related records
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

export async function createGraphData(urlProjectId: string) {
  const { literatureRecords, noteRecords } = await retrieveGraphData(
    urlProjectId
  );

  const nodes: Array<{
    id: string;
    group: number;
    icon: string;
    val: number;
    createdAt: string;
  }> = [];
  const links: Array<{ source: string; target: string; value: number }> = [];

  const addNode = (
    id: string,
    group: number,
    icon: string,
    val: number,
    createdAt: string
  ) => {
    if (!nodes.find((node) => node.id === id)) {
      nodes.push({ id, group, icon, val, createdAt });
    }
  };

  const addLink = (source: string, target: string, value: number) => {
    if (
      nodes.find((node) => node.id === source) &&
      nodes.find((node) => node.id === target)
    ) {
      links.push({ source, target, value });
    }
  };

  literatureRecords.forEach((literature) => {
    addNode(
      literature.name,
      3,
      "literature",
      getNodeSize("literature"),
      literature.createdAt || ""
    );

    if (literature.authors) {
      // Convert authors to array if it's a string
      const authorsList =
        typeof literature.authors === "string"
          ? JSON.parse(literature.authors)
          : literature.authors;

      if (Array.isArray(authorsList)) {
        authorsList.forEach((author: string) => {
          addNode(
            author,
            5,
            "authors",
            getNodeSize("authors"),
            literature.createdAt || ""
          );
          addLink(literature.name, author, 1);
        });
      }
    }

    if (literature.keywords) {
      // Convert keywords to array if it's a string
      const keywordsList =
        typeof literature.keywords === "string"
          ? JSON.parse(literature.keywords)
          : literature.keywords;

      if (Array.isArray(keywordsList)) {
        keywordsList.forEach((keyword: string) => {
          addNode(
            keyword,
            1,
            "keyword",
            getNodeSize("keyword"),
            literature.createdAt || ""
          );
          addLink(literature.name, keyword, 1);
        });
      }
    }

    if (literature.type) {
      // Handle type as string since that's what the Literature interface defines
      addNode(
        literature.type,
        8,
        "type",
        getNodeSize("type"),
        literature.createdAt || ""
      );
      addLink(literature.name, literature.type, 1);
    }

    if (literature.publishYear) {
      addNode(
        literature.publishYear,
        4,
        "year",
        getNodeSize("year"),
        literature.createdAt || ""
      );
      addLink(literature.name, literature.publishYear, 1);
    }

    if (literature.publisherName) {
      addNode(
        literature.publisherName,
        2,
        "publisher",
        getNodeSize("publisher"),
        literature.createdAt || ""
      );
      addLink(literature.name, literature.publisherName, 1);
    }

    if (literature.researchDesign) {
      addNode(
        literature.researchDesign,
        6,
        "research_design",
        getNodeSize("research_design"),
        literature.createdAt || ""
      );
      addLink(literature.name, literature.researchDesign, 1);
    }

    if (literature.analyticDesign) {
      addNode(
        literature.analyticDesign,
        7,
        "analytic_design",
        getNodeSize("analytic_design"),
        literature.createdAt || ""
      );
      addLink(literature.name, literature.analyticDesign, 1);
    }

    if (literature.samplingDesign) {
      addNode(
        literature.samplingDesign,
        7,
        "sampling_design",
        getNodeSize("sampling_design"),
        literature.createdAt || ""
      );
      addLink(literature.name, literature.samplingDesign, 1);
    }

    if (literature.measurementDesign) {
      addNode(
        literature.measurementDesign,
        7,
        "measurement_design",
        getNodeSize("measurement_design"),
        literature.createdAt || ""
      );
      addLink(literature.name, literature.measurementDesign, 1);
    }
  });

  const getNodeLabel = (note: any) => {
    if (note.name && note.name !== note.content) {
      return stripHtmlTags(note.name);
    }

    if (note.content) {
      return `${stripHtmlTags(note.content).slice(0, 24)}...`;
    }

    return "Untitled Note";
  };

  noteRecords.forEach((note) => {
    const noteLabel = getNodeLabel(note);
    addNode(
      noteLabel,
      9,
      "note",
      getNodeSize("note"),
      note.created_at || note.createdAt || ""
    );

    if (note.literatureId) {
      const literature = literatureRecords.find(
        (lit) => lit.id === note.literatureId
      );
      if (literature) {
        addLink(noteLabel, literature.name, 1);
      }
    }
  });

  // Comment out model processing
  /*
  modelRecords.forEach((model) => {
    addNode(model.name, 11, "model", getNodeSize("model"), model.created || "");
  });
  */

  return { nodes, links };
}

export const nodeIcons = {
  keyword: `/keyword.png`,
  literature: `/literature.png`,
  publisher: `/publisher.png`,
  authors: `/author.png`,
  year: `/year.png`,
  research_design: `/research_design.png`,
  sampling_design: `/sampling_design.png`,
  measurement_design: `/measurement_design.png`,
  analytic_design: `/analytic_design.png`,
  model: `/model.png`,
  type: `/type.png`,
  note: `/note.png`,
};

export const typeMap = {
  keyword: "Keyword",
  publisher: "Publisher",
  authors: "Authors",
  year: "Year",
  research_design: "Research Design",
  sampling_design: "Sampling Design",
  measurement_design: "Measurement Design",
  analytic_design: "Analytic Design",
  model: "Model",
  type: "Type",
  note: "Note",
};

export const nodeTypes = [
  "keyword",
  "publisher",
  "authors",
  "year",
  "research_design",
  "sampling_design",
  "measurement_design",
  "analytic_design",
  "model",
  "type",
  "note",
];

export const colorCheckboxMap = {
  keyword: "var(--color-blue)",
  publisher: "var(--color-blue)",
  authors: "var(--color-yellow)",
  year: "var(--color-yellow)",
  research_design: "var(--color-red)",
  sampling_design: "var(--color-red)",
  measurement_design: "var(--color-red)",
  analytic_design: "var(--color-red)",
  model: "var(--color-red)",
  type: "var(--color-green)",
  note: "var(--color-orange)",
};
