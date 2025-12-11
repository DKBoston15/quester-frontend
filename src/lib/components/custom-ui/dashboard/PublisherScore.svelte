<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import { projectStore } from "$lib/stores/ProjectStore";
  import { literatureStore } from "$lib/stores/LiteratureStore";
  import type { Literature } from "$lib/types/literature";
  import _ from "lodash";
  import { _ as t } from "svelte-i18n";

  interface Article {
    type: string;
    authors: string[];
    name: string;
    publish_year: number;
    publisher_name?: string;
  }

  interface PublisherScores {
    journalAndReviewScores: Record<string, string>;
    conferenceProceedingsScores: Record<string, string>;
    publisherDetails: {
      journalAndReview: Record<
        string,
        { cumulativeScore: number; articleScores: number[] }
      >;
      conferenceProceedings: Record<
        string,
        { cumulativeScore: number; articleScores: number[] }
      >;
    };
  }

  const dialog = $state(false);
  let scores = $state<PublisherScores | null>(null);

  // Load literature data when project changes
  $effect(() => {
    const projectId = projectStore.currentProject?.id;
    if (projectId) {
      literatureStore.loadLiterature(projectId);
    }
  });

  $effect(() => {
    if (literatureStore.data) {
      const articles = literatureStore.data.map((lit: Literature) => ({
        type: lit.type,
        authors: Array.isArray(lit.authors) ? lit.authors : [],
        name: lit.name || "",
        publish_year: new Date(lit.createdAt || Date.now()).getFullYear(),
        publisher_name: lit.publisherName
          ? lit.publisherName
              .split(" ")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join(" ")
          : "Unknown Publisher",
      }));
      scores = scorePublishers(articles);
    }
  });

  function scorePublishers(articles: Article[]): PublisherScores {
    const currentYear = new Date().getFullYear();
    const authorCounts: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};
    const publisherScores = {
      journalAndReview: {} as Record<
        string,
        { totalScore: number; count: number }
      >,
      conferenceProceedings: {} as Record<
        string,
        { totalScore: number; count: number }
      >,
    };
    const publisherDetails = {
      journalAndReview: {} as Record<
        string,
        { cumulativeScore: number; articleScores: number[] }
      >,
      conferenceProceedings: {} as Record<
        string,
        { cumulativeScore: number; articleScores: number[] }
      >,
    };

    // Filter articles
    const journalAndReviewArticles = articles.filter(
      (article) =>
        article.type === "Journal Article" ||
        article.type === "Literature Review"
    );
    const conferenceProceedingsArticles = articles.filter(
      (article) =>
        article.type === "Conference Proceedings" ||
        article.type === "Conference Presentation"
    );

    // Function to process articles
    function processArticles(
      articleSet: Article[],
      scoreType: "journalAndReview" | "conferenceProceedings"
    ) {
      articleSet.forEach((article) => {
        article.authors.forEach((author) => {
          authorCounts[author] = (authorCounts[author] || 0) + 1;
        });

        const keywords = extractKeywords(article.name);
        keywords.forEach((keyword) => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
      });

      articleSet.forEach((article) => {
        let score = 0;

        // Publication year score
        const yearsAgo = currentYear - article.publish_year;
        if (yearsAgo <= 3) {
          score += 3;
        } else if (yearsAgo <= 7) {
          score += 2;
        } else {
          score += 1;
        }

        // Author score
        article.authors.forEach((author) => {
          if (authorCounts[author] === 1) {
            score += 1;
          }
        });

        // Keyword score
        const keywords = extractKeywords(article.name);
        keywords.forEach((keyword) => {
          if (keywordCounts[keyword] >= 3) {
            score += 0.25;
          }
        });

        const publisherName = article.publisher_name;
        if (publisherName) {
          if (!publisherScores[scoreType][publisherName]) {
            publisherScores[scoreType][publisherName] = {
              totalScore: 0,
              count: 0,
            };
            publisherDetails[scoreType][publisherName] = {
              cumulativeScore: 0,
              articleScores: [],
            };
          }
          publisherScores[scoreType][publisherName].totalScore += score;
          publisherScores[scoreType][publisherName].count++;
          publisherDetails[scoreType][publisherName].cumulativeScore += score;
          publisherDetails[scoreType][publisherName].articleScores.push(score);
        }
      });
    }

    // Process both sets of articles
    processArticles(journalAndReviewArticles, "journalAndReview");
    processArticles(conferenceProceedingsArticles, "conferenceProceedings");

    // Calculate average scores
    function calculateAverageScores(
      scoreType: "journalAndReview" | "conferenceProceedings"
    ): Record<string, string> {
      const result: Record<string, string> = {};
      for (const publisherName in publisherScores[scoreType]) {
        const { totalScore, count } = publisherScores[scoreType][publisherName];
        let averageScore = totalScore / count;

        // Apply weighting based on the number of articles
        if (count <= 2) {
          averageScore *= 0.75;
        } else if (count > 5) {
          const extraArticles = Math.floor((count - 5) / 3);
          averageScore *= 1 + extraArticles * 0.1;
        }

        // Round the average score to two decimal places
        result[publisherName] = (Math.round(averageScore * 100) / 100).toFixed(
          2
        );
      }
      const sortedResult = sortObjectByScore(result);

      // Limit to top 7
      return Object.fromEntries(Object.entries(sortedResult).slice(0, 7));
    }

    return {
      journalAndReviewScores: calculateAverageScores("journalAndReview"),
      conferenceProceedingsScores: calculateAverageScores(
        "conferenceProceedings"
      ),
      publisherDetails,
    };
  }

  function sortObjectByScore(
    obj: Record<string, string>
  ): Record<string, string> {
    const entries = Object.entries(obj);
    const sortedEntries = entries.sort(
      ([, a], [, b]) => parseFloat(b) - parseFloat(a)
    );
    return Object.fromEntries(sortedEntries);
  }

  function extractKeywords(title: string): string[] {
    return title.toLowerCase().split(/\s+/);
  }
