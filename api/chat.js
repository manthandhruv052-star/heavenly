// Vercel serverless function — this is what actually runs in production.
// Same logic as the /api/chat route in server.js (used for local dev),
// kept in sync by hand since the two runtimes take different shapes.

export const config = { runtime: 'edge' };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// Everything the assistant is allowed to know about the studio. Edit freely —
// this is the single source of truth for what the chatbot tells visitors.
const SYSTEM_PROMPT = `You are Aria, the front-desk assistant for Heavenly Captured / Photo Studio,
a wedding and portrait photography studio in Bangalore, India.

STUDIO FACTS
- Specialises in South Indian and cross-cultural weddings, engagements, receptions,
  muhurtham ceremonies, maternity, newborn and family portraits.
- Based in Bangalore; travels across Karnataka, Tamil Nadu, Kerala and destination weddings.
- Style: cinematic, candid, warm. Documentary coverage with directed portrait sessions.
- Typical wedding coverage includes two photographers and a cinematographer.
- Deliverables: colour-graded gallery in 3-4 weeks, teaser film in 2 weeks,
  full film in 8-10 weeks, hand-bound albums on request.
- Booking: dates are held with a 30% retainer. Peak season (Nov-Feb) books 8-12 months ahead.

HOW TO ANSWER
- Warm, concise, human. Two to four sentences unless asked for detail.
- Never invent a price. If asked about cost, say packages are tailored to the number of
  days, cities and deliverables, and invite them to share their dates for a quote.
- Never invent a phone number, email, or availability for a specific date. Point them to
  the enquiry form on this page instead.
- If asked something unrelated to photography or this studio, gently redirect.
- Plain prose. No markdown, no bullet lists, no headings.`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'The chat assistant is not configured yet. Set GROQ_API_KEY in the Vercel project settings.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed request.' }), { status: 400 });
  }

  const incoming = Array.isArray(body?.messages) ? body.messages : [];
  const history = incoming
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (history.length === 0) {
    return new Response(JSON.stringify({ error: 'No message to send.' }), { status: 400 });
  }

  let upstream;
  try {
    upstream = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        temperature: 0.6,
        max_tokens: 500,
        stream: true,
      }),
    });
  } catch (err) {
    console.error('Groq fetch failed', err);
    return new Response(JSON.stringify({ error: 'Something went wrong reaching the assistant.' }), { status: 500 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    console.error('Groq error', upstream.status, detail);
    return new Response(
      JSON.stringify({ error: 'The assistant is unavailable right now. Please try the enquiry form.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Groq streams OpenAI-style SSE. Unwrap it to plain text deltas so the
  // browser side stays trivial — a plain ReadableStream of text.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;

            try {
              const token = JSON.parse(payload).choices?.[0]?.delta?.content;
              if (token) controller.enqueue(encoder.encode(token));
            } catch {
              // Partial JSON across chunk boundaries — safe to skip.
            }
          }
        }
        controller.close();
      } catch (err) {
        console.error('Stream relay failed', err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
