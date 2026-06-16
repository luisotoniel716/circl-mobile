import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { League } from '../../types/database';

/** All active leagues. */
export function useLeagues() {
  return useQuery({
    queryKey: ['leagues'],
    staleTime: 10 * 60 * 1000, // leagues rarely change
    queryFn: async (): Promise<League[]> => {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
