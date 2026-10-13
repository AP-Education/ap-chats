CREATE VIEW "public"."live_conversations" AS (
  select c.id as channel_id
  from channels c
  where c.kind = 'channel'
  union all
  select dm.channel_id
  from direct_messages dm
  join workspace_members first_peer on first_peer.id = dm.first_member_id and first_peer.status = 'active'
  join workspace_members second_peer on second_peer.id = dm.second_member_id and second_peer.status = 'active'
);