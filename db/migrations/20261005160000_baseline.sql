-- migrate:up
-- Baseline of the app schema as it was in Supabase on 05.10.2026 (pg_dump 17, --schema-only --no-owner --no-privileges).
-- Removed: row level security and the one policy (they guarded the Supabase Data API, which our server does not
-- have), the psql \restrict lines and the search_path reset. Extensions live in the "extensions" schema like in
-- Supabase; deploy/postgres-init creates them, so index operators such as extensions.gin_trgm_ops resolve.
-- Older history: supabase/migrations/ and drizzle/ in git before 06.10.2026 (not replayed here).

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: app; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA app;


--
-- Name: acceptance_status; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.acceptance_status AS ENUM (
    'pending',
    'accepted',
    'issues'
);


--
-- Name: actor_type; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.actor_type AS ENUM (
    'user',
    'customer',
    'system'
);


--
-- Name: attachment_kind; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.attachment_kind AS ENUM (
    'image',
    'audio',
    'document'
);


--
-- Name: attachment_visibility; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.attachment_visibility AS ENUM (
    'internal',
    'client'
);


--
-- Name: change_decision; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.change_decision AS ENUM (
    'approved',
    'declined',
    'changes_requested'
);


--
-- Name: change_kind; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.change_kind AS ENUM (
    'addition',
    'credit',
    'no_cost',
    'schedule_only'
);


--
-- Name: change_lifecycle_status; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.change_lifecycle_status AS ENUM (
    'draft',
    'open',
    'resolved',
    'canceled'
);


--
-- Name: change_revision_status; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.change_revision_status AS ENUM (
    'draft',
    'sent',
    'viewed',
    'approved',
    'declined',
    'changes_requested',
    'canceled',
    'expired',
    'superseded'
);


--
-- Name: change_work_status; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.change_work_status AS ENUM (
    'not_started',
    'scheduled',
    'in_progress',
    'completed',
    'invoiced',
    'paid'
);


--
-- Name: customer_kind; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.customer_kind AS ENUM (
    'person',
    'company'
);


--
-- Name: document_kind; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.document_kind AS ENUM (
    'offer',
    'change'
);


--
-- Name: file_category; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.file_category AS ENUM (
    'drawing',
    'render',
    'photo',
    'document',
    'warranty',
    'installation',
    'review_request'
);


--
-- Name: member_permission; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.member_permission AS ENUM (
    'projects.create',
    'milestones.manage',
    'offers.edit',
    'changes.draft',
    'documents.send',
    'drafts.view_all',
    'notes.view',
    'payments.record',
    'finance.view',
    'clients.manage'
);


--
-- Name: member_role; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.member_role AS ENUM (
    'owner',
    'admin',
    'member',
    'field',
    'office'
);


--
-- Name: member_status; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.member_status AS ENUM (
    'active',
    'invited',
    'disabled'
);


--
-- Name: notification_status; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.notification_status AS ENUM (
    'pending',
    'processing',
    'sent',
    'failed'
);


--
-- Name: order_stage; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.order_stage AS ENUM (
    'draft',
    'awaiting_approval',
    'approved',
    'in_production',
    'ready_for_installation',
    'installed',
    'completed',
    'service'
);


--
-- Name: payment_kind; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.payment_kind AS ENUM (
    'deposit',
    'progress',
    'final',
    'other'
);


--
-- Name: portal_contact_role; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.portal_contact_role AS ENUM (
    'viewer',
    'approver'
);


--
-- Name: portal_scope; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.portal_scope AS ENUM (
    'review',
    'installation_acceptance',
    'after_sales'
);


--
-- Name: project_permission; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.project_permission AS ENUM (
    'view',
    'draft',
    'send',
    'manage'
);


--
-- Name: project_status; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.project_status AS ENUM (
    'active',
    'completed',
    'archived'
);


--
-- Name: review_state; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.review_state AS ENUM (
    'comment',
    'changes_requested'
);


--
-- Name: schedule_impact_type; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.schedule_impact_type AS ENUM (
    'none',
    'days',
    'unknown'
);


--
-- Name: service_status; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.service_status AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed'
);


--
-- Name: specification_field_type; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.specification_field_type AS ENUM (
    'short_text',
    'long_text',
    'integer',
    'decimal',
    'measurement',
    'single_select',
    'boolean',
    'date',
    'money',
    'colour',
    'file',
    'image_gallery'
);


--
-- Name: template_scope; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.template_scope AS ENUM (
    'platform',
    'organization'
);


--
-- Name: timeline_actor_type; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.timeline_actor_type AS ENUM (
    'staff',
    'portal_contact',
    'system',
    'ai'
);


--
-- Name: timeline_visibility; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.timeline_visibility AS ENUM (
    'internal',
    'client'
);


--
-- Name: version_status; Type: TYPE; Schema: app; Owner: -
--

CREATE TYPE app.version_status AS ENUM (
    'published',
    'awaiting_approval',
    'approved',
    'superseded'
);


