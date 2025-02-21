// src/lib/types/auth.ts
export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

// Add a type assertion function to validate user data
export function isUser(data: any): data is User {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.id === "number" &&
    typeof data.email === "string" &&
    typeof data.firstName === "string" &&
    typeof data.lastName === "string" &&
    (data.avatarUrl === null || typeof data.avatarUrl === "string")
  );
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  billingProviderId?: string;
  subscriptionType?: "personal" | "organization";
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
}

export interface Project {
  id: string;
  organizationId: string;
  departmentId: string | null;
  name: string;
  description: string | null;
  settings: Record<string, any>;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  // Relations (optional since they might not always be loaded)
  organization?: Organization;
  department?: Department;
  projectRoles?: ProjectRole[];
  users?: User[];
}

export interface ProjectRole {
  id: string;
  userId: string;
  projectId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  project?: Project;
  user?: User;
  role?: Role;
}

export interface Role {
  id: string;
  name: string;
  scope: "organization" | "department" | "project";
  description: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  parentDepartmentId: string | null;
  settings: Record<string, any>;
  metadata: Record<string, any> | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional since they might not always be loaded)
  organization?: Organization;
  parentDepartment?: Department;
  projects?: Project[];
  departmentRoles?: DepartmentRole[];
  users?: User[];
}

export interface DepartmentRole {
  id: string;
  userId: string;
  departmentId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  department?: Department;
  user?: User;
  role?: Role;
}
