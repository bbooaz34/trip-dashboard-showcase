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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      flights: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          direction: string
          airline: string
          flight_no: string
          from_iata: string
          from_city: string
          to_iata: string
          to_city: string
          dep_time: string
          arr_time: string
          duration: string
          flight_date: string | null
          confirmation: string
          manage_url: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          direction?: string
          airline?: string
          flight_no?: string
          from_iata?: string
          from_city?: string
          to_iata?: string
          to_city?: string
          dep_time?: string
          arr_time?: string
          duration?: string
          flight_date?: string | null
          confirmation?: string
          manage_url?: string
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          user_id?: string
          direction?: string
          airline?: string
          flight_no?: string
          from_iata?: string
          from_city?: string
          to_iata?: string
          to_city?: string
          dep_time?: string
          arr_time?: string
          duration?: string
          flight_date?: string | null
          confirmation?: string
          manage_url?: string
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      member_trip_dates: {
        Row: {
          trip_id: string
          user_id: string
          start_date: string
          end_date: string
          updated_at: string
        }
        Insert: {
          trip_id: string
          user_id: string
          start_date: string
          end_date: string
          updated_at?: string
        }
        Update: {
          trip_id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      car_state: {
        Row: {
          current_odo_km: number
          fuel_liters: number
          start_odo_km: number
          tank_capacity_l: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          current_odo_km?: number
          fuel_liters?: number
          start_odo_km?: number
          tank_capacity_l?: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          current_odo_km?: number
          fuel_liters?: number
          start_odo_km?: number
          tank_capacity_l?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_state_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      frankfurt_items: {
        Row: {
          created_at: string
          created_by: string
          done: boolean
          id: string
          position: number
          text: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          done?: boolean
          id?: string
          position?: number
          text: string
          trip_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          done?: boolean
          id?: string
          position?: number
          text?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frankfurt_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      groceries: {
        Row: {
          created_at: string
          created_by: string
          done: boolean
          id: string
          market: string
          position: number
          text: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          done?: boolean
          id?: string
          market?: string
          position?: number
          text: string
          trip_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          done?: boolean
          id?: string
          market?: string
          position?: number
          text?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groceries_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          id: string
          trip_id: string
          date: string
          time: string | null
          title: string
          notes: string
          category: string
          done: boolean
          position: number
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          trip_id: string
          date: string
          time?: string | null
          title: string
          notes?: string
          category?: string
          done?: boolean
          position?: number
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          trip_id?: string
          date?: string
          time?: string | null
          title?: string
          notes?: string
          category?: string
          done?: boolean
          position?: number
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          trip_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          body?: string
          trip_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          body?: string
          trip_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      refuels: {
        Row: {
          created_by: string
          id: string
          liters: number
          odo_km: number
          refueled_at: string
          trip_id: string
        }
        Insert: {
          created_by: string
          id?: string
          liters: number
          odo_km: number
          refueled_at?: string
          trip_id: string
        }
        Update: {
          created_by?: string
          id?: string
          liters?: number
          odo_km?: number
          refueled_at?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refuels_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      stops: {
        Row: {
          category: string
          description_html: string
          id: string
          lat: number
          lng: number
          name: string
          position: number
          trip_id: string
        }
        Insert: {
          category: string
          description_html?: string
          id?: string
          lat: number
          lng: number
          name: string
          position?: number
          trip_id: string
        }
        Update: {
          category?: string
          description_html?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          position?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stops_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          role: string
          trip_id: string
          user_id: string
        }
        Insert: {
          role?: string
          trip_id: string
          user_id: string
        }
        Update: {
          role?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          base_camp_address: string | null
          base_camp_lat: number | null
          base_camp_lng: number | null
          created_at: string
          end_date: string
          id: string
          name: string
          start_date: string
        }
        Insert: {
          base_camp_address?: string | null
          base_camp_lat?: number | null
          base_camp_lng?: number | null
          created_at?: string
          end_date: string
          id?: string
          name: string
          start_date: string
        }
        Update: {
          base_camp_address?: string | null
          base_camp_lat?: number | null
          base_camp_lng?: number | null
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_trip_member: { Args: { p_trip_id: string }; Returns: boolean }
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
