export type Role = "student" | "instructor";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}