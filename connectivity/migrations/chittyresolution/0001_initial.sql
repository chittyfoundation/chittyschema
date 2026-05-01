-- ChittyResolution: Unified Dispute Resolution Schema (ADR + Litigation)
-- Managed by chittyschema - DO NOT edit in service repos
-- Created: 2026-05-01
-- Source of Truth: chittyschema/connectivity/migrations/chittyresolution/
-- Drizzle Origin: CHITTYAPPS/chittyresolution/shared/schema.ts
--
-- PURPOSE: Dual-track resolution data model:
--   - ADR (mediation, arbitration, negotiation, neutral evaluation)
--   - Litigation (court filings, motions, discovery)
--   - Shared evidence + timeline backbone across both tracks
--   - Contract lifecycle (templates, parties, negotiations, offers)
--   - Cost analysis and decision intelligence (ADR vs litigation)
--   - RTLO compliance tracking
--
-- Generated from drizzle schema via `drizzle-kit generate`.
-- Schema drift fixes vs prior live DB (cases.title/description/type,
-- evidence.verified) included as of CHITTYAPPS/chittyresolution#5.

CREATE TYPE "public"."adr_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'settlement_reached', 'escalated_to_litigation');--> statement-breakpoint
CREATE TYPE "public"."adr_type" AS ENUM('mediation', 'arbitration', 'negotiation', 'early_neutral_evaluation', 'settlement_conference', 'med_arb', 'court_ordered_mediation');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('active', 'pending', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('draft', 'pending_signatures', 'active', 'expired', 'terminated', 'breached');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('loan', 'roommate', 'partnership', 'prenup', 'employment', 'service', 'rental', 'purchase', 'other');--> statement-breakpoint
CREATE TYPE "public"."discovery_type" AS ENUM('interrogatories', 'requests_for_production', 'requests_for_admission', 'depositions', 'subpoenas');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('payment', 'communication', 'notice', 'violation', 'legal', 'maintenance', 'mediation', 'arbitration', 'negotiation', 'settlement');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('document', 'communication', 'financial', 'violation', 'photo');--> statement-breakpoint
CREATE TYPE "public"."litigation_phase" AS ENUM('pre_filing', 'filing', 'discovery', 'motion_practice', 'trial_prep', 'trial', 'post_trial', 'appeal');--> statement-breakpoint
CREATE TYPE "public"."motion_type" AS ENUM('dismiss', 'summary_judgment', 'compel_discovery', 'protective_order', 'sanctions', 'preliminary_injunction');--> statement-breakpoint
CREATE TYPE "public"."negotiation_status" AS ENUM('active', 'offer_pending', 'counter_pending', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."offer_type" AS ENUM('initial', 'counter', 'final', 'settlement', 'blind_bid');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('plaintiff', 'defendant', 'mediator', 'arbitrator', 'neutral_evaluator', 'attorney', 'observer', 'judge', 'court_reporter');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TABLE "adr_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "participant_role" NOT NULL,
	"organization" text,
	"phone" text,
	"is_present" boolean DEFAULT false,
	"joined_at" timestamp,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adr_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"type" "adr_type" NOT NULL,
	"status" "adr_status" DEFAULT 'scheduled' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_start" timestamp NOT NULL,
	"scheduled_end" timestamp NOT NULL,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"virtual_room_url" text,
	"settlement_amount" numeric(10, 2),
	"settlement_terms" text,
	"chitty_chain_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_number" text NOT NULL,
	"property_address" text NOT NULL,
	"unit" text,
	"tenant_name" text NOT NULL,
	"tenant_email" text,
	"tenant_phone" text,
	"status" "case_status" DEFAULT 'active' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"total_owed" numeric(10, 2) DEFAULT '0',
	"base_rent" numeric(10, 2) NOT NULL,
	"late_fees" numeric(10, 2) DEFAULT '0',
	"utilities" numeric(10, 2) DEFAULT '0',
	"rtlo_compliant" boolean DEFAULT false,
	"notice_deadline" timestamp,
	"title" text,
	"description" text,
	"type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cases_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "contract_parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"organization" text,
	"phone" text,
	"address" text,
	"signature_date" timestamp,
	"is_signatory" boolean DEFAULT true,
	"has_notification_preference" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "contract_type" NOT NULL,
	"description" text,
	"template" text NOT NULL,
	"clauses" json,
	"adr_clauses" json,
	"variables" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"title" text NOT NULL,
	"type" "contract_type" NOT NULL,
	"status" "contract_status" DEFAULT 'draft' NOT NULL,
	"contract_text" text NOT NULL,
	"terms" json,
	"variables" json,
	"effective_date" timestamp,
	"expiration_date" timestamp,
	"auto_renewal" boolean DEFAULT false,
	"adr_clauses_included" boolean DEFAULT true,
	"signatures" json,
	"is_executed" boolean DEFAULT false,
	"execution_date" timestamp,
	"chitty_chain_hash" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "court_filings" (
	"id" serial PRIMARY KEY NOT NULL,
	"litigation_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_path" text,
	"filing_date" timestamp,
	"deadline" timestamp,
	"is_electronic_filing" boolean DEFAULT true,
	"efiling_status" text DEFAULT 'pending',
	"efiling_reference" text,
	"served_parties" json,
	"chitty_chain_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_sync" timestamp,
	"total_records" integer DEFAULT 0,
	"config" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"analysis_type" text NOT NULL,
	"input_factors" json,
	"adr_success_probability" numeric(3, 2),
	"litigation_success_probability" numeric(3, 2),
	"settlement_range" json,
	"time_to_resolution" json,
	"risk_factors" json,
	"strategic_recommendations" json,
	"confidence_score" numeric(3, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"litigation_id" integer NOT NULL,
	"type" "discovery_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"requesting_party" text NOT NULL,
	"responding_party" text NOT NULL,
	"date_requested" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"date_completed" timestamp,
	"status" text DEFAULT 'pending',
	"documents" json,
	"objections" text,
	"chitty_chain_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"type" "evidence_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_path" text,
	"source_url" text,
	"chitty_chain_hash" text,
	"verified" boolean DEFAULT false,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "litigation_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"court_name" text NOT NULL,
	"case_number" text,
	"docket_number" text,
	"filing_date" timestamp,
	"current_phase" "litigation_phase" DEFAULT 'pre_filing' NOT NULL,
	"trial_date" timestamp,
	"estimated_cost" numeric(10, 2),
	"actual_cost" numeric(10, 2) DEFAULT '0',
	"estimated_duration_days" integer,
	"actual_duration_days" integer,
	"settlement_probability" numeric(3, 2),
	"win_probability" numeric(3, 2),
	"chitty_chain_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "litigation_cases_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "mcp_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool" text NOT NULL,
	"action" text NOT NULL,
	"case_id" integer,
	"request" json,
	"response" json,
	"duration" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "motions" (
	"id" serial PRIMARY KEY NOT NULL,
	"litigation_id" integer NOT NULL,
	"type" "motion_type" NOT NULL,
	"title" text NOT NULL,
	"moving_party" text NOT NULL,
	"responding_party" text NOT NULL,
	"filed_date" timestamp NOT NULL,
	"hearing_date" timestamp,
	"brief_due_date" timestamp,
	"response_due_date" timestamp,
	"reply_due_date" timestamp,
	"status" text DEFAULT 'pending',
	"ruling" text,
	"ruling_text" text,
	"ruling_date" timestamp,
	"chitty_chain_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer,
	"case_id" integer,
	"title" text NOT NULL,
	"description" text,
	"status" "negotiation_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"current_offer" json,
	"negotiation_type" text NOT NULL,
	"allows_counter_offers" boolean DEFAULT true,
	"deadline" timestamp,
	"is_private" boolean DEFAULT false,
	"ai_coaching_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neutral_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"session_id" integer,
	"evaluator_id" integer NOT NULL,
	"evaluation_type" text NOT NULL,
	"strengths" text,
	"weaknesses" text,
	"likely_outcome" text,
	"settlement_recommendation" numeric(10, 2),
	"reasoning" text,
	"precedent_research" json,
	"risk_score" numeric(3, 2),
	"confidence_level" text,
	"chitty_chain_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"negotiation_id" integer NOT NULL,
	"from_party" text NOT NULL,
	"to_party" text NOT NULL,
	"type" "offer_type" NOT NULL,
	"amount" numeric(10, 2),
	"terms" json,
	"offer_text" text,
	"valid_until" timestamp,
	"is_accepted" boolean DEFAULT false,
	"is_countered" boolean DEFAULT false,
	"parent_offer_id" integer,
	"response_deadline" timestamp,
	"ai_recommendations" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resolution_cost_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"analysis_date" timestamp DEFAULT now() NOT NULL,
	"adr_estimated_cost" numeric(10, 2),
	"adr_actual_cost" numeric(10, 2),
	"litigation_estimated_cost" numeric(10, 2),
	"litigation_actual_cost" numeric(10, 2),
	"adr_time_estimate_days" integer,
	"adr_actual_time_days" integer,
	"litigation_time_estimate_days" integer,
	"litigation_actual_time_days" integer,
	"recommended_path" text,
	"recommendation" text,
	"cost_savings" numeric(10, 2),
	"time_savings_days" integer,
	"roi" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer,
	"case_id" integer NOT NULL,
	"litigation_id" integer,
	"agreement_type" text NOT NULL,
	"template_id" text,
	"agreement_text" text NOT NULL,
	"terms" json,
	"signatures" json,
	"is_executed" boolean DEFAULT false,
	"execution_date" timestamp,
	"effective_date" timestamp,
	"expiration_date" timestamp,
	"chitty_chain_hash" text,
	"compliance_status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"session_id" integer,
	"analysis_type" text NOT NULL,
	"ai_model" text DEFAULT 'gpt-4' NOT NULL,
	"input_data" json,
	"analysis" json,
	"settlement_range" json,
	"confidence_score" numeric(3, 2),
	"precedent_cases" json,
	"risk_factors" json,
	"recommendations" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"type" "event_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"source" text,
	"source_id" text,
	"metadata" json,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "violations" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"severity" "priority" DEFAULT 'medium' NOT NULL,
	"documented_at" timestamp NOT NULL,
	"resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "virtual_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"room_name" text NOT NULL,
	"room_type" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"meeting_url" text,
	"recording_url" text,
	"transcript_url" text,
	"shared_documents" json,
	"chat_history" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adr_participants" ADD CONSTRAINT "adr_participants_session_id_adr_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."adr_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adr_sessions" ADD CONSTRAINT "adr_sessions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_parties" ADD CONSTRAINT "contract_parties_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "court_filings" ADD CONSTRAINT "court_filings_litigation_id_litigation_cases_id_fk" FOREIGN KEY ("litigation_id") REFERENCES "public"."litigation_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_analytics" ADD CONSTRAINT "decision_analytics_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_items" ADD CONSTRAINT "discovery_items_litigation_id_litigation_cases_id_fk" FOREIGN KEY ("litigation_id") REFERENCES "public"."litigation_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "litigation_cases" ADD CONSTRAINT "litigation_cases_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_activity" ADD CONSTRAINT "mcp_activity_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "motions" ADD CONSTRAINT "motions_litigation_id_litigation_cases_id_fk" FOREIGN KEY ("litigation_id") REFERENCES "public"."litigation_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_sessions" ADD CONSTRAINT "negotiation_sessions_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_sessions" ADD CONSTRAINT "negotiation_sessions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neutral_evaluations" ADD CONSTRAINT "neutral_evaluations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neutral_evaluations" ADD CONSTRAINT "neutral_evaluations_session_id_adr_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."adr_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neutral_evaluations" ADD CONSTRAINT "neutral_evaluations_evaluator_id_adr_participants_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."adr_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_negotiation_id_negotiation_sessions_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "public"."negotiation_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolution_cost_analysis" ADD CONSTRAINT "resolution_cost_analysis_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_agreements" ADD CONSTRAINT "settlement_agreements_session_id_adr_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."adr_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_agreements" ADD CONSTRAINT "settlement_agreements_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_agreements" ADD CONSTRAINT "settlement_agreements_litigation_id_litigation_cases_id_fk" FOREIGN KEY ("litigation_id") REFERENCES "public"."litigation_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_analysis" ADD CONSTRAINT "settlement_analysis_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_analysis" ADD CONSTRAINT "settlement_analysis_session_id_adr_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."adr_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_rooms" ADD CONSTRAINT "virtual_rooms_session_id_adr_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."adr_sessions"("id") ON DELETE no action ON UPDATE no action;