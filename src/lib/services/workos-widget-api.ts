import { api } from './api-client';
import type { User, Organization } from '$lib/types/auth';

export interface UserProfile {
  id: string;
  authProviderId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  orcidUrl: string | null;
  emailVerified?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  role?: {
    id: string;
    name: string;
  };
  roleId?: string;
  joinedAt?: string;
  $extras?: {
    roleName?: string;
    roleId?: string;
  };
}

export interface PendingInvitation {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  accessMapping?: {
    organization?: { roleId: string; roleName?: string };
    departments?: Array<{ id: string; roleId: string; roleName?: string }>;
    projects?: Array<{ id: string; roleId: string; roleName?: string }>;
  };
}

export interface AvailableRole {
  id: string;
  name: string;
  scope: string;
}

export interface OrganizationTeamData {
  organization: {
    id: string;
    name: string;
    users: TeamMember[];
    availableRoles?: AvailableRole[];
  };
  permissions: Record<string, boolean>;
}

// User Profile API
export async function fetchUserProfile(): Promise<UserProfile> {
  return api.get<UserProfile>('/users/me/profile');
}

export async function updateUserProfile(data: Partial<User>): Promise<UserProfile> {
  return api.put<UserProfile>('/users/me/profile', data);
}

// Organization Team Data
export async function fetchOrganizationTeam(orgId: string): Promise<OrganizationTeamData> {
  return api.get<OrganizationTeamData>(`/team-management/organization/${orgId}`);
}

// Invitations
export async function fetchInvitations(orgId: string): Promise<PendingInvitation[]> {
  return api.get<PendingInvitation[]>(`/invitations?organizationId=${orgId}`);
}

export async function sendInvitation(payload: {
  email: string;
  organizationId: string;
  organizationRoleId: string;
}): Promise<PendingInvitation> {
  return api.post<PendingInvitation>('/invitations', payload);
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  return api.post(`/invitations/${invitationId}/revoke`);
}

// Role Management
export async function updateMemberRole(
  orgId: string,
  userId: string,
  roleId: string
): Promise<void> {
  return api.put(`/team-management/organization/${orgId}/users/${userId}`, { roleId });
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  return api.delete(`/team-management/organization/${orgId}/users/${userId}`);
}

// Available Roles
export async function fetchAvailableRoles(scope: string): Promise<AvailableRole[]> {
  return api.get<AvailableRole[]>(`/roles?scope=${scope}`);
}

// Organizations
export async function fetchUserOrganizations(userId: string): Promise<Organization[]> {
  return api.get<Organization[]>(`/organizations/by-user?userId=${userId}`);
}

export async function createOrganization(data: {
  name: string;
}): Promise<Organization> {
  return api.post<Organization>('/organizations/createOrgWithUser', data);
}

// Subscription limits
export async function fetchInvitationLimits(): Promise<{
  canInvite: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  try {
    const [capability, limits] = await Promise.all([
      api.get('/capabilities/user_invite'),
      api.get('/limits'),
    ]);
    const used = limits?.invitations?.used ?? 0;
    const limit = limits?.invitations?.limit ?? Infinity;
    return {
      canInvite: capability?.allowed ?? false,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  } catch {
    return { canInvite: false, used: 0, limit: 0, remaining: 0 };
  }
}
