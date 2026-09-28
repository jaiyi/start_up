-- Milestone 3: Read-only business state functions for MCP runtime tools.
-- Runtime callers receive EXECUTE on these narrow functions, not direct table SELECT.

CREATE TABLE IF NOT EXISTS family_state.runtime_family_access (
  role_name name NOT NULL,
  family_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_name, family_id),
  FOREIGN KEY (family_id) REFERENCES family_state.families(id) ON DELETE CASCADE
);

REVOKE ALL ON TABLE family_state.runtime_family_access FROM PUBLIC;
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON family_state.runtime_family_access FROM family_nutrition_runtime;

CREATE OR REPLACE FUNCTION family_state.assert_runtime_family_access(target_family_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
BEGIN
  IF target_family_id IS NULL THEN
    RAISE EXCEPTION 'family_id is required' USING ERRCODE = '22004';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM family_state.runtime_family_access
    WHERE runtime_family_access.role_name = session_user::name
      AND runtime_family_access.family_id = target_family_id
  ) THEN
    RAISE EXCEPTION 'family_id is not allowed for this database runtime role' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION family_state.read_current_inventory(
  target_family_id uuid,
  include_zero boolean DEFAULT false,
  result_limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  family_id uuid,
  item_name text,
  category text,
  quantity numeric,
  unit text,
  storage_location text,
  purchased_at date,
  expires_at date,
  last_event_at timestamptz,
  notes text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
BEGIN
  PERFORM family_state.assert_runtime_family_access(target_family_id);

  RETURN QUERY
  SELECT
    inventory_items.id,
    inventory_items.family_id,
    inventory_items.item_name,
    inventory_items.category,
    inventory_items.quantity,
    inventory_items.unit,
    inventory_items.storage_location,
    inventory_items.purchased_at,
    inventory_items.expires_at,
    inventory_items.last_event_at,
    inventory_items.notes,
    inventory_items.updated_at
  FROM family_state.inventory_items
  WHERE inventory_items.family_id = target_family_id
    AND inventory_items.archived_at IS NULL
    AND (COALESCE(include_zero, false) OR inventory_items.quantity > 0)
  ORDER BY inventory_items.expires_at NULLS LAST, inventory_items.updated_at DESC, inventory_items.item_name ASC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 50), 1), 100);
END;
$$;

CREATE OR REPLACE FUNCTION family_state.read_inventory_risk_candidates(
  target_family_id uuid,
  as_of_date date DEFAULT CURRENT_DATE,
  include_low_risk boolean DEFAULT false,
  result_limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  family_id uuid,
  item_name text,
  category text,
  quantity numeric,
  unit text,
  storage_location text,
  purchased_at date,
  expires_at date,
  last_event_at timestamptz,
  notes text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
BEGIN
  PERFORM family_state.assert_runtime_family_access(target_family_id);

  RETURN QUERY
  WITH ranked_inventory AS (
    SELECT
      inventory_items.id,
      inventory_items.family_id,
      inventory_items.item_name,
      inventory_items.category,
      inventory_items.quantity,
      inventory_items.unit,
      inventory_items.storage_location,
      inventory_items.purchased_at,
      inventory_items.expires_at,
      inventory_items.last_event_at,
      inventory_items.notes,
      inventory_items.updated_at,
      (
        CASE
          WHEN inventory_items.expires_at IS NOT NULL AND inventory_items.expires_at < as_of_date THEN 100
          WHEN inventory_items.expires_at IS NOT NULL AND inventory_items.expires_at <= as_of_date + 3 THEN 80
          WHEN inventory_items.purchased_at IS NOT NULL AND inventory_items.purchased_at <= as_of_date - 14 THEN 50
          ELSE 10
        END
        + CASE
            WHEN inventory_items.expires_at IS NOT NULL AND inventory_items.expires_at <= as_of_date + 3 THEN 1
            ELSE 0
          END
        + CASE
            WHEN inventory_items.purchased_at IS NOT NULL AND inventory_items.purchased_at <= as_of_date - 14 THEN 1
            ELSE 0
          END
        + CASE
            WHEN inventory_items.quantity >= 1000
             AND inventory_items.expires_at IS NOT NULL
             AND inventory_items.expires_at <= as_of_date + 3 THEN 1
            ELSE 0
          END
      ) AS risk_priority_score
    FROM family_state.inventory_items
    WHERE inventory_items.family_id = target_family_id
      AND inventory_items.archived_at IS NULL
      AND inventory_items.quantity > 0
  )
  SELECT
    ranked_inventory.id,
    ranked_inventory.family_id,
    ranked_inventory.item_name,
    ranked_inventory.category,
    ranked_inventory.quantity,
    ranked_inventory.unit,
    ranked_inventory.storage_location,
    ranked_inventory.purchased_at,
    ranked_inventory.expires_at,
    ranked_inventory.last_event_at,
    ranked_inventory.notes,
    ranked_inventory.updated_at
  FROM ranked_inventory
  WHERE COALESCE(include_low_risk, false)
     OR ranked_inventory.risk_priority_score > 10
  ORDER BY ranked_inventory.risk_priority_score DESC, ranked_inventory.expires_at NULLS LAST, ranked_inventory.item_name ASC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 50), 1), 100);
