import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Starting Supabase migration...')

  const migrationPath = join(process.cwd(), 'supabase/migrations/20250930000000_initial_schema.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  // Split SQL into individual statements (rough split on semicolons)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Executing ${statements.length} SQL statements...`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement) continue

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
      if (error && !error.message.includes('already exists')) {
        console.error(`❌ Error on statement ${i + 1}:`, error.message)
        console.log('Statement:', statement.substring(0, 100) + '...')
      } else {
        console.log(`✅ Statement ${i + 1}/${statements.length}`)
      }
    } catch (err) {
      console.error(`❌ Error executing statement ${i + 1}:`, err)
    }
  }

  console.log('✨ Migration complete!')
}

runMigration().catch(console.error)
