
// types/auth.ts
export interface UserInfoInterface {
  id?: number;
  username?: string;
  email?: string;
  avatar?: string;
  permissions?: number;
  phone?: string;
  registerDate?: string;
  sex?: 0 | 1 | 2;
  status?: number;
  password?: string;
}

export interface userEditFormData {
  id: number | null
  username: string | null | undefined
  email: string | null | undefined
  password: string | null | undefined
  sex: 0 | 1 | 2 | null | undefined
  phone: string | null | undefined
  registerDate: string | '' | undefined
}