--
-- Name: broadcast_staff_refresh(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.broadcast_staff_refresh() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  PERFORM pg_notify(
    'staff_refresh',
    jsonb_build_object('user_id', NEW.user_id, 'event_type', NEW.event_type, 'title', left(NEW.title, 200))::text
  );
  RETURN NEW;
END;
$$;


--
-- Name: is_purging_row(jsonb); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.is_purging_row(old_row jsonb) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  SELECT coalesce(current_setting('app.purge_organization', true), '') <> ''
    AND (old_row->>'organization_id' IS NULL OR old_row->>'organization_id' = current_setting('app.purge_organization', true));
$$;


--
-- Name: prevent_append_only_mutation(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.prevent_append_only_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Append-only records cannot be updated or deleted';
END $$;


--
-- Name: prevent_immutable_record_change(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.prevent_immutable_record_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Immutable history records cannot be updated or deleted';
END;
$$;


--
-- Name: protect_frozen_change_revision(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.protect_frozen_change_revision() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF OLD.status <> 'draft' AND ROW(NEW.title, NEW.description, NEW.reason, NEW.change_kind, NEW.pricing_type, NEW.currency, NEW.subtotal, NEW.tax_rate, NEW.tax_amount, NEW.total, NEW.schedule_impact_type, NEW.schedule_impact_days, NEW.agreed_deadline, NEW.response_due_at, NEW.client_note, NEW.frozen_at, NEW.content_hash, NEW.discount_type, NEW.discount_value, NEW.discount_amount, NEW.logo_storage_path) IS DISTINCT FROM ROW(OLD.title, OLD.description, OLD.reason, OLD.change_kind, OLD.pricing_type, OLD.currency, OLD.subtotal, OLD.tax_rate, OLD.tax_amount, OLD.total, OLD.schedule_impact_type, OLD.schedule_impact_days, OLD.agreed_deadline, OLD.response_due_at, OLD.client_note, OLD.frozen_at, OLD.content_hash, OLD.discount_type, OLD.discount_value, OLD.discount_amount, OLD.logo_storage_path) THEN
    RAISE EXCEPTION 'Frozen change revision content is immutable';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: protect_frozen_revision_child(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.protect_frozen_revision_child() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  IF EXISTS (
    SELECT 1 FROM app.change_order_revisions r
    WHERE r.frozen_at IS NOT NULL
      AND r.id IN (CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.revision_id END, CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.revision_id END)
  ) THEN
    RAISE EXCEPTION 'The content of a sent version cannot change';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;


--
-- Name: protect_frozen_schedule_item(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.protect_frozen_schedule_item() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  IF EXISTS (
    SELECT 1 FROM app.change_order_revisions r
    WHERE r.frozen_at IS NOT NULL
      AND r.id IN (CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.revision_id END, CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.revision_id END)
  ) THEN
    RAISE EXCEPTION 'The schedule of a sent version cannot change';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;


--
-- Name: protect_locked_contact(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.protect_locked_contact() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL
    AND coalesce(current_setting('app.contact_change', true), '') NOT IN ('client', 'reset')
    AND (
      NEW.email IS DISTINCT FROM OLD.email
      OR NEW.email_verified_at IS DISTINCT FROM OLD.email_verified_at
      OR NEW.locked_at IS DISTINCT FROM OLD.locked_at
      OR NEW.project_id IS DISTINCT FROM OLD.project_id
    ) THEN
    RAISE EXCEPTION 'Client-verified contact is locked';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: protect_project_client(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.protect_project_client() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF OLD.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM OLD.client_id
    AND coalesce(current_setting('app.client_merge', true), '') <> 'on' THEN
    RAISE EXCEPTION 'The client of a project cannot change';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: protect_project_receipt(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.protect_project_receipt() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.offer_id IS NULL AND NEW.offer_id IS NOT NULL
    AND (to_jsonb(NEW) - 'offer_id') = (to_jsonb(OLD) - 'offer_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Append-only records cannot be updated or deleted';
END $$;


--
-- Name: protect_version_payload(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.protect_version_payload() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF OLD.snapshot_json IS DISTINCT FROM NEW.snapshot_json
    OR OLD.commercial_snapshot_json IS DISTINCT FROM NEW.commercial_snapshot_json
    OR OLD.content_hash IS DISTINCT FROM NEW.content_hash
    OR OLD.version_number IS DISTINCT FROM NEW.version_number
    OR OLD.order_id IS DISTINCT FROM NEW.order_id
    OR OLD.organization_id IS DISTINCT FROM NEW.organization_id
  THEN
    RAISE EXCEPTION 'Published specification payloads are immutable';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: purge_organization(uuid); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.purge_organization(p_org uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app.organizations WHERE id = p_org AND closure_requested_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Organization % is not scheduled for closure', p_org;
  END IF;
  PERFORM set_config('app.purge_organization', p_org::text, true);
  UPDATE app.change_orders SET current_revision_id = NULL, approved_revision_id = NULL, baseline_offer_id = NULL, absorbed_by_revision_id = NULL WHERE organization_id = p_org;
  DELETE FROM app.payment_claims WHERE organization_id = p_org;
  DELETE FROM app.payment_disputes WHERE organization_id = p_org;
  DELETE FROM app.project_receipts WHERE organization_id = p_org;
  DELETE FROM app.payment_installments WHERE organization_id = p_org;
  DELETE FROM app.offer_acceptances WHERE organization_id = p_org;
  DELETE FROM app.timeline_events WHERE organization_id = p_org;
  DELETE FROM app.portal_decisions WHERE revision_id IN (
    SELECT r.id FROM app.change_order_revisions r JOIN app.change_orders c ON c.id = r.change_order_id WHERE c.organization_id = p_org
  );
  DELETE FROM app.change_attachments WHERE organization_id = p_org;
  DELETE FROM app.portal_otps WHERE project_contact_id IN (
    SELECT pc.id FROM app.project_contacts pc JOIN app.projects p ON p.id = pc.project_id WHERE p.organization_id = p_org
  );
  DELETE FROM app.project_milestones WHERE organization_id = p_org;
  DELETE FROM app.change_order_revisions WHERE change_order_id IN (SELECT id FROM app.change_orders WHERE organization_id = p_org);
  DELETE FROM app.change_orders WHERE organization_id = p_org;
  DELETE FROM app.portal_grants WHERE project_id IN (SELECT id FROM app.projects WHERE organization_id = p_org);
  DELETE FROM app.staff_notifications WHERE organization_id = p_org;
  DELETE FROM app.projects WHERE organization_id = p_org;
  DELETE FROM app.clients WHERE organization_id = p_org;
  DELETE FROM app.approvals WHERE organization_id = p_org;
  DELETE FROM app.review_requests WHERE organization_id = p_org;
  DELETE FROM app.service_requests WHERE organization_id = p_org;
  DELETE FROM app.warranty_items WHERE organization_id = p_org;
  DELETE FROM app.installations WHERE organization_id = p_org;
  DELETE FROM app.payments WHERE organization_id = p_org;
  DELETE FROM app.version_files WHERE organization_id = p_org;
  DELETE FROM app.portal_links WHERE organization_id = p_org;
  UPDATE app.orders SET current_approved_version_id = NULL WHERE organization_id = p_org;
  DELETE FROM app.specification_versions WHERE organization_id = p_org;
  DELETE FROM app.orders WHERE organization_id = p_org;
  DELETE FROM app.customers WHERE organization_id = p_org;
  DELETE FROM app.activity_events WHERE organization_id = p_org;
  DELETE FROM app.notification_outbox WHERE organization_id = p_org;
  DELETE FROM app.team_invites WHERE organization_id = p_org;
  DELETE FROM app.owner_role_requests WHERE organization_id = p_org;
  DELETE FROM app.organizations WHERE id = p_org;
END $$;


--
-- Name: require_offer_reference(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.require_offer_reference() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.offer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM app.change_orders c WHERE c.id = NEW.offer_id AND c.document_kind = 'offer'
  ) THEN
    RAISE EXCEPTION 'offer_id must reference a base offer';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: require_portal_decision(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.require_portal_decision() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.status IN ('approved', 'declined', 'changes_requested') AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM app.portal_decisions d
      WHERE d.revision_id = NEW.id
        AND d.decision::text = NEW.status::text
        AND d.revision_content_hash = NEW.content_hash
        AND d.otp_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Revision decision requires a verified client decision';
    END IF;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_events; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.activity_events (
    id bigint NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid,
    actor_type app.actor_type NOT NULL,
    actor_user_id uuid,
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_events_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

ALTER TABLE app.activity_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME app.activity_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: approvals; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    version_id uuid NOT NULL,
    portal_link_id uuid NOT NULL,
    content_hash text NOT NULL,
    approver_name text NOT NULL,
    approver_email text,
    approved_at timestamp with time zone DEFAULT now() NOT NULL,
    user_agent text,
    confirmation_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_accounts; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.auth_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp with time zone,
    refresh_token_expires_at timestamp with time zone,
    scope text,
    password text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_sessions; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.auth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_users; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.auth_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_verifications; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.auth_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: catalog_items; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.catalog_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    unit text,
    unit_price numeric(14,2) NOT NULL,
    category text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT catalog_items_category_check CHECK (((category IS NULL) OR (char_length(category) <= 80))),
    CONSTRAINT catalog_items_name_check CHECK (((char_length(name) >= 2) AND (char_length(name) <= 300))),
    CONSTRAINT catalog_items_unit_check CHECK (((unit IS NULL) OR (char_length(unit) <= 20))),
    CONSTRAINT catalog_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: change_attachments; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.change_attachments (
    id bigint NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    revision_id bigint,
    storage_path text NOT NULL,
    kind app.attachment_kind NOT NULL,
    mime_type text NOT NULL,
    byte_size bigint NOT NULL,
    sha256 text NOT NULL,
    visibility app.attachment_visibility DEFAULT 'client'::app.attachment_visibility NOT NULL,
    processing_status text DEFAULT 'ready'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    change_order_id uuid NOT NULL,
    original_name text NOT NULL
);


--
-- Name: change_attachments_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

ALTER TABLE app.change_attachments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME app.change_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: change_order_line_items; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.change_order_line_items (
    id bigint NOT NULL,
    revision_id bigint NOT NULL,
    "position" integer NOT NULL,
    description text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit text,
    unit_price numeric(14,2) NOT NULL,
    line_total numeric(14,2) NOT NULL
);


--
-- Name: change_order_line_items_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

ALTER TABLE app.change_order_line_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME app.change_order_line_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: change_order_payment_terms; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.change_order_payment_terms (
    id bigint NOT NULL,
    revision_id bigint NOT NULL,
    "position" integer NOT NULL,
    title text NOT NULL,
    percent numeric(5,2) NOT NULL,
    due_trigger text NOT NULL,
    due_on date,
    schedule_line_key uuid,
    CONSTRAINT change_order_payment_terms_check CHECK (((due_trigger = 'on_date'::text) = (due_on IS NOT NULL))),
    CONSTRAINT change_order_payment_terms_check1 CHECK (((due_trigger = 'on_stage'::text) = (schedule_line_key IS NOT NULL))),
    CONSTRAINT change_order_payment_terms_due_trigger_check CHECK ((due_trigger = ANY (ARRAY['on_approval'::text, 'on_stage'::text, 'on_completion'::text, 'on_date'::text]))),
    CONSTRAINT change_order_payment_terms_percent_check CHECK (((percent > (0)::numeric) AND (percent <= (100)::numeric))),
    CONSTRAINT change_order_payment_terms_position_check CHECK (("position" > 0)),
    CONSTRAINT change_order_payment_terms_title_check CHECK (((char_length(title) >= 2) AND (char_length(title) <= 180)))
);


--
-- Name: change_order_payment_terms_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

ALTER TABLE app.change_order_payment_terms ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME app.change_order_payment_terms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: change_order_revisions; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.change_order_revisions (
    id bigint NOT NULL,
    change_order_id uuid NOT NULL,
    revision_number integer NOT NULL,
    status app.change_revision_status DEFAULT 'draft'::app.change_revision_status NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    reason text,
    change_kind app.change_kind DEFAULT 'addition'::app.change_kind NOT NULL,
    pricing_type text DEFAULT 'fixed'::text NOT NULL,
    currency character(3) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    tax_amount numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(14,2) NOT NULL,
    schedule_impact_type app.schedule_impact_type DEFAULT 'none'::app.schedule_impact_type NOT NULL,
    schedule_impact_days integer,
    response_due_at timestamp with time zone,
    client_note text,
    internal_note text,
    frozen_at timestamp with time zone,
    content_hash text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    agreed_deadline date,
    viewed_at timestamp with time zone,
    client_reminded_at timestamp with time zone,
    expiry_warned_at timestamp with time zone,
    discount_type text,
    discount_value numeric(14,2),
    discount_amount numeric(14,2) DEFAULT 0 NOT NULL,
    logo_storage_path text,
    CONSTRAINT change_order_revisions_discount_type_check CHECK ((discount_type = ANY (ARRAY['percent'::text, 'amount'::text]))),
    CONSTRAINT change_revision_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT change_revision_schedule_check CHECK ((((schedule_impact_type = 'days'::app.schedule_impact_type) AND (schedule_impact_days > 0)) OR ((schedule_impact_type <> 'days'::app.schedule_impact_type) AND (schedule_impact_days IS NULL)))),
    CONSTRAINT change_revision_tax_rate_check CHECK (((tax_rate >= (0)::numeric) AND (tax_rate <= (100)::numeric))),
    CONSTRAINT change_revision_total_check CHECK ((((change_kind = 'credit'::app.change_kind) AND (total <= (0)::numeric)) OR ((change_kind = ANY (ARRAY['no_cost'::app.change_kind, 'schedule_only'::app.change_kind])) AND (total = (0)::numeric)) OR ((change_kind = 'addition'::app.change_kind) AND (total >= (0)::numeric))))
);


--
-- Name: change_order_revisions_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

ALTER TABLE app.change_order_revisions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME app.change_order_revisions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: change_order_schedule_items; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.change_order_schedule_items (
    id bigint NOT NULL,
    revision_id bigint NOT NULL,
    "position" integer NOT NULL,
    title text NOT NULL,
    duration_days integer NOT NULL,
    line_key uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT change_order_schedule_items_duration_days_check CHECK (((duration_days >= 1) AND (duration_days <= 365))),
    CONSTRAINT change_order_schedule_items_position_check CHECK (("position" > 0)),
    CONSTRAINT change_order_schedule_items_title_check CHECK (((char_length(title) >= 2) AND (char_length(title) <= 180)))
);


--
-- Name: change_order_schedule_items_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

ALTER TABLE app.change_order_schedule_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME app.change_order_schedule_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: change_orders; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.change_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    sequence_number bigint NOT NULL,
    current_revision_id bigint,
    lifecycle_status app.change_lifecycle_status DEFAULT 'draft'::app.change_lifecycle_status NOT NULL,
    work_status app.change_work_status DEFAULT 'not_started'::app.change_work_status NOT NULL,
    created_by uuid NOT NULL,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    document_kind app.document_kind DEFAULT 'change'::app.document_kind NOT NULL,
    baseline_offer_id uuid,
    approved_revision_id bigint,
    absorbed_by_revision_id bigint,
    CONSTRAINT change_orders_offer_has_no_baseline CHECK ((((document_kind = 'offer'::app.document_kind) AND (baseline_offer_id IS NULL)) OR (document_kind = 'change'::app.document_kind)))
);


--
-- Name: clients; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    email_normalized text GENERATED ALWAYS AS (NULLIF(lower(btrim(email)), ''::text)) STORED,
    phone text,
    phone_normalized text,
    address text,
    notes text,
    merged_into_id uuid,
    archived_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clients_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 160)))
);


--
-- Name: customers; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    kind app.customer_kind DEFAULT 'person'::app.customer_kind NOT NULL,
    name text NOT NULL,
    company_name text,
    email text,
    phone text,
    address text,
    notes text,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: document_messages; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.document_messages (
    id bigint NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    change_order_id uuid NOT NULL,
    revision_id bigint,
    author_type text NOT NULL,
    author_id uuid NOT NULL,
    body text NOT NULL,
    read_by_staff_at timestamp with time zone,
    read_by_client_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT document_messages_author_type_check CHECK ((author_type = ANY (ARRAY['staff'::text, 'portal_contact'::text]))),
    CONSTRAINT document_messages_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 2000)))
);


--
-- Name: document_messages_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

ALTER TABLE app.document_messages ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME app.document_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: email_outbox; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.email_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    to_address text NOT NULL,
    subject text,
    text_body text,
    html_body text,
    reply_to text,
    status text DEFAULT 'sending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    CONSTRAINT email_outbox_status_check CHECK ((status = ANY (ARRAY['sending'::text, 'queued'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: installations; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.installations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    scheduled_for timestamp with time zone,
    installed_at timestamp with time zone,
    notes text,
    acceptance_status app.acceptance_status DEFAULT 'pending'::app.acceptance_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: internal_notes; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.internal_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    change_order_id uuid,
    author_id uuid NOT NULL,
    body text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT internal_notes_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 4000)))
);


--
-- Name: notification_outbox; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.notification_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    idempotency_key text NOT NULL,
    event_type text NOT NULL,
    recipient text NOT NULL,
    payload_json jsonb NOT NULL,
    status app.notification_status DEFAULT 'pending'::app.notification_status NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_preferences; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.notification_preferences (
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    event_type text NOT NULL,
    email boolean NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: offer_acceptances; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.offer_acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    offer_id uuid NOT NULL,
    kind text NOT NULL,
    note text,
    typed_name text,
    actor_type text NOT NULL,
    actor_id uuid NOT NULL,
    ip inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT offer_acceptances_actor_type_check CHECK ((actor_type = ANY (ARRAY['staff'::text, 'portal_contact'::text]))),
    CONSTRAINT offer_acceptances_check CHECK (((kind <> 'accepted'::text) OR (typed_name IS NOT NULL))),
    CONSTRAINT offer_acceptances_check1 CHECK (((kind <> 'issues'::text) OR (note IS NOT NULL))),
    CONSTRAINT offer_acceptances_kind_check CHECK ((kind = ANY (ARRAY['requested'::text, 'accepted'::text, 'issues'::text]))),
    CONSTRAINT offer_acceptances_note_check CHECK (((note IS NULL) OR (char_length(note) <= 2000)))
);


--
-- Name: offer_templates; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.offer_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    client_note text,
    tax_rate numeric(5,2) NOT NULL,
    lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT offer_templates_name_check CHECK (((char_length(name) >= 2) AND (char_length(name) <= 120)))
);


--
-- Name: order_drafts; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.order_drafts (
    order_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    values_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    commercial_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    template_snapshot_json jsonb NOT NULL,
    updated_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 1 NOT NULL
);


--
-- Name: order_files; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.order_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    category app.file_category NOT NULL,
    storage_bucket text DEFAULT 'order-files'::text NOT NULL,
    storage_path text NOT NULL,
    original_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    checksum_sha256 text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    template_id uuid NOT NULL,
    order_number text NOT NULL,
    title text NOT NULL,
    stage app.order_stage DEFAULT 'draft'::app.order_stage NOT NULL,
    site_address text,
    target_delivery_date date,
    current_approved_version_id uuid,
    currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    current_total_minor bigint,
    deposit_required_minor bigint,
    deposit_paid_minor bigint DEFAULT 0 NOT NULL,
    created_by uuid NOT NULL,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text))
);


