export type PlatformUserRole = 'USER' | 'ADMIN' | 'DEVELOPER';

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  role: PlatformUserRole;
  active: boolean;
  registeredAt: string;
}
