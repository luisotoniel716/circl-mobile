// Auto-generated shape matching the Supabase schema.
// Regenerate with: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      leagues: {
        Row: {
          id: string;
          name: string;
          slug: string;
          country: string;
          logo_url: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leagues']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['leagues']['Insert']>;
      };
      seasons: {
        Row: {
          id: string;
          league_id: string;
          name: string;
          slug: string;
          start_date: string;
          end_date: string;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['seasons']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['seasons']['Insert']>;
      };
      teams: {
        Row: {
          id: string;
          league_id: string;
          name: string;
          short_name: string;
          code: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      matches: {
        Row: {
          id: string;
          season_id: string;
          league_id: string;
          home_team_id: string;
          away_team_id: string;
          kickoff_at: string;
          status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
          home_score: number | null;
          away_score: number | null;
          matchday: number;
          external_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['matches']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          name: string;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Pick<Database['public']['Tables']['profiles']['Row'], 'username' | 'name' | 'avatar_url' | 'bio'>>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          icon: string;
          accent: string;
          league_id: string;
          invite_code: string;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'invite_code' | 'created_at'> & { id?: string; invite_code?: string };
        Update: Partial<Pick<Database['public']['Tables']['groups']['Row'], 'name' | 'icon' | 'accent'>>;
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['group_members']['Row'], 'id' | 'joined_at'> & { id?: string };
        Update: Partial<Pick<Database['public']['Tables']['group_members']['Row'], 'role'>>;
      };
      picks: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          group_id: string;
          prediction: 'home' | 'draw' | 'away';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['picks']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Pick<Database['public']['Tables']['picks']['Row'], 'prediction'>>;
      };
      pick_results: {
        Row: {
          id: string;
          pick_id: string;
          correct: boolean;
          points: number;
          calculated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pick_results']['Row'], 'id' | 'calculated_at'> & { id?: string };
        Update: never;
      };
      friendships: {
        Row: {
          id: string;
          requester: string;
          addressee: string;
          status: 'pending' | 'accepted' | 'blocked';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['friendships']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Pick<Database['public']['Tables']['friendships']['Row'], 'status'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Shorthand row types
export type League       = Database['public']['Tables']['leagues']['Row'];
export type Season       = Database['public']['Tables']['seasons']['Row'];
export type DBTeam       = Database['public']['Tables']['teams']['Row'];
export type DBMatch      = Database['public']['Tables']['matches']['Row'];
export type Profile      = Database['public']['Tables']['profiles']['Row'];
export type DBGroup      = Database['public']['Tables']['groups']['Row'];
export type GroupMember  = Database['public']['Tables']['group_members']['Row'];
export type DBPick       = Database['public']['Tables']['picks']['Row'];
export type PickResult   = Database['public']['Tables']['pick_results']['Row'];
export type Friendship   = Database['public']['Tables']['friendships']['Row'];