--
-- Name: organization_members; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.organization_members (
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role app.member_role NOT NULL,
    status app.member_status DEFAULT 'active'::app.member_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    permissions app.member_permission[] DEFAULT '{}'::app.member_permission[] NOT NULL,
    all_projects boolean DEFAULT false NOT NULL
);


--
-- Name: organization_template_field_overrides; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.organization_template_field_overrides (
    organization_id uuid NOT NULL,
    field_id uuid NOT NULL,
    label text,
    hidden boolean DEFAULT false NOT NULL,
    sort_order integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_storage_path text,
    brand_color text,
    default_currency character(3) DEFAULT 'EUR'::bpchar NOT NULL,
    default_locale text DEFAULT 'bg'::text NOT NULL,
    order_number_prefix text DEFAULT 'MF'::text NOT NULL,
    next_order_number bigint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    default_tax_rate numeric(5,2) DEFAULT 20.00 NOT NULL,
    portal_session_days integer DEFAULT 30 NOT NULL,
    step_up_threshold numeric(14,2),
    closure_requested_at timestamp with time zone,
    offer_validity_days integer DEFAULT 14 NOT NULL,
    logo_size text DEFAULT 'medium'::text NOT NULL,
    phone text,
    client_nudge_after_days integer DEFAULT 3 NOT NULL,
    client_expiry_warning_days integer DEFAULT 2 NOT NULL,
    client_schedule_digest_enabled boolean DEFAULT true NOT NULL,
    stage_warning_days integer DEFAULT 7 NOT NULL,
    CONSTRAINT organizations_client_expiry_warning_days_check CHECK (((client_expiry_warning_days >= 0) AND (client_expiry_warning_days <= 7))),
    CONSTRAINT organizations_client_nudge_after_days_check CHECK (((client_nudge_after_days >= 0) AND (client_nudge_after_days <= 14))),
    CONSTRAINT organizations_currency_check CHECK ((default_currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT organizations_logo_size_check CHECK ((logo_size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text]))),
    CONSTRAINT organizations_offer_validity_days_check CHECK (((offer_validity_days >= 1) AND (offer_validity_days <= 180))),
    CONSTRAINT organizations_phone_check CHECK (((phone IS NULL) OR ((char_length(phone) >= 6) AND (char_length(phone) <= 30)))),
    CONSTRAINT organizations_stage_warning_days_check CHECK (((stage_warning_days >= 1) AND (stage_warning_days <= 30)))
);


--
-- Name: owner_role_requests; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.owner_role_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    target_user_id uuid NOT NULL,
    requested_role app.member_role,
    remove_member boolean DEFAULT false NOT NULL,
    requested_by uuid NOT NULL,
    approved_by uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    target_role app.member_role
);


--
-- Name: payment_claims; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.payment_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    offer_id uuid,
    installment_id uuid,
    project_contact_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency character(3) NOT NULL,
    method text NOT NULL,
    paid_on date NOT NULL,
    note text,
    status text DEFAULT 'pending'::text NOT NULL,
    response text,
    receipt_id uuid,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_claims_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payment_claims_method_check CHECK ((method = ANY (ARRAY['cash'::text, 'bank'::text, 'card'::text, 'other'::text]))),
    CONSTRAINT payment_claims_note_check CHECK (((note IS NULL) OR (char_length(note) <= 500))),
    CONSTRAINT payment_claims_response_check CHECK (((response IS NULL) OR (char_length(response) <= 1000))),
    CONSTRAINT payment_claims_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text])))
);


--
-- Name: payment_disputes; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.payment_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    receipt_id uuid NOT NULL,
    project_contact_id uuid NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolution text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_disputes_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])))
);


--
-- Name: payment_installments; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.payment_installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    milestone_id uuid,
    kind app.payment_kind NOT NULL,
    title text NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency character(3) NOT NULL,
    due_on date NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    offer_id uuid,
    term_id bigint,
    CONSTRAINT payment_installments_positive CHECK ((amount > (0)::numeric))
);


--
-- Name: payments; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    kind app.payment_kind NOT NULL,
    amount_minor bigint NOT NULL,
    currency character(3) NOT NULL,
    paid_at timestamp with time zone NOT NULL,
    note text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: portal_decisions; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.portal_decisions (
    id bigint NOT NULL,
    revision_id bigint NOT NULL,
    project_contact_id uuid NOT NULL,
    portal_session_id bigint NOT NULL,
    decision app.change_decision NOT NULL,
    comment text,
    typed_name text NOT NULL,
    consent_text_version text NOT NULL,
    revision_content_hash text NOT NULL,
    idempotency_key uuid NOT NULL,
    ip inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    otp_id uuid,
    verified_email text,
    signature_storage_path text,
    signature_sha256 text
);


--
-- Name: portal_decisions_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

ALTER TABLE app.portal_decisions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME app.portal_decisions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: portal_grants; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.portal_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_contact_id uuid NOT NULL,
    project_id uuid NOT NULL,
    token_hash text NOT NULL,
    scope text[] DEFAULT '{view,decide}'::text[] NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_exchanged_at timestamp with time zone,
    token_ciphertext text,
    CONSTRAINT portal_grants_expiry_check CHECK ((expires_at > created_at))
);


--
-- Name: portal_links; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.portal_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    version_id uuid NOT NULL,
    token_hash text NOT NULL,
    scope app.portal_scope DEFAULT 'review'::app.portal_scope NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_viewed_at timestamp with time zone,
    view_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT portal_links_hash_check CHECK ((token_hash ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: portal_otps; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.portal_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portal_session_id bigint NOT NULL,
    project_contact_id uuid NOT NULL,
    purpose text NOT NULL,
    revision_id bigint,
    decision app.change_decision,
    email text NOT NULL,
    target_email text,
    code_hash text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_ip inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT portal_otps_check CHECK (((purpose <> 'decision'::text) OR ((revision_id IS NOT NULL) AND (decision IS NOT NULL)))),
    CONSTRAINT portal_otps_purpose_check CHECK ((purpose = ANY (ARRAY['claim'::text, 'email_change'::text, 'decision'::text, 'unlock'::text])))
);


--
-- Name: portal_sessions; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.portal_sessions (
    id bigint NOT NULL,
    portal_grant_id uuid NOT NULL,
    session_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    created_ip inet,
    user_agent text,
    client_id uuid,
    verified_at timestamp with time zone,
    CONSTRAINT portal_sessions_expiry_check CHECK ((expires_at > created_at))
);


--
-- Name: portal_sessions_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

ALTER TABLE app.portal_sessions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME app.portal_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: profiles; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.profiles (
    id uuid NOT NULL,
    display_name text NOT NULL,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    deletion_requested_at timestamp with time zone,
    deleted_at timestamp with time zone,
    welcome_seen_at timestamp with time zone
);


--
-- Name: project_contacts; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.project_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    portal_role app.portal_contact_role DEFAULT 'approver'::app.portal_contact_role NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email_verified_at timestamp with time zone,
    locked_at timestamp with time zone,
    removed_at timestamp with time zone,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL
);


--
-- Name: project_members; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.project_members (
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission app.project_permission DEFAULT 'view'::app.project_permission NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_milestones; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    change_order_id uuid,
    title text NOT NULL,
    due_on date NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    completed_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    schedule_item_id bigint,
    schedule_line_key uuid,
    offer_id uuid,
    previous_due_on date,
    due_change_reason text,
    CONSTRAINT project_milestones_due_change_reason_check CHECK (((due_change_reason IS NULL) OR (char_length(due_change_reason) <= 300))),
    CONSTRAINT project_milestones_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: project_receipts; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.project_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    installment_id uuid,
    correction_of_id uuid,
    kind app.payment_kind NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency character(3) NOT NULL,
    method text NOT NULL,
    received_on date NOT NULL,
    note text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    offer_id uuid,
    CONSTRAINT project_receipts_nonzero CHECK ((amount <> (0)::numeric))
);


--
-- Name: projects; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    site_address text NOT NULL,
    reference text,
    status app.project_status DEFAULT 'active'::app.project_status NOT NULL,
    created_by uuid NOT NULL,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    client_digest_at timestamp with time zone,
    client_id uuid NOT NULL
);


--
-- Name: quote_items; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(14,4) NOT NULL,
    unit text,
    unit_price_minor bigint NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: review_requests; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.review_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    version_id uuid NOT NULL,
    portal_link_id uuid NOT NULL,
    state app.review_state NOT NULL,
    message text NOT NULL,
    customer_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: revision_absorbed_changes; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.revision_absorbed_changes (
    revision_id bigint NOT NULL,
    change_order_id uuid NOT NULL
);


--
-- Name: service_requests; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.service_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    warranty_item_id uuid,
    status app.service_status DEFAULT 'open'::app.service_status NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: specification_template_fields; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.specification_template_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    stable_key text NOT NULL,
    section_key text NOT NULL,
    section_label text NOT NULL,
    label text NOT NULL,
    field_type app.specification_field_type NOT NULL,
    unit text,
    required boolean DEFAULT false NOT NULL,
    sort_order integer NOT NULL,
    options_json jsonb,
    config_json jsonb
);


