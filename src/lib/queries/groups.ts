import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import type { Group } from '../../types';
import type { Profile } from '../../types/database';

// ─── Types ────────────────────────────────────────────────────

export interface GroupDetail extends Group {
  league_id:   string;
  invite_code: string;
  created_by:  string;
  image_url:   string | null;
  /** When true, members can't see each other's picks until a match starts. */
  hide_picks_until_kickoff: boolean;
}

export interface GroupMember {
  user_id:   string;
  role:      'admin' | 'member';
  joined_at: string;
  profile:   Pick<Profile, 'id' | 'username' | 'name' | 'avatar_url'>;
  /** Group-scoped points. 0 until pick_results are aggregated. */
  points:    number;
}

// ─── Queries ──────────────────────────────────────────────────

/** All groups the current user belongs to. */
export function useMyGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['groups', 'me', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<Group[]> => {
      const { data: memberships, error: mErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id);
      if (mErr) throw mErr;

      const ids = (memberships ?? []).map((m) => m.group_id);
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from('groups')
        .select('id, name, icon, accent, invite_code, image_url')
        .in('id', ids);
      if (error) throw error;

      // Member counts + my points + my rank per group — run in parallel.
      const [counts, myPtsMap, rankMap] = await Promise.all([
        // ① member count per group
        (async () => {
          const out: Record<string, number> = {};
          await Promise.all(
            (data ?? []).map(async (g) => {
              const { count } = await supabase
                .from('group_members')
                .select('id', { count: 'exact', head: true })
                .eq('group_id', g.id);
              out[g.id] = count ?? 0;
            }),
          );
          return out;
        })(),

        // ② my points per group (sum pick_results scoped to group)
        (async () => {
          const out: Record<string, number> = {};
          const { data: pickRows } = await supabase
            .from('picks')
            .select('group_id, pick_results ( points )')
            .eq('user_id', user!.id)
            .in('group_id', ids);
          for (const row of (pickRows ?? []) as Array<{
            group_id:     string;
            pick_results: { points: number } | { points: number }[] | null;
          }>) {
            const pr = Array.isArray(row.pick_results) ? row.pick_results[0] : row.pick_results;
            out[row.group_id] = (out[row.group_id] ?? 0) + (pr?.points ?? 0);
          }
          return out;
        })(),

        // ③ my rank per group: count members with more points than me + 1
        //    We do this after ② finishes by computing on the same data but
        //    we need all users' points. One query per group (small N).
        //    Resolved after myPtsMap is available — we'll compute it below.
        Promise.resolve(null as Record<string, number> | null),
      ]);

      // ③ compute rank now that myPtsMap is ready
      const rankOut: Record<string, number> = {};
      await Promise.all(
        (data ?? []).map(async (g) => {
          const myPts = myPtsMap[g.id] ?? 0;
          // All members' point totals for this group (reuse same pick+result join)
          const { data: allRows } = await supabase
            .from('picks')
            .select('user_id, pick_results ( points )')
            .eq('group_id', g.id);

          const totals: Record<string, number> = {};
          for (const row of (allRows ?? []) as Array<{
            user_id:      string;
            pick_results: { points: number } | { points: number }[] | null;
          }>) {
            const pr = Array.isArray(row.pick_results) ? row.pick_results[0] : row.pick_results;
            totals[row.user_id] = (totals[row.user_id] ?? 0) + (pr?.points ?? 0);
          }
          // Rank = count of members with strictly more points + 1
          const ahead = Object.values(totals).filter((pts) => pts > myPts).length;
          rankOut[g.id] = ahead + 1;
        }),
      );
      void rankMap; // unused, replaced by rankOut

      return (data ?? []).map<Group>((g) => ({
        id:        g.id,
        name:      g.name,
        icon:      g.icon,
        accent:    g.accent,
        image_url: g.image_url ?? null,
        members:   counts[g.id] ?? 0,
        myRank:    rankOut[g.id] ?? 1,
        myPts:     myPtsMap[g.id] ?? 0,
        lastMatch: '',
        avatars:   [],
      }));
    },
  });
}

