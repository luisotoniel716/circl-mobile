import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import type { Profile } from '../../types/database';

// ─── Types ────────────────────────────────────────────────────

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

// Reuse ProfileMini from ./friends (exported there).
type ProfileMini = Pick<Profile, 'id' | 'username' | 'name' | 'avatar_url'>;

export interface GroupInviteRow {
  id:           string;
  group_id:     string;
  status:       InviteStatus;
  created_at:   string;
  inviter:      ProfileMini;
  group:        { id: string; name: string; icon: string; accent: string; image_url: string | null };
}

// ─── Pending incoming invites (for invitee) ──────────────────

export function useGroupInvites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['group-invites', 'incoming', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<GroupInviteRow[]> => {
      const { data, error } = await supabase
        .from('group_invites')
        .select(`
          id, group_id, status, created_at,
          inviter:profiles!group_invites_inviter_id_fkey ( id, username, name, avatar_url ),
          group:groups!group_invites_group_id_fkey       ( id, name, icon, accent, image_url )
        `)
        .eq('invitee_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as GroupInviteRow & {
          inviter: ProfileMini | ProfileMini[];
          group:   GroupInviteRow['group'] | GroupInviteRow['group'][];
        };
        return {
          ...r,
          inviter: Array.isArray(r.inviter) ? r.inviter[0] : r.inviter,
          group:   Array.isArray(r.group)   ? r.group[0]   : r.group,
        };
      });
    },
  });
}

// ─── Invitable friends for a group (friends not already in it, no pending invite) ──

/**
 * Friends who are NOT already a member of `groupId` AND don't have a
 * pending invite to it.  Used by the "Invite friends" picker.
 */
export function useInvitableFriends(groupId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invitable-friends', groupId ?? null, user?.id ?? null],
    enabled: !!user && !!groupId,
    queryFn: async (): Promise<ProfileMini[]> => {
      // 1. All accepted friends
      const { data: fRows, error: fErr } = await supabase
        .from('friendships')
        .select(`
          requester, addressee,
          requester_profile:profiles!friendships_requester_fkey ( id, username, name, avatar_url ),
          addressee_profile:profiles!friendships_addressee_fkey ( id, username, name, avatar_url )
        `)
        .eq('status', 'accepted')
        .or(`requester.eq.${user!.id},addressee.eq.${user!.id}`);
      if (fErr) throw fErr;

      const friends = (fRows ?? []).map((row) => {
        const r = row as unknown as {
          requester: string;
          addressee: string;
          requester_profile: ProfileMini | ProfileMini[];
          addressee_profile: ProfileMini | ProfileMini[];
        };
        const reqP = Array.isArray(r.requester_profile) ? r.requester_profile[0] : r.requester_profile;
        const adrP = Array.isArray(r.addressee_profile) ? r.addressee_profile[0] : r.addressee_profile;
        return r.requester === user!.id ? adrP : reqP;
      });

      if (friends.length === 0) return [];

      // 2. Existing group members
      const { data: members, error: mErr } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId!);
      if (mErr) throw mErr;
      const memberSet = new Set((members ?? []).map((m) => m.user_id));

      // 3. Pending invites
      const { data: invites, error: iErr } = await supabase
        .from('group_invites')
        .select('invitee_id')
        .eq('group_id', groupId!)
        .eq('status', 'pending');
      if (iErr) throw iErr;
      const invitedSet = new Set((invites ?? []).map((i) => i.invitee_id));

      return friends.filter((f) => f && !memberSet.has(f.id) && !invitedSet.has(f.id));
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────

function invalidateInviteCaches(qc: ReturnType<typeof useQueryClient>, groupId?: string) {
  qc.invalidateQueries({ queryKey: ['group-invites'] });
  qc.invalidateQueries({ queryKey: ['notifications'] });
  if (groupId) {
    qc.invalidateQueries({ queryKey: ['invitable-friends', groupId] });
    qc.invalidateQueries({ queryKey: ['group-members', groupId] });
    qc.invalidateQueries({ queryKey: ['groups', 'me'] });
  }
}

/** Send a group invite to a friend. */
export function useSendGroupInvite() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { group_id: string; invitee_id: string }): Promise<void> => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('group_invites')
        .insert({
          group_id:   input.group_id,
          inviter_id: user.id,
          invitee_id: input.invitee_id,
          status:     'pending',
        });
      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya tiene una invitación pendiente o ya es miembro.');
        }
        throw new Error(error.message);
      }
    },
    onSuccess: (_v, input) => invalidateInviteCaches(qc, input.group_id),
  });
}

/** Send multiple invites in one call (used by friend-picker modal). */
export function useSendGroupInvitesBulk() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { group_id: string; invitee_ids: string[] }): Promise<number> => {
      if (!user) throw new Error('Not authenticated');
      if (input.invitee_ids.length === 0) return 0;

      const rows = input.invitee_ids.map((id) => ({
        group_id:   input.group_id,
        inviter_id: user.id,
        invitee_id: id,
        status:     'pending' as const,
      }));

      const { error, count } = await supabase
        .from('group_invites')
        .insert(rows, { count: 'exact' });
      if (error) throw new Error(error.message);
      return count ?? rows.length;
    },
    onSuccess: (_count, input) => invalidateInviteCaches(qc, input.group_id),
  });
}

export function useAcceptGroupInvite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string): Promise<string> => {
      // Fetch the group_id first so we know what to invalidate.
      const { data: invRow, error: rErr } = await supabase
        .from('group_invites')
        .select('group_id')
        .eq('id', inviteId)
        .single();
      if (rErr) throw new Error(rErr.message);

      const { error } = await supabase
        .from('group_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);
      if (error) throw new Error(error.message);

      return invRow.group_id;
    },
    onSuccess: (groupId) => invalidateInviteCaches(qc, groupId),
  });
}

export function useDeclineGroupInvite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string): Promise<void> => {
      const { error } = await supabase
        .from('group_invites')
        .update({ status: 'declined' })
        .eq('id', inviteId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateInviteCaches(qc),
  });
}
