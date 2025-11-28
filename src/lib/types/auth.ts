export type UserMetadata = {
  locale?: string;
  [key: string]: unknown;
};

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  orcidUrl: string | null;
  metadata?: UserMetadata | null;
};

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
  subscription?: {
    id: string;
    organizationId: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    trialEndsAt: string | null;
    currentPeriodStartsAt: string;
    currentPeriodEndsAt: string;
    canceledAt: string | null;
    seatsCount: number;
    planId: string;
    plan: {
      id: string;
      name: string;
    };
  };
  organizationRoles?: Array<{
    roleId: string;
    role?: {
      id: string;
      name: string;
    };
  }>;
}

export type ResearchProductType = "professionalism" | "writing" | "analysis";

export interface ResearchProduct {
  id: string;
  name: string;
  type: ResearchProductType;
  status: "planned" | "in_progress" | "completed" | "archived";
  description?: string;
  dueDate?: Date;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  keywords?: string[] | null;
  purpose?: string | null;
  financialInstitution?: string | null;
  financialSupport?: string | null;
  product?: string | null;
  researchDesign?: string | null;
  analyticDesign?: string | null;
  samplingDesign?: string | null;
  measurementDesign?: string | null;
  status?: string | null;
  settings?: Record<string, any>;
  metadata?: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  organizationId: string;
  departmentId?: string | null;
  userId?: string | null;

  // Relations (optional since they might not always be loaded)
  organization?: Organization;
  department?: Department;
  users?: User[];
  projectRoles?: ProjectRole[];
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

export interface Grant {
  id: string;
  projectId: string;
  grantName: string;
  recipient?: string | null;
  awardNumber?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  awardType?: string | null;
  directorateDivision?: string | null;
  principalInvestigators?: string[] | null;
  coPrincipalInvestigators?: string[] | null;
  programManager?: string | null;
  programManagerEmail?: string | null;
  programManagerPhone?: string | null;
  amount?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  // Relations
  project?: Project;
}
