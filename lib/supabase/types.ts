export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      descriptors: {
        Row: {
          created_at: string
          family: string
          id: string
          label_en: string
          label_ru: string
          subfamily: string | null
          tier: string
        }
        Insert: {
          created_at?: string
          family: string
          id?: string
          label_en: string
          label_ru: string
          subfamily?: string | null
          tier: string
        }
        Update: {
          created_at?: string
          family?: string
          id?: string
          label_en?: string
          label_ru?: string
          subfamily?: string | null
          tier?: string
        }
        Relationships: []
      }
      grapes: {
        Row: {
          color: string
          created_at: string
          id: string
          name_en: string
          name_native: string[]
          name_ru: string
          search_aliases: string[]
          search_text: unknown
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          name_en: string
          name_native?: string[]
          name_ru: string
          search_aliases?: string[]
          search_text?: unknown
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name_en?: string
          name_native?: string[]
          name_ru?: string
          search_aliases?: string[]
          search_text?: unknown
        }
        Relationships: []
      }
      group_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          group_id: string
          id: string
          single_use: boolean
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          group_id: string
          id?: string
          single_use?: boolean
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          single_use?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      producers: {
        Row: {
          created_at: string
          founded_year: number | null
          id: string
          name: string
          region_id: string | null
          search_aliases: string[]
          search_text: unknown
          website: string | null
        }
        Insert: {
          created_at?: string
          founded_year?: number | null
          id?: string
          name: string
          region_id?: string | null
          search_aliases?: string[]
          search_text?: unknown
          website?: string | null
        }
        Update: {
          created_at?: string
          founded_year?: number | null
          id?: string
          name?: string
          region_id?: string | null
          search_aliases?: string[]
          search_text?: unknown
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producers_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          preferred_scale: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          preferred_scale?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          preferred_scale?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          classification: string | null
          country_code: string
          created_at: string
          id: string
          name_en: string
          name_ru: string
          parent_id: string | null
          search_aliases: string[]
          search_text: unknown
        }
        Insert: {
          classification?: string | null
          country_code: string
          created_at?: string
          id?: string
          name_en: string
          name_ru: string
          parent_id?: string | null
          search_aliases?: string[]
          search_text?: unknown
        }
        Update: {
          classification?: string | null
          country_code?: string
          created_at?: string
          id?: string
          name_en?: string
          name_ru?: string
          parent_id?: string | null
          search_aliases?: string[]
          search_text?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      tasting_notes: {
        Row: {
          appearance: Json
          conclusion: Json
          favorite_of_flight: boolean
          id: string
          nose: Json
          overall_scale_raw: Json | null
          overall_score: number | null
          palate: Json
          schema_version: number
          submitted_at: string | null
          updated_at: string
          user_id: string
          wine_in_session_id: string
        }
        Insert: {
          appearance?: Json
          conclusion?: Json
          favorite_of_flight?: boolean
          id?: string
          nose?: Json
          overall_scale_raw?: Json | null
          overall_score?: number | null
          palate?: Json
          schema_version?: number
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          wine_in_session_id: string
        }
        Update: {
          appearance?: Json
          conclusion?: Json
          favorite_of_flight?: boolean
          id?: string
          nose?: Json
          overall_scale_raw?: Json | null
          overall_score?: number | null
          palate?: Json
          schema_version?: number
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          wine_in_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasting_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasting_notes_wine_in_session_id_fkey"
            columns: ["wine_in_session_id"]
            isOneToOne: false
            referencedRelation: "wines_in_session"
            referencedColumns: ["id"]
          },
        ]
      }
      tasting_sessions: {
        Row: {
          blind_mode: boolean
          created_at: string
          created_by: string
          depth_mode: string
          group_id: string
          id: string
          session_date: string
          status: string
          theme: string | null
          title: string
        }
        Insert: {
          blind_mode?: boolean
          created_at?: string
          created_by: string
          depth_mode?: string
          group_id: string
          id?: string
          session_date?: string
          status?: string
          theme?: string | null
          title: string
        }
        Update: {
          blind_mode?: boolean
          created_at?: string
          created_by?: string
          depth_mode?: string
          group_id?: string
          id?: string
          session_date?: string
          status?: string
          theme?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasting_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasting_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      wines: {
        Row: {
          abv: number | null
          country_code: string | null
          created_at: string
          created_by_group_id: string | null
          external_refs: Json
          grape_ids: string[]
          id: string
          name: string
          price: number | null
          price_currency: string | null
          producer_id: string | null
          region_id: string | null
          search_aliases: string[]
          search_text: unknown
          vintage: number | null
          wine_type: string
        }
        Insert: {
          abv?: number | null
          country_code?: string | null
          created_at?: string
          created_by_group_id?: string | null
          external_refs?: Json
          grape_ids?: string[]
          id?: string
          name: string
          price?: number | null
          price_currency?: string | null
          producer_id?: string | null
          region_id?: string | null
          search_aliases?: string[]
          search_text?: unknown
          vintage?: number | null
          wine_type: string
        }
        Update: {
          abv?: number | null
          country_code?: string | null
          created_at?: string
          created_by_group_id?: string | null
          external_refs?: Json
          grape_ids?: string[]
          id?: string
          name?: string
          price?: number | null
          price_currency?: string | null
          producer_id?: string | null
          region_id?: string | null
          search_aliases?: string[]
          search_text?: unknown
          vintage?: number | null
          wine_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wines_created_by_group_id_fkey"
            columns: ["created_by_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wines_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wines_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      wines_in_session: {
        Row: {
          id: string
          position: number
          revealed: boolean
          session_id: string
          wine_id: string
        }
        Insert: {
          id?: string
          position: number
          revealed?: boolean
          session_id: string
          wine_id: string
        }
        Update: {
          id?: string
          position?: number
          revealed?: boolean
          session_id?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wines_in_session_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tasting_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wines_in_session_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_member: { Args: { _group_id: string }; Returns: boolean }
      is_group_owner: { Args: { _group_id: string }; Returns: boolean }
      search_entities: {
        Args: { etype?: string; lim?: number; q: string }
        Returns: {
          entity_type: string
          id: string
          meta: Json
          name: string
          rank: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

