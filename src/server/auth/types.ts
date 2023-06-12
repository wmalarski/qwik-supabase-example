export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type Database = {
  public: {
    Tables: {
      Task: {
        Row: {
          created_at: string | null;
          id: number;
          test: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          test?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          test?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Task_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
