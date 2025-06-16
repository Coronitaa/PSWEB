
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      badges: {
        Row: {
          color: string | null
          description: string | null
          icon: Database["public"]["Enums"]["user_badge_icon_enum"] | null
          id: string
          name: string
          text_color: string | null
        }
        Insert: {
          color?: string | null
          description?: string | null
          icon?: Database["public"]["Enums"]["user_badge_icon_enum"] | null
          id: string
          name: string
          text_color?: string | null
        }
        Update: {
          color?: string | null
          description?: string | null
          icon?: Database["public"]["Enums"]["user_badge_icon_enum"] | null
          id?: string
          name?: string
          text_color?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_item_id: string
          slug: string
          sort_order: number
          updated_at: string | null 
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          name: string
          parent_item_id: string
          slug: string
          sort_order?: number
          updated_at?: string | null 
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_item_id?: string
          slug?: string
          sort_order?: number
          updated_at?: string | null 
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_entries: {
        Row: {
          created_at: string | null 
          date: string
          id: string
          notes: string
          resource_file_id: string | null 
          resource_id: string
          updated_at: string | null 
          version_name: string
        }
        Insert: {
          created_at?: string | null 
          date?: string
          id: string
          notes: string
          resource_file_id?: string | null 
          resource_id: string
          updated_at?: string | null 
          version_name: string
        }
        Update: {
          created_at?: string | null 
          date?: string
          id?: string
          notes?: string
          resource_file_id?: string | null 
          resource_id?: string
          updated_at?: string | null 
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelog_entries_resource_file_id_fkey" 
            columns: ["resource_file_id"]
            isOneToOne: false
            referencedRelation: "resource_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "changelog_entries_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      item_tags: { 
        Row: {
          item_id: string
          tag_id: string
        }
        Insert: {
          item_id: string
          tag_id: string
        }
        Update: {
          item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_tags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags" 
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          artist_name: string | null
          author_display_name: string | null
          author_id: string | null 
          banner_url: string | null
          created_at: string | null
          description: string
          icon_url: string | null
          id: string
          item_type: Database["public"]["Enums"]["item_type_enum"]
          long_description: string | null
          medium_tag_id: string | null 
          name: string
          project_url: string | null
          slug: string
          status: Database["public"]["Enums"]["project_status_enum"]
          updated_at: string | null
        }
        Insert: {
          artist_name?: string | null
          author_display_name?: string | null
          author_id?: string | null
          banner_url?: string | null
          created_at?: string | null
          description: string
          icon_url?: string | null
          id: string
          item_type: Database["public"]["Enums"]["item_type_enum"]
          long_description?: string | null
          medium_tag_id?: string | null
          name: string
          project_url?: string | null
          slug: string
          status?: Database["public"]["Enums"]["project_status_enum"]
          updated_at?: string | null
        }
        Update: {
          artist_name?: string | null
          author_display_name?: string | null
          author_id?: string | null
          banner_url?: string | null
          created_at?: string | null
          description?: string
          icon_url?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["item_type_enum"]
          long_description?: string | null
          medium_tag_id?: string | null
          name?: string
          project_url?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["project_status_enum"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_medium_tag_id_fkey"
            columns: ["medium_tag_id"]
            isOneToOne: false
            referencedRelation: "tags" 
            referencedColumns: ["id"]
          },
        ]
      }
      profile_badges: {
        Row: {
          assigned_at: string | null
          badge_id: string
          profile_id: string
        }
        Insert: {
          assigned_at?: string | null
          badge_id: string
          profile_id: string
        }
        Update: {
          assigned_at?: string | null
          badge_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_app_role_enum"]
          social_links: Json | null
          updated_at: string | null
          usertag: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_app_role_enum"]
          social_links?: Json | null
          updated_at?: string | null
          usertag?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_app_role_enum"]
          social_links?: Json | null
          updated_at?: string | null
          usertag?: string | null
        }
        Relationships: []
      }
      resource_files: {
        Row: {
          channel_id: string | null
          created_at: string | null 
          date: string | null 
          downloads: number
          id: string
          name: string
          resource_id: string
          selected_file_tags_json: string | null 
          size: string | null
          size_bytes: number | null 
          updated_at: string | null 
          url: string
          version_name: string 
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null 
          date?: string | null
          downloads?: number
          id: string
          name: string
          resource_id: string
          selected_file_tags_json?: string | null 
          size?: string | null
          size_bytes?: number | null
          updated_at?: string | null 
          url: string
          version_name: string 
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null 
          date?: string | null
          downloads?: number
          id?: string
          name?: string
          resource_id?: string
          selected_file_tags_json?: string | null 
          size?: string | null
          size_bytes?: number | null
          updated_at?: string | null 
          url?: string
          version_name?: string 
        }
        Relationships: [
          {
            foreignKeyName: "resource_files_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_tags: { 
        Row: {
          resource_id: string
          tag_id: string 
        }
        Insert: {
          resource_id: string
          tag_id: string
        }
        Update: {
          resource_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_tags_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          author_id: string
          category_id: string
          created_at: string | null
          description: string
          detailed_description: string | null
          downloads: number
          followers: number
          id: string
          image_gallery: string[] | null
          image_url: string | null
          links: Json | null
          main_file_details_json: string | null 
          name: string
          parent_item_id: string
          positive_review_percentage: number | null
          rating: number | null
          requirements: string | null
          review_count: number | null
          selected_dynamic_tags_json: string | null 
          slug: string
          status: Database["public"]["Enums"]["project_status_enum"] 
          updated_at: string | null
          version: string | null
        }
        Insert: {
          author_id: string
          category_id: string
          created_at?: string | null
          description: string
          detailed_description?: string | null
          downloads?: number
          followers?: number
          id: string
          image_gallery?: string[] | null
          image_url?: string | null
          links?: Json | null
          main_file_details_json?: string | null 
          name: string
          parent_item_id: string
          positive_review_percentage?: number | null
          rating?: number | null
          requirements?: string | null
          review_count?: number | null
          selected_dynamic_tags_json?: string | null 
          slug: string
          status?: Database["public"]["Enums"]["project_status_enum"] 
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          author_id?: string
          category_id?: string
          created_at?: string | null
          description?: string
          detailed_description?: string | null
          downloads?: number
          followers?: number
          id?: string
          image_gallery?: string[] | null
          image_url?: string | null
          links?: Json | null
          main_file_details_json?: string | null 
          name?: string
          parent_item_id?: string
          positive_review_percentage?: number | null
          rating?: number | null
          requirements?: string | null
          review_count?: number | null
          selected_dynamic_tags_json?: string | null 
          slug?: string
          status?: Database["public"]["Enums"]["project_status_enum"] 
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          comment: string
          created_at: string | null
          id: string
          interaction_counts: Json | null
          is_most_helpful: boolean | null
          is_recommended: boolean
          resource_id: string
          resource_version: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          comment: string
          created_at?: string | null
          id: string
          interaction_counts?: Json | null
          is_most_helpful?: boolean | null
          is_recommended: boolean
          resource_id: string
          resource_version: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          comment?: string
          created_at?: string | null
          id?: string
          interaction_counts?: Json | null
          is_most_helpful?: boolean | null
          is_recommended?: boolean
          resource_id?: string
          resource_version?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: { 
        Row: {
          border_color: string | null 
          color: string | null
          created_at: string | null
          description: string | null
          hover_bg_color: string | null 
          hover_border_color: string | null 
          hover_text_color: string | null 
          icon_svg: string | null 
          id: string
          name: string
          slug: string
          text_color: string | null
          type: Database["public"]["Enums"]["tag_type_enum"]
        }
        Insert: {
          border_color?: string | null 
          color?: string | null
          created_at?: string | null
          description?: string | null
          hover_bg_color?: string | null 
          hover_border_color?: string | null 
          hover_text_color?: string | null 
          icon_svg?: string | null 
          id: string
          name: string
          slug: string
          text_color?: string | null
          type: Database["public"]["Enums"]["tag_type_enum"]
        }
        Update: {
          border_color?: string | null 
          color?: string | null
          created_at?: string | null
          description?: string | null
          hover_bg_color?: string | null 
          hover_border_color?: string | null 
          hover_text_color?: string | null 
          icon_svg?: string | null 
          id?: string
          name?: string
          slug?: string
          text_color?: string | null
          type?: Database["public"]["Enums"]["tag_type_enum"]
        }
        Relationships: []
      }
      section_tags: {
        Row: {
          id: string
          item_type: Database["public"]["Enums"]["item_type_enum"]
          name: string
          slug: string
          description: string | null
          color: string | null
          text_color: string | null
          border_color: string | null
          hover_bg_color: string | null
          hover_text_color: string | null
          hover_border_color: string | null
          icon_svg: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          item_type: Database["public"]["Enums"]["item_type_enum"]
          name: string
          slug: string
          description?: string | null
          color?: string | null
          text_color?: string | null
          border_color?: string | null
          hover_bg_color?: string | null
          hover_text_color?: string | null
          hover_border_color?: string | null
          icon_svg?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          item_type?: Database["public"]["Enums"]["item_type_enum"]
          name?: string
          slug?: string
          description?: string | null
          color?: string | null
          text_color?: string | null
          border_color?: string | null
          hover_bg_color?: string | null
          hover_text_color?: string | null
          hover_border_color?: string | null
          icon_svg?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_section_tags: {
        Row: {
          project_id: string
          section_tag_id: string
        }
        Insert: {
          project_id: string
          section_tag_id: string
        }
        Update: {
          project_id?: string
          section_tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_section_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_section_tags_section_tag_id_fkey"
            columns: ["section_tag_id"]
            isOneToOne: false
            referencedRelation: "section_tags"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      drop_policies_on_table: {
        Args: { schema_name_param: string; table_name_param: string }
        Returns: undefined
      }
    }
    Enums: {
      item_type_enum: "game" | "web" | "app" | "art-music"
      ItemTypeEnum: "GAME" | "WEB" | "APP" | "ART_MUSIC" 
      project_status_enum: "published" | "draft" | "archived"
      tag_type_enum:
        | "version"
        | "loader"
        | "genre"
        | "platform"
        | "misc"
        | "channel"
        | "framework"
        | "language"
        | "tooling"
        | "app-category"
        | "art-style"
        | "music-genre"
        | "medium"
        | "section" 
      TagTypeEnum: 
        | "VERSION"
        | "LOADER"
        | "GENRE"
        | "PLATFORM"
        | "MISC"
        | "CHANNEL"
        | "FRAMEWORK"
        | "LANGUAGE"
        | "TOOLING"
        | "APP_CATEGORY"
        | "ART_STYLE"
        | "MUSIC_GENRE"
        | "SECTION" 
      user_app_role_enum: "usuario" | "vip" | "mod" | "admin"
      user_badge_icon_enum:
        | "ShieldCheck"
        | "Star"
        | "CheckCircle"
        | "Shield"
        | "Edit3"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      item_type_enum: ["game", "web", "app", "art-music"],
      ItemTypeEnum: ["GAME", "WEB", "APP", "ART_MUSIC"],
      project_status_enum: ["published", "draft", "archived"],
      tag_type_enum: [
        "version",
        "loader",
        "genre",
        "platform",
        "misc",
        "channel",
        "framework",
        "language",
        "tooling",
        "app-category",
        "art-style",
        "music-genre",
        "medium",
        "section", 
      ],
      TagTypeEnum: [
        "VERSION",
        "LOADER",
        "GENRE",
        "PLATFORM",
        "MISC",
        "CHANNEL",
        "FRAMEWORK",
        "LANGUAGE",
        "TOOLING",
        "APP_CATEGORY",
        "ART_STYLE",
        "MUSIC_GENRE",
        "SECTION", 
      ],
      user_app_role_enum: ["usuario", "vip", "mod", "admin"],
      user_badge_icon_enum: [
        "ShieldCheck",
        "Star",
        "CheckCircle",
        "Shield",
        "Edit3",
      ],
    },
  },
} as const
