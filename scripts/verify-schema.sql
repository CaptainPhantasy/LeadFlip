-- Verify leads table schema after reconciliation

-- Check all columns in leads table
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
ORDER BY ordinal_position;

-- Verify indexes on leads table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'leads'
  AND schemaname = 'public'
ORDER BY indexname;

-- Test that detect_spam_patterns function compiles
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'detect_spam_patterns';
