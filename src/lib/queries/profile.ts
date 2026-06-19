import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import type { Profile } from '../../types/database';

// ─── Username availability ───────────────────────────────────

/**
 * Check if a username is available.
 * Returns true if the username is free OR belongs to the current user.
 */
export function useUsernameAvailable(username: string | null | undefined) {
  const { user } = useAuth();
  const u = (username ?? '').trim().toLowerCase();

  return useQuery({
    queryKey: ['username-available', u, user?.id ?? null],
    enabled: !!user && u.length >= 3,
    staleTime: 0,
    queryFn: async (): Promise<{ available: boolean; reason?: string }> => {
      // Basic format check
      if (!/^[a-z0-9_.]{3,20}$/.test(u)) {
        return { available: false, reason: 'Solo letras, números, _ y . (3-20 caracteres)' };
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', u)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { available: true };
      if (data.id === user!.id) return { available: true };       // it's me
      return { available: false, reason: 'Ya está en uso' };
    },
  });
}

// ─── Update profile ──────────────────────────────────────────

export interface UpdateProfileInput {
  name?:             string;
  username?:         string;          // will be lowercased
  bio?:              string | null;
  avatar_url?:       string | null;
  favorite_team_id?: string | null;
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput): Promise<Profile> => {
      if (!user) throw new Error('No estás autenticado.');

      const patch: UpdateProfileInput = {};
      if (input.name !== undefined)             patch.name = input.name.trim();
      if (input.username !== undefined)         patch.username = input.username.trim().toLowerCase();
      if (input.bio !== undefined)              patch.bio = input.bio?.trim() || null;
      if (input.avatar_url !== undefined)       patch.avatar_url = input.avatar_url;
      if (input.favorite_team_id !== undefined) patch.favorite_team_id = input.favorite_team_id;

      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
        .select()
        .single();
      if (error) {
        // Translate common errors
        if (error.code === '23505') throw new Error('Ese nombre de usuario ya está en uso.');
        throw new Error(error.message);
      }
      return data as Profile;
    },
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['my-stats'] });
      qc.invalidateQueries({ queryKey: ['groups', 'me'] });
      qc.invalidateQueries({ queryKey: ['group-members'] });
    },
  });
}

export interface TeamRow {
  id:         string;
  code:       string;
  short_name: string;
  name:       string;
  league_id:  string;
}

// ─── Notification preferences ────────────────────────────────

export type NotificationCategory = 'friends' | 'groups' | 'picks' | 'kickoff' | 'ranks';

export type NotificationPrefs = Partial<Record<NotificationCategory, boolean>>;

/**
 * Read the current user's per-category notification preferences. Empty
 * object means "all on" — the edge function only mutes a category when
 * its key is explicitly `false`.
 */
export function useMyNotificationPrefs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notification-prefs', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<NotificationPrefs> => {
      // notification_prefs was added after the generated types snapshot.
      // Cast around the missing column until we regen types.
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', user!.id)
        .single() as unknown as {
          data: { notification_prefs: NotificationPrefs | null } | null;
          error: { message: string } | null;
        };
      if (error) throw new Error(error.message);
      return (data?.notification_prefs ?? {}) as NotificationPrefs;
    },
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (next: NotificationPrefs): Promise<void> => {
      if (!user) throw new Error('No estás autenticado.');
      // Same cast: column exists in DB but not yet in generated types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder = supabase.from('profiles').update({ notification_prefs: next } as any);
      const { error } = await builder.eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
    },
  });
}

// ─── Pinned groups ───────────────────────────────────────────
//
// Up to 3 groups the user has marked as favourites for quick access from
// the home screen's "Active Circls" Wallet stack. Stored as a uuid[] on
// the profile; a DB check constraint caps the array at 3 elements, and
// the mutation below also enforces that client-side with a friendly
// error so the UI can show an Alert instead of a generic 500.

/** Maximum number of groups a user can pin at once. */
export const MAX_PINNED_GROUPS = 3;

