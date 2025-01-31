// src/lib/types/auth.ts
export type User = {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
}

// Add a type assertion function to validate user data
export function isUser(data: any): data is User {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof data.id === 'number' &&
        typeof data.email === 'string' &&
        typeof data.firstName === 'string' &&
        typeof data.lastName === 'string' &&
        (data.avatarUrl === null || typeof data.avatarUrl === 'string')
    );
}

export interface Organization {
    id: string
    authProviderOrgId: string | null
    billingProviderId: string | null
    name: string
    slug: string
    settings: any
    metadata: any | null
    maxUsers: number | null
    createdAt: any
    updatedAt: any
    deletedAt: any | null
    version: number
}