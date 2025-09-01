import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set. The /api/guidelines endpoint will fail until configured.');
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/guidelines', async (req, res) => {
  try {
    const { diagnosis } = req.body || {};
    if (!diagnosis || typeof diagnosis !== 'string') {
      return res.status(400).json({ message: 'diagnosis is required' });
    }

    const systemPrompt = `You are an oncology clinical assistant. Given a cancer diagnosis, provide evidence-informed guidance for:
1) Workup
2) Treatment modalities (with brief notes)
3) Surveillance
4) Follow-up

Return ONLY a valid JSON object with this shape:
{
  "diagnosis": string,
  "workup": string[],
  "treatment": { "name": string, "details"?: string }[],
  "surveillance": string[],
  "follow_up": string[]
}
Keep each list focused and practical. Include biomarker or genetic testing as appropriate. If details depend on stage, receptors, fitness, or comorbidities, include concise qualifiers.`;

    const userPrompt = `Diagnosis: ${diagnosis}`;

    const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
      })
    });

    if (!apiRes.ok) {
      const text = await apiRes.text();
      return res.status(502).json({ message: 'OpenAI error', detail: text });
    }

    const data = await apiRes.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ message: 'No content from OpenAI' });
    }

    // Try parsing JSON; if it fails, attempt to extract JSON substring
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse JSON response');
      }
    }

    // Normalize minimal fields
    parsed.diagnosis = parsed.diagnosis || diagnosis;
    parsed.workup = Array.isArray(parsed.workup) ? parsed.workup : [];
    parsed.treatment = Array.isArray(parsed.treatment) ? parsed.treatment : [];
    parsed.surveillance = Array.isArray(parsed.surveillance) ? parsed.surveillance : [];
    parsed.follow_up = Array.isArray(parsed.follow_up) ? parsed.follow_up : [];

    return res.json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