/**
 * Read the current user's array of pinned group IDs. Order is preserved
 * (the most recently pinned ends up last) so the home stack always sees a
 * stable visual ordering.
 */
export function useMyPinnedGroupIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pinned-groups', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      // pinned_groups was added after the generated types snapshot.
      // Cast around the missing column until we regen types.
      const { data, error } = await supabase
        .from('profiles')
        .select('pinned_groups')
        .eq('id', user!.id)
        .single() as unknown as {
          data: { pinned_groups: string[] | null } | null;
          error: { message: string } | null;
        };
      if (error) throw new Error(error.message);
      return data?.pinned_groups ?? [];
    },
  });
}

/**
 * Toggle a group's pinned state for the current user.
 * - If already pinned → removes it.
 * - If not pinned and the user has < MAX_PINNED_GROUPS → adds it (at end).
 * - If not pinned and the user already has the max → throws a friendly
 *   error so the caller can show an Alert.
 */
export function useToggleGroupPin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (groupId: string): Promise<{ pinned: boolean; next: string[] }> => {
      if (!user) throw new Error('No estás autenticado.');

      // Read current array first — we don't trust the client cache to be
      // fresh enough for the limit check.
      const { data, error: readErr } = await supabase
        .from('profiles')
        .select('pinned_groups')
        .eq('id', user.id)
        .single() as unknown as {
          data: { pinned_groups: string[] | null } | null;
          error: { message: string } | null;
        };
      if (readErr) throw new Error(readErr.message);
      const stored = data?.pinned_groups ?? [];

      // Reconcile against the user's ACTUAL group memberships. When a group
      // is deleted (e.g. the user leaves a group where they're the sole
      // member) its id lingers in pinned_groups as a phantom — and those
      // phantoms used to count against MAX_PINNED_GROUPS, blocking the user
      // from pinning real groups even when nothing appears pinned in the UI.
      // We drop any pinned id that no longer maps to a membership row.
      const { data: memberships, error: memErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
      if (memErr) throw new Error(memErr.message);
      const validIds = new Set((memberships ?? []).map((r) => r.group_id));
      const current = stored.filter((id) => validIds.has(id));

      let next: string[];
      let pinned: boolean;
      if (current.includes(groupId)) {
        next = current.filter((id) => id !== groupId);
        pinned = false;
      } else {
        if (current.length >= MAX_PINNED_GROUPS) {
          throw new Error(
            `Solo puedes anclar hasta ${MAX_PINNED_GROUPS} grupos. Desancla uno antes de añadir otro.`,
          );
        }
        next = [...current, groupId];
        pinned = true;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder = supabase.from('profiles').update({ pinned_groups: next } as any);
      const { error: writeErr } = await builder.eq('id', user.id);
      if (writeErr) throw new Error(writeErr.message);
      return { pinned, next };
    },
    onSuccess: ({ next }) => {
      // Optimistically write into the cache so the home stack updates
      // without a second round-trip.
      qc.setQueryData(['pinned-groups', user?.id ?? null], next);
    },
  });
}

// ─── Public profile (other users) ────────────────────────────

export interface PublicProfile {
  id:          string;
  name:        string | null;
  username:    string | null;
  avatar_url:  string | null;
  bio:         string | null;
  favorite_team: { id: string; code: string; name: string; short_name: string } | null;
}

