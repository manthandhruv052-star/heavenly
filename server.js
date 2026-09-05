import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.includes('your_key_here')) {
    return res.status(503).json({
      error: 'The chat assistant is not configured yet. Add GROQ_API_KEY to your .env file and restart the server.',
    });
  }

  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  // Keep only well-formed turns, cap length, and cap the history we forward.
  const history = incoming
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (history.length === 0) {
    return res.status(400).json({ error: 'No message to send.' });
  }

  try {
    const upstream = await fetch(GROQ_URL, {
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

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('Groq error', upstream.status, detail);
      return res.status(502).json({ error: 'The assistant is unavailable right now. Please try the enquiry form.' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    // Groq streams OpenAI-style SSE. Unwrap it to plain text deltas so the
    // browser side stays trivial.
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
          if (token) res.write(token);
        } catch {
          // Partial JSON across chunk boundaries — safe to skip.
        }
      }
    }

    res.end();
  } catch (err) {
    console.error('Chat proxy failed', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Something went wrong reaching the assistant.' });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => {
  const configured = process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_key_here');
  console.log(`\n  Heavenly Captured — http://localhost:${PORT}`);
  console.log(`  Chat assistant: ${configured ? `ready (${GROQ_MODEL})` : 'not configured — add GROQ_API_KEY to .env'}\n`);
});
