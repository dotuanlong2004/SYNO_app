ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_users_class_id ON users (class_id);

CREATE TABLE IF NOT EXISTS timetables (
    id              BIGSERIAL PRIMARY KEY,
    class_id        VARCHAR(64) NOT NULL,
    subject_name    VARCHAR(255) NOT NULL,
    day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    room            VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_timetables_class_day_start
ON timetables (class_id, day_of_week, start_time);
