CREATE OR REPLACE FUNCTION random_student_link_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  rec RECORD;
  candidate TEXT;
BEGIN
  FOR rec IN
    SELECT id
    FROM students
    WHERE link_code IS NULL OR trim(link_code) = ''
    ORDER BY id
  LOOP
    LOOP
      candidate := random_student_link_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM students WHERE link_code = candidate
      );
    END LOOP;

    UPDATE students
    SET link_code = candidate,
        updated_at = NOW()
    WHERE id = rec.id;
  END LOOP;
END
$$;