/** Single group's full detail (incl. invite_code). */
export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupDetail | null> => {
      // hide_picks_until_kickoff was added after the generated types
      // snapshot — cast around it until types are regenerated.
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, icon, accent, invite_code, league_id, created_by, image_url, hide_picks_until_kickoff')
        .eq('id', groupId!)
        .single() as unknown as {
          data: (Record<string, unknown> & { hide_picks_until_kickoff: boolean | null }) | null;
          error: { message: string } | null;
        };
      if (error) throw error;
      if (!data) return null;

      const { count } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', data.id as string);

      return {
        id:          data.id as string,
        name:        data.name as string,
        icon:        data.icon as string,
        accent:      data.accent as string,
        invite_code: data.invite_code as string,
        league_id:   data.league_id as string,
        created_by:  data.created_by as string,
        image_url:   (data.image_url as string | null) ?? null,
        hide_picks_until_kickoff: data.hide_picks_until_kickoff ?? true,
        members:     count ?? 0,
        myRank:      1,
        myPts:       0,
        lastMatch:   '',
        avatars:     [],
      };
    },
  });
}

/** Members of a group with their profile + group-scoped points. */
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-members', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupMember[]> => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          user_id, role, joined_at,
          profile:profiles!group_members_user_id_fkey ( id, username, name, avatar_url )
        `)
        .eq('group_id', groupId!)
        .order('joined_at', { ascending: true });
      if (error) throw error;

      // Aggregate points per user from pick_results, scoped to this group.
      // One query: join picks → pick_results, filter by group, sum client-side.
      const { data: pickRows, error: pErr } = await supabase
        .from('picks')
        .select('user_id, pick_results ( points )')
        .eq('group_id', groupId!);
      if (pErr) throw pErr;

      const pointsByUser: Record<string, number> = {};
      for (const row of (pickRows ?? []) as Array<{ user_id: string; pick_results: { points: number } | { points: number }[] | null }>) {
        const pr = row.pick_results;
        const points = !pr ? 0 : Array.isArray(pr) ? (pr[0]?.points ?? 0) : pr.points;
        pointsByUser[row.user_id] = (pointsByUser[row.user_id] ?? 0) + points;
      }

      return (data ?? []).map((row): GroupMember => {
        const rawProfile = (row as unknown as { profile: GroupMember['profile'] | GroupMember['profile'][] }).profile;
        const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
        return {
          user_id:   row.user_id,
          role:      row.role as 'admin' | 'member',
          joined_at: row.joined_at,
          profile,
          points:    pointsByUser[row.user_id] ?? 0,
        };
      });
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────

export interface CreateGroupInput {
  name:        string;
  icon?:       string;
  accent?:     string;
  league_id:   string;
  image_url?:  string | null;
  /** Defaults to true (picks hidden until kickoff). */
  hide_picks_until_kickoff?: boolean;
}

/** Create a new group. The DB trigger adds the creator as admin. */
export function useCreateGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateGroupInput): Promise<GroupDetail> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name:       input.name.trim(),
          icon:       input.icon  ?? '🎯',
          accent:     input.accent ?? '#4F6BFF',
          league_id:  input.league_id,
          image_url:  input.image_url ?? null,
          created_by: user.id,
          // New column — cast the insert object so TS doesn't complain
          // about the missing generated-types field.
          hide_picks_until_kickoff: input.hide_picks_until_kickoff ?? true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .select('id, name, icon, accent, invite_code, league_id, created_by, image_url, hide_picks_until_kickoff')
        .single() as unknown as {
          data: (Record<string, unknown> & { hide_picks_until_kickoff: boolean | null }) | null;
          error: { message: string; details?: string } | null;
        };
      if (error) {
        // Wrap PostgREST errors so `e.message` shows useful info downstream.
        const msg = error.message
          || error.details
          || JSON.stringify(error);
        throw new Error(`[create_group] ${msg}`);
      }
      if (!data) throw new Error('[create_group] no data returned');

      return {
        id:          data.id as string,
        name:        data.name as string,
        icon:        data.icon as string,
        accent:      data.accent as string,
        invite_code: data.invite_code as string,
        league_id:   data.league_id as string,
        created_by:  data.created_by as string,
        image_url:   (data.image_url as string | null) ?? null,
        hide_picks_until_kickoff: data.hide_picks_until_kickoff ?? true,
        members:     1,
        myRank:      1,
        myPts:       0,
        lastMatch:   '',
        avatars:     [],
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups', 'me'] });
    },
  });
}

/** Join an existing group by 8-char invite code. */
export function useJoinGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const trimmed = code.trim().toUpperCase();
      if (trimmed.length < 4) throw new Error('Código inválido');

      const { data, error } = await supabase.rpc('join_group_by_code', { p_code: trimmed });
      if (error) {
        if (error.message?.includes('GROUP_NOT_FOUND')) {
          throw new Error('No encontramos un grupo con ese código.');
        }
        throw new Error(error.message);
      }
      return data as string; // group_id
    },
    onSuccess: (groupId) => {
      qc.invalidateQueries({ queryKey: ['groups', 'me'] });
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
  });
}

// ─── Group admin mutations (settings screen) ─────────────────

export interface UpdateGroupInput {
  group_id:    string;
  name?:       string;
  icon?:       string;
  accent?:     string;
  image_url?:  string | null;
  hide_picks_until_kickoff?: boolean;
}

/** Update group metadata. RLS allows admins only. */
export function useUpdateGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateGroupInput): Promise<void> => {
      const patch: {
        name?: string;
        icon?: string;
        accent?: string;
        image_url?: string | null;
        hide_picks_until_kickoff?: boolean;
      } = {};
      if (input.name      !== undefined) patch.name      = input.name.trim();
      if (input.icon      !== undefined) patch.icon      = input.icon;
      if (input.accent    !== undefined) patch.accent    = input.accent;
      if (input.image_url !== undefined) patch.image_url = input.image_url;
      if (input.hide_picks_until_kickoff !== undefined) {
        patch.hide_picks_until_kickoff = input.hide_picks_until_kickoff;
      }
      const { error } = await supabase
        .from('groups')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(patch as any)
        .eq('id', input.group_id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_void, input) => {
      qc.invalidateQueries({ queryKey: ['group', input.group_id] });
      qc.invalidateQueries({ queryKey: ['groups', 'me'] });
      // Toggling pick visibility changes what RLS lets the client read.
      // The pick queries were cached (often empty) under the old setting,
      // so force them to refetch — otherwise the circle keeps showing
      // "sin pick" even though picks are now visible.
      if (input.hide_picks_until_kickoff !== undefined) {
        qc.invalidateQueries({ queryKey: ['match-picks-in-group'] });
        qc.invalidateQueries({ queryKey: ['my-picks-in-group'] });
        qc.invalidateQueries({ queryKey: ['group-pick-dist'] });
      }
    },
  });
}

/**
 * Remove a group id from the current user's pinned_groups, if present.
 * Called when a group is left or deleted so phantom ids don't linger and
 * count against the pin limit. Best-effort: a failure here shouldn't block
 * the leave/delete itself, so the caller swallows errors.
 */
async function unpinGroupForUser(userId: string, groupId: string): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('pinned_groups')
    .eq('id', userId)
    .single() as unknown as { data: { pinned_groups: string[] | null } | null };
  const current = data?.pinned_groups ?? [];
  if (!current.includes(groupId)) return;
  const next = current.filter((id) => id !== groupId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase.from('profiles').update({ pinned_groups: next } as any).eq('id', userId);
}

/** Delete the group entirely. RLS allows admins only (and cascades). */
export function useDeleteGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (groupId: string): Promise<void> => {
      // `.select()` so we can verify a row was actually deleted. RLS only
      // lets admins delete groups; without this check a blocked delete would
      // return no error AND no effect, silently "succeeding".
      const { data, error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)
        .select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error('No tienes permiso para eliminar este grupo.');
      }
      // Best-effort cleanup of a stale pin. Don't let it fail the delete.
      if (user) {
        try { await unpinGroupForUser(user.id, groupId); } catch { /* ignore */ }
      }
    },
    onSuccess: (_void, groupId) => {
      qc.invalidateQueries({ queryKey: ['groups', 'me'] });
      qc.invalidateQueries({ queryKey: ['pinned-groups'] });
      qc.removeQueries({ queryKey: ['group', groupId] });
      qc.removeQueries({ queryKey: ['group-members', groupId] });
    },
  });
}

/** Promote/demote a member's role within a group. RLS: admin only. */
export function useUpdateMemberRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { group_id: string; user_id: string; role: 'admin' | 'member' }): Promise<void> => {
      const { error } = await supabase
        .from('group_members')
        .update({ role: input.role })
        .eq('group_id', input.group_id)
        .eq('user_id',  input.user_id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_void, input) => {
      qc.invalidateQueries({ queryKey: ['group-members', input.group_id] });
    },
  });
}

/** Leave a group. The auth user removes their own membership row. */
export function useLeaveGroup() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (groupId: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
      if (error) throw error;
      // Best-effort cleanup of a stale pin (covers the sole-member case
      // where leaving cascades into a group delete).
      try { await unpinGroupForUser(user.id, groupId); } catch { /* ignore */ }
    },
    onSuccess: (_void, groupId) => {
      qc.invalidateQueries({ queryKey: ['groups', 'me'] });
      qc.invalidateQueries({ queryKey: ['pinned-groups'] });
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
  });
}
