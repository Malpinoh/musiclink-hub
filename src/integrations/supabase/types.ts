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
      ad_campaigns: {
        Row: {
          advertiser: string
          cpc_cents: number
          cpm_cents: number
          created_at: string
          cta_text: string | null
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_house_ad: boolean
          starts_at: string | null
          target_url: string
          title: string
          updated_at: string
        }
        Insert: {
          advertiser: string
          cpc_cents?: number
          cpm_cents?: number
          created_at?: string
          cta_text?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_house_ad?: boolean
          starts_at?: string | null
          target_url: string
          title: string
          updated_at?: string
        }
        Update: {
          advertiser?: string
          cpc_cents?: number
          cpm_cents?: number
          created_at?: string
          cta_text?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_house_ad?: boolean
          starts_at?: string | null
          target_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_impressions: {
        Row: {
          ad_campaign_id: string
          artist_user_id: string | null
          country: string | null
          created_at: string
          event_type: string
          fanlink_id: string | null
          id: string
          pre_save_id: string | null
        }
        Insert: {
          ad_campaign_id: string
          artist_user_id?: string | null
          country?: string | null
          created_at?: string
          event_type: string
          fanlink_id?: string | null
          id?: string
          pre_save_id?: string | null
        }
        Update: {
          ad_campaign_id?: string
          artist_user_id?: string | null
          country?: string | null
          created_at?: string
          event_type?: string
          fanlink_id?: string | null
          id?: string
          pre_save_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_campaign_id_fkey"
            columns: ["ad_campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_revenue_shares: {
        Row: {
          artist_user_id: string
          id: string
          share_percent: number
          total_clicks: number
          total_earned_cents: number
          total_impressions: number
          total_paid_cents: number
          updated_at: string
        }
        Insert: {
          artist_user_id: string
          id?: string
          share_percent?: number
          total_clicks?: number
          total_earned_cents?: number
          total_impressions?: number
          total_paid_cents?: number
          updated_at?: string
        }
        Update: {
          artist_user_id?: string
          id?: string
          share_percent?: number
          total_clicks?: number
          total_earned_cents?: number
          total_impressions?: number
          total_paid_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          properties: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          category: string
          context: Json
          created_at: string
          fan_id: string | null
          id: string
          ip: string | null
          level: string
          message: string
          origin: string | null
          pre_save_id: string | null
          step: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          context?: Json
          created_at?: string
          fan_id?: string | null
          id?: string
          ip?: string | null
          level?: string
          message: string
          origin?: string | null
          pre_save_id?: string | null
          step: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          context?: Json
          created_at?: string
          fan_id?: string | null
          id?: string
          ip?: string | null
          level?: string
          message?: string
          origin?: string | null
          pre_save_id?: string | null
          step?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      artist_custom_buttons: {
        Row: {
          artist_profile_id: string
          created_at: string
          display_order: number | null
          id: string
          title: string
          url: string
        }
        Insert: {
          artist_profile_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          title: string
          url: string
        }
        Update: {
          artist_profile_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_custom_buttons_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_link_clicks: {
        Row: {
          artist_profile_id: string
          clicked_at: string
          country: string | null
          id: string
          ip_address: string | null
          link_label: string | null
          link_type: string
          link_url: string | null
        }
        Insert: {
          artist_profile_id: string
          clicked_at?: string
          country?: string | null
          id?: string
          ip_address?: string | null
          link_label?: string | null
          link_type: string
          link_url?: string | null
        }
        Update: {
          artist_profile_id?: string
          clicked_at?: string
          country?: string | null
          id?: string
          ip_address?: string | null
          link_label?: string | null
          link_type?: string
          link_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_link_clicks_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_profile_views: {
        Row: {
          artist_profile_id: string
          country: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          artist_profile_id: string
          country?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          artist_profile_id?: string
          country?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_profile_views_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          profile_picture_url: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          username: string
          youtube_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          profile_picture_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          username: string
          youtube_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          profile_picture_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      campaign_templates: {
        Row: {
          created_at: string
          default_settings: Json | null
          description: string | null
          id: string
          name: string
          template_type: string
        }
        Insert: {
          created_at?: string
          default_settings?: Json | null
          description?: string | null
          id?: string
          name: string
          template_type: string
        }
        Update: {
          created_at?: string
          default_settings?: Json | null
          description?: string | null
          id?: string
          name?: string
          template_type?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          artist_name: string | null
          artwork_url: string | null
          campaign_name: string
          created_at: string
          description: string | null
          fanlink_id: string | null
          id: string
          metadata: Json
          pre_save_id: string | null
          release_date: string | null
          status: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          artist_name?: string | null
          artwork_url?: string | null
          campaign_name: string
          created_at?: string
          description?: string | null
          fanlink_id?: string | null
          id?: string
          metadata?: Json
          pre_save_id?: string | null
          release_date?: string | null
          status?: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          artist_name?: string | null
          artwork_url?: string | null
          campaign_name?: string
          created_at?: string
          description?: string | null
          fanlink_id?: string | null
          id?: string
          metadata?: Json
          pre_save_id?: string | null
          release_date?: string | null
          status?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "campaign_templates"
            referencedColumns: ["id"]
          },
        ]
      }
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
      fan_contacts: {
        Row: {
          collected_at: string
          consent: boolean | null
          country: string | null
          email: string | null
          id: string
          ip_address: string | null
          link_id: string
          phone: string | null
          user_agent: string | null
        }
        Insert: {
          collected_at?: string
          consent?: boolean | null
          country?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          link_id: string
          phone?: string | null
          user_agent?: string | null
        }
        Update: {
          collected_at?: string
          consent?: boolean | null
          country?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          link_id?: string
          phone?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fan_contacts_link_id_fkey"
            columns: ["link_id"]
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
          collect_email: boolean | null
          collect_phone: boolean | null
          created_at: string
          expires_at: string | null
          id: string
          is_published: boolean | null
          isrc: string | null
          release_date: string | null
          release_type: string | null
          require_contact: boolean | null
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
          collect_email?: boolean | null
          collect_phone?: boolean | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          isrc?: string | null
          release_date?: string | null
          release_type?: string | null
          require_contact?: boolean | null
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
          collect_email?: boolean | null
          collect_phone?: boolean | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          isrc?: string | null
          release_date?: string | null
          release_type?: string | null
          require_contact?: boolean | null
          slug?: string
          title?: string
          upc?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      link_themes: {
        Row: {
          background_color: string
          background_image_url: string | null
          button_color: string
          created_at: string
          font_family: string
          id: string
          layout_style: string
          link_id: string
          logo_url: string | null
          text_color: string
          theme_mode: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          background_image_url?: string | null
          button_color?: string
          created_at?: string
          font_family?: string
          id?: string
          layout_style?: string
          link_id: string
          logo_url?: string | null
          text_color?: string
          theme_mode?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          background_image_url?: string | null
          button_color?: string
          created_at?: string
          font_family?: string
          id?: string
          layout_style?: string
          link_id?: string
          logo_url?: string | null
          text_color?: string
          theme_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_themes_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "fanlinks"
            referencedColumns: ["id"]
          },
        ]
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
          artist_followed: boolean
          artist_followed_at: string | null
          city: string | null
          completed: boolean | null
          country: string | null
          created_at: string
          email: string | null
          email_sent: boolean
          email_sent_at: string | null
          fan_email: string | null
          fan_id: string | null
          fan_name: string | null
          id: string
          last_error: string | null
          library_saved: boolean | null
          library_saved_at: string | null
          playlist_added: boolean
          playlist_added_at: string | null
          pre_save_id: string
          spotify_access_token: string | null
          spotify_refresh_token: string | null
          spotify_user_id: string | null
          token_expires_at: string | null
        }
        Insert: {
          action_type: string
          artist_followed?: boolean
          artist_followed_at?: string | null
          city?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          fan_email?: string | null
          fan_id?: string | null
          fan_name?: string | null
          id?: string
          last_error?: string | null
          library_saved?: boolean | null
          library_saved_at?: string | null
          playlist_added?: boolean
          playlist_added_at?: string | null
          pre_save_id: string
          spotify_access_token?: string | null
          spotify_refresh_token?: string | null
          spotify_user_id?: string | null
          token_expires_at?: string | null
        }
        Update: {
          action_type?: string
          artist_followed?: boolean
          artist_followed_at?: string | null
          city?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          fan_email?: string | null
          fan_id?: string | null
          fan_name?: string | null
          id?: string
          last_error?: string | null
          library_saved?: boolean | null
          library_saved_at?: string | null
          playlist_added?: boolean
          playlist_added_at?: string | null
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
      pre_save_themes: {
        Row: {
          accent_color: string
          artist_image_url: string | null
          background_color: string
          background_image_url: string | null
          button_color: string
          countdown_enabled: boolean
          created_at: string
          cta_text: string
          font_family: string
          hero_image_url: string | null
          id: string
          layout_style: string
          logo_url: string | null
          pre_save_id: string
          section_order: Json
          text_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          artist_image_url?: string | null
          background_color?: string
          background_image_url?: string | null
          button_color?: string
          countdown_enabled?: boolean
          created_at?: string
          cta_text?: string
          font_family?: string
          hero_image_url?: string | null
          id?: string
          layout_style?: string
          logo_url?: string | null
          pre_save_id: string
          section_order?: Json
          text_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          artist_image_url?: string | null
          background_color?: string
          background_image_url?: string | null
          button_color?: string
          countdown_enabled?: boolean
          created_at?: string
          cta_text?: string
          font_family?: string
          hero_image_url?: string | null
          id?: string
          layout_style?: string
          logo_url?: string | null
          pre_save_id?: string
          section_order?: Json
          text_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_save_themes_pre_save_id_fkey"
            columns: ["pre_save_id"]
            isOneToOne: true
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
          auto_add_to_playlist: boolean
          auto_follow_artist: boolean
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_released: boolean | null
          isrc: string | null
          links_resolved: boolean | null
          playlist_id: string | null
          preview_audio_url: string | null
          preview_end: number | null
          preview_start: number | null
          release_date: string | null
          send_release_email: boolean
          slug: string
          spotify_album_id: string | null
          spotify_artist_id: string | null
          spotify_uri: string | null
          theme_accent_color: string | null
          theme_bg_color: string | null
          theme_bg_image_url: string | null
          theme_button_color: string | null
          theme_button_text_color: string | null
          theme_countdown_enabled: boolean
          theme_cta_text: string | null
          theme_font_family: string | null
          theme_hero_image_url: string | null
          theme_layout: string
          theme_text_color: string | null
          title: string
          upc: string | null
          updated_at: string
          user_id: string
          waveform_data: Json | null
        }
        Insert: {
          album_title?: string | null
          apple_music_resolved?: boolean | null
          apple_music_url?: string | null
          artist: string
          artist_slug: string
          artwork_url?: string | null
          auto_add_to_playlist?: boolean
          auto_follow_artist?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_released?: boolean | null
          isrc?: string | null
          links_resolved?: boolean | null
          playlist_id?: string | null
          preview_audio_url?: string | null
          preview_end?: number | null
          preview_start?: number | null
          release_date?: string | null
          send_release_email?: boolean
          slug: string
          spotify_album_id?: string | null
          spotify_artist_id?: string | null
          spotify_uri?: string | null
          theme_accent_color?: string | null
          theme_bg_color?: string | null
          theme_bg_image_url?: string | null
          theme_button_color?: string | null
          theme_button_text_color?: string | null
          theme_countdown_enabled?: boolean
          theme_cta_text?: string | null
          theme_font_family?: string | null
          theme_hero_image_url?: string | null
          theme_layout?: string
          theme_text_color?: string | null
          title: string
          upc?: string | null
          updated_at?: string
          user_id: string
          waveform_data?: Json | null
        }
        Update: {
          album_title?: string | null
          apple_music_resolved?: boolean | null
          apple_music_url?: string | null
          artist?: string
          artist_slug?: string
          artwork_url?: string | null
          auto_add_to_playlist?: boolean
          auto_follow_artist?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_released?: boolean | null
          isrc?: string | null
          links_resolved?: boolean | null
          playlist_id?: string | null
          preview_audio_url?: string | null
          preview_end?: number | null
          preview_start?: number | null
          release_date?: string | null
          send_release_email?: boolean
          slug?: string
          spotify_album_id?: string | null
          spotify_artist_id?: string | null
          spotify_uri?: string | null
          theme_accent_color?: string | null
          theme_bg_color?: string | null
          theme_bg_image_url?: string | null
          theme_button_color?: string | null
          theme_button_text_color?: string | null
          theme_countdown_enabled?: boolean
          theme_cta_text?: string | null
          theme_font_family?: string | null
          theme_hero_image_url?: string | null
          theme_layout?: string
          theme_text_color?: string | null
          title?: string
          upc?: string | null
          updated_at?: string
          user_id?: string
          waveform_data?: Json | null
        }
        Relationships: []
      }
      presave_fans: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          notification_sent: boolean | null
          pre_save_id: string
          spotify_email: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          notification_sent?: boolean | null
          pre_save_id: string
          spotify_email?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          notification_sent?: boolean | null
          pre_save_id?: string
          spotify_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presave_fans_pre_save_id_fkey"
            columns: ["pre_save_id"]
            isOneToOne: false
            referencedRelation: "pre_saves"
            referencedColumns: ["id"]
          },
        ]
      }
      presave_notifications: {
        Row: {
          email: string
          error_message: string | null
          fan_id: string
          id: string
          pre_save_id: string
          sent_at: string
          status: string
        }
        Insert: {
          email: string
          error_message?: string | null
          fan_id: string
          id?: string
          pre_save_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          email?: string
          error_message?: string | null
          fan_id?: string
          id?: string
          pre_save_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "presave_notifications_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "presave_fans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presave_notifications_pre_save_id_fkey"
            columns: ["pre_save_id"]
            isOneToOne: false
            referencedRelation: "pre_saves"
            referencedColumns: ["id"]
          },
        ]
      }
      presave_streaming_links: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          platform_name: string
          platform_url: string
          pre_save_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          platform_name: string
          platform_url: string
          pre_save_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          platform_name?: string
          platform_url?: string
          pre_save_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presave_streaming_links_pre_save_id_fkey"
            columns: ["pre_save_id"]
            isOneToOne: false
            referencedRelation: "pre_saves"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          malpinoh_artist_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          malpinoh_artist_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          malpinoh_artist_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_campaign_timeseries: {
        Args: { _start: string; _user_id: string }
        Returns: {
          clicks: number
          day: string
          fans: number
          presaves: number
        }[]
      }
      get_campaign_totals: {
        Args: { _start: string; _user_id: string }
        Returns: {
          total_clicks: number
          total_fans: number
          total_presaves: number
        }[]
      }
      get_click_dimensions: {
        Args: { _start: string; _user_id: string }
        Returns: {
          count: number
          dimension: string
          value: string
        }[]
      }
      get_fanlink_breakdown: {
        Args: { _start: string; _user_id: string }
        Returns: {
          clicks: number
          fanlink_id: string
          fans: number
        }[]
      }
      get_presave_breakdown: {
        Args: { _start: string; _user_id: string }
        Returns: {
          actions: number
          pre_save_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
