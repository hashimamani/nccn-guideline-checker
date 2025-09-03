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

app.post('/api/guidelines', async (_req, res) => {
  try {
    // Accept optional structured inputs; fall back to legacy 'diagnosis' as cancerType
    const {
      cancerType,
      stage,
      subtype,
      setting,
      guidelineBasis,
      clinicalContextNotes,
      diagnosis,
    } = _req.body || {};

    const buildPrompt = ({
      cancerType: _cancerType,
      stage: _stage,
      subtype: _subtype,
      setting: _setting,
      guidelineBasis: _guidelineBasis,
      clinicalContextNotes: _clinicalContextNotes,
    } = {}) => `
You are generating a structured clinical care-plan summary for oncology.

OUTPUT FORMAT:
- Return ONLY valid JSON (UTF-8), no markdown, no commentary.
- JSON must be an array of 5 objects (rows), each with EXACTLY these keys:
  - "clinical_issue_diagnosis"                (string)
  - "therapeutic_objective"                  (array of strings; each item is a bullet)
  - "management_strategy"                    (array of strings; each item is a bullet)
  - "assessment_of_response_follow_up"       (array of strings; each item is a bullet)

CONTENT REQUIREMENTS:
- Cancer: ${_cancerType || "N/A"}
- Stage: ${_stage || "N/A"}
- Subtype: ${_subtype || "N/A"}
- Treatment setting: ${_setting || "N/A"}
- Guideline basis: ${_guidelineBasis || "Evidence-based standard of care"}
- Context notes: ${_clinicalContextNotes || "None"}

CLINICAL STYLE:
- Use precise clinical language suitable for an oncologist.
- Make bullets concise, action-oriented, and non-redundant.
- Include biomarker- or mutation-directed strategies when relevant (e.g., PIK3CA, BRCA1/2, PD-L1, MSI-H, NTRK, etc.) based on the specified subtype/setting.
- Include supportive/palliative components when relevant to the context.
- Do NOT include drug doses or schedules; summarize strategies and decisions.
- If an item does not apply, omit it rather than writing "N/A".

ROW DEFINITIONS (create 5 rows total, adapt to the context):
1) Row for the PRIMARY clinical problem in this context (e.g., localized disease OR first-line metastatic presentation).
2) Row for RECURRENCE/PROGRESSION or next-line sequencing (e.g., biomarker-driven options, endocrine vs chemotherapy triggers, ADCs, immunotherapy, PARPi, etc.)
3) Row for COMPLICATION-SPECIFIC care where relevant (e.g., bone metastases/SRE prevention, CNS disease management, thromboembolism risk).
4) Row for TOXICITY/PREVENTIVE care linked to the chosen strategies (e.g., cardiotoxicity surveillance, bone health on AIs, hyperglycemia on PI3K inhibitors).
5) Row for SURVIVORSHIP / FOLLOW-UP or ONGOING MONITORING appropriate to the setting (metastatic monitoring vs adjuvant surveillance), including PROs and imaging principles.

VALIDATION:
- Ensure the response is strictly valid JSON and parses with JSON.parse().
- Each array must have at least 2 bullet items.
- Avoid duplicate bullets across columns.

Now produce the JSON.
`.trim();

    const prompt = buildPrompt({
      cancerType: cancerType || (typeof diagnosis === 'string' ? diagnosis : undefined),
      stage,
      subtype,
      setting,
      guidelineBasis,
      clinicalContextNotes,
    });

    const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
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

    // Robust JSON extraction: handle code fences, arrays, or objects
    const tryParse = (text) => {
      if (!text || typeof text !== 'string') return null;
      try {
        return JSON.parse(text.trim());
      } catch (_) {
        return null;
      }
    };

    const extractFromFences = (text) => {
      const fenceRe = /```(?:json|JSON)?\s*([\s\S]*?)```/;
      const m = text.match(fenceRe);
      return m ? m[1].trim() : null;
    };

    const findBalanced = (text, openChar, closeChar) => {
      const start = text.indexOf(openChar);
      if (start === -1) return null;
      let depth = 0;
      let inString = false;
      let quote = '';
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
          if (ch === '\\') { i++; continue; }
          if (ch === quote) { inString = false; }
          continue;
        } else {
          if (ch === '"' || ch === '\'') { inString = true; quote = ch; continue; }
          if (ch === openChar) depth++;
          else if (ch === closeChar) {
            depth--;
            if (depth === 0) {
              return text.slice(start, i + 1);
            }
          }
        }
      }
      return null;
    };

    let parsed = tryParse(content);
    if (!parsed) {
      const fenced = extractFromFences(content);
      if (fenced) parsed = tryParse(fenced);
    }
    if (!parsed) {
      const arrBlock = findBalanced(content, '[', ']');
      if (arrBlock) parsed = tryParse(arrBlock);
    }
    if (!parsed) {
      const objBlock = findBalanced(content, '{', '}');
      if (objBlock) parsed = tryParse(objBlock);
    }

    if (!parsed) {
      throw new SyntaxError('Failed to parse JSON from model response');
    }

    // Normalize rows: first col is string; others arrays of strings
    const toStringArray = (v) => {
      if (Array.isArray(v)) return v.map(String);
      if (v == null || v === '') return [];
      return [String(v)];
    };

    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const normalized = rows.map((row) => ({
      clinical_issue_diagnosis: row?.clinical_issue_diagnosis != null ? String(row.clinical_issue_diagnosis) : '',
      therapeutic_objective: toStringArray(row?.therapeutic_objective),
      management_strategy: toStringArray(row?.management_strategy),
      assessment_of_response_follow_up: toStringArray(row?.assessment_of_response_follow_up),
    }));

    return res.json(normalized);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
