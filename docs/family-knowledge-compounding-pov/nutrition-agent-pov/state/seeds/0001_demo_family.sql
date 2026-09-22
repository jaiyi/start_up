-- Demo-only seed data for Milestone 1 validation.
-- Do not replace these values with real household, health, password, or token data.

INSERT INTO family_state.families (id, display_name, timezone, notes)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Demo Family',
  'Asia/Shanghai',
  'Synthetic demo household for migration validation.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_state.actors (id, family_id, actor_type, display_name, external_ref)
VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'human',
    'Demo Caregiver',
    'demo-local-user'
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111111',
    'agent',
    'Demo Nutrition Agent',
    'demo-agent'
  )
ON CONFLICT (family_id, actor_type, display_name) DO NOTHING;

INSERT INTO family_state.family_members (id, family_id, display_name, member_role, birth_year, dietary_constraints)
VALUES
  (
    '33333333-3333-3333-3333-333333333331',
    '11111111-1111-1111-1111-111111111111',
    'Demo Adult',
    'adult',
    1990,
    '{}'::jsonb
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    '11111111-1111-1111-1111-111111111111',
    'Demo Baby',
    'baby',
    2024,
    '{"demo_note":"synthetic baby-meal constraint only"}'::jsonb
  )
ON CONFLICT (family_id, display_name) DO NOTHING;

INSERT INTO family_state.inventory_items (
  id,
  family_id,
  item_name,
  category,
  quantity,
  unit,
  storage_location,
  purchased_at,
  expires_at,
  notes
)
VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    '11111111-1111-1111-1111-111111111111',
    '菠菜',
    'vegetable',
    500,
    'g',
    'fridge',
    DATE '2026-09-20',
    DATE '2026-09-24',
    'Demo vegetable for quick breakfast/lunch dishes.'
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '11111111-1111-1111-1111-111111111111',
    '鸡蛋',
    'protein',
    12,
    '个',
    'fridge',
    DATE '2026-09-20',
    DATE '2026-10-05',
    'Demo protein item.'
  )
ON CONFLICT (family_id, item_name, unit, storage_location) DO NOTHING;

