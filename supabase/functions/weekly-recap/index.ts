// Supabase Edge Function: weekly-recap
//
// Fetches the caller's last 7 mood_logs, sends them to xAI's Grok with a
// forced function call (guaranteed structured output), writes the result to
// public.recaps, and returns the stored row.
//
// Auth: uses the user's JWT (`Authorization` header) to build the Supabase
// client, so every read and write is enforced by the RLS policies on
// mood_logs and recaps.
//
// Deploy:
//   supabase functions deploy weekly-recap
//   supabase secrets set XAI_API_KEY=xai-...

import OpenAI from 'npm:openai@4.67.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

// xAI's Grok 4 reasoning model — slower but much better at pattern-finding.
// Reasoning models may produce a hidden reasoning step before the function
// call; the OpenAI SDK surfaces only the final tool_call, so no extra handling
// is needed on our end.
const MODEL = 'grok-4.20-reasoning'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `You are the insight engine for devmood, a tool that helps developers track daily coding energy, focus, and mood.

Given a recent window of check-ins, you surface 3 PERSONALIZED, CONCRETE insights about the developer's coding patterns — what the data reveals about how they work best.

Guidelines:
- Ground every insight in the data. Reference specific tags, notes, scores, or day patterns you actually see.
- Prefer specifics over generics. "Your focus dips on days tagged #meetings" > "focus matters."
- Be warm but direct. No platitudes, no "remember self-care" filler, no cheerleading.
- Vary angles across the three insights: ideally one highlights a strength, one a correlation or pattern, one something actionable.
- If the data is thin or very uniform, acknowledge that rather than invent patterns.
- Write in second person ("you"), present tense. Each insight body is 1–2 sentences max.
- The summary is a single warm, honest sentence (≤140 chars) — not a headline, a human observation.

You MUST respond by calling the record_recap function exactly once. Never respond with plain text.`

// OpenAI-style function schema (same shape as Anthropic tools, different wrapper).
const recapTool = {
  type: 'function' as const,
  function: {
    name: 'record_recap',
    description:
      "Record the weekly recap for the developer based on their check-ins. Always call this exactly once.",
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description:
            'One warm, honest sentence summarizing the week (≤140 chars).',
        },
        insights: {
          type: 'array',
          description: 'Exactly three personalized insights.',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Short, punchy headline (3–6 words).',
              },
              body: {
                type: 'string',
                description:
                  'One to two sentences. Concrete, grounded in the data. Actionable where natural.',
              },
            },
            required: ['title', 'body'],
            additionalProperties: false,
          },
        },
      },
      required: ['summary', 'insights'],
      additionalProperties: false,
    },
  },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function formatLogs(
  logs: Array<{
    logged_at: string
    energy: number
    focus: number
    mood: number
    note: string | null
    tags: string[] | null
  }>,
) {
  return logs
    .map((l, i) => {
      const date = new Date(l.logged_at)
      const day = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      const tagLine = l.tags?.length
        ? `\n   tags: ${l.tags.map((t) => '#' + t).join(' ')}`
        : ''
      const noteLine = l.note ? `\n   note: ${l.note}` : ''
      return `${i + 1}. ${day} — energy ${l.energy}/5, focus ${l.focus}/5, mood ${l.mood}/5${tagLine}${noteLine}`
    })
    .join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'missing authorization' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) return json({ error: 'unauthorized' }, 401)

    const { data: logs, error: logsErr } = await supabase
      .from('mood_logs')
      .select('logged_at, energy, focus, mood, note, tags')
      .order('logged_at', { ascending: false })
      .limit(7)

    if (logsErr) return json({ error: logsErr.message }, 500)
    if (!logs || logs.length === 0) {
      return json(
        { error: 'log at least one check-in first', code: 'no_logs', log_count: 0 },
        400,
      )
    }

    const apiKey = Deno.env.get('XAI_API_KEY')
    if (!apiKey) return json({ error: 'XAI_API_KEY not configured' }, 500)

    // xAI's API is OpenAI-compatible — point the OpenAI SDK at api.x.ai.
    const grok = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    })

    const completion = await grok.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      tools: [recapTool],
      tool_choice: {
        type: 'function',
        function: { name: 'record_recap' },
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Here are my last ${logs.length} daily check-ins (most recent first):\n\n${formatLogs(logs)}\n\nWhat patterns do you see? Give me 3 insights.`,
        },
      ],
    })

    const choice = completion.choices?.[0]
    const toolCall = choice?.message?.tool_calls?.[0]
    if (!toolCall || toolCall.function.name !== 'record_recap') {
      console.error('no record_recap tool call in response', completion)
      return json({ error: 'model did not produce a recap' }, 502)
    }

    let parsed: { summary: string; insights: Array<{ title: string; body: string }> }
    try {
      parsed = JSON.parse(toolCall.function.arguments)
    } catch (e) {
      console.error('could not parse function arguments', toolCall.function.arguments)
      return json({ error: 'model returned malformed JSON' }, 502)
    }

    if (
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.insights) ||
      parsed.insights.length !== 3 ||
      !parsed.insights.every(
        (i) => typeof i?.title === 'string' && typeof i?.body === 'string',
      )
    ) {
      console.error('schema mismatch', parsed)
      return json({ error: 'model returned unexpected shape' }, 502)
    }

    const { summary, insights } = parsed

    const { data: recap, error: insErr } = await supabase
      .from('recaps')
      .insert({
        user_id: user.id,
        summary,
        insights,
        log_count: logs.length,
        period_start: logs[logs.length - 1].logged_at,
        period_end: logs[0].logged_at,
        model: MODEL,
      })
      .select()
      .single()

    if (insErr) return json({ error: insErr.message }, 500)

    return json({
      recap,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens ?? 0,
        completion_tokens: completion.usage?.completion_tokens ?? 0,
        total_tokens: completion.usage?.total_tokens ?? 0,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('weekly-recap error:', err)

    // OpenAI SDK surfaces HTTP status on error objects.
    const status = (err as { status?: number })?.status
    if (status === 429) {
      return json(
        { error: 'rate limited — try again shortly', code: 'rate_limited' },
        429,
      )
    }
    if (status === 401) {
      return json({ error: 'xAI API key invalid or missing' }, 500)
    }

    return json({ error: msg }, 500)
  }
})