END;
$$;

CREATE OR REPLACE FUNCTION family_state.read_recent_meals(
  target_family_id uuid,
  result_limit integer DEFAULT 20
)
RETURNS TABLE(
  meal_event_id uuid,
  meal_plan_id uuid,
  cooked_at timestamptz,
  meal_scene text,
  status text,
  notes text,
  items jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
BEGIN
  PERFORM family_state.assert_runtime_family_access(target_family_id);

  RETURN QUERY
  SELECT
    meal_events.id AS meal_event_id,
    meal_events.meal_plan_id,
    meal_events.cooked_at,
    meal_events.meal_scene,
    meal_events.status,
    meal_events.notes,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'recipe_ref', meal_event_items.recipe_ref,
          'recipe_title', meal_event_items.recipe_title,
          'actual_servings', meal_event_items.actual_servings
        )
        ORDER BY meal_event_items.created_at ASC
      ) FILTER (WHERE meal_event_items.id IS NOT NULL),
      '[]'::jsonb
    ) AS items
  FROM family_state.meal_events
  LEFT JOIN family_state.meal_event_items
    ON meal_event_items.family_id = meal_events.family_id
   AND meal_event_items.meal_event_id = meal_events.id
  WHERE meal_events.family_id = target_family_id
    AND meal_events.status IN ('cooked', 'partially_cooked')
  GROUP BY meal_events.id
  ORDER BY meal_events.cooked_at DESC, meal_events.id DESC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 20), 1), 100);
END;
$$;

CREATE OR REPLACE FUNCTION family_state.read_pending_planned_consumptions(
  target_family_id uuid,
  from_plan_date date DEFAULT NULL,
  to_plan_date date DEFAULT NULL,
  result_limit integer DEFAULT 50
)
RETURNS TABLE(
  planned_consumption_id uuid,
  meal_plan_id uuid,
  meal_plan_item_id uuid,
  plan_date date,
  meal_scene text,
  plan_status text,
  recipe_ref text,
  recipe_title text,
  dish_role text,
  inventory_item_id uuid,
  item_name text,
  planned_quantity numeric,
  unit text,
  inventory_quantity numeric,
  storage_location text,
  expires_at date,
  meal_event_id uuid,
  notes text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
BEGIN
  PERFORM family_state.assert_runtime_family_access(target_family_id);

  RETURN QUERY
  SELECT
    planned_consumptions.id AS planned_consumption_id,
    meal_plans.id AS meal_plan_id,
    meal_plan_items.id AS meal_plan_item_id,
    meal_plans.plan_date,
    meal_plans.meal_scene,
    meal_plans.status AS plan_status,
    meal_plan_items.recipe_ref,
    meal_plan_items.recipe_title,
    meal_plan_items.dish_role,
    planned_consumptions.inventory_item_id,
    planned_consumptions.item_name,
    planned_consumptions.planned_quantity,
    planned_consumptions.unit,
    inventory_items.quantity AS inventory_quantity,
    inventory_items.storage_location,
    inventory_items.expires_at,
    meal_events.id AS meal_event_id,
    planned_consumptions.notes
  FROM family_state.planned_consumptions
  JOIN family_state.meal_plan_items
    ON meal_plan_items.family_id = planned_consumptions.family_id
   AND meal_plan_items.id = planned_consumptions.meal_plan_item_id
  JOIN family_state.meal_plans
    ON meal_plans.family_id = meal_plan_items.family_id
   AND meal_plans.id = meal_plan_items.meal_plan_id
  LEFT JOIN family_state.inventory_items
    ON inventory_items.family_id = planned_consumptions.family_id
   AND inventory_items.id = planned_consumptions.inventory_item_id
  LEFT JOIN family_state.meal_events
    ON meal_events.family_id = meal_plans.family_id
   AND meal_events.meal_plan_id = meal_plans.id
   AND meal_events.status <> 'skipped'
  WHERE planned_consumptions.family_id = target_family_id
    AND meal_plans.status IN ('planned', 'confirmed')
    AND (from_plan_date IS NULL OR meal_plans.plan_date >= from_plan_date)
    AND (to_plan_date IS NULL OR meal_plans.plan_date <= to_plan_date)
  ORDER BY meal_plans.plan_date ASC, meal_plan_items.sort_order ASC, planned_consumptions.item_name ASC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 50), 1), 100);
