export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  invitationToken?: string;
}