--
-- Name: specification_templates; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.specification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope app.template_scope NOT NULL,
    organization_id uuid,
    key text NOT NULL,
    name_bg text NOT NULL,
    name_en text,
    version integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: specification_versions; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.specification_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    version_number integer NOT NULL,
    status app.version_status DEFAULT 'published'::app.version_status NOT NULL,
    snapshot_json jsonb NOT NULL,
    commercial_snapshot_json jsonb NOT NULL,
    content_hash text NOT NULL,
    change_summary_json jsonb,
    price_delta_minor bigint,
    delivery_delta_days integer,
    created_by uuid NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    superseded_at timestamp with time zone,
    CONSTRAINT specification_versions_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: staff_notifications; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.staff_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid,
    event_type text NOT NULL,
    title text NOT NULL,
    body text,
    href text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_invites; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email text NOT NULL,
    role app.member_role NOT NULL,
    project_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    token_hash text NOT NULL,
    created_by uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    permissions app.member_permission[] DEFAULT '{}'::app.member_permission[] NOT NULL,
    all_projects boolean DEFAULT false NOT NULL
);


--
-- Name: timeline_events; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.timeline_events (
    id bigint NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    change_order_id uuid,
    revision_id bigint,
    actor_type app.timeline_actor_type NOT NULL,
    actor_id text,
    event_type text NOT NULL,
    visibility app.timeline_visibility DEFAULT 'internal'::app.timeline_visibility NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: timeline_events_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

ALTER TABLE app.timeline_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME app.timeline_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_consents; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.user_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    document text NOT NULL,
    version text NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_consents_document_check CHECK ((document = ANY (ARRAY['terms'::text, 'privacy'::text])))
);


