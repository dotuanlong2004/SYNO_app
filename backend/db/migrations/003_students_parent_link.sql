ALTER TABLE students ADD COLUMN IF NOT EXISTS link_code VARCHAR(128);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_link_code_unique ON students (link_code);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students (parent_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_students_parent_id_users'
      AND table_name = 'students'
  ) THEN
    ALTER TABLE students
    ADD CONSTRAINT fk_students_parent_id_users
      FOREIGN KEY (parent_id)
      REFERENCES users (id)
      ON DELETE SET NULL;
  END IF;
END $$;
