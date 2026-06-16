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

// ─── Teams (read-only listing for favorite team picker) ─────

export interface TeamRow {
  id:         string;
  code:       string;
  short_name: string;
  name:       string;
  league_id:  string;
}

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
