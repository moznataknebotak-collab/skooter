// supabase/functions/admin-create-user/index.ts
// Deploy: supabase functions deploy admin-create-user

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check caller role
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await supabaseUser.auth.getUser()
    if (!caller) throw new Error('Unauthorized')

    const { data: callerProfile } = await supabaseAdmin
      .from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') throw new Error('Forbidden — admin only')

    // Create user
    const { name, email, password, role } = await req.json()
    if (!name || !email || !password || !role) throw new Error('Chybí povinná pole')

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })
    if (createError) throw createError

    // Upsert profile (trigger should handle it, but just in case)
    await supabaseAdmin.from('users').upsert({
      id: newUser.user.id,
      name,
      role,
    })

    return new Response(JSON.stringify({ ok: true, userId: newUser.user.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