END;
$$;

CREATE OR REPLACE FUNCTION family_state.read_meal_feedback_rows(
  target_family_id uuid,
  result_limit integer DEFAULT 50
)
RETURNS TABLE(
  feedback_id uuid,
  meal_event_id uuid,
  cooked_at timestamptz,
  meal_scene text,
  rating text,
  feedback_text text,
  suggested_preference_update text,
  requires_human_review boolean,
  family_member_name text,
  family_member_role text,
  recipe_titles jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
BEGIN
  PERFORM family_state.assert_runtime_family_access(target_family_id);

  RETURN QUERY
  SELECT
    meal_feedback.id AS feedback_id,
    meal_feedback.meal_event_id,
    meal_events.cooked_at,
    meal_events.meal_scene,
    meal_feedback.rating,
    meal_feedback.feedback_text,
    meal_feedback.suggested_preference_update,
    meal_feedback.requires_human_review,
    family_members.display_name AS family_member_name,
    family_members.member_role AS family_member_role,
    COALESCE(
      jsonb_agg(DISTINCT meal_event_items.recipe_title) FILTER (WHERE meal_event_items.recipe_title IS NOT NULL),
      '[]'::jsonb
    ) AS recipe_titles,
    meal_feedback.created_at
  FROM family_state.meal_feedback
  JOIN family_state.meal_events
    ON meal_events.family_id = meal_feedback.family_id
   AND meal_events.id = meal_feedback.meal_event_id
  LEFT JOIN family_state.family_members
    ON family_members.family_id = meal_feedback.family_id
   AND family_members.id = meal_feedback.family_member_id
  LEFT JOIN family_state.meal_event_items
    ON meal_event_items.family_id = meal_events.family_id
   AND meal_event_items.meal_event_id = meal_events.id
  WHERE meal_feedback.family_id = target_family_id
  GROUP BY meal_feedback.id, meal_events.id, family_members.id
  ORDER BY meal_feedback.created_at DESC, meal_feedback.id DESC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 50), 1), 100);
END;
$$;

REVOKE ALL ON FUNCTION family_state.assert_runtime_family_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.read_current_inventory(uuid, boolean, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.read_inventory_risk_candidates(uuid, date, boolean, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.read_recent_meals(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.read_pending_planned_consumptions(uuid, date, date, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.read_meal_feedback_rows(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION family_state.read_current_inventory(uuid, boolean, integer) TO family_nutrition_runtime;
GRANT EXECUTE ON FUNCTION family_state.read_inventory_risk_candidates(uuid, date, boolean, integer) TO family_nutrition_runtime;
GRANT EXECUTE ON FUNCTION family_state.read_recent_meals(uuid, integer) TO family_nutrition_runtime;
GRANT EXECUTE ON FUNCTION family_state.read_pending_planned_consumptions(uuid, date, date, integer) TO family_nutrition_runtime;
GRANT EXECUTE ON FUNCTION family_state.read_meal_feedback_rows(uuid, integer) TO family_nutrition_runtime;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA family_state FROM family_nutrition_runtime;
REVOKE SELECT ON ALL TABLES IN SCHEMA family_state FROM family_nutrition_runtime;
