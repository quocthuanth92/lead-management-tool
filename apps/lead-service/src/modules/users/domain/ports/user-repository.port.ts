export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'SALESPERSON' | 'ADMIN';
  isActive: boolean;
}

export interface UserRepositoryPort {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
}

export const USER_REPOSITORY_PORT = Symbol('USER_REPOSITORY_PORT');
