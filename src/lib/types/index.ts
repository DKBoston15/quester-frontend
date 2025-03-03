// Analytics module types
export interface Analytics {
  track: (
    event: string,
    properties?: Record<string, any>,
    userId?: string
  ) => void;
}

// User store types
export interface UserData {
  id: string;
  [key: string]: any;
}

export interface User {
  userData: UserData;
}

export interface KeywordAnalysis {
  id: string;
  project_id: string;
  user_id: string;
  keywords: string[] | string;
  report:
    | string
    | {
        report: string;
        keywordsSuggested: boolean;
        keywords: string[];
      };
  frequency_data?:
    | string
    | {
        [key: number]: {
          [keyword: string]: {
            count: number;
            [otherKeyword: string]: number | { count: number };
          };
        };
      };
  frequencyData?:
    | string
    | {
        [key: number]: {
          [keyword: string]: {
            count: number;
            [otherKeyword: string]: number | { count: number };
          };
        };
      };
  created_at: string;
  createdAt: string;
  updated_at: string;
}