</script>

{#if !dialog}
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Dialog.Root>
      <Card.Root id="journal-suggestions-card">
        <Card.Header>
          <Card.Title class="flex justify-between items-center">
            <h3 class="font-semibold mb-2 text-xl text-[#2383fb]">
              {$t('publisherScoreExtra.journalSuggestionsForPublication')}:
            </h3>
            <Dialog.Trigger><Button size="sm">{$t('publisherScore.explain')}</Button></Dialog.Trigger>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          {#if scores && scores.journalAndReviewScores && !_.isEmpty(scores.journalAndReviewScores)}
            <ul class="space-y-2">
              {#each Object.entries(scores.journalAndReviewScores) as [publisher, score]}
                <li class="flex items-center space-x-2">
                  <span class="mr-2">-</span><span class="font-semibold"
                    >{publisher}</span
                  >
                </li>
              {/each}
            </ul>
          {:else}
            <p>
              {$t('publisherScoreExtra.noJournalSuggestionsYet')}
            </p>
          {/if}
        </Card.Content>
      </Card.Root>
      <Dialog.Content class="max-w-[600px] mx-auto">
        <div>
          <h2 class="text-xl font-semibold">
            {$t('publisherScoreExtra.journalSuggestionsForPublication')}
          </h2>
          <p class="dark:text-white text-lg mt-2">
            {$t('publisherScoreExtra.journalSuggestionsExplanation')}
          </p>
        </div>
      </Dialog.Content>
    </Dialog.Root>
    <Dialog.Root>
      <Card.Root id="conference-suggestions-card">
        <Card.Header>
          <Card.Title class="flex justify-between items-center">
            <h3 class="font-semibold mb-2 text-xl text-[#2383fb]">
              {$t('publisherScoreExtra.conferenceSuggestionsForPresentation')}:
            </h3>
            <Dialog.Trigger><Button size="sm">{$t('publisherScore.explain')}</Button></Dialog.Trigger>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          {#if scores && scores.conferenceProceedingsScores && !_.isEmpty(scores.conferenceProceedingsScores)}
            <ul class="space-y-2">
              {#each Object.entries(scores.conferenceProceedingsScores) as [publisher, score]}
                <li class="flex items-center space-x-2">
                  <span class="mr-2">-</span><span class="font-semibold"
                    >{publisher}</span
                  >
                </li>
              {/each}
            </ul>
          {:else}
            <p>
              {$t('publisherScoreExtra.noConferenceSuggestionsYet')}
            </p>
          {/if}
        </Card.Content>
      </Card.Root>
      <Dialog.Content class="max-w-[600px] mx-auto">
        <div>
          <h2 class="text-xl font-semibold">
            {$t('publisherScoreExtra.conferenceSuggestionsForPresentation')}
          </h2>
          <p class="dark:text-white text-lg mt-2">
            {$t('publisherScoreExtra.conferenceSuggestionsExplanation')}
          </p>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  </div>
{/if}

{#if dialog}
  <Dialog.Root>
    <Dialog.Trigger
      ><Button size="sm">{$t('publisherScore.suggestedJournalsConferences')}</Button
      ></Dialog.Trigger
    >
    <Dialog.Content class="max-w-[800px] mx-auto">
      <div>
        <h2 class="text-xl font-semibold mb-2">
          {$t('publisherScoreExtra.suggestedJournalsAndConferences')}
        </h2>
        <Card.Root>
          <Card.Content class="p-4">
            {#if scores}
              <h3 class="font-semibold mb-2 text-xl text-[#2383fb]">
                {$t('publisherScoreExtra.journalSuggestionsForPublication')}:
              </h3>
              {#if Object.keys(scores.journalAndReviewScores).length > 0}
                <ul class="space-y-2 mb-4">
                  {#each Object.entries(scores.journalAndReviewScores) as [publisher, score]}
                    <li class="flex items-center space-x-2">
                      <span class="mr-2">-</span>
                      <span class="font-semibold">{publisher}</span>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p>{$t('publisherScoreExtra.noJournalAndReviewSuggestions')}</p>
              {/if}
              <hr class="mb-4" />
              <h3 class="font-semibold mb-2 text-xl text-[#2383fb]">
                {$t('publisherScoreExtra.conferenceSuggestionsForPresentation')}:
              </h3>
              {#if Object.keys(scores.conferenceProceedingsScores).length > 0}
                <ul class="space-y-2">
                  {#each Object.entries(scores.conferenceProceedingsScores) as [publisher, score]}
                    <li class="flex items-center space-x-2">
                      <span class="mr-2">-</span>
                      <span class="font-semibold">{publisher}</span>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p>{$t('publisherScoreExtra.noConferenceSuggestions')}</p>
              {/if}
            {:else}
              <p>{$t('publisherScoreExtra.noSuggestionsAvailable')}</p>
            {/if}
          </Card.Content>
        </Card.Root>
      </div>
    </Dialog.Content>
  </Dialog.Root>
{/if}
