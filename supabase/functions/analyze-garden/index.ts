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

  type ChatMessage = { role: 'user' | 'assistant'; content: string };
  let payload: {
    mode?: 'analyze' | 'chat';
    prompt?: string;
    plant_id?: string;
    garden_id?: string;
    analysis_type?: string;
    system?: string;
    messages?: ChatMessage[];
  };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const mode = payload.mode === 'chat' ? 'chat' : 'analyze';
  const { plant_id, garden_id, analysis_type } = payload;

  // Build messages + system prompt based on mode
  let messages: ChatMessage[];
  let systemPrompt: string | undefined;
  let promptSummary: string;

  if (mode === 'chat') {
    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      return jsonResponse({ error: 'Missing messages for chat mode' }, 400);
    }
    messages = payload.messages;
    systemPrompt = payload.system;
    promptSummary = messages[messages.length - 1]?.content?.slice(0, 500) || '';
  } else {
    if (!payload.prompt) {
      return jsonResponse({ error: 'Missing prompt' }, 400);
    }
    messages = [{ role: 'user', content: payload.prompt }];
    promptSummary = payload.prompt.slice(0, 500);
  }

  // Call Claude API
  let claudeData: any;
  try {
    const claudeBody: any = {
      model: 'claude-sonnet-4-5',
      max_tokens: mode === 'chat' ? 768 : 1024,
      messages,
    };
    if (systemPrompt) claudeBody.system = systemPrompt;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(claudeBody),
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

  const tokensUsed =
    (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);

  if (mode === 'chat') {
    // Log chat turn best-effort
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && garden_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('ai_analyses').insert({
          garden_id,
          plant_id,
          analysis_type: 'chat',
          prompt_summary: promptSummary,
          response: { reply: responseText },
          model: 'claude-sonnet-4-5',
          tokens_used: tokensUsed,
        });
      } catch (err) {
        console.error('ai_analyses insert failed (ignored):', err);
      }
    }
    return jsonResponse({ reply: responseText });
  }

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

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && garden_id) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('ai_analyses').insert({
        garden_id,
        plant_id,
        analysis_type: analysis_type || 'general',
        prompt_summary: promptSummary,
        response: recommendation,
        model: 'claude-sonnet-4-5',
        tokens_used: tokensUsed,
      });
    } catch (err) {
      console.error('ai_analyses insert failed (ignored):', err);
    }
  }

  return jsonResponse({ recommendation });
});
