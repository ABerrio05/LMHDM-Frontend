export interface AuthResponse {
  userId: number;
  name: string;
  email: string;
  role: 'USER' | 'DEVELOPER';
  accessToken: string;
}
