export interface LoginRequest {
  email: string;
  password: string;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: 'SALESPERSON' | 'ADMIN';
}

export interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}
