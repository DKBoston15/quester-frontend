
  import { api, streamRequest } from "../services/api-client";

  export interface DesignAlignmentScore {
    researchDesign: number;
    samplingDesign: number;
    measurementDesign: number;
    analyticDesign: number;
  }

  export interface LanguageConsistencyMetrics {
    synonymGroups: { terms: string[]; suggestion: string }[];
    inconsistencies: string[];
    overallScore: number;
  }

  export type ResearchQuestionStatus = "draft" | "active" | "archived";

  export interface ResearchQuestion {
    id: string;
    projectId: string;
    userId: string;
    question: string;
    description: string;
    parentQuestionId: string | null;
    subQuestions?: ResearchQuestion[];
    designAlignmentScore: DesignAlignmentScore | null;
    connectedLiteratureIds: string[];
    languageConsistencyMetrics: LanguageConsistencyMetrics | null;
    status: ResearchQuestionStatus;
    metadata: Record<string, any>;
    version: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  }

  export interface GroupedQuestionsResponse {
    topLevel: ResearchQuestion[];
    all: ResearchQuestion[];
  }

  export interface ResearchQuestionVersion {
    id: string;
    researchQuestionId: string;
    question: string;
    description: string;
    designAlignmentScore: DesignAlignmentScore | null;
    connectedLiteratureIds: string[];
    languageConsistencyMetrics: LanguageConsistencyMetrics | null;
    metadata: Record<string, any>;
    version: number;
    createdAt: string;
  }

  export interface CreateResearchQuestionData {
    question: string;
    description?: string;
    status?: ResearchQuestionStatus;
    parentQuestionId?: string;
  }

  export interface UpdateResearchQuestionData {
    question?: string;
    description?: string;
    status?: ResearchQuestionStatus;
  }

  export interface StreamingAnalysisResult {
    content: string;
    isComplete: boolean;
  }

  let questions = $state<ResearchQuestion[]>([]);
  let topLevelQuestions = $state<ResearchQuestion[]>([]);
  let allQuestions = $state<ResearchQuestion[]>([]);
  let selectedQuestion = $state<ResearchQuestion | null>(null);
  let versions = $state<ResearchQuestionVersion[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let streamingAnalysis = $state<StreamingAnalysisResult | null>(null);
  let loadedProjectId = $state<string | null>(null);

  let abortController: AbortController | null = null;

  function cancelStreaming() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  async function processStream(response: Response): Promise<string> {
    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";

    streamingAnalysis = { content: "", isComplete: false };

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          streamingAnalysis = { content: accumulated, isComplete: true };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const content = line.slice(6);
          if (content === "[DONE]") {
            streamingAnalysis = { content: accumulated, isComplete: true };
            return accumulated;
          }

          try {
            const parsed = JSON.parse(content);
            if (parsed.text) {
              accumulated += parsed.text;
              streamingAnalysis = { content: accumulated, isComplete: false };
            } else if (parsed.content) {
              accumulated += parsed.content;
              streamingAnalysis = { content: accumulated, isComplete: false };
            } else if (typeof parsed === "string") {
              accumulated += parsed;
              streamingAnalysis = { content: accumulated, isComplete: false };
            }
          } catch {
            // Non-JSON data, treat as raw text
            if (content) {
              accumulated += content;
              streamingAnalysis = { content: accumulated, isComplete: false };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return accumulated;
  }

  function updateQuestionInLists(id: string, updater: (q: ResearchQuestion) => ResearchQuestion) {
    questions = questions.map((q) => (q.id === id ? updater(q) : q));
    allQuestions = allQuestions.map((q) => (q.id === id ? updater(q) : q));
    topLevelQuestions = topLevelQuestions.map((q) => {
      if (q.id === id) return updater(q);
      if (q.subQuestions?.some((sq) => sq.id === id)) {
        return { ...q, subQuestions: q.subQuestions.map((sq) => (sq.id === id ? updater(sq) : sq)) };
      }
      return q;
    });
  }

  export const researchQuestionsStore = {
    get questions() {
      return questions;
    },
    get topLevelQuestions() {
      return topLevelQuestions;
    },
    get allQuestions() {
      return allQuestions;
    },
    get selectedQuestion() {
      return selectedQuestion;
    },
    get versions() {
      return versions;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    get streamingAnalysis() {
      return streamingAnalysis;
    },
    get loadedProjectId() {
      return loadedProjectId;
    },

    setSelectedQuestion(question: ResearchQuestion | null) {
      selectedQuestion = question;
    },

    async loadQuestions(projectId: string, force = false) {
      if (!projectId) {
        error = "No project ID provided";
        return;
      }

      if (!force && loadedProjectId === projectId && !error) {
        return;
      }

      isLoading = true;
      error = null;

      try {
        const data = await api.get<GroupedQuestionsResponse | ResearchQuestion[]>(
          `/projects/${projectId}/research-questions`,
        );

        if (Array.isArray(data)) {
          // Flat array response (legacy)
          allQuestions = data;
          topLevelQuestions = data.filter((q) => !q.parentQuestionId);
          questions = data;
        } else {
          // Grouped response with hierarchy
          topLevelQuestions = data.topLevel;
          allQuestions = data.all;
          questions = data.all;
        }

        loadedProjectId = projectId;
      } catch (err) {
        console.error("Error loading research questions:", err);
        error = err instanceof Error ? err.message : "Failed to load research questions";
        questions = [];
        topLevelQuestions = [];
        allQuestions = [];
        loadedProjectId = null;
      } finally {
        isLoading = false;
      }
    },

    async createQuestion(projectId: string, data: CreateResearchQuestionData) {
      if (!projectId) {
        error = "No project ID provided";
        return;
      }

      isLoading = true;
      error = null;

      try {
        const newQuestion = await api.post<ResearchQuestion>(
          `/projects/${projectId}/research-questions`,
          data,
        );
        questions = [newQuestion, ...questions];
        allQuestions = [newQuestion, ...allQuestions];
        if (!newQuestion.parentQuestionId) {
          topLevelQuestions = [newQuestion, ...topLevelQuestions];
        } else {
          // Add sub-question to parent's subQuestions array
          topLevelQuestions = topLevelQuestions.map((q) =>
            q.id === newQuestion.parentQuestionId
              ? { ...q, subQuestions: [...(q.subQuestions ?? []), newQuestion] }
              : q,
          );
        }
        selectedQuestion = newQuestion;
        return newQuestion;
      } catch (err) {
        console.error("Error creating research question:", err);
        error = err instanceof Error ? err.message : "Failed to create research question";
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async createSubQuestion(parentId: string, data: Omit<CreateResearchQuestionData, "parentQuestionId">) {
      const parentQuestion = allQuestions.find((q) => q.id === parentId);
      if (!parentQuestion) {
        error = "Parent question not found";
        return;
      }

      return this.createQuestion(parentQuestion.projectId, {
        ...data,
        parentQuestionId: parentId,
      });
    },

    async updateQuestion(id: string, data: UpdateResearchQuestionData) {
      isLoading = true;
      error = null;

      try {
        const updated = await api.put<ResearchQuestion>(
          `/research-questions/${id}`,
          data,
        );
        updateQuestionInLists(id, () => updated);
        if (selectedQuestion?.id === id) {
          selectedQuestion = updated;
        }
        return updated;
      } catch (err) {
        console.error("Error updating research question:", err);
        error = err instanceof Error ? err.message : "Failed to update research question";
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async deleteQuestion(id: string) {
      isLoading = true;
      error = null;

      try {
        await api.delete(`/research-questions/${id}`);
        questions = questions.filter((q) => q.id !== id);
        allQuestions = allQuestions.filter((q) => q.id !== id);
        topLevelQuestions = topLevelQuestions
          .filter((q) => q.id !== id)
          .map((q) => {
            if (q.subQuestions?.some((sq) => sq.id === id)) {
              return { ...q, subQuestions: q.subQuestions.filter((sq) => sq.id !== id) };
            }
            return q;
          });
        if (selectedQuestion?.id === id) {
          selectedQuestion = null;
        }
      } catch (err) {
        console.error("Error deleting research question:", err);
        error = err instanceof Error ? err.message : "Failed to delete research question";
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async loadVersionHistory(questionId: string) {
      isLoading = true;
      error = null;

      try {
        const data = await api.get<ResearchQuestionVersion[]>(
          `/research-questions/${questionId}/versions`,
        );
        versions = data;
      } catch (err) {
        console.error("Error loading version history:", err);
        error = err instanceof Error ? err.message : "Failed to load version history";
        versions = [];
      } finally {
        isLoading = false;
      }
    },

    async analyzeAlignment(questionId: string) {
      isLoading = true;
      error = null;

      try {
        const data = await api.post<{ alignmentScores: DesignAlignmentScore; question: ResearchQuestion }>(`/research-questions/${questionId}/analyze-alignment`);
        const updatedQuestion = data.question;

        if (selectedQuestion?.id === questionId) {
          selectedQuestion = { ...selectedQuestion, ...updatedQuestion };
        }
        updateQuestionInLists(questionId, (q) => ({ ...q, ...updatedQuestion }));
      } catch (err) {
        console.error("Error analyzing alignment:", err);
        error = err instanceof Error ? err.message : "Failed to analyze alignment";
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async analyzePurposeAlignment(questionId: string) {
      isLoading = true;
      error = null;

      try {
        const data = await api.post<{ purposeAlignment: any; question: ResearchQuestion }>(
          `/research-questions/${questionId}/analyze-purpose-alignment`,
        );
        const updatedQuestion = data.question;

        if (selectedQuestion?.id === questionId) {
          selectedQuestion = { ...selectedQuestion, ...updatedQuestion };
        }
        updateQuestionInLists(questionId, (q) => ({ ...q, ...updatedQuestion }));
        return data.purposeAlignment;
      } catch (err) {
        console.error("Error analyzing purpose alignment:", err);
        error = err instanceof Error ? err.message : "Failed to analyze purpose alignment";
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async analyzeCoherence(questionId: string) {
      isLoading = true;
      error = null;

      try {
        const data = await api.post<{ coherence: any; question: ResearchQuestion }>(
          `/research-questions/${questionId}/analyze-coherence`,
        );
        const updatedQuestion = data.question;

        if (selectedQuestion?.id === questionId) {
          selectedQuestion = { ...selectedQuestion, ...updatedQuestion };
        }
        updateQuestionInLists(questionId, (q) => ({ ...q, ...updatedQuestion }));
        return data.coherence;
      } catch (err) {
        console.error("Error analyzing coherence:", err);
        error = err instanceof Error ? err.message : "Failed to analyze coherence";
        throw err;
      } finally {
        isLoading = false;
      }
    },

    async analyzeConsistency(projectId: string) {
      if (!projectId) {
        error = "No project ID provided";
        return;
      }

      cancelStreaming();
      isLoading = true;
      error = null;
      streamingAnalysis = null;
      abortController = new AbortController();

      try {
        const response = await streamRequest(
          `/projects/${projectId}/research-questions/analyze-consistency`,
          {
            method: "POST",
            signal: abortController.signal,
            timeout: 120_000,
          },
        );

        const result = await processStream(response);
        return result;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Error analyzing consistency:", err);
        error = err instanceof Error ? err.message : "Failed to analyze consistency";
        throw err;
      } finally {
        isLoading = false;
        abortController = null;
      }
    },

    async suggestQuestions(projectId: string): Promise<Array<{ question: string; rationale: string }>> {
      const data = await api.post<{ suggestions: Array<{ question: string; rationale: string }> }>(
        `/projects/${projectId}/research-questions/suggest`,
      );
      return data.suggestions;
    },

    cancelAnalysis() {
      cancelStreaming();
      streamingAnalysis = null;
    },

    reset() {
      cancelStreaming();
      questions = [];
      topLevelQuestions = [];
      allQuestions = [];
      selectedQuestion = null;
      versions = [];
      isLoading = false;
      error = null;
      streamingAnalysis = null;
      loadedProjectId = null;
    },
  };