--
-- Name: version_files; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.version_files (
    organization_id uuid NOT NULL,
    version_id uuid NOT NULL,
    file_id uuid NOT NULL,
    manifest_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: warranty_items; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.warranty_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    name text NOT NULL,
    manufacturer text,
    model text,
    serial_number text,
    warranty_start date,
    warranty_end date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_events activity_events_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.activity_events
    ADD CONSTRAINT activity_events_pkey PRIMARY KEY (id);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: auth_accounts auth_accounts_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_accounts
    ADD CONSTRAINT auth_accounts_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- Name: auth_verifications auth_verifications_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_verifications
    ADD CONSTRAINT auth_verifications_pkey PRIMARY KEY (id);


--
-- Name: catalog_items catalog_items_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.catalog_items
    ADD CONSTRAINT catalog_items_pkey PRIMARY KEY (id);


--
-- Name: change_attachments change_attachments_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_attachments
    ADD CONSTRAINT change_attachments_pkey PRIMARY KEY (id);


--
-- Name: change_order_line_items change_order_line_items_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_order_line_items
    ADD CONSTRAINT change_order_line_items_pkey PRIMARY KEY (id);


--
-- Name: change_order_payment_terms change_order_payment_terms_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_order_payment_terms
    ADD CONSTRAINT change_order_payment_terms_pkey PRIMARY KEY (id);


--
-- Name: change_order_payment_terms change_order_payment_terms_revision_id_position_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_order_payment_terms
    ADD CONSTRAINT change_order_payment_terms_revision_id_position_key UNIQUE (revision_id, "position");


--
-- Name: change_order_revisions change_order_revisions_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_order_revisions
    ADD CONSTRAINT change_order_revisions_pkey PRIMARY KEY (id);


--
-- Name: change_order_schedule_items change_order_schedule_items_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_order_schedule_items
    ADD CONSTRAINT change_order_schedule_items_pkey PRIMARY KEY (id);


--
-- Name: change_order_schedule_items change_order_schedule_items_revision_id_position_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_order_schedule_items
    ADD CONSTRAINT change_order_schedule_items_revision_id_position_key UNIQUE (revision_id, "position");


--
-- Name: change_orders change_orders_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_orders
    ADD CONSTRAINT change_orders_pkey PRIMARY KEY (id);


--
-- Name: clients clients_org_id_unique; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.clients
    ADD CONSTRAINT clients_org_id_unique UNIQUE (organization_id, id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: customers customers_org_id_unique; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.customers
    ADD CONSTRAINT customers_org_id_unique UNIQUE (organization_id, id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: document_messages document_messages_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.document_messages
    ADD CONSTRAINT document_messages_pkey PRIMARY KEY (id);


--
-- Name: email_outbox email_outbox_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.email_outbox
    ADD CONSTRAINT email_outbox_pkey PRIMARY KEY (id);


--
-- Name: installations installations_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.installations
    ADD CONSTRAINT installations_pkey PRIMARY KEY (id);


--
-- Name: internal_notes internal_notes_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.internal_notes
    ADD CONSTRAINT internal_notes_pkey PRIMARY KEY (id);


--
-- Name: notification_outbox notification_outbox_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.notification_outbox
    ADD CONSTRAINT notification_outbox_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id, organization_id, event_type);


--
-- Name: offer_acceptances offer_acceptances_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.offer_acceptances
    ADD CONSTRAINT offer_acceptances_pkey PRIMARY KEY (id);


--
-- Name: offer_templates offer_templates_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.offer_templates
    ADD CONSTRAINT offer_templates_pkey PRIMARY KEY (id);


--
-- Name: order_drafts order_drafts_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.order_drafts
    ADD CONSTRAINT order_drafts_pkey PRIMARY KEY (order_id);


--
-- Name: order_files order_files_org_id_unique; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.order_files
    ADD CONSTRAINT order_files_org_id_unique UNIQUE (organization_id, id);


--
-- Name: order_files order_files_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.order_files
    ADD CONSTRAINT order_files_pkey PRIMARY KEY (id);


--
-- Name: orders orders_org_id_unique; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.orders
    ADD CONSTRAINT orders_org_id_unique UNIQUE (organization_id, id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_organization_id_user_id_pk; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_pk PRIMARY KEY (organization_id, user_id);


--
-- Name: organization_template_field_overrides organization_template_field_overrides_organization_id_field_id_; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_template_field_overrides
    ADD CONSTRAINT organization_template_field_overrides_organization_id_field_id_ PRIMARY KEY (organization_id, field_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: owner_role_requests owner_role_requests_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.owner_role_requests
    ADD CONSTRAINT owner_role_requests_pkey PRIMARY KEY (id);


--
-- Name: payment_claims payment_claims_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_claims
    ADD CONSTRAINT payment_claims_pkey PRIMARY KEY (id);


--
-- Name: payment_disputes payment_disputes_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_disputes
    ADD CONSTRAINT payment_disputes_pkey PRIMARY KEY (id);


--
-- Name: payment_installments payment_installments_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_installments
    ADD CONSTRAINT payment_installments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: portal_decisions portal_decisions_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_decisions
    ADD CONSTRAINT portal_decisions_pkey PRIMARY KEY (id);


--
-- Name: portal_decisions portal_decisions_verified_chk; Type: CHECK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE app.portal_decisions
    ADD CONSTRAINT portal_decisions_verified_chk CHECK (((otp_id IS NOT NULL) AND (verified_email IS NOT NULL))) NOT VALID;


--
-- Name: portal_grants portal_grants_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_grants
    ADD CONSTRAINT portal_grants_pkey PRIMARY KEY (id);


--
-- Name: portal_links portal_links_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_links
    ADD CONSTRAINT portal_links_pkey PRIMARY KEY (id);


--
-- Name: portal_otps portal_otps_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_otps
    ADD CONSTRAINT portal_otps_pkey PRIMARY KEY (id);


--
-- Name: portal_sessions portal_sessions_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_sessions
    ADD CONSTRAINT portal_sessions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_contacts project_contacts_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_contacts
    ADD CONSTRAINT project_contacts_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_project_id_user_id_pk; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_members
    ADD CONSTRAINT project_members_project_id_user_id_pk PRIMARY KEY (project_id, user_id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_receipts project_receipts_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_receipts
    ADD CONSTRAINT project_receipts_pkey PRIMARY KEY (id);


--
-- Name: projects projects_org_id_unique; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.projects
    ADD CONSTRAINT projects_org_id_unique UNIQUE (organization_id, id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: review_requests review_requests_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.review_requests
    ADD CONSTRAINT review_requests_pkey PRIMARY KEY (id);


--
-- Name: revision_absorbed_changes revision_absorbed_changes_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.revision_absorbed_changes
    ADD CONSTRAINT revision_absorbed_changes_pkey PRIMARY KEY (revision_id, change_order_id);


--
-- Name: service_requests service_requests_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);


--
-- Name: specification_template_fields specification_template_fields_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.specification_template_fields
    ADD CONSTRAINT specification_template_fields_pkey PRIMARY KEY (id);


--
-- Name: specification_templates specification_templates_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.specification_templates
    ADD CONSTRAINT specification_templates_pkey PRIMARY KEY (id);


--
-- Name: specification_versions specification_versions_org_id_unique; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.specification_versions
    ADD CONSTRAINT specification_versions_org_id_unique UNIQUE (organization_id, id);


--
-- Name: specification_versions specification_versions_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.specification_versions
    ADD CONSTRAINT specification_versions_pkey PRIMARY KEY (id);


--
-- Name: staff_notifications staff_notifications_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.staff_notifications
    ADD CONSTRAINT staff_notifications_pkey PRIMARY KEY (id);


--
-- Name: team_invites team_invites_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.team_invites
    ADD CONSTRAINT team_invites_pkey PRIMARY KEY (id);


--
-- Name: timeline_events timeline_events_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.timeline_events
    ADD CONSTRAINT timeline_events_pkey PRIMARY KEY (id);


--
-- Name: user_consents user_consents_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.user_consents
    ADD CONSTRAINT user_consents_pkey PRIMARY KEY (id);


--
-- Name: version_files version_files_version_id_file_id_pk; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.version_files
    ADD CONSTRAINT version_files_version_id_file_id_pk PRIMARY KEY (version_id, file_id);


--
-- Name: warranty_items warranty_items_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.warranty_items
    ADD CONSTRAINT warranty_items_pkey PRIMARY KEY (id);


--
-- Name: activity_events_order_time_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX activity_events_order_time_idx ON app.activity_events USING btree (organization_id, order_id, created_at);


--
-- Name: approvals_org_order_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX approvals_org_order_idx ON app.approvals USING btree (organization_id, order_id);


--
-- Name: approvals_org_version_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX approvals_org_version_idx ON app.approvals USING btree (organization_id, version_id);


--
-- Name: approvals_portal_link_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX approvals_portal_link_idx ON app.approvals USING btree (portal_link_id);


--
-- Name: approvals_version_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX approvals_version_uidx ON app.approvals USING btree (version_id);


--
-- Name: auth_accounts_user_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX auth_accounts_user_idx ON app.auth_accounts USING btree (user_id);


--
-- Name: auth_sessions_token_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX auth_sessions_token_uidx ON app.auth_sessions USING btree (token);


--
-- Name: auth_sessions_user_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX auth_sessions_user_idx ON app.auth_sessions USING btree (user_id);


--
-- Name: auth_users_email_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX auth_users_email_uidx ON app.auth_users USING btree (email);


--
-- Name: auth_verifications_identifier_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX auth_verifications_identifier_idx ON app.auth_verifications USING btree (identifier);


--
-- Name: catalog_items_org_name_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX catalog_items_org_name_idx ON app.catalog_items USING btree (organization_id, lower(name)) WHERE (archived_at IS NULL);


--
-- Name: change_attachments_change_order_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_attachments_change_order_idx ON app.change_attachments USING btree (change_order_id);


--
-- Name: change_attachments_project_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_attachments_project_idx ON app.change_attachments USING btree (project_id);


--
-- Name: change_attachments_revision_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_attachments_revision_idx ON app.change_attachments USING btree (revision_id);


--
-- Name: change_attachments_revision_path_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX change_attachments_revision_path_uidx ON app.change_attachments USING btree (revision_id, storage_path);


--
-- Name: change_line_items_revision_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_line_items_revision_idx ON app.change_order_line_items USING btree (revision_id);


--
-- Name: change_order_revisions_open_due_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_order_revisions_open_due_idx ON app.change_order_revisions USING btree (response_due_at) WHERE (status = ANY (ARRAY['sent'::app.change_revision_status, 'viewed'::app.change_revision_status]));


--
-- Name: change_order_schedule_items_line_key_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX change_order_schedule_items_line_key_uidx ON app.change_order_schedule_items USING btree (revision_id, line_key);


--
-- Name: change_orders_baseline_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_orders_baseline_idx ON app.change_orders USING btree (baseline_offer_id);


--
-- Name: change_orders_org_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_orders_org_idx ON app.change_orders USING btree (organization_id);


--
-- Name: change_orders_org_kind_updated_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_orders_org_kind_updated_idx ON app.change_orders USING btree (organization_id, document_kind, updated_at DESC) WHERE (archived_at IS NULL);


--
-- Name: change_orders_project_id_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX change_orders_project_id_uidx ON app.change_orders USING btree (project_id, id);


--
-- Name: change_orders_project_kind_sequence_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX change_orders_project_kind_sequence_uidx ON app.change_orders USING btree (project_id, document_kind, sequence_number);


--
-- Name: change_orders_project_kind_updated_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_orders_project_kind_updated_idx ON app.change_orders USING btree (project_id, document_kind, updated_at DESC) WHERE (archived_at IS NULL);


--
-- Name: change_orders_project_status_updated_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_orders_project_status_updated_idx ON app.change_orders USING btree (project_id, lifecycle_status, updated_at);


--
-- Name: change_revisions_one_active_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX change_revisions_one_active_uidx ON app.change_order_revisions USING btree (change_order_id) WHERE (status = ANY (ARRAY['sent'::app.change_revision_status, 'viewed'::app.change_revision_status]));


--
-- Name: change_revisions_order_id_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX change_revisions_order_id_uidx ON app.change_order_revisions USING btree (change_order_id, id);


--
-- Name: change_revisions_order_number_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX change_revisions_order_number_uidx ON app.change_order_revisions USING btree (change_order_id, revision_number);


--
-- Name: change_revisions_order_status_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX change_revisions_order_status_idx ON app.change_order_revisions USING btree (change_order_id, status);


--
-- Name: clients_org_email_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX clients_org_email_idx ON app.clients USING btree (organization_id, email_normalized) WHERE (email_normalized IS NOT NULL);


--
-- Name: clients_org_name_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX clients_org_name_idx ON app.clients USING btree (organization_id, name);


--
-- Name: clients_org_phone_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX clients_org_phone_idx ON app.clients USING btree (organization_id, phone_normalized) WHERE (phone_normalized IS NOT NULL);


--
-- Name: customers_name_trgm_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX customers_name_trgm_idx ON app.customers USING gin (lower(name) extensions.gin_trgm_ops);


--
-- Name: customers_org_email_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX customers_org_email_idx ON app.customers USING btree (organization_id, email);


--
-- Name: customers_org_name_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX customers_org_name_idx ON app.customers USING btree (organization_id, name);


--
-- Name: customers_org_phone_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX customers_org_phone_idx ON app.customers USING btree (organization_id, phone);


--
-- Name: document_messages_change_order_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX document_messages_change_order_idx ON app.document_messages USING btree (change_order_id, created_at);


--
-- Name: email_outbox_created_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX email_outbox_created_idx ON app.email_outbox USING btree (created_at);


--
-- Name: email_outbox_due_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX email_outbox_due_idx ON app.email_outbox USING btree (next_attempt_at) WHERE (status = 'queued'::text);


--
-- Name: email_outbox_sent_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX email_outbox_sent_idx ON app.email_outbox USING btree (sent_at) WHERE (status = 'sent'::text);


--
-- Name: installations_order_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX installations_order_uidx ON app.installations USING btree (order_id);


--
-- Name: installations_org_order_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX installations_org_order_idx ON app.installations USING btree (organization_id, order_id);


--
-- Name: internal_notes_change_order_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX internal_notes_change_order_idx ON app.internal_notes USING btree (change_order_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: internal_notes_project_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX internal_notes_project_idx ON app.internal_notes USING btree (project_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: notification_outbox_delivery_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX notification_outbox_delivery_idx ON app.notification_outbox USING btree (status, available_at);


--
-- Name: notification_outbox_idempotency_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX notification_outbox_idempotency_uidx ON app.notification_outbox USING btree (idempotency_key);


--
-- Name: notification_outbox_org_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX notification_outbox_org_idx ON app.notification_outbox USING btree (organization_id);


--
-- Name: offer_acceptances_offer_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX offer_acceptances_offer_idx ON app.offer_acceptances USING btree (offer_id, created_at);


--
-- Name: offer_acceptances_project_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX offer_acceptances_project_idx ON app.offer_acceptances USING btree (project_id, created_at);


--
-- Name: offer_templates_org_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX offer_templates_org_idx ON app.offer_templates USING btree (organization_id, created_at DESC) WHERE (archived_at IS NULL);


--
-- Name: order_drafts_org_order_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX order_drafts_org_order_idx ON app.order_drafts USING btree (organization_id, order_id);


--
-- Name: order_files_order_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX order_files_order_idx ON app.order_files USING btree (organization_id, order_id);


--
-- Name: order_files_storage_path_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX order_files_storage_path_uidx ON app.order_files USING btree (storage_bucket, storage_path);


--
-- Name: orders_org_approved_version_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX orders_org_approved_version_idx ON app.orders USING btree (organization_id, current_approved_version_id);


--
-- Name: orders_org_customer_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX orders_org_customer_idx ON app.orders USING btree (organization_id, customer_id);


--
-- Name: orders_org_number_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX orders_org_number_uidx ON app.orders USING btree (organization_id, order_number);


--
-- Name: orders_org_stage_updated_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX orders_org_stage_updated_idx ON app.orders USING btree (organization_id, stage, updated_at);


--
-- Name: orders_template_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX orders_template_idx ON app.orders USING btree (template_id);


--
-- Name: orders_title_trgm_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX orders_title_trgm_idx ON app.orders USING gin (lower(title) extensions.gin_trgm_ops);


--
-- Name: organization_members_user_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX organization_members_user_idx ON app.organization_members USING btree (user_id, status);


--
-- Name: organizations_slug_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX organizations_slug_uidx ON app.organizations USING btree (slug);


--
-- Name: owner_role_requests_org_status_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX owner_role_requests_org_status_idx ON app.owner_role_requests USING btree (organization_id, status);


--
-- Name: payment_claims_installment_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX payment_claims_installment_idx ON app.payment_claims USING btree (installment_id) WHERE (installment_id IS NOT NULL);


--
-- Name: payment_claims_project_status_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX payment_claims_project_status_idx ON app.payment_claims USING btree (project_id, status);


--
-- Name: payment_disputes_one_open_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX payment_disputes_one_open_uidx ON app.payment_disputes USING btree (receipt_id) WHERE (status = 'open'::text);


--
-- Name: payment_disputes_project_status_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX payment_disputes_project_status_idx ON app.payment_disputes USING btree (project_id, status);


--
-- Name: payment_installments_milestone_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX payment_installments_milestone_idx ON app.payment_installments USING btree (milestone_id) WHERE (milestone_id IS NOT NULL);


--
-- Name: payment_installments_project_due_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX payment_installments_project_due_idx ON app.payment_installments USING btree (project_id, due_on);


--
-- Name: payment_installments_project_offer_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX payment_installments_project_offer_idx ON app.payment_installments USING btree (project_id, offer_id);


--
-- Name: payments_order_paid_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX payments_order_paid_idx ON app.payments USING btree (organization_id, order_id, paid_at);


--
-- Name: portal_decisions_contact_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX portal_decisions_contact_idx ON app.portal_decisions USING btree (project_contact_id);


--
-- Name: portal_decisions_idempotency_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX portal_decisions_idempotency_uidx ON app.portal_decisions USING btree (idempotency_key);


--
-- Name: portal_decisions_otp_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX portal_decisions_otp_uidx ON app.portal_decisions USING btree (otp_id);


--
-- Name: portal_decisions_revision_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX portal_decisions_revision_uidx ON app.portal_decisions USING btree (revision_id);


--
-- Name: portal_decisions_session_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX portal_decisions_session_idx ON app.portal_decisions USING btree (portal_session_id);


--
-- Name: portal_grants_project_contact_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX portal_grants_project_contact_idx ON app.portal_grants USING btree (project_id, project_contact_id);


--
-- Name: portal_grants_token_hash_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX portal_grants_token_hash_uidx ON app.portal_grants USING btree (token_hash);


--
-- Name: portal_links_active_review_order_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX portal_links_active_review_order_uidx ON app.portal_links USING btree (organization_id, order_id) WHERE ((scope = 'review'::app.portal_scope) AND (revoked_at IS NULL));


--
-- Name: portal_links_org_order_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX portal_links_org_order_idx ON app.portal_links USING btree (organization_id, order_id);


--
-- Name: portal_links_token_hash_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX portal_links_token_hash_uidx ON app.portal_links USING btree (token_hash);


--
-- Name: portal_links_version_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX portal_links_version_idx ON app.portal_links USING btree (organization_id, version_id);


--
-- Name: portal_otps_contact_created_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX portal_otps_contact_created_idx ON app.portal_otps USING btree (project_contact_id, created_at);


--
-- Name: portal_otps_revision_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX portal_otps_revision_idx ON app.portal_otps USING btree (revision_id);


--
-- Name: portal_otps_session_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX portal_otps_session_idx ON app.portal_otps USING btree (portal_session_id);


--
-- Name: portal_sessions_client_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX portal_sessions_client_idx ON app.portal_sessions USING btree (client_id) WHERE (client_id IS NOT NULL);


--
-- Name: portal_sessions_grant_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX portal_sessions_grant_idx ON app.portal_sessions USING btree (portal_grant_id);


--
-- Name: portal_sessions_session_hash_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX portal_sessions_session_hash_uidx ON app.portal_sessions USING btree (session_hash);


--
-- Name: profiles_deletion_due_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX profiles_deletion_due_idx ON app.profiles USING btree (deletion_requested_at) WHERE ((deletion_requested_at IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: project_contacts_client_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_contacts_client_idx ON app.project_contacts USING btree (client_id);


--
-- Name: project_contacts_one_approver_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX project_contacts_one_approver_uidx ON app.project_contacts USING btree (project_id) WHERE (is_primary AND (portal_role = 'approver'::app.portal_contact_role) AND (removed_at IS NULL));


--
-- Name: project_contacts_one_per_client_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX project_contacts_one_per_client_uidx ON app.project_contacts USING btree (project_id, client_id) WHERE (removed_at IS NULL);


--
-- Name: project_contacts_project_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_contacts_project_idx ON app.project_contacts USING btree (project_id);


--
-- Name: project_members_user_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_members_user_idx ON app.project_members USING btree (user_id, project_id);


--
-- Name: project_milestones_change_order_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_milestones_change_order_idx ON app.project_milestones USING btree (change_order_id) WHERE (change_order_id IS NOT NULL);


--
-- Name: project_milestones_org_open_due_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_milestones_org_open_due_idx ON app.project_milestones USING btree (organization_id, due_on) WHERE (status <> 'completed'::text);


--
-- Name: project_milestones_project_due_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_milestones_project_due_idx ON app.project_milestones USING btree (project_id, due_on);


--
-- Name: project_milestones_project_offer_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_milestones_project_offer_idx ON app.project_milestones USING btree (project_id, offer_id);


--
-- Name: project_milestones_schedule_item_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_milestones_schedule_item_idx ON app.project_milestones USING btree (schedule_item_id) WHERE (schedule_item_id IS NOT NULL);


--
-- Name: project_milestones_schedule_line_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_milestones_schedule_line_idx ON app.project_milestones USING btree (project_id, schedule_line_key) WHERE (schedule_line_key IS NOT NULL);


--
-- Name: project_receipts_installment_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_receipts_installment_idx ON app.project_receipts USING btree (installment_id) WHERE (installment_id IS NOT NULL);


--
-- Name: project_receipts_org_date_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_receipts_org_date_idx ON app.project_receipts USING btree (organization_id, received_on);


--
-- Name: project_receipts_project_date_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_receipts_project_date_idx ON app.project_receipts USING btree (project_id, received_on);


--
-- Name: project_receipts_project_offer_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_receipts_project_offer_idx ON app.project_receipts USING btree (project_id, offer_id);


--
-- Name: projects_org_client_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX projects_org_client_idx ON app.projects USING btree (organization_id, client_id);


--
-- Name: projects_org_status_updated_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX projects_org_status_updated_idx ON app.projects USING btree (organization_id, status, updated_at);


--
-- Name: projects_org_updated_active_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX projects_org_updated_active_idx ON app.projects USING btree (organization_id, updated_at DESC) WHERE (archived_at IS NULL);


--
-- Name: projects_public_id_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX projects_public_id_uidx ON app.projects USING btree (public_id);


--
-- Name: quote_items_order_sort_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX quote_items_order_sort_idx ON app.quote_items USING btree (organization_id, order_id, sort_order);


--
-- Name: review_requests_order_open_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX review_requests_order_open_idx ON app.review_requests USING btree (organization_id, order_id, resolved_at);


--
-- Name: review_requests_org_version_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX review_requests_org_version_idx ON app.review_requests USING btree (organization_id, version_id);


--
-- Name: review_requests_portal_link_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX review_requests_portal_link_idx ON app.review_requests USING btree (portal_link_id);


--
-- Name: revision_absorbed_changes_change_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX revision_absorbed_changes_change_idx ON app.revision_absorbed_changes USING btree (change_order_id);


--
-- Name: service_requests_order_status_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX service_requests_order_status_idx ON app.service_requests USING btree (organization_id, order_id, status);


--
-- Name: service_requests_warranty_item_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX service_requests_warranty_item_idx ON app.service_requests USING btree (warranty_item_id);


--
-- Name: specification_templates_org_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX specification_templates_org_idx ON app.specification_templates USING btree (organization_id);


--
-- Name: specification_templates_scope_key_version_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX specification_templates_scope_key_version_uidx ON app.specification_templates USING btree (scope, organization_id, key, version);


--
-- Name: specification_versions_order_number_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX specification_versions_order_number_uidx ON app.specification_versions USING btree (order_id, version_number);


--
-- Name: specification_versions_order_status_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX specification_versions_order_status_idx ON app.specification_versions USING btree (organization_id, order_id, status);


--
-- Name: staff_notifications_org_user_created_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX staff_notifications_org_user_created_idx ON app.staff_notifications USING btree (organization_id, user_id, created_at DESC);


--
-- Name: team_invites_org_email_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX team_invites_org_email_idx ON app.team_invites USING btree (organization_id, email);


--
-- Name: team_invites_token_hash_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX team_invites_token_hash_uidx ON app.team_invites USING btree (token_hash);


--
-- Name: template_field_overrides_field_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX template_field_overrides_field_idx ON app.organization_template_field_overrides USING btree (field_id);


--
-- Name: template_fields_sort_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX template_fields_sort_idx ON app.specification_template_fields USING btree (template_id, sort_order);


--
-- Name: template_fields_stable_key_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX template_fields_stable_key_uidx ON app.specification_template_fields USING btree (template_id, stable_key);


--
-- Name: timeline_change_created_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX timeline_change_created_idx ON app.timeline_events USING btree (change_order_id, created_at, id);


--
-- Name: timeline_client_digest_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX timeline_client_digest_idx ON app.timeline_events USING btree (created_at) WHERE ((visibility = 'client'::app.timeline_visibility) AND (actor_type = 'staff'::app.timeline_actor_type));


--
-- Name: timeline_project_cursor_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX timeline_project_cursor_idx ON app.timeline_events USING btree (project_id, created_at, id);


--
-- Name: timeline_revision_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX timeline_revision_idx ON app.timeline_events USING btree (revision_id);


--
-- Name: user_consents_user_document_version_uidx; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX user_consents_user_document_version_uidx ON app.user_consents USING btree (user_id, document, version);


--
-- Name: version_files_org_file_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX version_files_org_file_idx ON app.version_files USING btree (organization_id, file_id);


--
-- Name: version_files_org_version_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX version_files_org_version_idx ON app.version_files USING btree (organization_id, version_id);


--
-- Name: warranty_items_order_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX warranty_items_order_idx ON app.warranty_items USING btree (organization_id, order_id);


--
-- Name: activity_events activity_events_prevent_change; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER activity_events_prevent_change BEFORE DELETE OR UPDATE ON app.activity_events FOR EACH ROW EXECUTE FUNCTION app.prevent_immutable_record_change();


--
-- Name: approvals approvals_prevent_change; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER approvals_prevent_change BEFORE DELETE OR UPDATE ON app.approvals FOR EACH ROW EXECUTE FUNCTION app.prevent_immutable_record_change();


--
-- Name: customers customers_set_updated_at; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON app.customers FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();


--
-- Name: installations installations_set_updated_at; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER installations_set_updated_at BEFORE UPDATE ON app.installations FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();


--
-- Name: offer_acceptances offer_acceptances_append_only; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER offer_acceptances_append_only BEFORE DELETE OR UPDATE ON app.offer_acceptances FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();


--
-- Name: orders orders_set_updated_at; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON app.orders FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();


--
-- Name: organizations organizations_set_updated_at; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON app.organizations FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();


--
-- Name: payment_installments payment_installments_offer_kind; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER payment_installments_offer_kind BEFORE INSERT OR UPDATE OF offer_id ON app.payment_installments FOR EACH ROW EXECUTE FUNCTION app.require_offer_reference();


--
-- Name: portal_decisions portal_decisions_append_only; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER portal_decisions_append_only BEFORE DELETE OR UPDATE ON app.portal_decisions FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON app.profiles FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();


--
-- Name: project_milestones project_milestones_offer_kind; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER project_milestones_offer_kind BEFORE INSERT OR UPDATE OF offer_id ON app.project_milestones FOR EACH ROW EXECUTE FUNCTION app.require_offer_reference();


--
-- Name: project_receipts project_receipts_append_only; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER project_receipts_append_only BEFORE DELETE OR UPDATE ON app.project_receipts FOR EACH ROW EXECUTE FUNCTION app.protect_project_receipt();


--
-- Name: project_receipts project_receipts_offer_kind; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER project_receipts_offer_kind BEFORE INSERT OR UPDATE OF offer_id ON app.project_receipts FOR EACH ROW EXECUTE FUNCTION app.require_offer_reference();


--
-- Name: projects projects_protect_client; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER projects_protect_client BEFORE UPDATE OF client_id ON app.projects FOR EACH ROW EXECUTE FUNCTION app.protect_project_client();


--
-- Name: revision_absorbed_changes protect_frozen_absorbed_change; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER protect_frozen_absorbed_change BEFORE INSERT OR DELETE OR UPDATE ON app.revision_absorbed_changes FOR EACH ROW EXECUTE FUNCTION app.protect_frozen_revision_child();


--
-- Name: change_order_revisions protect_frozen_change_revision; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER protect_frozen_change_revision BEFORE UPDATE ON app.change_order_revisions FOR EACH ROW EXECUTE FUNCTION app.protect_frozen_change_revision();


--
-- Name: change_order_payment_terms protect_frozen_payment_term; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER protect_frozen_payment_term BEFORE INSERT OR DELETE OR UPDATE ON app.change_order_payment_terms FOR EACH ROW EXECUTE FUNCTION app.protect_frozen_revision_child();


--
-- Name: change_order_schedule_items protect_frozen_schedule_item; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER protect_frozen_schedule_item BEFORE INSERT OR DELETE OR UPDATE ON app.change_order_schedule_items FOR EACH ROW EXECUTE FUNCTION app.protect_frozen_schedule_item();


--
-- Name: project_contacts protect_locked_contact; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER protect_locked_contact BEFORE UPDATE ON app.project_contacts FOR EACH ROW EXECUTE FUNCTION app.protect_locked_contact();


--
-- Name: quote_items quote_items_set_updated_at; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER quote_items_set_updated_at BEFORE UPDATE ON app.quote_items FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();


--
-- Name: change_order_revisions require_portal_decision; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER require_portal_decision BEFORE UPDATE OF status ON app.change_order_revisions FOR EACH ROW EXECUTE FUNCTION app.require_portal_decision();


--
-- Name: service_requests service_requests_set_updated_at; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER service_requests_set_updated_at BEFORE UPDATE ON app.service_requests FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();


--
-- Name: specification_versions specification_versions_prevent_delete; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER specification_versions_prevent_delete BEFORE DELETE ON app.specification_versions FOR EACH ROW EXECUTE FUNCTION app.prevent_immutable_record_change();


--
-- Name: specification_versions specification_versions_protect_payload; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER specification_versions_protect_payload BEFORE UPDATE ON app.specification_versions FOR EACH ROW EXECUTE FUNCTION app.protect_version_payload();


--
-- Name: staff_notifications staff_notifications_refresh; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER staff_notifications_refresh AFTER INSERT ON app.staff_notifications FOR EACH ROW EXECUTE FUNCTION app.broadcast_staff_refresh();


--
-- Name: timeline_events timeline_events_append_only; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER timeline_events_append_only BEFORE DELETE OR UPDATE ON app.timeline_events FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();


--
-- Name: version_files version_files_prevent_change; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER version_files_prevent_change BEFORE DELETE OR UPDATE ON app.version_files FOR EACH ROW EXECUTE FUNCTION app.prevent_immutable_record_change();


--
-- Name: warranty_items warranty_items_set_updated_at; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER warranty_items_set_updated_at BEFORE UPDATE ON app.warranty_items FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();


--
-- Name: activity_events activity_events_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.activity_events
    ADD CONSTRAINT activity_events_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE RESTRICT;


--
-- Name: approvals approvals_order_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.approvals
    ADD CONSTRAINT approvals_order_tenant_fk FOREIGN KEY (organization_id, order_id) REFERENCES app.orders(organization_id, id) ON DELETE RESTRICT;


--
-- Name: approvals approvals_portal_link_id_portal_links_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.approvals
    ADD CONSTRAINT approvals_portal_link_id_portal_links_id_fk FOREIGN KEY (portal_link_id) REFERENCES app.portal_links(id) ON DELETE RESTRICT;


--
-- Name: approvals approvals_version_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.approvals
    ADD CONSTRAINT approvals_version_tenant_fk FOREIGN KEY (organization_id, version_id) REFERENCES app.specification_versions(organization_id, id) ON DELETE RESTRICT;


--
-- Name: auth_accounts auth_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_accounts
    ADD CONSTRAINT auth_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.auth_users(id) ON DELETE CASCADE;


--
-- Name: auth_sessions auth_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.auth_users(id) ON DELETE CASCADE;


--
-- Name: catalog_items catalog_items_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.catalog_items
    ADD CONSTRAINT catalog_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: change_attachments change_attachments_change_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_attachments
    ADD CONSTRAINT change_attachments_change_order_id_fkey FOREIGN KEY (change_order_id) REFERENCES app.change_orders(id) ON DELETE RESTRICT;


--
-- Name: change_attachments change_attachments_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_attachments
    ADD CONSTRAINT change_attachments_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE RESTRICT;


--
-- Name: change_attachments change_attachments_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_attachments
    ADD CONSTRAINT change_attachments_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id) ON DELETE RESTRICT;


--
-- Name: change_attachments change_attachments_revision_id_change_order_revisions_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_attachments
    ADD CONSTRAINT change_attachments_revision_id_change_order_revisions_id_fk FOREIGN KEY (revision_id) REFERENCES app.change_order_revisions(id) ON DELETE RESTRICT;


--
-- Name: change_order_line_items change_order_line_items_revision_id_change_order_revisions_id_f; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_order_line_items
    ADD CONSTRAINT change_order_line_items_revision_id_change_order_revisions_id_f FOREIGN KEY (revision_id) REFERENCES app.change_order_revisions(id) ON DELETE CASCADE;


--
-- Name: change_order_payment_terms change_order_payment_terms_revision_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_order_payment_terms
    ADD CONSTRAINT change_order_payment_terms_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES app.change_order_revisions(id) ON DELETE CASCADE;


--
-- Name: change_order_revisions change_order_revisions_change_order_id_change_orders_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_order_revisions
    ADD CONSTRAINT change_order_revisions_change_order_id_change_orders_id_fk FOREIGN KEY (change_order_id) REFERENCES app.change_orders(id) ON DELETE RESTRICT;


--
-- Name: change_order_schedule_items change_order_schedule_items_revision_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_order_schedule_items
    ADD CONSTRAINT change_order_schedule_items_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES app.change_order_revisions(id) ON DELETE CASCADE;


--
-- Name: change_orders change_orders_absorbed_by_revision_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_orders
    ADD CONSTRAINT change_orders_absorbed_by_revision_id_fkey FOREIGN KEY (absorbed_by_revision_id) REFERENCES app.change_order_revisions(id) ON DELETE SET NULL;


--
-- Name: change_orders change_orders_approved_revision_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_orders
    ADD CONSTRAINT change_orders_approved_revision_fk FOREIGN KEY (id, approved_revision_id) REFERENCES app.change_order_revisions(change_order_id, id) ON DELETE RESTRICT;


--
-- Name: change_orders change_orders_baseline_offer_id_change_orders_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_orders
    ADD CONSTRAINT change_orders_baseline_offer_id_change_orders_id_fk FOREIGN KEY (baseline_offer_id) REFERENCES app.change_orders(id) ON DELETE RESTRICT;


--
-- Name: change_orders change_orders_current_revision_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_orders
    ADD CONSTRAINT change_orders_current_revision_fk FOREIGN KEY (current_revision_id) REFERENCES app.change_order_revisions(id) ON DELETE RESTRICT;


--
-- Name: change_orders change_orders_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_orders
    ADD CONSTRAINT change_orders_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE RESTRICT;


--
-- Name: change_orders change_orders_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.change_orders
    ADD CONSTRAINT change_orders_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id) ON DELETE RESTRICT;


--
-- Name: clients clients_merged_into_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.clients
    ADD CONSTRAINT clients_merged_into_id_fkey FOREIGN KEY (merged_into_id) REFERENCES app.clients(id);


--
-- Name: clients clients_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.clients
    ADD CONSTRAINT clients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE RESTRICT;


--
-- Name: customers customers_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.customers
    ADD CONSTRAINT customers_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE RESTRICT;


--
-- Name: document_messages document_messages_change_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.document_messages
    ADD CONSTRAINT document_messages_change_order_id_fkey FOREIGN KEY (change_order_id) REFERENCES app.change_orders(id) ON DELETE CASCADE;


--
-- Name: document_messages document_messages_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.document_messages
    ADD CONSTRAINT document_messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: document_messages document_messages_project_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.document_messages
    ADD CONSTRAINT document_messages_project_id_fkey FOREIGN KEY (project_id) REFERENCES app.projects(id) ON DELETE CASCADE;


--
-- Name: document_messages document_messages_revision_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.document_messages
    ADD CONSTRAINT document_messages_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES app.change_order_revisions(id) ON DELETE SET NULL;


--
-- Name: installations installations_order_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.installations
    ADD CONSTRAINT installations_order_tenant_fk FOREIGN KEY (organization_id, order_id) REFERENCES app.orders(organization_id, id) ON DELETE RESTRICT;


--
-- Name: internal_notes internal_notes_change_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.internal_notes
    ADD CONSTRAINT internal_notes_change_order_id_fkey FOREIGN KEY (change_order_id) REFERENCES app.change_orders(id) ON DELETE CASCADE;


--
-- Name: internal_notes internal_notes_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.internal_notes
    ADD CONSTRAINT internal_notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: internal_notes internal_notes_project_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.internal_notes
    ADD CONSTRAINT internal_notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES app.projects(id) ON DELETE CASCADE;


--
-- Name: notification_outbox notification_outbox_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.notification_outbox
    ADD CONSTRAINT notification_outbox_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE RESTRICT;


--
-- Name: notification_preferences notification_preferences_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.notification_preferences
    ADD CONSTRAINT notification_preferences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: offer_acceptances offer_acceptances_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.offer_acceptances
    ADD CONSTRAINT offer_acceptances_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id);


--
-- Name: offer_acceptances offer_acceptances_project_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.offer_acceptances
    ADD CONSTRAINT offer_acceptances_project_id_fkey FOREIGN KEY (project_id) REFERENCES app.projects(id);


--
-- Name: offer_acceptances offer_acceptances_project_id_offer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.offer_acceptances
    ADD CONSTRAINT offer_acceptances_project_id_offer_id_fkey FOREIGN KEY (project_id, offer_id) REFERENCES app.change_orders(project_id, id);


--
-- Name: offer_templates offer_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.offer_templates
    ADD CONSTRAINT offer_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: order_drafts order_drafts_order_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.order_drafts
    ADD CONSTRAINT order_drafts_order_tenant_fk FOREIGN KEY (organization_id, order_id) REFERENCES app.orders(organization_id, id) ON DELETE CASCADE;


--
-- Name: order_files order_files_order_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.order_files
    ADD CONSTRAINT order_files_order_tenant_fk FOREIGN KEY (organization_id, order_id) REFERENCES app.orders(organization_id, id) ON DELETE CASCADE;


--
-- Name: orders orders_current_approved_version_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.orders
    ADD CONSTRAINT orders_current_approved_version_tenant_fk FOREIGN KEY (organization_id, current_approved_version_id) REFERENCES app.specification_versions(organization_id, id) ON DELETE RESTRICT;


--
-- Name: orders orders_customer_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.orders
    ADD CONSTRAINT orders_customer_tenant_fk FOREIGN KEY (organization_id, customer_id) REFERENCES app.customers(organization_id, id) ON DELETE RESTRICT;


--
-- Name: orders orders_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.orders
    ADD CONSTRAINT orders_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE RESTRICT;


--
-- Name: orders orders_template_id_specification_templates_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.orders
    ADD CONSTRAINT orders_template_id_specification_templates_id_fk FOREIGN KEY (template_id) REFERENCES app.specification_templates(id) ON DELETE RESTRICT;


--
-- Name: organization_members organization_members_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_members
    ADD CONSTRAINT organization_members_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_template_field_overrides organization_template_field_overrides_field_id_specification_te; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_template_field_overrides
    ADD CONSTRAINT organization_template_field_overrides_field_id_specification_te FOREIGN KEY (field_id) REFERENCES app.specification_template_fields(id) ON DELETE CASCADE;


--
-- Name: organization_template_field_overrides organization_template_field_overrides_organization_id_organizat; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_template_field_overrides
    ADD CONSTRAINT organization_template_field_overrides_organization_id_organizat FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: owner_role_requests owner_role_requests_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.owner_role_requests
    ADD CONSTRAINT owner_role_requests_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id);


--
-- Name: payment_claims payment_claims_installment_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_claims
    ADD CONSTRAINT payment_claims_installment_id_fkey FOREIGN KEY (installment_id) REFERENCES app.payment_installments(id);


--
-- Name: payment_claims payment_claims_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_claims
    ADD CONSTRAINT payment_claims_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id);


--
-- Name: payment_claims payment_claims_project_contact_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_claims
    ADD CONSTRAINT payment_claims_project_contact_id_fkey FOREIGN KEY (project_contact_id) REFERENCES app.project_contacts(id);


--
-- Name: payment_claims payment_claims_project_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_claims
    ADD CONSTRAINT payment_claims_project_id_fkey FOREIGN KEY (project_id) REFERENCES app.projects(id);


--
-- Name: payment_claims payment_claims_project_id_offer_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_claims
    ADD CONSTRAINT payment_claims_project_id_offer_id_fkey FOREIGN KEY (project_id, offer_id) REFERENCES app.change_orders(project_id, id);


--
-- Name: payment_claims payment_claims_receipt_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_claims
    ADD CONSTRAINT payment_claims_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES app.project_receipts(id);


--
-- Name: payment_disputes payment_disputes_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_disputes
    ADD CONSTRAINT payment_disputes_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id);


--
-- Name: payment_disputes payment_disputes_project_contact_id_project_contacts_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_disputes
    ADD CONSTRAINT payment_disputes_project_contact_id_project_contacts_id_fk FOREIGN KEY (project_contact_id) REFERENCES app.project_contacts(id);


--
-- Name: payment_disputes payment_disputes_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_disputes
    ADD CONSTRAINT payment_disputes_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id);


--
-- Name: payment_disputes payment_disputes_receipt_id_project_receipts_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_disputes
    ADD CONSTRAINT payment_disputes_receipt_id_project_receipts_id_fk FOREIGN KEY (receipt_id) REFERENCES app.project_receipts(id);


--
-- Name: payment_installments payment_installments_milestone_id_project_milestones_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_installments
    ADD CONSTRAINT payment_installments_milestone_id_project_milestones_id_fk FOREIGN KEY (milestone_id) REFERENCES app.project_milestones(id);


--
-- Name: payment_installments payment_installments_offer_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_installments
    ADD CONSTRAINT payment_installments_offer_fk FOREIGN KEY (project_id, offer_id) REFERENCES app.change_orders(project_id, id) ON DELETE RESTRICT;


--
-- Name: payment_installments payment_installments_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_installments
    ADD CONSTRAINT payment_installments_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id);


--
-- Name: payment_installments payment_installments_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_installments
    ADD CONSTRAINT payment_installments_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id);


