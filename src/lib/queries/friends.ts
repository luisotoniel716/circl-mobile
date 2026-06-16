import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import type { Profile } from '../../types/database';

// ─── Types ────────────────────────────────────────────────────

export type FriendStatus =
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'accepted'
  | 'blocked';

export type ProfileMini = Pick<Profile, 'id' | 'username' | 'name' | 'avatar_url'>;

export interface FriendRow {
  friendship_id: string;
  user: ProfileMini;        // the OTHER user
  created_at: string;
}

export interface FriendRequestRow extends FriendRow {
  direction: 'incoming' | 'outgoing';
}

// ─── Read: accepted friends ──────────────────────────────────

/** All accepted friendships for the current user. */
export function useFriends() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friends', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<FriendRow[]> => {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, requester, addressee, created_at,
          requester_profile:profiles!friendships_requester_fkey ( id, username, name, avatar_url ),
          addressee_profile:profiles!friendships_addressee_fkey ( id, username, name, avatar_url )
        `)
        .eq('status', 'accepted')
        .or(`requester.eq.${user!.id},addressee.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          requester: string;
          addressee: string;
          created_at: string;
          requester_profile: ProfileMini | ProfileMini[];
          addressee_profile: ProfileMini | ProfileMini[];
        };
        const reqProfile = Array.isArray(r.requester_profile) ? r.requester_profile[0] : r.requester_profile;
        const adrProfile = Array.isArray(r.addressee_profile) ? r.addressee_profile[0] : r.addressee_profile;
        const other = r.requester === user!.id ? adrProfile : reqProfile;
        return {
          friendship_id: r.id,
          user:          other,
          created_at:    r.created_at,
        };
      });
    },
  });
}

// ─── Read: pending requests (incoming + outgoing) ────────────

export function useFriendRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friend-requests', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<FriendRequestRow[]> => {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, requester, addressee, created_at,
          requester_profile:profiles!friendships_requester_fkey ( id, username, name, avatar_url ),
          addressee_profile:profiles!friendships_addressee_fkey ( id, username, name, avatar_url )
        `)
        .eq('status', 'pending')
        .or(`requester.eq.${user!.id},addressee.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          requester: string;
          addressee: string;
          created_at: string;
          requester_profile: ProfileMini | ProfileMini[];
          addressee_profile: ProfileMini | ProfileMini[];
        };
        const reqProfile = Array.isArray(r.requester_profile) ? r.requester_profile[0] : r.requester_profile;
        const adrProfile = Array.isArray(r.addressee_profile) ? r.addressee_profile[0] : r.addressee_profile;
        const isIncoming = r.addressee === user!.id;
        return {
          friendship_id: r.id,
          user:          isIncoming ? reqProfile : adrProfile,
          direction:     isIncoming ? 'incoming' : 'outgoing',
          created_at:    r.created_at,
        };
      });
    },
  });
}

// ─── Friendship status with another user ─────────────────────

export function useFriendshipStatus(otherId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friendship-status', user?.id ?? null, otherId ?? null],
    enabled: !!user && !!otherId && otherId !== user.id,
    queryFn: async (): Promise<FriendStatus> => {
      const { data, error } = await supabase.rpc('friendship_status_with', { p_other: otherId! });
      if (error) throw error;
      return (data ?? 'none') as FriendStatus;
    },
  });
}

// ─── Search users by @username or name ───────────────────────

export function useSearchUsers(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['user-search', trimmed.toLowerCase()],
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<ProfileMini[]> => {
      const q = trimmed.replace(/^@/, '');
      const { data, error } = await supabase.rpc('search_users', { p_query: q, p_limit: 20 });
      if (error) throw error;
      return (data ?? []) as ProfileMini[];
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────

function invalidateFriendCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['friends'] });
  qc.invalidateQueries({ queryKey: ['friend-requests'] });
  qc.invalidateQueries({ queryKey: ['friendship-status'] });
  qc.invalidateQueries({ queryKey: ['notifications'] });
}

/** Send a friend request to another user. */
export function useSendFriendRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (addresseeId: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');
      if (addresseeId === user.id) throw new Error('No puedes agregarte a ti mismo.');

      const { error } = await supabase
        .from('friendships')
        .insert({ requester: user.id, addressee: addresseeId, status: 'pending' });

      if (error) {
        // Unique pair violation = already friends or pending
        if (error.code === '23505') {
          throw new Error('Ya existe una solicitud o son amigos.');
        }
        throw new Error(error.message);
      }
    },
    onSuccess: () => invalidateFriendCaches(qc),
  });
}

/** Accept a pending incoming friend request. */
export function useAcceptFriendRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string): Promise<void> => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateFriendCaches(qc),
  });
}

/** Decline or cancel a friendship (incoming request, outgoing request, or unfriend). */
export function useRemoveFriendship() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string): Promise<void> => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateFriendCaches(qc),
  });
}
