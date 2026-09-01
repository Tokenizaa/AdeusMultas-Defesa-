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
      ai_execution_logs: {
        Row: {
          case_id: string | null
          completion_tokens: number
          cost_estimate: number
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number
          metadata: Json
          model: string
          operation: string
          prompt_tokens: number
          provider: string
          status: string
        }
        Insert: {
          case_id?: string | null
          completion_tokens?: number
          cost_estimate?: number
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number
          metadata?: Json
          model: string
          operation: string
          prompt_tokens?: number
          provider: string
          status?: string
        }
        Update: {
          case_id?: string | null
          completion_tokens?: number
          cost_estimate?: number
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number
          metadata?: Json
          model?: string
          operation?: string
          prompt_tokens?: number
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_execution_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          category: string
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor: string
          actor_role: string | null
          correlation_id: string | null
          details: Json
          gdpr_compliant: boolean
          id: string
          ip_hash: string | null
          target_id: string | null
          target_resource: string
          timestamp: string
        }
        Insert: {
          action: string
          actor: string
          actor_role?: string | null
          correlation_id?: string | null
          details?: Json
          gdpr_compliant?: boolean
          id?: string
          ip_hash?: string | null
          target_id?: string | null
          target_resource: string
          timestamp?: string
        }
        Update: {
          action?: string
          actor?: string
          actor_role?: string | null
          correlation_id?: string | null
          details?: Json
          gdpr_compliant?: boolean
          id?: string
          ip_hash?: string | null
          target_id?: string | null
          target_resource?: string
          timestamp?: string
        }
        Relationships: []
      }
      bonus_ledger: {
        Row: {
          admin_author: string | null
          amount: number
          balance_after: number
          created_at: string
          expires_at: string | null
          id: string
          origin: string
          reason: string | null
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          admin_author?: string | null
          amount: number
          balance_after: number
          created_at?: string
          expires_at?: string | null
          id?: string
          origin: string
          reason?: string | null
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          admin_author?: string | null
          amount?: number
          balance_after?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          origin?: string
          reason?: string | null
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          ait_number: string
          analysis_json: Json | null
          app_ref: string | null
          autuador_body: string
          claim_token: string | null
          client_cpf: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          considered_speed: number | null
          created_at: string
          ctb_article: string
          current_stage: number
          date_time: string | null
          defense_deadline: string | null
          defense_draft_json: Json | null
          fine_amount: number
          formal_flaws_json: Json
          id: string
          infraction_code: string | null
          infraction_description: string
          inmetro_aferition_date: string | null
          is_anonymous: boolean
          is_paid: boolean
          location: string | null
          measured_speed: number | null
          notification_expedition_date: string | null
          ocr_auxiliary_json: Json | null
          paid_at: string | null
          points: number
          protocol_info_json: Json | null
          radar_equipment_id: string | null
          service_type: string
          severity: string
          speed_limit: number | null
          status: string
          timeline_json: Json
          title: string
          updated_at: string
          user_id: string | null
          vehicle_brand_model: string
          vehicle_chassis: string | null
          vehicle_color: string | null
          vehicle_plate: string
          vehicle_renavam: string | null
          vehicle_year: string | null
        }
        Insert: {
          ait_number: string
          analysis_json?: Json | null
          app_ref?: string | null
          autuador_body: string
          claim_token?: string | null
          client_cpf?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          considered_speed?: number | null
          created_at?: string
          ctb_article: string
          current_stage?: number
          date_time?: string | null
          defense_deadline?: string | null
          defense_draft_json?: Json | null
          fine_amount?: number
          formal_flaws_json?: Json
          id?: string
          infraction_code?: string | null
          infraction_description: string
          inmetro_aferition_date?: string | null
          is_anonymous?: boolean
          is_paid?: boolean
          location?: string | null
          measured_speed?: number | null
          notification_expedition_date?: string | null
          ocr_auxiliary_json?: Json | null
          paid_at?: string | null
          points?: number
          protocol_info_json?: Json | null
          radar_equipment_id?: string | null
          service_type?: string
          severity?: string
          speed_limit?: number | null
          status?: string
          timeline_json?: Json
          title: string
          updated_at?: string
          user_id?: string | null
          vehicle_brand_model: string
          vehicle_chassis?: string | null
          vehicle_color?: string | null
          vehicle_plate: string
          vehicle_renavam?: string | null
          vehicle_year?: string | null
        }
        Update: {
          ait_number?: string
          analysis_json?: Json | null
          app_ref?: string | null
          autuador_body?: string
          claim_token?: string | null
          client_cpf?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          considered_speed?: number | null
          created_at?: string
          ctb_article?: string
          current_stage?: number
          date_time?: string | null
          defense_deadline?: string | null
          defense_draft_json?: Json | null
          fine_amount?: number
          formal_flaws_json?: Json
          id?: string
          infraction_code?: string | null
          infraction_description?: string
          inmetro_aferition_date?: string | null
          is_anonymous?: boolean
          is_paid?: boolean
          location?: string | null
          measured_speed?: number | null
          notification_expedition_date?: string | null
          ocr_auxiliary_json?: Json | null
          paid_at?: string | null
          points?: number
          protocol_info_json?: Json | null
          radar_equipment_id?: string | null
          service_type?: string
          severity?: string
          speed_limit?: number | null
          status?: string
          timeline_json?: Json
          title?: string
          updated_at?: string
          user_id?: string | null
          vehicle_brand_model?: string
          vehicle_chassis?: string | null
          vehicle_color?: string | null
          vehicle_plate?: string
          vehicle_renavam?: string | null
          vehicle_year?: string | null
        }
        Relationships: []
      }
      commercial_audit_log: {
        Row: {
          action: string
          changed_by: string
          id: string
          new_state: Json | null
          previous_state: Json | null
          reason: string | null
          target: string
          timestamp: string
        }
        Insert: {
          action: string
          changed_by: string
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          reason?: string | null
          target: string
          timestamp?: string
        }
        Update: {
          action?: string
          changed_by?: string
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          reason?: string | null
          target?: string
          timestamp?: string
        }
        Relationships: []
      }
      commercial_offers: {
        Row: {
          available: boolean
          base_amount: number
          coupon_discount: number
          coupon_id: string | null
          created_at: string | null
          currency: string
          description: string | null
          document_number: string | null
          eligible: boolean
          final_amount: number
          first_documents_discount: number
          id: string
          name: string
          promotion_discount: number
          promotion_id: string | null
          requirements: Json
          service_type: string
          stage_id: string | null
        }
        Insert: {
          available?: boolean
          base_amount: number
          coupon_discount?: number
          coupon_id?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          document_number?: string | null
          eligible?: boolean
          final_amount: number
          first_documents_discount?: number
          id?: string
          name: string
          promotion_discount?: number
          promotion_id?: string | null
          requirements?: Json
          service_type: string
          stage_id?: string | null
        }
        Update: {
          available?: boolean
          base_amount?: number
          coupon_discount?: number
          coupon_id?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          document_number?: string | null
          eligible?: boolean
          final_amount?: number
          first_documents_discount?: number
          id?: string
          name?: string
          promotion_discount?: number
          promotion_id?: string | null
          requirements?: Json
          service_type?: string
          stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_offers_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_orders: {
        Row: {
          affiliate_id: string | null
          base_amount: number
          case_id: string
          commercial_offer_id: string
          commission_amount: number
          commission_base: number
          coupon_discount: number
          coupon_id: string | null
          created_at: string
          currency: string
          document_number: number
          final_amount: number
          first_documents_discount: number
          id: string
          promotion_discount: number
          promotion_id: string | null
          service_type: string
          stage_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_id?: string | null
          base_amount: number
          case_id: string
          commercial_offer_id: string
          commission_amount: number
          commission_base: number
          coupon_discount: number
          coupon_id?: string | null
          created_at?: string
          currency?: string
          document_number: number
          final_amount: number
          first_documents_discount: number
          id?: string
          promotion_discount: number
          promotion_id?: string | null
          service_type: string
          stage_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_id?: string | null
          base_amount?: number
          case_id?: string
          commercial_offer_id?: string
          commission_amount?: number
          commission_base?: number
          coupon_discount?: number
          coupon_id?: string | null
          created_at?: string
          currency?: string
          document_number?: number
          final_amount?: number
          first_documents_discount?: number
          id?: string
          promotion_discount?: number
          promotion_id?: string | null
          service_type?: string
          stage_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_orders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_ledger: {
        Row: {
          applied_percent: number
          available_at: string | null
          base_amount: number
          beneficiary_id: string
          buyer_user_id: string
          case_id: string | null
          commission_amount: number
          created_at: string
          id: string
          level: number
          paid_at: string | null
          payment_id: string | null
          reversal_reason: string | null
          reversed_at: string | null
          status: string
        }
        Insert: {
          applied_percent: number
          available_at?: string | null
          base_amount: number
          beneficiary_id: string
          buyer_user_id: string
          case_id?: string | null
          commission_amount: number
          created_at?: string
          id?: string
          level: number
          paid_at?: string | null
          payment_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          status?: string
        }
        Update: {
          applied_percent?: number
          available_at?: string | null
          base_amount?: number
          beneficiary_id?: string
          buyer_user_id?: string
          case_id?: string | null
          commission_amount?: number
          created_at?: string
          id?: string
          level?: number
          paid_at?: string | null
          payment_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          available_at: string | null
          base_amount: number
          beneficiary_id: string
          buyer_user_id: string | null
          case_id: string
          commission_amount: number
          created_at: string | null
          id: string
          level: number
          paid_at: string | null
          payment_id: string | null
          reversal_reason: string | null
          reversed_at: string | null
          status: string
        }
        Insert: {
          available_at?: string | null
          base_amount: number
          beneficiary_id: string
          buyer_user_id?: string | null
          case_id: string
          commission_amount: number
          created_at?: string | null
          id?: string
          level?: number
          paid_at?: string | null
          payment_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          status?: string
        }
        Update: {
          available_at?: string | null
          base_amount?: number
          beneficiary_id?: string
          buyer_user_id?: string | null
          case_id?: string
          commission_amount?: number
          created_at?: string | null
          id?: string
          level?: number
          paid_at?: string | null
          payment_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          applicable_services: string[]
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_value: number | null
          total_limit: number
          updated_at: string
          usage_history: Json
          used_count: number
          user_limit: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          applicable_services?: string[]
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_value?: number | null
          total_limit?: number
          updated_at?: string
          usage_history?: Json
          used_count?: number
          user_limit?: number
          valid_from: string
          valid_until: string
        }
        Update: {
          applicable_services?: string[]
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_value?: number | null
          total_limit?: number
          updated_at?: string
          usage_history?: Json
          used_count?: number
          user_limit?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          case_id: string
          created_at: string | null
          id: string
          order_id: string | null
          service_type: string
          status: string
        }
        Insert: {
          case_id: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          service_type: string
          status?: string
        }
        Update: {
          case_id?: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          service_type?: string
          status?: string
        }
        Relationships: []
      }
      editorial_content: {
        Row: {
          author_agent: string
          channel: string
          copy_text: string | null
          created_at: string
          estimated_reach: number
          format: string
          hashtags: string[]
          id: string
          infraction_target_code: string | null
          legal_theme: string | null
          meta_post_id: string | null
          published_at: string | null
          quality_review_score: number | null
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
          visual_prompt: string | null
        }
        Insert: {
          author_agent?: string
          channel: string
          copy_text?: string | null
          created_at?: string
          estimated_reach?: number
          format: string
          hashtags?: string[]
          id?: string
          infraction_target_code?: string | null
          legal_theme?: string | null
          meta_post_id?: string | null
          published_at?: string | null
          quality_review_score?: number | null
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
          visual_prompt?: string | null
        }
        Update: {
          author_agent?: string
          channel?: string
          copy_text?: string | null
          created_at?: string
          estimated_reach?: number
          format?: string
          hashtags?: string[]
          id?: string
          infraction_target_code?: string | null
          legal_theme?: string | null
          meta_post_id?: string | null
          published_at?: string | null
          quality_review_score?: number | null
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          visual_prompt?: string | null
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          article_number: string | null
          chunk_index: number
          content: string
          content_hash: string
          created_at: string
          document_id: string
          document_type: string
          document_version_id: string
          heading: string | null
          id: string
          jurisdiction: string
          metadata: Json
          section_name: string | null
          source_id: string
          token_count: number
        }
        Insert: {
          article_number?: string | null
          chunk_index: number
          content: string
          content_hash: string
          created_at?: string
          document_id: string
          document_type?: string
          document_version_id: string
          heading?: string | null
          id: string
          jurisdiction?: string
          metadata?: Json
          section_name?: string | null
          source_id: string
          token_count?: number
        }
        Update: {
          article_number?: string | null
          chunk_index?: number
          content?: string
          content_hash?: string
          created_at?: string
          document_id?: string
          document_type?: string
          document_version_id?: string
          heading?: string | null
          id?: string
          jurisdiction?: string
          metadata?: Json
          section_name?: string | null
          source_id?: string
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "knowledge_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_document_versions: {
        Row: {
          content: string
          content_hash: string
          created_at: string
          document_id: string
          effective_from: string | null
          effective_until: string | null
          id: string
          metadata: Json
          published_at: string | null
          source_url: string | null
          version: string
        }
        Insert: {
          content: string
          content_hash: string
          created_at?: string
          document_id: string
          effective_from?: string | null
          effective_until?: string | null
          id: string
          metadata?: Json
          published_at?: string | null
          source_url?: string | null
          version?: string
        }
        Update: {
          content?: string
          content_hash?: string
          created_at?: string
          document_id?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          source_url?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          created_at: string
          current_version_id: string | null
          description: string | null
          document_type: string
          id: string
          jurisdiction: string
          metadata: Json
          source_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_version_id?: string | null
          description?: string | null
          document_type: string
          id: string
          jurisdiction?: string
          metadata?: Json
          source_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_version_id?: string | null
          description?: string | null
          document_type?: string
          id?: string
          jurisdiction?: string
          metadata?: Json
          source_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_knowledge_documents_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "knowledge_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_embeddings: {
        Row: {
          chunk_id: string
          created_at: string
          dimensions: number
          embedding: string | null
          id: string
          model: string
          provider: string
        }
        Insert: {
          chunk_id: string
          created_at?: string
          dimensions: number
          embedding?: string | null
          id: string
          model: string
          provider: string
        }
        Update: {
          chunk_id?: string
          created_at?: string
          dimensions?: number
          embedding?: string | null
          id?: string
          model?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "knowledge_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_ingestions: {
        Row: {
          completed_at: string | null
          created_chunks: number
          details: Json
          duration_ms: number | null
          error_message: string | null
          failed_count: number
          generated_embeddings: number
          id: string
          model_used: string | null
          processed_documents: number
          provider_used: string | null
          skipped_documents: number
          started_at: string
          status: string
          total_files: number
          triggered_by: string
        }
        Insert: {
          completed_at?: string | null
          created_chunks?: number
          details?: Json
          duration_ms?: number | null
          error_message?: string | null
          failed_count?: number
          generated_embeddings?: number
          id: string
          model_used?: string | null
          processed_documents?: number
          provider_used?: string | null
          skipped_documents?: number
          started_at?: string
          status: string
          total_files?: number
          triggered_by?: string
        }
        Update: {
          completed_at?: string | null
          created_chunks?: number
          details?: Json
          duration_ms?: number | null
          error_message?: string | null
          failed_count?: number
          generated_embeddings?: number
          id?: string
          model_used?: string | null
          processed_documents?: number
          provider_used?: string | null
          skipped_documents?: number
          started_at?: string
          status?: string
          total_files?: number
          triggered_by?: string
        }
        Relationships: []
      }
      knowledge_sources: {
        Row: {
          authority: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          jurisdiction: string
          name: string
          source_type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          authority: string
          created_at?: string
          description?: string | null
          id: string
          is_active?: boolean
          jurisdiction?: string
          name: string
          source_type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          authority?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          jurisdiction?: string
          name?: string
          source_type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          budget: number | null
          channel: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          metrics: Json
          name: string
          spent: number
          start_date: string | null
          status: string
          target_audience: Json
          updated_at: string
        }
        Insert: {
          budget?: number | null
          channel?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metrics?: Json
          name: string
          spent?: number
          start_date?: string | null
          status?: string
          target_audience?: Json
          updated_at?: string
        }
        Update: {
          budget?: number | null
          channel?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metrics?: Json
          name?: string
          spent?: number
          start_date?: string | null
          status?: string
          target_audience?: Json
          updated_at?: string
        }
        Relationships: []
      }
      meta_accounts: {
        Row: {
          access_token: string | null
          connected_at: string | null
          created_at: string
          id: string
          is_connected: boolean
          meta_user_email: string | null
          meta_user_id: string | null
          meta_user_name: string | null
          pages: Json
          selected_instagram_id: string | null
          selected_page_id: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          meta_user_email?: string | null
          meta_user_id?: string | null
          meta_user_name?: string | null
          pages?: Json
          selected_instagram_id?: string | null
          selected_page_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          meta_user_email?: string | null
          meta_user_id?: string | null
          meta_user_name?: string | null
          pages?: Json
          selected_instagram_id?: string | null
          selected_page_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          affiliate_id: string | null
          base_amount: number
          case_id: string
          commercial_offer_id: string | null
          commission_amount: number
          coupon_discount: number
          created_at: string | null
          currency: string
          final_amount: number
          first_documents_discount: number
          id: string
          promotion_discount: number
          service_type: string
          status: string
          user_id: string
        }
        Insert: {
          affiliate_id?: string | null
          base_amount: number
          case_id: string
          commercial_offer_id?: string | null
          commission_amount?: number
          coupon_discount?: number
          created_at?: string | null
          currency?: string
          final_amount: number
          first_documents_discount?: number
          id?: string
          promotion_discount?: number
          service_type: string
          status?: string
          user_id: string
        }
        Update: {
          affiliate_id?: string | null
          base_amount?: number
          case_id?: string
          commercial_offer_id?: string | null
          commission_amount?: number
          coupon_discount?: number
          created_at?: string | null
          currency?: string
          final_amount?: number
          first_documents_discount?: number
          id?: string
          promotion_discount?: number
          service_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_commercial_offer_id_fkey"
            columns: ["commercial_offer_id"]
            isOneToOne: false
            referencedRelation: "commercial_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          payload: Json
          payment_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          payload: Json
          payment_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          payload?: Json
          payment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount: number
          base_amount: number | null
          bonus_used_amount: number
          case_id: string
          coupon_code: string | null
          created_at: string
          currency: string
          discount_amount: number
          discount_type: string | null
          expires_at: string | null
          final_amount: number
          gateway: string
          gateway_transaction_id: string | null
          id: string
          pagbank_order_id: string | null
          paid_at: string | null
          payment_method: string | null
          qr_code_data_url: string | null
          qr_code_text: string | null
          qr_code_url: string | null
          reference_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          base_amount?: number | null
          bonus_used_amount?: number
          case_id: string
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          discount_type?: string | null
          expires_at?: string | null
          final_amount?: number
          gateway?: string
          gateway_transaction_id?: string | null
          id?: string
          pagbank_order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          qr_code_data_url?: string | null
          qr_code_text?: string | null
          qr_code_url?: string | null
          reference_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          base_amount?: number | null
          bonus_used_amount?: number
          case_id?: string
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          discount_type?: string | null
          expires_at?: string | null
          final_amount?: number
          gateway?: string
          gateway_transaction_id?: string | null
          id?: string
          pagbank_order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          qr_code_data_url?: string | null
          qr_code_text?: string | null
          qr_code_url?: string | null
          reference_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          attempts: number
          event_type: string
          id: string
          pagbank_event_id: string | null
          payload: Json
          payment_order_id: string | null
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          received_at: string
        }
        Insert: {
          attempts?: number
          event_type: string
          id?: string
          pagbank_event_id?: string | null
          payload?: Json
          payment_order_id?: string | null
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Update: {
          attempts?: number
          event_type?: string
          id?: string
          pagbank_event_id?: string | null
          payload?: Json
          payment_order_id?: string | null
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          case_id: string
          commercial_offer_id: string | null
          created_at: string | null
          gateway: string
          gateway_transaction_id: string | null
          id: string
          order_id: string
          paid_at: string | null
          service_type: string | null
          status: string
        }
        Insert: {
          amount: number
          case_id: string
          commercial_offer_id?: string | null
          created_at?: string | null
          gateway: string
          gateway_transaction_id?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          service_type?: string | null
          status?: string
        }
        Update: {
          amount?: number
          case_id?: string
          commercial_offer_id?: string | null
          created_at?: string | null
          gateway?: string
          gateway_transaction_id?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          service_type?: string | null
          status?: string
        }
        Relationships: []
      }
      platform_events: {
        Row: {
          aggregate_id: string | null
          aggregate_type: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          aggregate_id?: string | null
          aggregate_type?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          aggregate_id?: string | null
          aggregate_type?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      promotion_campaigns: {
        Row: {
          applicable_services: string[]
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          name: string
          promo_code: string | null
          start_date: string
          status: string
          updated_at: string
          usage_count: number
          usage_limit: number
          user_usage_limit: number
        }
        Insert: {
          applicable_services?: string[]
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value?: number
          end_date: string
          id?: string
          name: string
          promo_code?: string | null
          start_date: string
          status?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number
          user_usage_limit?: number
        }
        Update: {
          applicable_services?: string[]
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          name?: string
          promo_code?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          usage_count?: number
          usage_limit?: number
          user_usage_limit?: number
        }
        Relationships: []
      }
      promotions: {
        Row: {
          applicable_services: Json
          created_at: string | null
          discount_type: string
          discount_value: number
          ends_at: string
          id: string
          name: string
          starts_at: string
          status: string
        }
        Insert: {
          applicable_services?: Json
          created_at?: string | null
          discount_type: string
          discount_value: number
          ends_at: string
          id: string
          name: string
          starts_at: string
          status?: string
        }
        Update: {
          applicable_services?: Json
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string
          id?: string
          name?: string
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      referral_config: {
        Row: {
          calculation_base: string
          id: number
          is_program_active: boolean
          level1_percent: number
          level2_percent: number
          level3_percent: number
          min_withdrawal_amount: number
          payout_delay_days: number
          referrer_bonus_amount: number
          signup_bonus_amount: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          calculation_base?: string
          id?: number
          is_program_active?: boolean
          level1_percent?: number
          level2_percent?: number
          level3_percent?: number
          min_withdrawal_amount?: number
          payout_delay_days?: number
          referrer_bonus_amount?: number
          signup_bonus_amount?: number
          updated_at?: string
          updated_by?: string
        }
        Update: {
          calculation_base?: string
          id?: number
          is_program_active?: boolean
          level1_percent?: number
          level2_percent?: number
          level3_percent?: number
          min_withdrawal_amount?: number
          payout_delay_days?: number
          referrer_bonus_amount?: number
          signup_bonus_amount?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      referral_relations: {
        Row: {
          created_at: string
          id: string
          level: number
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: number
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      service_pricings: {
        Row: {
          description: string | null
          history: Json
          id: string
          is_active: boolean
          promotional_price: number
          service_name: string
          service_type: string
          standard_price: number
          updated_at: string | null
          updated_by: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          description?: string | null
          history?: Json
          id?: string
          is_active?: boolean
          promotional_price: number
          service_name: string
          service_type: string
          standard_price: number
          updated_at?: string | null
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          description?: string | null
          history?: Json
          id?: string
          is_active?: boolean
          promotional_price?: number
          service_name?: string
          service_type?: string
          standard_price?: number
          updated_at?: string | null
          updated_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          city_state: string | null
          cnh: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          referral_code: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city_state?: string | null
          cnh?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          referral_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city_state?: string | null
          cnh?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          referral_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
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
      admin_update_user_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      admin_update_user_role_by_email: {
        Args: { new_role: string; target_user_email: string }
        Returns: Json
      }
      current_user_id: { Args: never; Returns: string }
      emit_event: {
        Args: {
          p_aggregate_id?: string
          p_aggregate_type?: string
          p_event_type: string
          p_payload?: Json
          p_user_id?: string
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      match_knowledge_chunks: {
        Args: {
          filter_document_type?: string
          filter_jurisdiction?: string
          filter_source_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          article_number: string
          authority: string
          chunk_id: string
          content: string
          document_id: string
          document_title: string
          document_type: string
          heading: string
          metadata: Json
          similarity: number
          source_id: string
          source_name: string
          version: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      user_role: "citizen" | "admin"
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
    Enums: {
      user_role: ["citizen", "admin"],
    },
  },
} as const
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthUser } from '../types/auth';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Validação de variáveis de ambiente no frontend
if (typeof window !== 'undefined') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[env] Frontend: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas');
  } else if (supabaseUrl.includes('your-') || supabaseAnonKey.includes('your-')) {
    console.warn('[env] Frontend: Variáveis Supabase contêm placeholders - configure no .env.local ou Vercel');
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// =========================================================================
// Pre-configured Platform & E2E Accounts — available for seamless login/tests
// =========================================================================
const generateE2EUsers = (): Record<string, { user: AuthUser; passwordHash: string }> => {
  const map: Record<string, { user: AuthUser; passwordHash: string }> = {};
  for (let i = 1; i <= 36; i++) {
    const numStr = String(i).padStart(3, '0');
    const email = `teste${numStr}@e2e.local`;
    map[email] = {
      user: {
        id: `usr_e2e_teste_${numStr}`,
        name: `Teste ${numStr}`,
        email: email,
        role: 'citizen',
        cpf: `000.000.0${String(i).padStart(2, '0')}-00`,
        phone: `(11) 98000-${numStr}0`,
        cnh: `00000000${numStr}`,
        cityState: 'São Paulo/SP',
        createdAt: '2026-08-30T10:00:00.000Z',
      },
      passwordHash: 'E2E@2026Teste',
    };
  }
  return map;
};

export const DEMO_USERS: Record<string, { user: AuthUser; passwordHash: string }> = {
  'admin@defesai.com.br': {
    user: {
      id: 'usr_admin_defesai',
      name: 'Administrador DefesAi',
      email: 'admin@defesai.com.br',
      role: 'admin',
      cpf: '000.111.222-33',
      phone: '(11) 99999-0000',
      cityState: 'Brasília/DF',
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    passwordHash: 'admin123',
  },
  'admin@www.defesai.shop': {
    user: {
      id: 'usr_admin_defesai',
      name: 'Administrador DefesAi',
      email: 'admin@www.defesai.shop',
      role: 'admin',
      cpf: '000.111.222-33',
      phone: '(11) 99999-0000',
      cityState: 'Brasília/DF',
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    passwordHash: 'admin123',
  },
  'admin@defesai.shop': {
    user: {
      id: 'usr_admin_defesai',
      name: 'Administrador DefesAi',
      email: 'admin@defesai.shop',
      role: 'admin',
      cpf: '000.111.222-33',
      phone: '(11) 99999-0000',
      cityState: 'Brasília/DF',
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    passwordHash: 'admin123',
  },
  'olfnetto@gmail.com': {
    user: {
      id: 'usr_admin_olfnetto',
      name: 'Netto (Administrador)',
      email: 'olfnetto@gmail.com',
      role: 'admin',
      cpf: '000.111.222-99',
      phone: '(11) 98888-7777',
      cityState: 'São Paulo/SP',
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    passwordHash: 'admin123',
  },
  'motorista@defesai.com.br': {
    user: {
      id: 'usr_motorista_carlos',
      name: 'Carlos Eduardo Silveira',
      email: 'motorista@defesai.com.br',
      role: 'citizen',
      cpf: '123.456.789-00',
      phone: '(11) 98765-4321',
      cnh: '05492817492',
      cityState: 'São Paulo/SP',
      createdAt: '2026-06-10T10:00:00.000Z',
    },
    passwordHash: '123456',
  },
  'motorista@www.defesai.shop': {
    user: {
      id: 'usr_motorista_carlos',
      name: 'Carlos Eduardo Silveira',
      email: 'motorista@www.defesai.shop',
      role: 'citizen',
      cpf: '123.456.789-00',
      phone: '(11) 98765-4321',
      cnh: '05492817492',
      cityState: 'São Paulo/SP',
      createdAt: '2026-06-10T10:00:00.000Z',
    },
    passwordHash: '123456',
  },
  ...generateE2EUsers(),
};

const STORAGE_KEY_AUTH = 'defesai_auth_session_v1';
const STORAGE_KEY_USERS = 'defesai_registered_users_v1';

export function getStoredUsers(): Record<string, { user: AuthUser; passwordHash: string }> {
  if (typeof window === 'undefined') return DEMO_USERS;

  const raw = localStorage.getItem(STORAGE_KEY_USERS);
  let users: Record<string, { user: AuthUser; passwordHash: string }> = {};

  try {
    users = JSON.parse(raw) || {};
  } catch {
    users = {};
  }

  // Fallback to DEMO_USERS if localStorage is empty (Supabase down / not configured)
  if (Object.keys(users).length === 0 && Object.keys(DEMO_USERS).length > 0) {
    return DEMO_USERS;
  }

  return users;
}

export function saveStoredUser(email: string, user: AuthUser, passwordHash: string) {
  try {
    const users = getStoredUsers();
    users[email.toLowerCase()] = { user, passwordHash };
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving user to local store:', err);
  }
}

export function getStoredSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredSession(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  } catch (err) {
    console.error('Error setting session to local store:', err);
  }
}