--
-- Name: payment_installments payment_installments_term_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payment_installments
    ADD CONSTRAINT payment_installments_term_id_fkey FOREIGN KEY (term_id) REFERENCES app.change_order_payment_terms(id) ON DELETE SET NULL;


--
-- Name: payments payments_order_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.payments
    ADD CONSTRAINT payments_order_tenant_fk FOREIGN KEY (organization_id, order_id) REFERENCES app.orders(organization_id, id) ON DELETE RESTRICT;


--
-- Name: portal_decisions portal_decisions_otp_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_decisions
    ADD CONSTRAINT portal_decisions_otp_id_fkey FOREIGN KEY (otp_id) REFERENCES app.portal_otps(id) ON DELETE RESTRICT;


--
-- Name: portal_decisions portal_decisions_portal_session_id_portal_sessions_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_decisions
    ADD CONSTRAINT portal_decisions_portal_session_id_portal_sessions_id_fk FOREIGN KEY (portal_session_id) REFERENCES app.portal_sessions(id) ON DELETE RESTRICT;


--
-- Name: portal_decisions portal_decisions_project_contact_id_project_contacts_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_decisions
    ADD CONSTRAINT portal_decisions_project_contact_id_project_contacts_id_fk FOREIGN KEY (project_contact_id) REFERENCES app.project_contacts(id) ON DELETE RESTRICT;


