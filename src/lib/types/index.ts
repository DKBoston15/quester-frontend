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
