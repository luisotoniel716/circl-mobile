import { USERS } from '../../data';
import type { User } from '../../types';

// Mock auth repository. Swap the bodies for Supabase auth calls later;
// the screen-facing signatures stay the same.
export const authRepo = {
  currentUser: async (): Promise<User> => USERS.me,
  signIn: async (_identifier: string, _password: string): Promise<User> => USERS.me,
  signUp: async (_name: string, _username: string, _email: string, _password: string): Promise<User> => USERS.me,
  signOut: async (): Promise<void> => {},
};