--
-- Name: portal_decisions portal_decisions_revision_id_change_order_revisions_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_decisions
    ADD CONSTRAINT portal_decisions_revision_id_change_order_revisions_id_fk FOREIGN KEY (revision_id) REFERENCES app.change_order_revisions(id) ON DELETE RESTRICT;


--
-- Name: portal_grants portal_grants_project_contact_id_project_contacts_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_grants
    ADD CONSTRAINT portal_grants_project_contact_id_project_contacts_id_fk FOREIGN KEY (project_contact_id) REFERENCES app.project_contacts(id) ON DELETE RESTRICT;


--
-- Name: portal_grants portal_grants_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_grants
    ADD CONSTRAINT portal_grants_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id) ON DELETE CASCADE;


--
-- Name: portal_links portal_links_order_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_links
    ADD CONSTRAINT portal_links_order_tenant_fk FOREIGN KEY (organization_id, order_id) REFERENCES app.orders(organization_id, id) ON DELETE CASCADE;


--
-- Name: portal_links portal_links_version_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_links
    ADD CONSTRAINT portal_links_version_tenant_fk FOREIGN KEY (organization_id, version_id) REFERENCES app.specification_versions(organization_id, id) ON DELETE CASCADE;


--
-- Name: portal_otps portal_otps_portal_session_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_otps
    ADD CONSTRAINT portal_otps_portal_session_id_fkey FOREIGN KEY (portal_session_id) REFERENCES app.portal_sessions(id) ON DELETE CASCADE;


