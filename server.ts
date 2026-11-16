import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

interface GuideContextInput {
  language?: 'en' | 'ur' | 'roman_ur';
  userName?: string;
  registrationStatus?: string;
  reviewNote?: string;
  branches?: Array<{ id: string; name: string; founderPairLabel?: string }>;
  sampleFounders?: Array<{ fullName: string; generation: number; branchName: string }>;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'FamilyRoots AI (OurLegacy)' });
});

app.post('/api/ai/guide', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'FamilyGuide AI is currently unavailable because GEMINI_API_KEY is not configured on the server.',
      });
    }

    const { messages, context } = req.body as {
      messages?: ChatMessageInput[];
      context?: GuideContextInput;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'At least one message is required.' });
    }

    const lang = context?.language || 'en';
    const langInstruction =
      lang === 'ur'
        ? 'Respond primarily in natural, polite Urdu (اردو script), keeping technical field names clear.'
        : lang === 'roman_ur'
          ? 'Respond in natural, polite Roman Urdu (e.g., "Aap apna registration form...").'
          : 'Respond in clear, warm, professional English (or match the user if they write in Urdu or Roman Urdu).';

    const branchesText =
      context?.branches && context.branches.length > 0
        ? context.branches
            .map((b) => `- ${b.name}${b.founderPairLabel ? ` (Founders: ${b.founderPairLabel})` : ''}`)
            .join('\n')
        : 'No family branches have been verified yet. An administrator can initialize the Founding Grandfather & Grandmother branch first.';

    const foundersText =
      context?.sampleFounders && context.sampleFounders.length > 0
        ? context.sampleFounders
            .slice(0, 12)
            .map((m) => `- ${m.fullName} (Gen ${m.generation}, Branch: ${m.branchName})`)
            .join('\n')
        : 'No verified members listed yet.';

    const systemInstruction = `You are FamilyGuide AI, the official registration and genealogy guide for FamilyRoots AI (OurLegacy).
Mission: Preserve family history, connect generations, and make family registration simple.

STRICT SAFETY & GOVERNANCE RULES (NEVER VIOLATE):
1. NEVER invent, guess, or assume family relationships based on names alone. Every parent-child and marital link must be explicitly selected and verified by a human Administrator.
2. NEVER claim you have approved, rejected, or edited any registration, branch, or family tree record. You are read-only and advisory.
3. If a case involves disputed parentage, missing elders, duplicate profiles, or branch merging, advise the user to use the "Escalate to Administrator" button so an Admin can review it.
4. Explain every registration field clearly when asked:
   - Full Name: Official full name for the lineage record.
   - Email Address & Phone Number: Stored privately for account communication and verification (only visible to you and Administrators).
   - Gender & Date of Birth: Used for demographic statistics, birthday reminders, and generational placement.
   - Father's Name & Mother's Name (plus optional explicit member selection): Helps Administrators verify exact parent-child links.
   - Family Branch: Choose "Join Existing Branch" to connect to an established line, or "Start New Branch" if founding a distinct branch.
   - Profile Photograph: Optional portrait compressed cleanly for the 2D/3D family tree medallions.
   - Family Head & Invited Accounts: One person is designated as the Main Family Head (e.g., Grandfather) and may appoint Branch Administrators. Only authorized administrators add, edit, remove, or approve relationships. When the Family Head adds a member with their email, that member automatically receives their personal login profile when signing in with that verified email.
5. Explain registration statuses clearly:
   - Pending: Submitted and awaiting Main Family Head / Administrator verification of relationships and duplicate checks.
   - Approved: Verified and added to the family tree, automatically updating the live tree.
   - Rejected: Declined by an Administrator (explain any provided review note and how to resubmit or escalate).
6. Language support: Support English, Urdu (اردو), and Roman Urdu fluently. ${langInstruction}

CURRENT LIVE CONTEXT (READ-ONLY):
- Signed-in user: ${context?.userName || 'Guest'}
- User's latest registration status: ${context?.registrationStatus || 'None submitted yet'}
- Admin review note (if any): ${context?.reviewNote || 'None'}
- Existing verified branches:
${branchesText}
- Sample verified lineage anchors:
${foundersText}`;

    const formattedContents = messages.slice(-14).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '').slice(0, 2000) }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: formattedContents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text?.trim() || 'I apologize, I could not generate a response right now. Please try again.';
    const lower = reply.toLowerCase();
    const suggestEscalation =
      lower.includes('escalate') ||
      lower.includes('administrator') ||
      lower.includes('admin review') ||
      lower.includes('ایڈمن');

    res.json({ reply, suggestEscalation });
  } catch (error: unknown) {
    console.error('FamilyGuide AI error:', error);
    const message = error instanceof Error ? error.message : 'Failed to reach FamilyGuide AI.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FamilyRoots AI (OurLegacy) server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
