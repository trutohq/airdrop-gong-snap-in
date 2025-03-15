export type LoaderState = {};

export interface UserEmail {
  email: string;
  is_primary: boolean;
}

export interface User {
  id: string;
  name: string;
  emails: UserEmail[];
  created_at: string;
}
