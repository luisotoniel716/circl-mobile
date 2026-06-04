// Auth repository — thin wrapper so screens never import supabase directly.
// All auth logic lives in src/lib/auth.tsx (AuthProvider + useAuth hook).
// This file is kept for compatibility; prefer useAuth() in components.

export { useAuth } from '../../lib/auth';
