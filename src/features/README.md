# Features

Each feature owns its domain logic and a **repository** that the UI calls.
Today repositories read from `src/data` (mock). When Supabase is wired up,
swap the repository body for queries — screens won't change.

```
features/
  auth/         session, sign in/up, current user
  groups/       list, create, join, members
  picks/        make/lock picks, results
  leaderboard/  season/jornada standings
```

Pattern:

```ts
// features/groups/groups.repo.ts
import { GROUPS } from '../../data';
export const groupsRepo = {
  list: async () => GROUPS,                 // later: supabase.from('groups').select()
  get: async (id: string) => GROUPS.find(g => g.id === id) ?? null,
};
```
