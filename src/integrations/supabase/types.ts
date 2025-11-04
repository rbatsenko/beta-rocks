export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      chat_logs: {
        Row: {
          ai_response: string | null;
          cached_input_tokens: number | null;
          country_code: string | null;
          created_at: string;
          duration_ms: number | null;
          error: string | null;
          estimated_cost_usd: number | null;
          friction_score: number | null;
          id: string;
          input_tokens: number | null;
          locale: string | null;
          location_name: string | null;
          message_id: string | null;
          metadata: Json | null;
          output_tokens: number | null;
          reasoning_tokens: number | null;
          rock_type: string | null;
          session_id: string;
          tool_calls: Json | null;
          tool_results: Json | null;
          total_tokens: number | null;
          user_agent: string | null;
          user_message: string;
        };
        Insert: {
          ai_response?: string | null;
          cached_input_tokens?: number | null;
          country_code?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          error?: string | null;
          estimated_cost_usd?: number | null;
          friction_score?: number | null;
          id?: string;
          input_tokens?: number | null;
          locale?: string | null;
          location_name?: string | null;
          message_id?: string | null;
          metadata?: Json | null;
          output_tokens?: number | null;
          reasoning_tokens?: number | null;
          rock_type?: string | null;
          session_id: string;
          tool_calls?: Json | null;
          tool_results?: Json | null;
          total_tokens?: number | null;
          user_agent?: string | null;
          user_message: string;
        };
        Update: {
          ai_response?: string | null;
          cached_input_tokens?: number | null;
          country_code?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          error?: string | null;
          estimated_cost_usd?: number | null;
          friction_score?: number | null;
          id?: string;
          input_tokens?: number | null;
          locale?: string | null;
          location_name?: string | null;
          message_id?: string | null;
          metadata?: Json | null;
          output_tokens?: number | null;
          reasoning_tokens?: number | null;
          rock_type?: string | null;
          session_id?: string;
          tool_calls?: Json | null;
          tool_results?: Json | null;
          total_tokens?: number | null;
          user_agent?: string | null;
          user_message?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          role: string;
          session_id: string;
          tool_invocations: Json | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id: string;
          role: string;
          session_id: string;
          tool_invocations?: Json | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          role?: string;
          session_id?: string;
          tool_invocations?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_sessions: {
        Row: {
          created_at: string | null;
          id: string;
          title: string | null;
          updated_at: string | null;
          user_profile_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          title?: string | null;
          updated_at?: string | null;
          user_profile_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          title?: string | null;
          updated_at?: string | null;
          user_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_profile_id_fkey";
            columns: ["user_profile_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      confirmations: {
        Row: {
          created_at: string | null;
          id: string;
          report_id: string;
          user_key_hash: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          report_id: string;
          user_key_hash: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          report_id?: string;
          user_key_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "confirmations_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      crags: {
        Row: {
          aspects: number[] | null;
          climbing_types: string[] | null;
          country: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          last_synced_at: string | null;
          lat: number;
          lon: number;
          municipality: string | null;
          name: string;
          osm_id: string | null;
          osm_type: string | null;
          rock_type: string | null;
          slug: string;
          slug_id: number;
          source: string | null;
          state: string | null;
          updated_at: string | null;
          village: string | null;
        };
        Insert: {
          aspects?: number[] | null;
          climbing_types?: string[] | null;
          country?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          last_synced_at?: string | null;
          lat: number;
          lon: number;
          municipality?: string | null;
          name: string;
          osm_id?: string | null;
          osm_type?: string | null;
          rock_type?: string | null;
          slug: string;
          slug_id?: number;
          source?: string | null;
          state?: string | null;
          updated_at?: string | null;
          village?: string | null;
        };
        Update: {
          aspects?: number[] | null;
          climbing_types?: string[] | null;
          country?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          last_synced_at?: string | null;
          lat?: number;
          lon?: number;
          municipality?: string | null;
          name?: string;
          osm_id?: string | null;
          osm_type?: string | null;
          rock_type?: string | null;
          slug?: string;
          slug_id?: number;
          source?: string | null;
          state?: string | null;
          updated_at?: string | null;
          village?: string | null;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          author_id: string | null;
          category: string;
          crag_id: string | null;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          lost_found_type: string | null;
          observed_at: string;
          photo_url: string | null;
          rating_crowds: number | null;
          rating_dry: number | null;
          rating_wind: number | null;
          route_id: string | null;
          sector_id: string | null;
          text: string | null;
          updated_at: string | null;
        };
        Insert: {
          author_id?: string | null;
          category?: string;
          crag_id?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          lost_found_type?: string | null;
          observed_at?: string;
          photo_url?: string | null;
          rating_crowds?: number | null;
          rating_dry?: number | null;
          rating_wind?: number | null;
          route_id?: string | null;
          sector_id?: string | null;
          text?: string | null;
          updated_at?: string | null;
        };
        Update: {
          author_id?: string | null;
          category?: string;
          crag_id?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          lost_found_type?: string | null;
          observed_at?: string;
          photo_url?: string | null;
          rating_crowds?: number | null;
          rating_dry?: number | null;
          rating_wind?: number | null;
          route_id?: string | null;
          sector_id?: string | null;
          text?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reports_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_crag_id_fkey";
            columns: ["crag_id"];
            isOneToOne: false;
            referencedRelation: "crags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
        ];
      };
      routes: {
        Row: {
          climbing_type: string | null;
          created_at: string | null;
          description: string | null;
          grade: string | null;
          id: string;
          last_synced_at: string | null;
          name: string;
          osm_id: string | null;
          osm_type: string | null;
          pitches: number | null;
          sector_id: string;
          source: string | null;
          updated_at: string | null;
        };
        Insert: {
          climbing_type?: string | null;
          created_at?: string | null;
          description?: string | null;
          grade?: string | null;
          id?: string;
          last_synced_at?: string | null;
          name: string;
          osm_id?: string | null;
          osm_type?: string | null;
          pitches?: number | null;
          sector_id: string;
          source?: string | null;
          updated_at?: string | null;
        };
        Update: {
          climbing_type?: string | null;
          created_at?: string | null;
          description?: string | null;
          grade?: string | null;
          id?: string;
          last_synced_at?: string | null;
          name?: string;
          osm_id?: string | null;
          osm_type?: string | null;
          pitches?: number | null;
          sector_id?: string;
          source?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "routes_sector_id_fkey";
            columns: ["sector_id"];
            isOneToOne: false;
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
        ];
      };
      sectors: {
        Row: {
          aspect: number | null;
          crag_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          last_synced_at: string | null;
          lat: number | null;
          lon: number | null;
          name: string;
          osm_id: string | null;
          osm_type: string | null;
          slug: string;
          slug_id: number | null;
          source: string | null;
          updated_at: string | null;
        };
        Insert: {
          aspect?: number | null;
          crag_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          last_synced_at?: string | null;
          lat?: number | null;
          lon?: number | null;
          name: string;
          osm_id?: string | null;
          osm_type?: string | null;
          slug: string;
          slug_id?: number | null;
          source?: string | null;
          updated_at?: string | null;
        };
        Update: {
          aspect?: number | null;
          crag_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          last_synced_at?: string | null;
          lat?: number | null;
          lon?: number | null;
          name?: string;
          osm_id?: string | null;
          osm_type?: string | null;
          slug?: string;
          slug_id?: number | null;
          source?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sectors_crag_id_fkey";
            columns: ["crag_id"];
            isOneToOne: false;
            referencedRelation: "crags";
            referencedColumns: ["id"];
          },
        ];
      };
      user_favorites: {
        Row: {
          added_at: string | null;
          area_id: string | null;
          area_name: string;
          area_slug: string | null;
          crag_id: string | null;
          created_at: string | null;
          display_order: number | null;
          id: string;
          last_checked_at: string | null;
          last_friction_score: number | null;
          last_rating: string | null;
          latitude: number;
          location: string | null;
          longitude: number;
          rock_type: string | null;
          updated_at: string | null;
          user_profile_id: string;
        };
        Insert: {
          added_at?: string | null;
          area_id?: string | null;
          area_name: string;
          area_slug?: string | null;
          crag_id?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          last_checked_at?: string | null;
          last_friction_score?: number | null;
          last_rating?: string | null;
          latitude: number;
          location?: string | null;
          longitude: number;
          rock_type?: string | null;
          updated_at?: string | null;
          user_profile_id: string;
        };
        Update: {
          added_at?: string | null;
          area_id?: string | null;
          area_name?: string;
          area_slug?: string | null;
          crag_id?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          last_checked_at?: string | null;
          last_friction_score?: number | null;
          last_rating?: string | null;
          latitude?: number;
          location?: string | null;
          longitude?: number;
          rock_type?: string | null;
          updated_at?: string | null;
          user_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_favorites_crag_id_fkey";
            columns: ["crag_id"];
            isOneToOne: false;
            referencedRelation: "crags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_favorites_user_profile_id_fkey";
            columns: ["user_profile_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          created_at: string | null;
          display_name: string | null;
          id: string;
          sync_key_hash: string;
          units_distance: string | null;
          units_elevation: string | null;
          units_precipitation: string | null;
          units_temperature: string | null;
          units_wind_speed: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          display_name?: string | null;
          id?: string;
          sync_key_hash: string;
          units_distance?: string | null;
          units_elevation?: string | null;
          units_precipitation?: string | null;
          units_temperature?: string | null;
          units_wind_speed?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          display_name?: string | null;
          id?: string;
          sync_key_hash?: string;
          units_distance?: string | null;
          units_elevation?: string | null;
          units_precipitation?: string | null;
          units_temperature?: string | null;
          units_wind_speed?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_stats: {
        Row: {
          confirmations_given: number | null;
          created_at: string | null;
          favorites_count: number | null;
          last_active: string | null;
          reports_posted: number | null;
          updated_at: string | null;
          user_profile_id: string;
        };
        Insert: {
          confirmations_given?: number | null;
          created_at?: string | null;
          favorites_count?: number | null;
          last_active?: string | null;
          reports_posted?: number | null;
          updated_at?: string | null;
          user_profile_id: string;
        };
        Update: {
          confirmations_given?: number | null;
          created_at?: string | null;
          favorites_count?: number | null;
          last_active?: string | null;
          reports_posted?: number | null;
          updated_at?: string | null;
          user_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_stats_user_profile_id_fkey";
            columns: ["user_profile_id"];
            isOneToOne: true;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      fetch_reports_by_crag_sorted: {
        Args: { p_crag_id: string; p_limit?: number };
        Returns: {
          author: Json;
          author_id: string;
          category: string;
          confirmations: Json;
          crag_id: string;
          created_at: string;
          expires_at: string;
          id: string;
          lost_found_type: string;
          observed_at: string;
          rating_crowds: number;
          rating_dry: number;
          rating_wind: number;
          route_id: string;
          sector_id: string;
          text: string;
          updated_at: string;
        }[];
      };
      generate_unique_slug: {
        Args: { base_name: string; crag_id: string };
        Returns: string;
      };
      get_user_profile_by_hash: {
        Args: { p_sync_key_hash: string };
        Returns: {
          created_at: string;
          display_name: string;
          id: string;
          sync_key_hash: string;
          units_distance: string;
          units_elevation: string;
          units_precipitation: string;
          units_temperature: string;
          units_wind_speed: string;
          updated_at: string;
        }[];
      };
      immutable_unaccent: { Args: { "": string }; Returns: string };
      search_crags_enhanced: {
        Args: { search_query: string };
        Returns: {
          climbing_types: string[];
          country: string;
          description: string;
          id: string;
          lat: number;
          lon: number;
          match_score: number;
          match_type: string;
          municipality: string;
          name: string;
          report_count: number;
          rock_type: string;
          slug: string;
          source: string;
          state: string;
          village: string;
        }[];
      };
      search_crags_unaccent: {
        Args: { search_query: string };
        Returns: {
          aspects: number[];
          climbing_types: string[];
          country: string;
          created_at: string;
          description: string;
          id: string;
          last_synced_at: string;
          lat: number;
          lon: number;
          municipality: string;
          name: string;
          osm_id: string;
          osm_type: string;
          rock_type: string;
          source: string;
          state: string;
          updated_at: string;
          village: string;
        }[];
      };
      search_locations_enhanced: {
        Args: { search_query: string };
        Returns: {
          climbing_types: string[];
          country: string;
          description: string;
          id: string;
          lat: number;
          lon: number;
          match_score: number;
          match_type: string;
          municipality: string;
          name: string;
          parent_crag_id: string;
          parent_crag_name: string;
          parent_crag_slug: string;
          report_count: number;
          result_type: string;
          rock_type: string;
          slug: string;
          source: string;
          state: string;
          village: string;
        }[];
      };
      search_locations_unaccent: {
        Args: { search_query: string };
        Returns: {
          climbing_types: string[];
          country: string;
          description: string;
          id: string;
          lat: number;
          lon: number;
          municipality: string;
          name: string;
          parent_crag_id: string;
          parent_crag_name: string;
          parent_crag_slug: string;
          result_type: string;
          rock_type: string;
          slug: string;
          source: string;
          state: string;
          village: string;
        }[];
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      slugify: { Args: { text_input: string }; Returns: string };
      unaccent: { Args: { "": string }; Returns: string };
      update_user_profile_by_hash: {
        Args: {
          p_display_name?: string;
          p_sync_key_hash: string;
          p_units_distance?: string;
          p_units_elevation?: string;
          p_units_precipitation?: string;
          p_units_temperature?: string;
          p_units_wind_speed?: string;
        };
        Returns: {
          created_at: string;
          display_name: string;
          id: string;
          sync_key_hash: string;
          units_distance: string;
          units_elevation: string;
          units_precipitation: string;
          units_temperature: string;
          units_wind_speed: string;
          updated_at: string;
        }[];
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
