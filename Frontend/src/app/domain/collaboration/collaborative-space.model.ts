export type SpaceRole = 'ADMINISTRADOR' | 'MODERADOR' | 'MIEMBRO' | 'INVITADO';

export interface CollaborativeSpace {
  id: number;
  name: string;
  description: string | null;
  creatorId: number;
  createdAt: string;
}

export interface CreateSpaceRequest {
  name: string;
  description?: string;
}

export interface SpaceMember {
  id: number;
  spaceId: number;
  userId: number;
  role: SpaceRole;
  joinedAt: string;
}

export interface InviteMemberRequest {
  email: string;
  role: SpaceRole;
}
