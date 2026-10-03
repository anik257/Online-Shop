export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          category_id: string | null
          name: string
          slug: string
          description: string | null
          price: number
          discount_price: number | null
          stock: number
          image_url: string | null
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          slug: string
          description?: string | null
          price: number
          discount_price?: number | null
          stock?: number
          image_url?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          price?: number
          discount_price?: number | null
          stock?: number
          image_url?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_name: string
          phone: string
          email: string | null
          division: string
          district: string
          area: string | null
          address: string
          delivery_notes: string | null
          subtotal: number
          delivery_charge: number
          total_amount: number
          payment_method: string
          payment_status: string
          order_status: string
          stock_restored: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          customer_name: string
          phone: string
          email?: string | null
          division: string
          district: string
          area?: string | null
          address: string
          delivery_notes?: string | null
          subtotal: number
          delivery_charge?: number
          total_amount: number
          payment_method: string
          payment_status?: string
          order_status?: string
          stock_restored?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          customer_name?: string
          phone?: string
          email?: string | null
          division?: string
          district?: string
          area?: string | null
          address?: string
          delivery_notes?: string | null
          subtotal?: number
          delivery_charge?: number
          total_amount?: number
          payment_method?: string
          payment_status?: string
          order_status?: string
          stock_restored?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          subtotal: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
          subtotal: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          id: string
          order_id: string
          payment_method: string
          transaction_id: string | null
          amount: number
          payment_status: string
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          payment_method: string
          transaction_id?: string | null
          amount: number
          payment_status?: string
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          payment_method?: string
          transaction_id?: string | null
          amount?: number
          payment_status?: string
          paid_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payments_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      place_customer_order: {
        Args: {
          p_customer_name: string
          p_phone: string
          p_email: string | null
          p_division: string
          p_district: string
          p_area: string | null
          p_address: string
          p_delivery_notes: string | null
          p_payment_method: string
          p_items: Json
        }
        Returns: Json
      }
      get_order_by_number: {
        Args: {
          p_order_number: string
        }
        Returns: Json
      }
      update_order_status_admin: {
        Args: {
          p_order_id: string
          p_order_status: string
          p_payment_status?: string | null
        }
        Returns: Json
      }
      switch_order_to_cod: {
        Args: {
          p_order_id: string
        }
        Returns: Json
      }
      record_payment_verification: {
        Args: {
          p_order_id: string
          p_payment_method: string
          p_transaction_id: string
          p_payment_status: string
          p_verified_amount?: number | null
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
}

export type CategoryRow = Database['public']['Tables']['categories']['Row']
export type ProductRow = Database['public']['Tables']['products']['Row']
export type OrderRow = Database['public']['Tables']['orders']['Row']
export type OrderItemRow = Database['public']['Tables']['order_items']['Row']
export type PaymentRow = Database['public']['Tables']['payments']['Row']
