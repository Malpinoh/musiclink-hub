export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clicks: {
        Row: {
          city: string | null
          clicked_at: string
          country: string | null
          device_type: string | null
          fanlink_id: string
          id: string
          ip_address: string | null
          platform_name: string | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          fanlink_id: string
          id?: string
          ip_address?: string | null
          platform_name?: string | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          fanlink_id?: string
          id?: string
          ip_address?: string | null
          platform_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_fanlink_id_fkey"
            columns: ["fanlink_id"]
            isOneToOne: false
            referencedRelation: "fanlinks"
            referencedColumns: ["id"]
          },
        ]
      }
      fanlinks: {
        Row: {
          artist: string
          artist_slug: string
          artwork_url: string | null
          created_at: string
          id: string
          is_published: boolean | null
          isrc: string | null
          release_date: string | null
          release_type: string | null
          slug: string
          title: string
          upc: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artist: string
          artist_slug: string
          artwork_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          isrc?: string | null
          release_date?: string | null
          release_type?: string | null
          slug: string
          title: string
          upc?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artist?: string
          artist_slug?: string
          artwork_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          isrc?: string | null
          release_date?: string | null
          release_type?: string | null
          slug?: string
          title?: string
          upc?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_links: {
        Row: {
          created_at: string
          display_order: number | null
          fanlink_id: string
          id: string
          is_active: boolean | null
          platform_name: string
          platform_url: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          fanlink_id: string
          id?: string
          is_active?: boolean | null
          platform_name: string
          platform_url: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          fanlink_id?: string
          id?: string
          is_active?: boolean | null
          platform_name?: string
          platform_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_links_fanlink_id_fkey"
            columns: ["fanlink_id"]
            isOneToOne: false
            referencedRelation: "fanlinks"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_save_actions: {
        Row: {
          action_type: string
          city: string | null
          completed: boolean | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          library_saved: boolean | null
          library_saved_at: string | null
          pre_save_id: string
          spotify_access_token: string | null
          spotify_refresh_token: string | null
          spotify_user_id: string | null
          token_expires_at: string | null
        }
        Insert: {
          action_type: string
          city?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          library_saved?: boolean | null
          library_saved_at?: string | null
          pre_save_id: string
          spotify_access_token?: string | null
          spotify_refresh_token?: string | null
          spotify_user_id?: string | null
          token_expires_at?: string | null
        }
        Update: {
          action_type?: string
          city?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          library_saved?: boolean | null
          library_saved_at?: string | null
          pre_save_id?: string
          spotify_access_token?: string | null
          spotify_refresh_token?: string | null
          spotify_user_id?: string | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pre_save_actions_pre_save_id_fkey"
            columns: ["pre_save_id"]
            isOneToOne: false
            referencedRelation: "pre_saves"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_saves: {
        Row: {
          album_title: string | null
          apple_music_resolved: boolean | null
          apple_music_url: string | null
          artist: string
          artist_slug: string
          artwork_url: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_released: boolean | null
          isrc: string | null
          release_date: string | null
          slug: string
          spotify_album_id: string | null
          spotify_artist_id: string | null
          spotify_uri: string | null
          title: string
          upc: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          album_title?: string | null
          apple_music_resolved?: boolean | null
          apple_music_url?: string | null
          artist: string
          artist_slug: string
          artwork_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_released?: boolean | null
          isrc?: string | null
          release_date?: string | null
          slug: string
          spotify_album_id?: string | null
          spotify_artist_id?: string | null
          spotify_uri?: string | null
          title: string
          upc?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          album_title?: string | null
          apple_music_resolved?: boolean | null
          apple_music_url?: string | null
          artist?: string
          artist_slug?: string
          artwork_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_released?: boolean | null
          isrc?: string | null
          release_date?: string | null
          slug?: string
          spotify_album_id?: string | null
          spotify_artist_id?: string | null
          spotify_uri?: string | null
          title?: string
          upc?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
