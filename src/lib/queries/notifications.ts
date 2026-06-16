import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import type { Notification, Profile } from '../../types/database';

// ─── Types ────────────────────────────────────────────────────

export type NotificationKind =
  | 'friend_request'
  | 'friend_accepted'
  | 'group_invite'
  | 'group_invite_accepted'
  | 'group_member_joined'
  | 'group_member_left'
  | 'group_admin_assigned'
  | 'pick_correct'
  | 'pick_missed'
  | 'match_kickoff_soon'
  | 'rank_up'
  | 'rank_down'
  | 'streak'
  | 'replaced_in_pick';

export interface NotificationRow extends Omit<Notification, 'kind'> {
  kind: NotificationKind;
  actor:  Pick<Profile, 'id' | 'name' | 'username' | 'avatar_url'> | null;
  group:  { id: string; name: string; icon: string; accent: string; image_url: string | null } | null;
}

// ─── List notifications ──────────────────────────────────────

/**
 * All notifications for the current user, newest first.
 * Joins actor profile + group info for rendering.
 */
export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id, user_id, kind, data, actor_id, group_id, match_id, read_at, created_at,
          actor:profiles!notifications_actor_id_fkey ( id, name, username, avatar_url ),
          group:groups!notifications_group_id_fkey   ( id, name, icon, accent, image_url )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      return (data ?? []).map((row): NotificationRow => {
        const r = row as unknown as NotificationRow & {
          actor: NotificationRow['actor'] | NotificationRow['actor'][];
          group: NotificationRow['group'] | NotificationRow['group'][];
        };
        const actor = Array.isArray(r.actor) ? r.actor[0] ?? null : r.actor;
        const group = Array.isArray(r.group) ? r.group[0] ?? null : r.group;
        return { ...r, actor, group };
      });
    },
  });
}

// ─── Unread count ────────────────────────────────────────────

export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', 'unread-count', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

// ─── Realtime subscription ───────────────────────────────────

/**
 * Subscribe to live notification changes for the current user.
 * Invalidates the cache on any INSERT/UPDATE/DELETE on notifications.
 * Mount once near the top of the tree (we'll put it in the auth provider).
 */
export function useNotificationsRealtime() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          // Refresh everything that might be affected by a new notification:
          // friend requests/accepted, group invites/joins, group rosters.
          // Cheap because react-query refetches lazily.
          qc.invalidateQueries({ queryKey: ['notifications'] });
          qc.invalidateQueries({ queryKey: ['friends'] });
          qc.invalidateQueries({ queryKey: ['friend-requests'] });
          qc.invalidateQueries({ queryKey: ['friendship-status'] });
          qc.invalidateQueries({ queryKey: ['group-invites'] });
          qc.invalidateQueries({ queryKey: ['invitable-friends'] });
          qc.invalidateQueries({ queryKey: ['groups', 'me'] });
          qc.invalidateQueries({ queryKey: ['group-members'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, user]);
}

// ─── Mark read ───────────────────────────────────────────────

export function useMarkAsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────

export function useDeleteNotification() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