/**
 * Read another user's public profile. Includes the favorite team join so
 * the screen can render the crest without a second round-trip.
 */
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId ?? null],
    enabled:  !!userId,
    queryFn: async (): Promise<PublicProfile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, name, username, avatar_url, bio,
          favorite_team:teams ( id, code, name, short_name )
        `)
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const r = data as unknown as {
        id: string; name: string | null; username: string | null;
        avatar_url: string | null; bio: string | null;
        favorite_team: PublicProfile['favorite_team'] | PublicProfile['favorite_team'][] | null;
      };
      const ft = Array.isArray(r.favorite_team) ? r.favorite_team[0] ?? null : r.favorite_team;
      return {
        id: r.id,
        name: r.name,
        username: r.username,
        avatar_url: r.avatar_url,
        bio: r.bio,
        favorite_team: ft ?? null,
      };
    },
  });
}

export interface UserPublicStats {
  totalPoints:  number;
  totalPicks:   number;
  correctPicks: number;
  accuracy:     number;     // 0-100, over finished matches
}

/**
 * Aggregate stats for ANOTHER user, deduplicated per match. Mirrors
 * useMyStats but takes an explicit userId so RLS still allows it
 * (picks are visible group-scoped or after kickoff).
 */
export function useUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-stats', userId ?? null],
    enabled:  !!userId,
    queryFn: async (): Promise<UserPublicStats> => {
      const { data, error } = await supabase
        .from('picks')
        .select('match_id, pick_results ( correct, points )')
        .eq('user_id', userId!);
      if (error) throw error;

      const byMatch = new Map<string, { correct: boolean | null; points: number }>();
      for (const row of (data ?? []) as Array<{
        match_id: string;
        pick_results: { correct: boolean; points: number } | { correct: boolean; points: number }[] | null;
      }>) {
        const pr = Array.isArray(row.pick_results) ? row.pick_results[0] : row.pick_results;
        const existing = byMatch.get(row.match_id);
        if (
          !existing ||
          (existing.correct === null && pr?.correct != null) ||
          (existing.correct === false && pr?.correct === true)
        ) {
          byMatch.set(row.match_id, {
            correct: pr?.correct ?? null,
            points:  pr?.points  ?? 0,
          });
        }
      }
      const entries     = Array.from(byMatch.values());
      const finished    = entries.filter((e) => e.correct !== null);
      const correctPicks = finished.filter((e) => e.correct === true).length;
      const totalPoints  = entries.reduce((s, e) => s + e.points, 0);
      return {
        totalPoints,
        totalPicks:   byMatch.size,
        correctPicks,
        accuracy:     finished.length > 0
          ? Math.round((correctPicks / finished.length) * 100)
          : 0,
      };
    },
  });
}

/**
 * Groups in common between the current user and a target user. Uses
 * group_members rows visible to the current user via RLS; the join is
 * client-side because Supabase doesn't intersect tables natively.
 */
export function useGroupsInCommon(otherUserId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['groups-in-common', user?.id ?? null, otherUserId ?? null],
    enabled:  !!user && !!otherUserId && user!.id !== otherUserId,
    queryFn: async (): Promise<Array<{ id: string; name: string; icon: string; accent: string; image_url: string | null }>> => {
      // Fetch group ids of the other user, then join groups the current user is also in.
      const { data: theirs, error: e1 } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', otherUserId!);
      if (e1) throw e1;
      const theirGroupIds = (theirs ?? []).map((r) => r.group_id);
      if (theirGroupIds.length === 0) return [];

      const { data: mine, error: e2 } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id)
        .in('group_id', theirGroupIds);
      if (e2) throw e2;
      const sharedIds = (mine ?? []).map((r) => r.group_id);
      if (sharedIds.length === 0) return [];

      const { data: groups, error: e3 } = await supabase
        .from('groups')
        .select('id, name, icon, accent, image_url')
        .in('id', sharedIds);
      if (e3) throw e3;
      return (groups ?? []) as Array<{
        id: string; name: string; icon: string; accent: string; image_url: string | null;
      }>;
    },
  });
}

// ─── Teams (read-only listing for favorite team picker) ─────

/** All teams in the active league, sorted by name. */
export function useTeams(leagueSlug = 'liga_mx') {
  return useQuery({
    queryKey: ['teams', leagueSlug],
    staleTime: 60 * 60_000,            // teams don't change often
    queryFn: async (): Promise<TeamRow[]> => {
      const { data: league } = await supabase
        .from('leagues')
        .select('id')
        .eq('slug', leagueSlug)
        .single();
      if (!league) return [];

      const { data, error } = await supabase
        .from('teams')
        .select('id, code, short_name, name, league_id')
        .eq('league_id', league.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamRow[];
    },
  });
}
