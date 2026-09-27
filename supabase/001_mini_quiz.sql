-- LAST SHIFT MINI QUIZ — dedicated Supabase schema.
-- Run ONCE on the intended dedicated Supabase project via SQL Editor.
-- No SQL from the old «Последняя смена» project is required or reused.
BEGIN;

CREATE TABLE IF NOT EXISTS public.ls_mini_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[0-9]{4}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  started_at timestamptz,
  CONSTRAINT ls_mini_start_valid CHECK (started_at IS NULL OR started_at >= created_at)
);
CREATE INDEX IF NOT EXISTS ls_mini_rooms_created ON public.ls_mini_rooms (created_at DESC);

CREATE TABLE IF NOT EXISTS public.ls_mini_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.ls_mini_rooms(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 32),
  token_hash text NOT NULL CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  joined_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT ls_mini_player_token UNIQUE (room_id, token_hash)
);
CREATE UNIQUE INDEX IF NOT EXISTS ls_mini_name_unique
  ON public.ls_mini_players (room_id, lower(btrim(display_name)));
CREATE INDEX IF NOT EXISTS ls_mini_players_room ON public.ls_mini_players (room_id);

CREATE TABLE IF NOT EXISTS public.ls_mini_answers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.ls_mini_rooms(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.ls_mini_players(id) ON DELETE CASCADE,
  question_no smallint NOT NULL CHECK (question_no BETWEEN 1 AND 3),
  option_label text NOT NULL CHECK (option_label IN ('А', 'Б', 'В', 'Г')),
  elapsed_ms integer NOT NULL CHECK (elapsed_ms BETWEEN 0 AND 30000),
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT ls_mini_one_answer UNIQUE (player_id, question_no)
);
CREATE INDEX IF NOT EXISTS ls_mini_answers_room ON public.ls_mini_answers (room_id, question_no);

ALTER TABLE public.ls_mini_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ls_mini_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ls_mini_answers ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: all DB access uses server-only service role.
REVOKE ALL ON public.ls_mini_rooms, public.ls_mini_players, public.ls_mini_answers FROM anon, authenticated;

-- All concurrent joins lock the same room row, so room capacity cannot exceed 15.
CREATE OR REPLACE FUNCTION public.ls_mini_join_room(p_code text, p_name text, p_token_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_room public.ls_mini_rooms%ROWTYPE; v_id uuid;
BEGIN
  SELECT * INTO v_room FROM public.ls_mini_rooms
    WHERE code = p_code AND created_at > clock_timestamp() - interval '24 hours'
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;
  SELECT id INTO v_id FROM public.ls_mini_players
    WHERE room_id=v_room.id AND token_hash=p_token_hash;
  IF FOUND THEN RETURN v_id; END IF;
  IF v_room.started_at IS NOT NULL THEN RAISE EXCEPTION 'ROOM_ALREADY_STARTED'; END IF;
  IF (SELECT COUNT(*) FROM public.ls_mini_players WHERE room_id=v_room.id)>=15
    THEN RAISE EXCEPTION 'ROOM_FULL'; END IF;
  IF EXISTS(SELECT 1 FROM public.ls_mini_players WHERE room_id=v_room.id AND lower(btrim(display_name))=lower(btrim(p_name)))
    THEN RAISE EXCEPTION 'NAME_TAKEN'; END IF;
  INSERT INTO public.ls_mini_players(room_id,display_name,token_hash)
    VALUES (v_room.id,btrim(p_name),p_token_hash) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ls_mini_start_room(p_code text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid; v_started timestamptz;
BEGIN
  SELECT id,started_at INTO v_id,v_started FROM public.ls_mini_rooms
    WHERE code=p_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;
  IF v_started IS NOT NULL THEN RETURN v_started; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.ls_mini_players WHERE room_id=v_id)
    THEN RAISE EXCEPTION 'NO_PLAYERS'; END IF;
  UPDATE public.ls_mini_rooms SET started_at=clock_timestamp()
    WHERE id=v_id RETURNING started_at INTO v_started;
  RETURN v_started;
END;
$$;

-- DB-clock acceptance, independent of web-instance clocks and duplicate HTTP requests.
-- The first answer for each player/question is immutable. No answer keys are stored here.
CREATE OR REPLACE FUNCTION public.ls_mini_submit_answer(
 p_code text,p_token_hash text,p_question_no smallint,p_option_label text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_room public.ls_mini_rooms%ROWTYPE; v_player_id uuid;
 v_existing public.ls_mini_answers%ROWTYPE; v_now timestamptz; v_elapsed integer;
BEGIN
  SELECT * INTO v_room FROM public.ls_mini_rooms WHERE code=p_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;
  SELECT id INTO v_player_id FROM public.ls_mini_players
    WHERE room_id=v_room.id AND token_hash=p_token_hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_A_PLAYER'; END IF;
  IF p_question_no NOT BETWEEN 1 AND 3 OR p_option_label NOT IN ('А','Б','В','Г')
    THEN RAISE EXCEPTION 'INVALID_OPTION'; END IF;
  SELECT * INTO v_existing FROM public.ls_mini_answers
    WHERE player_id=v_player_id AND question_no=p_question_no;
  IF FOUND THEN RETURN jsonb_build_object('accepted',true,'duplicate',true,
    'answer',v_existing.option_label,'elapsedMs',v_existing.elapsed_ms); END IF;
  IF v_room.started_at IS NULL THEN RAISE EXCEPTION 'GAME_NOT_STARTED'; END IF;
  v_now := clock_timestamp();
  v_elapsed := floor(EXTRACT(EPOCH FROM (v_now - v_room.started_at))*1000)::integer
               - (p_question_no-1)*40000;
  IF v_elapsed < 0 OR v_elapsed >= 30000 THEN RAISE EXCEPTION 'QUESTION_CLOSED'; END IF;
  INSERT INTO public.ls_mini_answers(room_id,player_id,question_no,option_label,elapsed_ms,accepted_at)
    VALUES(v_room.id,v_player_id,p_question_no,p_option_label,v_elapsed,v_now)
    ON CONFLICT (player_id,question_no) DO NOTHING;
  SELECT * INTO v_existing FROM public.ls_mini_answers
    WHERE player_id=v_player_id AND question_no=p_question_no;
  RETURN jsonb_build_object('accepted',true,'duplicate',v_existing.option_label<>p_option_label,
    'answer',v_existing.option_label,'elapsedMs',v_existing.elapsed_ms);
END;
$$;

REVOKE ALL ON FUNCTION public.ls_mini_join_room(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ls_mini_start_room(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ls_mini_submit_answer(text,text,smallint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ls_mini_join_room(text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ls_mini_start_room(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ls_mini_submit_answer(text,text,smallint,text) TO service_role;
COMMIT;