--
-- Name: portal_otps portal_otps_project_contact_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_otps
    ADD CONSTRAINT portal_otps_project_contact_id_fkey FOREIGN KEY (project_contact_id) REFERENCES app.project_contacts(id) ON DELETE CASCADE;


--
-- Name: portal_otps portal_otps_revision_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_otps
    ADD CONSTRAINT portal_otps_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES app.change_order_revisions(id) ON DELETE CASCADE;


--
-- Name: portal_sessions portal_sessions_client_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_sessions
    ADD CONSTRAINT portal_sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES app.clients(id) ON DELETE CASCADE;


--
-- Name: portal_sessions portal_sessions_portal_grant_id_portal_grants_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.portal_sessions
    ADD CONSTRAINT portal_sessions_portal_grant_id_portal_grants_id_fk FOREIGN KEY (portal_grant_id) REFERENCES app.portal_grants(id) ON DELETE CASCADE;


--
-- Name: project_contacts project_contacts_client_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_contacts
    ADD CONSTRAINT project_contacts_client_tenant_fk FOREIGN KEY (organization_id, client_id) REFERENCES app.clients(organization_id, id) ON DELETE RESTRICT;


--
-- Name: project_contacts project_contacts_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_contacts
    ADD CONSTRAINT project_contacts_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id) ON DELETE CASCADE;


--
-- Name: project_contacts project_contacts_project_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_contacts
    ADD CONSTRAINT project_contacts_project_tenant_fk FOREIGN KEY (organization_id, project_id) REFERENCES app.projects(organization_id, id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_members
    ADD CONSTRAINT project_members_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id) ON DELETE CASCADE;


--
-- Name: project_milestones project_milestones_change_order_id_change_orders_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_milestones
    ADD CONSTRAINT project_milestones_change_order_id_change_orders_id_fk FOREIGN KEY (change_order_id) REFERENCES app.change_orders(id);


--
-- Name: project_milestones project_milestones_offer_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_milestones
    ADD CONSTRAINT project_milestones_offer_fk FOREIGN KEY (project_id, offer_id) REFERENCES app.change_orders(project_id, id) ON DELETE RESTRICT;


--
-- Name: project_milestones project_milestones_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_milestones
    ADD CONSTRAINT project_milestones_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id);


--
-- Name: project_milestones project_milestones_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_milestones
    ADD CONSTRAINT project_milestones_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id);


--
-- Name: project_milestones project_milestones_schedule_item_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_milestones
    ADD CONSTRAINT project_milestones_schedule_item_id_fkey FOREIGN KEY (schedule_item_id) REFERENCES app.change_order_schedule_items(id) ON DELETE SET NULL;


--
-- Name: project_receipts project_receipts_installment_id_payment_installments_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_receipts
    ADD CONSTRAINT project_receipts_installment_id_payment_installments_id_fk FOREIGN KEY (installment_id) REFERENCES app.payment_installments(id);


--
-- Name: project_receipts project_receipts_offer_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_receipts
    ADD CONSTRAINT project_receipts_offer_fk FOREIGN KEY (project_id, offer_id) REFERENCES app.change_orders(project_id, id) ON DELETE RESTRICT;


--
-- Name: project_receipts project_receipts_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_receipts
    ADD CONSTRAINT project_receipts_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id);


--
-- Name: project_receipts project_receipts_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project_receipts
    ADD CONSTRAINT project_receipts_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id);


--
-- Name: projects projects_client_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.projects
    ADD CONSTRAINT projects_client_tenant_fk FOREIGN KEY (organization_id, client_id) REFERENCES app.clients(organization_id, id) ON DELETE RESTRICT;


--
-- Name: projects projects_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.projects
    ADD CONSTRAINT projects_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE RESTRICT;


--
-- Name: quote_items quote_items_order_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.quote_items
    ADD CONSTRAINT quote_items_order_tenant_fk FOREIGN KEY (organization_id, order_id) REFERENCES app.orders(organization_id, id) ON DELETE CASCADE;


--
-- Name: review_requests review_requests_portal_link_id_portal_links_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.review_requests
    ADD CONSTRAINT review_requests_portal_link_id_portal_links_id_fk FOREIGN KEY (portal_link_id) REFERENCES app.portal_links(id) ON DELETE RESTRICT;


--
-- Name: review_requests review_requests_version_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.review_requests
    ADD CONSTRAINT review_requests_version_tenant_fk FOREIGN KEY (organization_id, version_id) REFERENCES app.specification_versions(organization_id, id) ON DELETE RESTRICT;


--
-- Name: revision_absorbed_changes revision_absorbed_changes_change_order_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.revision_absorbed_changes
    ADD CONSTRAINT revision_absorbed_changes_change_order_id_fkey FOREIGN KEY (change_order_id) REFERENCES app.change_orders(id) ON DELETE CASCADE;


--
-- Name: revision_absorbed_changes revision_absorbed_changes_revision_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.revision_absorbed_changes
    ADD CONSTRAINT revision_absorbed_changes_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES app.change_order_revisions(id) ON DELETE CASCADE;


--
-- Name: service_requests service_requests_order_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.service_requests
    ADD CONSTRAINT service_requests_order_tenant_fk FOREIGN KEY (organization_id, order_id) REFERENCES app.orders(organization_id, id) ON DELETE RESTRICT;


--
-- Name: service_requests service_requests_warranty_item_id_warranty_items_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.service_requests
    ADD CONSTRAINT service_requests_warranty_item_id_warranty_items_id_fk FOREIGN KEY (warranty_item_id) REFERENCES app.warranty_items(id) ON DELETE SET NULL;


--
-- Name: specification_template_fields specification_template_fields_template_id_specification_templat; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.specification_template_fields
    ADD CONSTRAINT specification_template_fields_template_id_specification_templat FOREIGN KEY (template_id) REFERENCES app.specification_templates(id) ON DELETE CASCADE;


--
-- Name: specification_templates specification_templates_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.specification_templates
    ADD CONSTRAINT specification_templates_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: specification_versions specification_versions_order_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.specification_versions
    ADD CONSTRAINT specification_versions_order_tenant_fk FOREIGN KEY (organization_id, order_id) REFERENCES app.orders(organization_id, id) ON DELETE RESTRICT;


--
-- Name: staff_notifications staff_notifications_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.staff_notifications
    ADD CONSTRAINT staff_notifications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id);


--
-- Name: staff_notifications staff_notifications_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.staff_notifications
    ADD CONSTRAINT staff_notifications_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id);


--
-- Name: team_invites team_invites_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.team_invites
    ADD CONSTRAINT team_invites_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id);


--
-- Name: timeline_events timeline_events_change_order_id_change_orders_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.timeline_events
    ADD CONSTRAINT timeline_events_change_order_id_change_orders_id_fk FOREIGN KEY (change_order_id) REFERENCES app.change_orders(id) ON DELETE RESTRICT;


--
-- Name: timeline_events timeline_events_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.timeline_events
    ADD CONSTRAINT timeline_events_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE RESTRICT;


--
-- Name: timeline_events timeline_events_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.timeline_events
    ADD CONSTRAINT timeline_events_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES app.projects(id) ON DELETE RESTRICT;


--
-- Name: timeline_events timeline_events_revision_id_change_order_revisions_id_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.timeline_events
    ADD CONSTRAINT timeline_events_revision_id_change_order_revisions_id_fk FOREIGN KEY (revision_id) REFERENCES app.change_order_revisions(id) ON DELETE RESTRICT;


--
-- Name: version_files version_files_file_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.version_files
    ADD CONSTRAINT version_files_file_tenant_fk FOREIGN KEY (organization_id, file_id) REFERENCES app.order_files(organization_id, id) ON DELETE RESTRICT;


--
-- Name: version_files version_files_version_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.version_files
    ADD CONSTRAINT version_files_version_tenant_fk FOREIGN KEY (organization_id, version_id) REFERENCES app.specification_versions(organization_id, id) ON DELETE CASCADE;


--
-- Name: warranty_items warranty_items_order_tenant_fk; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.warranty_items
    ADD CONSTRAINT warranty_items_order_tenant_fk FOREIGN KEY (organization_id, order_id) REFERENCES app.orders(organization_id, id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

-- The application role reads and writes; it owns nothing (deploy/postgres-init/01-roles.sh).
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT USAGE ON SCHEMA app TO pakto_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO pakto_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO pakto_app;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO pakto_app;
  END IF;
END $$;

-- migrate:down
DROP SCHEMA app CASCADE;
