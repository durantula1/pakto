-- Live refresh for staff moves from Supabase Realtime to Postgres LISTEN/NOTIFY: the app keeps one listening
-- connection and pushes the event to the user's open tabs over /api/live (server-sent events).
-- The realtime.messages policy madeflow_staff_receive stays until Supabase is left; nothing sends there any more.
CREATE OR REPLACE FUNCTION app.broadcast_staff_refresh() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_notify(
    'staff_refresh',
    jsonb_build_object('user_id', NEW.user_id, 'event_type', NEW.event_type, 'title', left(NEW.title, 200))::text
  );
  RETURN NEW;
END;
$$;
