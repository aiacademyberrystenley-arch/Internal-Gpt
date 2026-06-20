import 'dotenv/config';
import { supabaseAdmin } from '../services/supabase.service.js';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_NAME || 'College Admin';

if (!supabaseAdmin) {
  console.error('Supabase is not configured. Check backend/.env.');
  process.exit(1);
}

if (!email || !password) {
  console.error('Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=StrongPass123 npm run create:admin');
  process.exit(1);
}

const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    role: 'admin',
    full_name: fullName,
    department: 'Administration'
  }
});

if (error && !error.message?.toLowerCase().includes('already')) {
  console.error(error.message);
  process.exit(1);
}

const userId = data?.user?.id;

if (userId) {
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    role: 'admin',
    department: 'Administration',
    semester: null
  });

  if (profileError) {
    console.error(profileError.message);
    process.exit(1);
  }
}

console.log(`Admin user ready: ${email}`);
