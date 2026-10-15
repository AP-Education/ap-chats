CREATE VIEW "public"."member_role_presentation" AS (
  select m.id as member_id,
    (select held.role_id from active_role_members held
      where held.member_id = m.id and held.is_hoisted
      order by held.position, held.name limit 1) as hoisted_role_id,
    (select held.color from active_role_members held
      where held.member_id = m.id and held.color is not null
      order by held.position, held.name limit 1) as role_color
  from workspace_members m
  where m.status = 'active'
);