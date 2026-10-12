CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pgcrypto SET SCHEMA extensions;

-- Milestone 4: Confirmed write business functions for MCP runtime tools.
-- Runtime callers receive EXECUTE on these narrow functions, not direct table writes.

CREATE OR REPLACE FUNCTION family_state.normalize_write_payload(input_payload jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
  SELECT COALESCE(input_payload, '{}'::jsonb) - 'requestId' - 'traceId' - 'request_id' - 'trace_id'
$$;

CREATE OR REPLACE FUNCTION family_state.require_confirmed_write(input_payload jsonb)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
BEGIN
  IF COALESCE((input_payload ->> 'confirmed')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'confirmed is not true' USING ERRCODE = '22023';
  END IF;

  IF length(trim(COALESCE(input_payload ->> 'confirmationText', input_payload ->> 'confirmation_text', ''))) = 0 THEN
    RAISE EXCEPTION 'confirmation_text is required' USING ERRCODE = '22023';
  END IF;

  IF length(trim(COALESCE(input_payload ->> 'idempotencyKey', input_payload ->> 'idempotency_key', ''))) = 0 THEN
    RAISE EXCEPTION 'idempotency_key is required' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION family_state.require_json_array(input_payload jsonb, field_name text, minimum_length integer)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
DECLARE
  array_value jsonb := input_payload -> field_name;
BEGIN
  IF jsonb_typeof(array_value) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION '% must be an array', field_name USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(array_value) < minimum_length THEN
    RAISE EXCEPTION '% must contain at least % item(s)', field_name, minimum_length USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION family_state.request_hash_for(input_payload jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
  SELECT encode(extensions.digest(family_state.normalize_write_payload(input_payload)::text, 'sha256'), 'hex')
$$;

CREATE OR REPLACE FUNCTION family_state.begin_mcp_tool_call(
  target_family_id uuid,
  target_actor_id uuid,
  tool_name text,
  input_payload jsonb
)
RETURNS TABLE(
  tool_call_id uuid,
  call_status text,
  existing_output jsonb
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
DECLARE
  normalized_idempotency_key text := COALESCE(input_payload ->> 'idempotencyKey', input_payload ->> 'idempotency_key');
  normalized_request_id text := COALESCE(input_payload ->> 'requestId', input_payload ->> 'request_id');
  normalized_trace_id text := COALESCE(input_payload ->> 'traceId', input_payload ->> 'trace_id');
  normalized_confirmation_text text := COALESCE(input_payload ->> 'confirmationText', input_payload ->> 'confirmation_text');
  normalized_request_hash text := family_state.request_hash_for(input_payload);
  existing_call family_state.mcp_tool_calls%ROWTYPE;
BEGIN
  SELECT *
  INTO existing_call
  FROM family_state.mcp_tool_calls
  WHERE family_id = target_family_id
    AND mcp_tool_calls.tool_name = begin_mcp_tool_call.tool_name
    AND idempotency_key = normalized_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF existing_call.request_hash <> normalized_request_hash THEN
      RAISE EXCEPTION 'idempotency key conflict' USING ERRCODE = '23505';
    END IF;

    IF existing_call.status = 'succeeded' OR existing_call.status = 'replayed' THEN
      RETURN QUERY SELECT existing_call.id, 'replayed'::text, existing_call.output_payload;
      RETURN;
    END IF;

    RAISE EXCEPTION 'idempotent write is already in progress or failed' USING ERRCODE = '55000';
  END IF;

  INSERT INTO family_state.mcp_tool_calls (
    family_id,
    actor_id,
    tool_name,
    idempotency_key,
    request_hash,
    request_id,
    trace_id,
    confirmation_text,
    status,
    input_payload
  ) VALUES (
    target_family_id,
    target_actor_id,
    begin_mcp_tool_call.tool_name,
    normalized_idempotency_key,
    normalized_request_hash,
    normalized_request_id,
    normalized_trace_id,
    normalized_confirmation_text,
    'started',
    family_state.normalize_write_payload(input_payload)
  )
  RETURNING id INTO tool_call_id;

  call_status := 'started';
  existing_output := NULL;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION family_state.finish_mcp_tool_call(
  target_family_id uuid,
  target_tool_call_id uuid,
  output_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
BEGIN
  UPDATE family_state.mcp_tool_calls
  SET status = 'succeeded',
      output_payload = finish_mcp_tool_call.output_payload,
      completed_at = now()
  WHERE family_id = target_family_id
    AND id = target_tool_call_id;
END;
$$;

CREATE OR REPLACE FUNCTION family_state.record_purchase_after_confirmation(
  target_family_id uuid,
  target_actor_id uuid,
  input_payload jsonb
)
RETURNS TABLE(
  tool_call_id uuid,
  call_status text,
  purchase_record_id uuid,
  inventory_changes jsonb
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
DECLARE
  call_record record;
  item_payload jsonb;
  item_record_id uuid;
  inventory_record family_state.inventory_items%ROWTYPE;
  before_quantity numeric;
  after_quantity numeric;
  output_payload jsonb;
  change_rows jsonb := '[]'::jsonb;
BEGIN
  PERFORM family_state.assert_runtime_family_access(target_family_id);
  PERFORM family_state.require_confirmed_write(input_payload);
  PERFORM family_state.require_json_array(input_payload, 'items', 1);

  SELECT * INTO call_record
  FROM family_state.begin_mcp_tool_call(target_family_id, target_actor_id, 'record_purchase_after_confirmation', input_payload);

  IF call_record.call_status = 'replayed' THEN
    tool_call_id := call_record.tool_call_id;
    call_status := 'replayed';
    purchase_record_id := (call_record.existing_output ->> 'purchase_record_id')::uuid;
    inventory_changes := COALESCE(call_record.existing_output -> 'inventory_changes', '[]'::jsonb);
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO family_state.purchase_records (
    family_id,
    actor_id,
    purchased_on,
    source,
    store_name,
    total_amount,
    currency,
    notes,
    request_id,
    trace_id
  ) VALUES (
    target_family_id,
    target_actor_id,
    COALESCE(input_payload ->> 'purchasedOn', input_payload ->> 'purchased_on')::date,
    COALESCE(input_payload ->> 'source', 'manual'),
    COALESCE(input_payload ->> 'storeName', input_payload ->> 'store_name'),
    NULLIF(COALESCE(input_payload ->> 'totalAmount', input_payload ->> 'total_amount', ''), '')::numeric,
    COALESCE(input_payload ->> 'currency', 'CNY'),
    input_payload ->> 'notes',
    COALESCE(input_payload ->> 'requestId', input_payload ->> 'request_id'),
    COALESCE(input_payload ->> 'traceId', input_payload ->> 'trace_id')
  ) RETURNING id INTO purchase_record_id;

  FOR item_payload IN SELECT value FROM jsonb_array_elements(COALESCE(input_payload -> 'items', '[]'::jsonb)) LOOP
    SELECT * INTO inventory_record
    FROM family_state.inventory_items
    WHERE family_id = target_family_id
      AND item_name = COALESCE(item_payload ->> 'itemName', item_payload ->> 'item_name')
      AND unit = item_payload ->> 'unit'
      AND storage_location = COALESCE(item_payload ->> 'storageLocation', item_payload ->> 'storage_location')
      AND archived_at IS NULL
    FOR UPDATE;

    IF FOUND THEN
      before_quantity := inventory_record.quantity;
      after_quantity := before_quantity + (item_payload ->> 'quantity')::numeric;

      UPDATE family_state.inventory_items
      SET quantity = after_quantity,
          category = COALESCE(item_payload ->> 'category', inventory_record.category),
          purchased_at = COALESCE(NULLIF(COALESCE(item_payload ->> 'purchasedAt', item_payload ->> 'purchased_at', ''), '')::date, inventory_record.purchased_at),
          expires_at = COALESCE(NULLIF(COALESCE(item_payload ->> 'expiresAt', item_payload ->> 'expires_at', ''), '')::date, inventory_record.expires_at),
          notes = COALESCE(item_payload ->> 'notes', inventory_record.notes),
          last_event_at = now(),
          updated_at = now()
      WHERE family_id = target_family_id
        AND id = inventory_record.id;
    ELSE
      before_quantity := 0;
      after_quantity := (item_payload ->> 'quantity')::numeric;

      INSERT INTO family_state.inventory_items (
        family_id,
        item_name,
        category,
        quantity,
        unit,
        storage_location,
        purchased_at,
        expires_at,
        last_event_at,
        notes
      ) VALUES (
        target_family_id,
        COALESCE(item_payload ->> 'itemName', item_payload ->> 'item_name'),
        item_payload ->> 'category',
        after_quantity,
        item_payload ->> 'unit',
        COALESCE(item_payload ->> 'storageLocation', item_payload ->> 'storage_location'),
        COALESCE(NULLIF(COALESCE(item_payload ->> 'purchasedAt', item_payload ->> 'purchased_at', ''), '')::date, COALESCE(input_payload ->> 'purchasedOn', input_payload ->> 'purchased_on')::date),
        NULLIF(COALESCE(item_payload ->> 'expiresAt', item_payload ->> 'expires_at', ''), '')::date,
        now(),
        item_payload ->> 'notes'
      ) RETURNING * INTO inventory_record;
    END IF;

    INSERT INTO family_state.purchase_items (
      family_id,
      purchase_record_id,
      inventory_item_id,
      item_name,
      quantity,
      unit,
      category,
      unit_price,
      notes
    ) VALUES (
      target_family_id,
      purchase_record_id,
      inventory_record.id,
      COALESCE(item_payload ->> 'itemName', item_payload ->> 'item_name'),
      (item_payload ->> 'quantity')::numeric,
      item_payload ->> 'unit',
      item_payload ->> 'category',
      NULLIF(COALESCE(item_payload ->> 'unitPrice', item_payload ->> 'unit_price', ''), '')::numeric,
      item_payload ->> 'notes'
    ) RETURNING id INTO item_record_id;

    INSERT INTO family_state.inventory_events (
      family_id,
      inventory_item_id,
      actor_id,
      event_type,
      quantity_delta,
      unit,
      reason,
      source_ref_type,
      source_ref_id,
      request_id,
      trace_id
    ) VALUES (
      target_family_id,
      inventory_record.id,
      target_actor_id,
      'purchase',
      (item_payload ->> 'quantity')::numeric,
      item_payload ->> 'unit',
      'confirmed purchase',
      'purchase_record',
      purchase_record_id,
      COALESCE(input_payload ->> 'requestId', input_payload ->> 'request_id'),
      COALESCE(input_payload ->> 'traceId', input_payload ->> 'trace_id')
    );

    change_rows := change_rows || jsonb_build_array(jsonb_build_object(
      'inventory_item_id', inventory_record.id,
      'item_name', inventory_record.item_name,
      'before_quantity', before_quantity,
      'after_quantity', after_quantity,
      'unit', inventory_record.unit
    ));
  END LOOP;

  INSERT INTO family_state.audit_log (
    family_id,
    actor_id,
    mcp_tool_call_id,
    action,
    entity_type,
    entity_id,
    after_snapshot,
    request_id,
    trace_id
  ) VALUES (
    target_family_id,
    target_actor_id,
    call_record.tool_call_id,
    'record_purchase_after_confirmation',
    'purchase_record',
    purchase_record_id,
    jsonb_build_object('inventory_changes', change_rows),
    COALESCE(input_payload ->> 'requestId', input_payload ->> 'request_id'),
    COALESCE(input_payload ->> 'traceId', input_payload ->> 'trace_id')
  );

  output_payload := jsonb_build_object('purchase_record_id', purchase_record_id, 'inventory_changes', change_rows);
  PERFORM family_state.finish_mcp_tool_call(target_family_id, call_record.tool_call_id, output_payload);

  tool_call_id := call_record.tool_call_id;
  call_status := 'succeeded';
  inventory_changes := change_rows;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION family_state.confirm_meal_execution(
  target_family_id uuid,
  target_actor_id uuid,
  input_payload jsonb
)
RETURNS TABLE(
  tool_call_id uuid,
  call_status text,
  meal_event_id uuid,
  inventory_changes jsonb
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
DECLARE
  call_record record;
  item_payload jsonb;
  consumption_payload jsonb;
  inventory_record family_state.inventory_items%ROWTYPE;
  before_quantity numeric;
  after_quantity numeric;
  output_payload jsonb;
  change_rows jsonb := '[]'::jsonb;
BEGIN
  PERFORM family_state.assert_runtime_family_access(target_family_id);
  PERFORM family_state.require_confirmed_write(input_payload);
  PERFORM family_state.require_json_array(input_payload, 'items', 1);

  IF input_payload ->> 'status' NOT IN ('cooked', 'partially_cooked', 'skipped') THEN
    RAISE EXCEPTION 'invalid meal execution status' USING ERRCODE = '22023';
  END IF;

  IF input_payload ->> 'status' IN ('cooked', 'partially_cooked') THEN
    PERFORM family_state.require_json_array(input_payload, 'consumptions', 1);
  END IF;

  SELECT * INTO call_record
  FROM family_state.begin_mcp_tool_call(target_family_id, target_actor_id, 'confirm_meal_execution', input_payload);

  IF call_record.call_status = 'replayed' THEN
    tool_call_id := call_record.tool_call_id;
    call_status := 'replayed';
    meal_event_id := (call_record.existing_output ->> 'meal_event_id')::uuid;
    inventory_changes := COALESCE(call_record.existing_output -> 'inventory_changes', '[]'::jsonb);
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO family_state.meal_events (
    family_id,
    actor_id,
    meal_plan_id,
    cooked_at,
    meal_scene,
    status,
    notes,
    request_id,
    trace_id
  ) VALUES (
    target_family_id,
    target_actor_id,
    NULLIF(COALESCE(input_payload ->> 'mealPlanId', input_payload ->> 'meal_plan_id', ''), '')::uuid,
    COALESCE(input_payload ->> 'cookedAt', input_payload ->> 'cooked_at')::timestamptz,
    COALESCE(input_payload ->> 'mealScene', input_payload ->> 'meal_scene'),
    input_payload ->> 'status',
    input_payload ->> 'notes',
    COALESCE(input_payload ->> 'requestId', input_payload ->> 'request_id'),
    COALESCE(input_payload ->> 'traceId', input_payload ->> 'trace_id')
  ) RETURNING id INTO meal_event_id;

  FOR item_payload IN SELECT value FROM jsonb_array_elements(COALESCE(input_payload -> 'items', '[]'::jsonb)) LOOP
    INSERT INTO family_state.meal_event_items (
      family_id,
      meal_event_id,
      meal_plan_item_id,
      recipe_ref,
      recipe_title,
      actual_servings,
      notes
    ) VALUES (
      target_family_id,
      meal_event_id,
      NULLIF(COALESCE(item_payload ->> 'mealPlanItemId', item_payload ->> 'meal_plan_item_id', ''), '')::uuid,
      COALESCE(item_payload ->> 'recipeRef', item_payload ->> 'recipe_ref'),
      COALESCE(item_payload ->> 'recipeTitle', item_payload ->> 'recipe_title'),
      NULLIF(COALESCE(item_payload ->> 'actualServings', item_payload ->> 'actual_servings', ''), '')::numeric,
      item_payload ->> 'notes'
    );
  END LOOP;

  IF input_payload ->> 'status' IN ('cooked', 'partially_cooked') THEN
    FOR consumption_payload IN SELECT value FROM jsonb_array_elements(COALESCE(input_payload -> 'consumptions', '[]'::jsonb)) LOOP
      SELECT * INTO inventory_record
      FROM family_state.inventory_items
      WHERE family_id = target_family_id
        AND id = COALESCE(consumption_payload ->> 'inventoryItemId', consumption_payload ->> 'inventory_item_id')::uuid
        AND archived_at IS NULL
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'inventory item not found' USING ERRCODE = '23503';
      END IF;

      IF inventory_record.unit <> consumption_payload ->> 'unit' THEN
        RAISE EXCEPTION 'inventory unit mismatch' USING ERRCODE = '22023';
      END IF;

      before_quantity := inventory_record.quantity;
      after_quantity := before_quantity - (consumption_payload ->> 'quantity')::numeric;

      IF after_quantity < 0 THEN
        RAISE EXCEPTION 'inventory quantity cannot be negative' USING ERRCODE = '22003';
      END IF;

      UPDATE family_state.inventory_items
      SET quantity = after_quantity,
          last_event_at = now(),
          updated_at = now()
      WHERE family_id = target_family_id
        AND id = inventory_record.id;

      INSERT INTO family_state.inventory_events (
        family_id,
        inventory_item_id,
        actor_id,
        event_type,
        quantity_delta,
        unit,
        reason,
        source_ref_type,
        source_ref_id,
        request_id,
        trace_id
      ) VALUES (
        target_family_id,
        inventory_record.id,
        target_actor_id,
        'consume',
        -1 * (consumption_payload ->> 'quantity')::numeric,
        inventory_record.unit,
        'confirmed meal execution',
        'meal_event',
        meal_event_id,
        COALESCE(input_payload ->> 'requestId', input_payload ->> 'request_id'),
        COALESCE(input_payload ->> 'traceId', input_payload ->> 'trace_id')
      );

      change_rows := change_rows || jsonb_build_array(jsonb_build_object(
        'inventory_item_id', inventory_record.id,
        'item_name', inventory_record.item_name,
        'before_quantity', before_quantity,
        'after_quantity', after_quantity,
        'unit', inventory_record.unit
      ));
    END LOOP;
  END IF;

  INSERT INTO family_state.audit_log (
    family_id,
    actor_id,
    mcp_tool_call_id,
    action,
    entity_type,
    entity_id,
    after_snapshot,
    request_id,
    trace_id
  ) VALUES (
    target_family_id,
    target_actor_id,
    call_record.tool_call_id,
    'confirm_meal_execution',
    'meal_event',
    meal_event_id,
    jsonb_build_object('inventory_changes', change_rows),
    COALESCE(input_payload ->> 'requestId', input_payload ->> 'request_id'),
    COALESCE(input_payload ->> 'traceId', input_payload ->> 'trace_id')
  );

  output_payload := jsonb_build_object('meal_event_id', meal_event_id, 'inventory_changes', change_rows);
  PERFORM family_state.finish_mcp_tool_call(target_family_id, call_record.tool_call_id, output_payload);

  tool_call_id := call_record.tool_call_id;
  call_status := 'succeeded';
  inventory_changes := change_rows;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION family_state.record_meal_feedback(
  target_family_id uuid,
  target_actor_id uuid,
  input_payload jsonb
)
RETURNS TABLE(
  tool_call_id uuid,
  call_status text,
  feedback_id uuid,
  requires_human_review boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
DECLARE
  call_record record;
  output_payload jsonb;
BEGIN
  PERFORM family_state.assert_runtime_family_access(target_family_id);
  PERFORM family_state.require_confirmed_write(input_payload);

  IF input_payload ->> 'rating' NOT IN ('liked', 'neutral', 'disliked', 'no_feedback') THEN
    RAISE EXCEPTION 'invalid meal feedback rating' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO call_record
  FROM family_state.begin_mcp_tool_call(target_family_id, target_actor_id, 'record_meal_feedback', input_payload);

  IF call_record.call_status = 'replayed' THEN
    tool_call_id := call_record.tool_call_id;
    call_status := 'replayed';
    feedback_id := (call_record.existing_output ->> 'feedback_id')::uuid;
    requires_human_review := (call_record.existing_output ->> 'requires_human_review')::boolean;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO family_state.meal_feedback (
    family_id,
    meal_event_id,
    family_member_id,
    actor_id,
    rating,
    feedback_text,
    suggested_preference_update,
    requires_human_review
  ) VALUES (
    target_family_id,
    COALESCE(input_payload ->> 'mealEventId', input_payload ->> 'meal_event_id')::uuid,
    NULLIF(COALESCE(input_payload ->> 'familyMemberId', input_payload ->> 'family_member_id', ''), '')::uuid,
    target_actor_id,
    input_payload ->> 'rating',
    COALESCE(input_payload ->> 'feedbackText', input_payload ->> 'feedback_text'),
    COALESCE(input_payload ->> 'suggestedPreferenceUpdate', input_payload ->> 'suggested_preference_update'),
    COALESCE((input_payload ->> 'requiresHumanReview')::boolean, (input_payload ->> 'requires_human_review')::boolean, false)
  ) RETURNING id, meal_feedback.requires_human_review INTO feedback_id, requires_human_review;

  INSERT INTO family_state.audit_log (
    family_id,
    actor_id,
    mcp_tool_call_id,
    action,
    entity_type,
    entity_id,
    after_snapshot,
    request_id,
    trace_id
  ) VALUES (
    target_family_id,
    target_actor_id,
    call_record.tool_call_id,
    'record_meal_feedback',
    'meal_feedback',
    feedback_id,
    jsonb_build_object('requires_human_review', requires_human_review),
    COALESCE(input_payload ->> 'requestId', input_payload ->> 'request_id'),
    COALESCE(input_payload ->> 'traceId', input_payload ->> 'trace_id')
  );

  output_payload := jsonb_build_object('feedback_id', feedback_id, 'requires_human_review', requires_human_review);
  PERFORM family_state.finish_mcp_tool_call(target_family_id, call_record.tool_call_id, output_payload);

  tool_call_id := call_record.tool_call_id;
  call_status := 'succeeded';
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION family_state.adjust_inventory_after_feedback(
  target_family_id uuid,
  target_actor_id uuid,
  input_payload jsonb
)
RETURNS TABLE(
  tool_call_id uuid,
  call_status text,
  inventory_item_id uuid,
  item_name text,
  before_quantity numeric,
  after_quantity numeric,
  unit text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, family_state
AS $$
DECLARE
  call_record record;
  inventory_record family_state.inventory_items%ROWTYPE;
  quantity_delta numeric;
  event_kind text;
  output_payload jsonb;
BEGIN
  PERFORM family_state.assert_runtime_family_access(target_family_id);
  PERFORM family_state.require_confirmed_write(input_payload);

  SELECT * INTO call_record
  FROM family_state.begin_mcp_tool_call(target_family_id, target_actor_id, 'adjust_inventory_after_feedback', input_payload);

  IF call_record.call_status = 'replayed' THEN
    tool_call_id := call_record.tool_call_id;
    call_status := 'replayed';
    inventory_item_id := (call_record.existing_output ->> 'inventory_item_id')::uuid;
    item_name := call_record.existing_output ->> 'item_name';
    before_quantity := (call_record.existing_output ->> 'before_quantity')::numeric;
    after_quantity := (call_record.existing_output ->> 'after_quantity')::numeric;
    unit := call_record.existing_output ->> 'unit';
    RETURN NEXT;
    RETURN;
  END IF;

  quantity_delta := COALESCE(input_payload ->> 'quantityDelta', input_payload ->> 'quantity_delta')::numeric;
  event_kind := COALESCE(input_payload ->> 'adjustmentType', input_payload ->> 'adjustment_type');

  IF event_kind NOT IN ('adjust', 'discard', 'expire') THEN
    RAISE EXCEPTION 'invalid inventory adjustment type' USING ERRCODE = '22023';
  END IF;

  IF event_kind IN ('discard', 'expire') AND quantity_delta >= 0 THEN
    RAISE EXCEPTION 'discard and expire adjustments must reduce inventory' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO inventory_record
  FROM family_state.inventory_items
  WHERE family_id = target_family_id
    AND id = COALESCE(input_payload ->> 'inventoryItemId', input_payload ->> 'inventory_item_id')::uuid
    AND archived_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory item not found' USING ERRCODE = '23503';
  END IF;

  IF inventory_record.unit <> COALESCE(input_payload ->> 'unit', inventory_record.unit) THEN
    RAISE EXCEPTION 'inventory unit mismatch' USING ERRCODE = '22023';
  END IF;

  before_quantity := inventory_record.quantity;
  after_quantity := before_quantity + quantity_delta;

  IF after_quantity < 0 THEN
    RAISE EXCEPTION 'inventory quantity cannot be negative' USING ERRCODE = '22003';
  END IF;

  UPDATE family_state.inventory_items
  SET quantity = after_quantity,
      last_event_at = now(),
      updated_at = now()
  WHERE family_id = target_family_id
    AND id = inventory_record.id;

  INSERT INTO family_state.inventory_events (
    family_id,
    inventory_item_id,
    actor_id,
    event_type,
    quantity_delta,
    unit,
    reason,
    source_ref_type,
    source_ref_id,
    request_id,
    trace_id
  ) VALUES (
    target_family_id,
    inventory_record.id,
    target_actor_id,
    event_kind,
    quantity_delta,
    inventory_record.unit,
    input_payload ->> 'reason',
    'manual_adjustment',
    inventory_record.id,
    COALESCE(input_payload ->> 'requestId', input_payload ->> 'request_id'),
    COALESCE(input_payload ->> 'traceId', input_payload ->> 'trace_id')
  );

  inventory_item_id := inventory_record.id;
  item_name := inventory_record.item_name;
  unit := inventory_record.unit;

  INSERT INTO family_state.audit_log (
    family_id,
    actor_id,
    mcp_tool_call_id,
    action,
    entity_type,
    entity_id,
    before_snapshot,
    after_snapshot,
    request_id,
    trace_id
  ) VALUES (
    target_family_id,
    target_actor_id,
    call_record.tool_call_id,
    'adjust_inventory_after_feedback',
    'inventory_item',
    inventory_item_id,
    jsonb_build_object('quantity', before_quantity),
    jsonb_build_object('quantity', after_quantity, 'reason', input_payload ->> 'reason'),
    COALESCE(input_payload ->> 'requestId', input_payload ->> 'request_id'),
    COALESCE(input_payload ->> 'traceId', input_payload ->> 'trace_id')
  );

  output_payload := jsonb_build_object(
    'inventory_item_id', inventory_item_id,
    'item_name', item_name,
    'before_quantity', before_quantity,
    'after_quantity', after_quantity,
    'unit', unit
  );
  PERFORM family_state.finish_mcp_tool_call(target_family_id, call_record.tool_call_id, output_payload);

  tool_call_id := call_record.tool_call_id;
  call_status := 'succeeded';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION family_state.normalize_write_payload(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.require_confirmed_write(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.require_json_array(jsonb, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.request_hash_for(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.begin_mcp_tool_call(uuid, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.finish_mcp_tool_call(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.record_purchase_after_confirmation(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.confirm_meal_execution(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.record_meal_feedback(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION family_state.adjust_inventory_after_feedback(uuid, uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION family_state.record_purchase_after_confirmation(uuid, uuid, jsonb) TO family_nutrition_runtime;
GRANT EXECUTE ON FUNCTION family_state.confirm_meal_execution(uuid, uuid, jsonb) TO family_nutrition_runtime;
GRANT EXECUTE ON FUNCTION family_state.record_meal_feedback(uuid, uuid, jsonb) TO family_nutrition_runtime;
GRANT EXECUTE ON FUNCTION family_state.adjust_inventory_after_feedback(uuid, uuid, jsonb) TO family_nutrition_runtime;
