-- Sample data so you can test the API immediately (no Twilio required).

INSERT INTO cohorts (name, role_level, start_date, duration_days, created_at, organization_id)
VALUES ('Sample Agent Cohort', 'agent', '2026-01-26', 30, now(), 1);



-- 2) Create a sample user (replace phone number with your real number in E.164 if you want to test Twilio later)
INSERT INTO users (name, phone, role_level, status, created_at, organization_id)
VALUES ('Test Learner', '+15551234567', 'agent', 'active', now(), 1);


-- 3) Enroll them in the cohort
INSERT INTO cohort_users (cohort_id, user_id)
SELECT c.id, u.id
FROM cohorts c, users u
WHERE c.name = 'Sample Agent Cohort'
  AND u.phone_number = '+15551234567'
ON CONFLICT (cohort_id, user_id) DO NOTHING;

-- 4) Add Day 1 lesson for agents
INSERT INTO lessons (role_level, day_number, title, lesson_text, action_text, reflection_question)
VALUES (
  'agent',
  1,
  'Attitude Shapes the Day',
  'How you show up shapes every interaction.',
  'Start your first customer interaction with a calm, positive tone.',
  'How did your attitude affect your first interaction today?'
)
ON CONFLICT (role_level, day_number) DO NOTHING;