INSERT INTO family_state.purchase_records (
  id,
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
)
VALUES (
  '55555555-5555-5555-5555-555555555551',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  DATE '2026-09-20',
  'manual',
  'Demo Market',
  28.50,
  'CNY',
  'Synthetic purchase record.',
  'demo-request-001',
  'demo-trace-001'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_state.purchase_items (
  id,
  family_id,
  purchase_record_id,
  inventory_item_id,
  item_name,
  quantity,
  unit,
  category,
  unit_price,
  notes
)
VALUES (
  '55555555-5555-5555-5555-555555555552',
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555551',
  '44444444-4444-4444-4444-444444444441',
  '菠菜',
  500,
  'g',
  'vegetable',
  6.50,
  'Demo purchase item.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_state.inventory_events (
  id,
  family_id,
  inventory_item_id,
  actor_id,
  event_type,
  quantity_delta,
  unit,
  occurred_at,
  reason,
  source_ref_type,
  source_ref_id,
  request_id,
  trace_id
)
VALUES (
  '66666666-6666-6666-6666-666666666661',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444441',
  '22222222-2222-2222-2222-222222222222',
  'purchase',
  500,
  'g',
  TIMESTAMPTZ '2026-09-20 10:00:00+08',
  'Demo purchase inventory increase.',
  'purchase_record',
  '55555555-5555-5555-5555-555555555551',
  'demo-request-001',
  'demo-trace-001'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_state.meal_plans (
  id,
  family_id,
  actor_id,
  plan_date,
  meal_scene,
  status,
  recommendation_reason,
  avoid_repeat_window_days,
  request_id,
  trace_id
)
VALUES (
  '77777777-7777-7777-7777-777777777771',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222223',
  DATE '2026-09-21',
  'breakfast',
  'planned',
  'Use demo inventory first and keep breakfast quick.',
  14,
  'demo-request-002',
  'demo-trace-002'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_state.meal_plan_items (
  id,
  family_id,
  meal_plan_id,
  recipe_ref,
  recipe_title,
  dish_role,
  target_members,
  sort_order,
  notes
)
VALUES (
  '77777777-7777-7777-7777-777777777772',
  '11111111-1111-1111-1111-111111111111',
  '77777777-7777-7777-7777-777777777771',
  'recipes/demo-spinach-egg.md',
  '菠菜鸡蛋快手菜',
  'main',
  '["Demo Adult"]'::jsonb,
  1,
  'Demo quick breakfast dish.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_state.planned_consumptions (
  id,
  family_id,
  meal_plan_item_id,
  inventory_item_id,
  item_name,
  planned_quantity,
  unit,
  notes
)
VALUES (
  '77777777-7777-7777-7777-777777777773',
  '11111111-1111-1111-1111-111111111111',
  '77777777-7777-7777-7777-777777777772',
  '44444444-4444-4444-4444-444444444441',
  '菠菜',
  150,
  'g',
  'Planned only; this does not decrease inventory.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_state.meal_events (
  id,
  family_id,
  actor_id,
  meal_plan_id,
  cooked_at,
  meal_scene,
  status,
  notes,
  request_id,
  trace_id
)
VALUES (
  '88888888-8888-8888-8888-888888888881',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '77777777-7777-7777-7777-777777777771',
  TIMESTAMPTZ '2026-09-21 08:00:00+08',
  'breakfast',
  'cooked',
  'Demo cooked event.',
  'demo-request-003',
  'demo-trace-003'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_state.meal_event_items (
  id,
  family_id,
  meal_event_id,
  meal_plan_item_id,
  recipe_ref,
  recipe_title,
  actual_servings,
  notes
)
VALUES (
  '88888888-8888-8888-8888-888888888882',
  '11111111-1111-1111-1111-111111111111',
  '88888888-8888-8888-8888-888888888881',
  '77777777-7777-7777-7777-777777777772',
  'recipes/demo-spinach-egg.md',
  '菠菜鸡蛋快手菜',
  2,
  'Demo cooked dish item.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_state.meal_feedback (
  id,
  family_id,
  meal_event_id,
  family_member_id,
  actor_id,
  rating,
  feedback_text,
  suggested_preference_update,
  requires_human_review
)
VALUES (
  '99999999-9999-9999-9999-999999999991',
  '11111111-1111-1111-1111-111111111111',
  '88888888-8888-8888-8888-888888888881',
  '33333333-3333-3333-3333-333333333331',
  '22222222-2222-2222-2222-222222222222',
  'liked',
  'Demo feedback: tasted fine.',
  NULL,
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_state.mcp_tool_calls (
  id,
  family_id,
  actor_id,
  tool_name,
  idempotency_key,
  request_hash,
  request_id,
  trace_id,
  confirmation_text,
  status,
  input_payload,
  output_payload,
  completed_at
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'demo_confirm_meal_execution',
  'demo-idempotency-key-001',
  'demo-request-hash-001',
  'demo-request-003',
  'demo-trace-003',
  'Demo confirmation only.',
  'succeeded',
  '{"demo":true}'::jsonb,
  '{"success":true}'::jsonb,
  TIMESTAMPTZ '2026-09-21 08:01:00+08'
)
ON CONFLICT (family_id, tool_name, idempotency_key) DO NOTHING;

INSERT INTO family_state.audit_log (
  id,
  family_id,
  actor_id,
  mcp_tool_call_id,
  action,
  entity_type,
  entity_id,
  before_snapshot,
  after_snapshot,
  metadata,
  request_id,
  trace_id
)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'demo.meal_event.created',
  'meal_event',
  '88888888-8888-8888-8888-888888888881',
  NULL,
  '{"status":"cooked"}'::jsonb,
  '{"demo":true,"contains_real_family_data":false}'::jsonb,
  'demo-request-003',
  'demo-trace-003'
)
ON CONFLICT (id) DO NOTHING;
