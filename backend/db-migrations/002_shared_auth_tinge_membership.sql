-- Shared auth.users: gate Tinge profile creation on app_metadata.
-- Safe to re-run. Does not modify auth.users rows owned by other apps.

CREATE OR REPLACE FUNCTION public.tinge_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  apps jsonb := COALESCE(NEW.raw_app_meta_data->'apps', '[]'::jsonb);
  is_tinge boolean := (apps ? 'tinge') OR (NEW.raw_app_meta_data->>'app' = 'tinge');
BEGIN
  IF NOT is_tinge THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.tinge_user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone, NEW.id::text),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.tinge_handle_new_user() IS
  'Creates tinge_user_profiles only when app_metadata.apps contains tinge. Shared DB safe.';
