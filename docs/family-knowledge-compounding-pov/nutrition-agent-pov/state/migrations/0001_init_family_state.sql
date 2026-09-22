-- Milestone 1: Family Nutrition dynamic state schema.
-- This migration creates the first Postgres contract for inventory, meal planning,
-- meal execution, feedback, idempotency, and audit logging.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS family_state;

CREATE TABLE IF NOT EXISTS family_state.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Shanghai',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CHECK (length(trim(display_name)) > 0),
  CHECK (length(trim(timezone)) > 0)
);

CREATE TABLE IF NOT EXISTS family_state.actors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('human', 'agent', 'system')),
  display_name text NOT NULL,
  external_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (family_id, id),
  UNIQUE (family_id, actor_type, display_name),
  CHECK (length(trim(display_name)) > 0),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  display_name text NOT NULL,
  member_role text NOT NULL CHECK (member_role IN ('adult', 'baby', 'elder', 'guest')),
  birth_year integer,
  notes text,
  dietary_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (family_id, id),
  UNIQUE (family_id, display_name),
  CHECK (length(trim(display_name)) > 0),
  CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  item_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('vegetable', 'protein', 'staple', 'fruit', 'dairy', 'seasoning', 'frozen', 'other')),
  quantity numeric(12, 3) NOT NULL DEFAULT 0,
  unit text NOT NULL,
  storage_location text NOT NULL DEFAULT 'unknown' CHECK (storage_location IN ('fridge', 'freezer', 'pantry', 'room_temperature', 'unknown')),
  purchased_at date,
  expires_at date,
  last_event_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (family_id, id),
  UNIQUE (family_id, item_name, unit, storage_location),
  CHECK (length(trim(item_name)) > 0),
  CHECK (length(trim(unit)) > 0),
  CHECK (quantity >= 0),
  CHECK (expires_at IS NULL OR purchased_at IS NULL OR expires_at >= purchased_at),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.inventory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('purchase', 'consume', 'adjust', 'discard', 'expire')),
  quantity_delta numeric(12, 3) NOT NULL,
  unit text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  source_ref_type text CHECK (source_ref_type IN ('purchase_record', 'meal_event', 'manual_adjustment', 'system')),
  source_ref_id uuid,
  request_id text,
  trace_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(unit)) > 0),
  CHECK (quantity_delta <> 0),
  CHECK (
    (event_type = 'purchase' AND quantity_delta > 0)
    OR (event_type IN ('consume', 'discard', 'expire') AND quantity_delta < 0)
    OR (event_type = 'adjust' AND quantity_delta <> 0)
  ),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, inventory_item_id) REFERENCES family_state.inventory_items(family_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, actor_id) REFERENCES family_state.actors(family_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.purchase_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  purchased_on date NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'receipt', 'agent_suggestion', 'import')),
  store_name text,
  total_amount numeric(12, 2),
  currency text NOT NULL DEFAULT 'CNY',
  notes text,
  request_id text,
  trace_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, id),
  CHECK (total_amount IS NULL OR total_amount >= 0),
  CHECK (length(trim(currency)) = 3),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, actor_id) REFERENCES family_state.actors(family_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  purchase_record_id uuid NOT NULL,
  inventory_item_id uuid,
  item_name text NOT NULL,
  quantity numeric(12, 3) NOT NULL,
  unit text NOT NULL,
  category text CHECK (category IN ('vegetable', 'protein', 'staple', 'fruit', 'dairy', 'seasoning', 'frozen', 'other')),
  unit_price numeric(12, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, id),
  CHECK (length(trim(item_name)) > 0),
  CHECK (length(trim(unit)) > 0),
  CHECK (quantity > 0),
  CHECK (unit_price IS NULL OR unit_price >= 0),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, purchase_record_id) REFERENCES family_state.purchase_records(family_id, id) ON DELETE CASCADE,
  FOREIGN KEY (family_id, inventory_item_id) REFERENCES family_state.inventory_items(family_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  plan_date date NOT NULL,
  meal_scene text NOT NULL CHECK (meal_scene IN ('breakfast', 'lunch', 'dinner', 'snack', 'baby_meal')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'skipped', 'cancelled')),
  recommendation_reason text,
  avoid_repeat_window_days integer NOT NULL DEFAULT 14,
  request_id text,
  trace_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, id),
  CHECK (avoid_repeat_window_days >= 0),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, actor_id) REFERENCES family_state.actors(family_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  meal_plan_id uuid NOT NULL,
  recipe_ref text,
  recipe_title text NOT NULL,
  dish_role text NOT NULL DEFAULT 'main' CHECK (dish_role IN ('main', 'side', 'soup', 'staple', 'snack')),
  target_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, id),
  CHECK (length(trim(recipe_title)) > 0),
  CHECK (sort_order >= 0),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, meal_plan_id) REFERENCES family_state.meal_plans(family_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family_state.planned_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  meal_plan_item_id uuid NOT NULL,
  inventory_item_id uuid,
  item_name text NOT NULL,
  planned_quantity numeric(12, 3) NOT NULL,
  unit text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, id),
  CHECK (length(trim(item_name)) > 0),
  CHECK (length(trim(unit)) > 0),
  CHECK (planned_quantity > 0),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, meal_plan_item_id) REFERENCES family_state.meal_plan_items(family_id, id) ON DELETE CASCADE,
  FOREIGN KEY (family_id, inventory_item_id) REFERENCES family_state.inventory_items(family_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.meal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  meal_plan_id uuid,
  cooked_at timestamptz NOT NULL DEFAULT now(),
  meal_scene text NOT NULL CHECK (meal_scene IN ('breakfast', 'lunch', 'dinner', 'snack', 'baby_meal')),
  status text NOT NULL DEFAULT 'cooked' CHECK (status IN ('cooked', 'partially_cooked', 'skipped')),
  notes text,
  request_id text,
  trace_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, id),
  UNIQUE (family_id, meal_plan_id),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, actor_id) REFERENCES family_state.actors(family_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, meal_plan_id) REFERENCES family_state.meal_plans(family_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.meal_event_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  meal_event_id uuid NOT NULL,
  meal_plan_item_id uuid,
  recipe_ref text,
  recipe_title text NOT NULL,
  actual_servings numeric(8, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, id),
  CHECK (length(trim(recipe_title)) > 0),
  CHECK (actual_servings IS NULL OR actual_servings > 0),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, meal_event_id) REFERENCES family_state.meal_events(family_id, id) ON DELETE CASCADE,
  FOREIGN KEY (family_id, meal_plan_item_id) REFERENCES family_state.meal_plan_items(family_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.meal_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  meal_event_id uuid NOT NULL,
  family_member_id uuid,
  actor_id uuid NOT NULL,
  rating text NOT NULL CHECK (rating IN ('liked', 'neutral', 'disliked', 'no_feedback')),
  feedback_text text,
  suggested_preference_update text,
  requires_human_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, id),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, meal_event_id) REFERENCES family_state.meal_events(family_id, id) ON DELETE CASCADE,
  FOREIGN KEY (family_id, family_member_id) REFERENCES family_state.family_members(family_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, actor_id) REFERENCES family_state.actors(family_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.mcp_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  tool_name text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  request_id text,
  trace_id text,
  confirmation_text text,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'succeeded', 'failed', 'replayed')),
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_payload jsonb,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (family_id, tool_name, idempotency_key),
  UNIQUE (family_id, id),
  CHECK (length(trim(tool_name)) > 0),
  CHECK (length(trim(idempotency_key)) > 0),
  CHECK (length(trim(request_hash)) > 0),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, actor_id) REFERENCES family_state.actors(family_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS family_state.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  mcp_tool_call_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_snapshot jsonb,
  after_snapshot jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  trace_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(action)) > 0),
  CHECK (length(trim(entity_type)) > 0),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, actor_id) REFERENCES family_state.actors(family_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (family_id, mcp_tool_call_id) REFERENCES family_state.mcp_tool_calls(family_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_family_active
  ON family_state.inventory_items (family_id, archived_at, category, expires_at);

CREATE INDEX IF NOT EXISTS idx_inventory_events_family_item_time
  ON family_state.inventory_events (family_id, inventory_item_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_records_family_date
  ON family_state.purchase_records (family_id, purchased_on DESC);

CREATE INDEX IF NOT EXISTS idx_meal_plans_family_date_scene
  ON family_state.meal_plans (family_id, plan_date DESC, meal_scene);

CREATE INDEX IF NOT EXISTS idx_meal_events_family_cooked_at
  ON family_state.meal_events (family_id, cooked_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_family_request
  ON family_state.mcp_tool_calls (family_id, request_id, trace_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_family_created_at
  ON family_state.audit_log (family_id, created_at DESC);
