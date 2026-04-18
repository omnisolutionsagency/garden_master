// supabase/functions/analyze-garden/index.ts
// Proxies garden analysis requests to Claude API
// Deploy:  supabase functions deploy analyze-garden
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!ANTHROPIC_API_KEY) {
    return jsonResponse(
      { error: 'Server misconfigured: ANTHROPIC_API_KEY not set. Run `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`' },
      500
    );
  }

  let payload: { prompt?: string; plant_id?: string; garden_id?: string; analysis_type?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { prompt, plant_id, garden_id, analysis_type } = payload;
  if (!prompt) {
    return jsonResponse({ error: 'Missing prompt' }, 400);
  }

  // Call Claude API
  let claudeData: any;
  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return jsonResponse(
        { error: `Claude API ${claudeRes.status}: ${errText.slice(0, 500)}` },
        502
      );
    }
    claudeData = await claudeRes.json();
  } catch (err: any) {
    return jsonResponse({ error: `Claude fetch failed: ${err?.message || err}` }, 502);
  }

  const responseText: string = (claudeData.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  let recommendation: any;
  try {
    // Claude sometimes wraps JSON in ```json fences — strip them first.
    const cleaned = responseText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    recommendation = JSON.parse(cleaned);
  } catch {
    recommendation = { summary: responseText, alerts: [] };
  }

  // Log analysis (best-effort — don't fail the request if logging breaks)
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && garden_id) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('ai_analyses').insert({
        garden_id,
        plant_id,
        analysis_type: analysis_type || 'general',
        prompt_summary: prompt.slice(0, 500),
        response: recommendation,
        model: 'claude-sonnet-4-5',
        tokens_used:
          (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0),
      });
    } catch (err) {
      console.error('ai_analyses insert failed (ignored):', err);
    }
  }

  return jsonResponse({ recommendation });
});
