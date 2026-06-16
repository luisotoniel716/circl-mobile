// Auto-generated from Supabase. Regenerate via the Supabase MCP tool
// (`generate_typescript_types`) whenever the schema changes.
//
// Below the generated `Database` type we re-export shorthand row types
// for convenience across the app.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      friendships: {
        Row: {
          addressee: string;
          created_at: string;
          id: string;
          requester: string;
          status: string;
        };
        Insert: {
          addressee: string;
          created_at?: string;
          id?: string;
          requester: string;
          status?: string;
        };
        Update: {
          addressee?: string;
          created_at?: string;
          id?: string;
          requester?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friendships_addressee_fkey';
            columns: ['addressee'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_requester_fkey';
            columns: ['requester'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      group_invites: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          invitee_id: string;
          inviter_id: string;
          responded_at: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          invitee_id: string;
          inviter_id: string;
          responded_at?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          invitee_id?: string;
          inviter_id?: string;
          responded_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_invites_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_invites_invitee_id_fkey';
            columns: ['invitee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_invites_inviter_id_fkey';
            columns: ['inviter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          id: string;
          joined_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          id?: string;
          joined_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          id?: string;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      groups: {
        Row: {
          accent: string;
          created_at: string;
          created_by: string;
          icon: string;
          id: string;
          image_url: string | null;
          invite_code: string;
          league_id: string;
          name: string;
        };
        Insert: {
          accent?: string;
          created_at?: string;
          created_by: string;
          icon?: string;
          id?: string;
          image_url?: string | null;
          invite_code?: string;
          league_id: string;
          name: string;
        };
        Update: {
          accent?: string;
          created_at?: string;
          created_by?: string;
          icon?: string;
          id?: string;
          image_url?: string | null;
          invite_code?: string;
          league_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'groups_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'groups_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
        ];
      };
      leagues: {
        Row: {
          active: boolean;
          country: string;
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
        };
        Insert: {
          active?: boolean;
          country: string;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug: string;
        };
        Update: {
          active?: boolean;
          country?: string;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          away_score: number | null;
          away_team_id: string;
          created_at: string;
          external_id: string | null;
          home_score: number | null;
          home_team_id: string;
          id: string;
          kickoff_at: string;
          league_id: string;
          matchday: number;
          season_id: string;
          status: string;
        };
        Insert: {
          away_score?: number | null;
          away_team_id: string;
          created_at?: string;
          external_id?: string | null;
          home_score?: number | null;
          home_team_id: string;
          id?: string;
          kickoff_at: string;
          league_id: string;
          matchday: number;
          season_id: string;
          status?: string;
        };
        Update: {
          away_score?: number | null;
          away_team_id?: string;
          created_at?: string;
          external_id?: string | null;
          home_score?: number | null;
          home_team_id?: string;
          id?: string;
          kickoff_at?: string;
          league_id?: string;
          matchday?: number;
          season_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'matches_away_team_id_fkey';
            columns: ['away_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_home_team_id_fkey';
            columns: ['home_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          created_at: string;
          data: Json;
          group_id: string | null;
          id: string;
          kind: string;
          match_id: string | null;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          data?: Json;
          group_id?: string | null;
          id?: string;
          kind: string;
          match_id?: string | null;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          data?: Json;
          group_id?: string | null;
          id?: string;
          kind?: string;
          match_id?: string | null;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      pick_results: {
        Row: {
          calculated_at: string;
          correct: boolean;
          id: string;
          pick_id: string;
          points: number;
        };
        Insert: {
          calculated_at?: string;
          correct: boolean;
          id?: string;
          pick_id: string;
          points?: number;
        };
        Update: {
          calculated_at?: string;
          correct?: boolean;
          id?: string;
          pick_id?: string;
          points?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'pick_results_pick_id_fkey';
            columns: ['pick_id'];
            isOneToOne: true;
            referencedRelation: 'picks';
            referencedColumns: ['id'];
          },
        ];
      };
      picks: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          match_id: string;
          prediction: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          match_id: string;
          prediction: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          match_id?: string;
          prediction?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'picks_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'picks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          favorite_team_id: string | null;
          id: string;
          is_admin: boolean;
          name: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          favorite_team_id?: string | null;
          id: string;
          is_admin?: boolean;
          name: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          favorite_team_id?: string | null;
          id?: string;
          is_admin?: boolean;
          name?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_favorite_team_id_fkey';
            columns: ['favorite_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          device_name: string | null;
          id: string;
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          platform: string;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          platform?: string;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      seasons: {
        Row: {
          active: boolean;
          created_at: string;
          end_date: string;
          id: string;
          league_id: string;
          name: string;
          slug: string;
          start_date: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          end_date: string;
          id?: string;
          league_id: string;
          name: string;
          slug: string;
          start_date: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          end_date?: string;
          id?: string;
          league_id?: string;
          name?: string;
          slug?: string;
          start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'seasons_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          league_id: string;
          logo_url: string | null;
          name: string;
          primary_color: string;
          secondary_color: string;
          short_name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          league_id: string;
          logo_url?: string | null;
          name: string;
          primary_color?: string;
          secondary_color?: string;
          short_name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          league_id?: string;
          logo_url?: string | null;
          name?: string;
          primary_color?: string;
          secondary_color?: string;
          short_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teams_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_pick_results: { Args: { p_match_id: string }; Returns: number };
      friendship_status_with: { Args: { p_other: string }; Returns: string };
      group_user_points: { Args: { p_group_id: string; p_user_id: string }; Returns: number };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_group_admin: { Args: { p_group_id: string }; Returns: boolean };
      is_group_member: { Args: { g: string }; Returns: boolean };
      join_group_by_code: { Args: { p_code: string }; Returns: string };
      search_users: {
        Args: { p_query: string; p_limit?: number };
        Returns: { id: string; username: string; name: string; avatar_url: string | null }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ─── Shorthand row types ─────────────────────────────────────
// Kept for back-compat with existing imports.

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
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type GroupInvite  = Database['public']['Tables']['group_invites']['Row'];
export type PushToken    = Database['public']['Tables']['push_tokens']['Row'];
