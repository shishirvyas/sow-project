// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { printRoutes } = require("./utils/listRoutes.js"); // relative path

const multer = require("multer");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

// parsers you already installed
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const rtf2text = require("rtf2text");
const XLSX = require("xlsx");
const { htmlToText } = require("html-to-text");
const libre = require("libreoffice-convert");

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors());
app.use(express.json());

/* ---------- Config / Runtime state ---------- */
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const USE_MOCK_ENV = (process.env.USE_MOCK || "false").toLowerCase() === "true";
const LOCAL_LLMS = {
  ollama: { name: "Ollama", type: "ollama", url: "http://localhost:11434" }, // default Ollama API
  textgen: { name: "TextGenerationWebUI", type: "textgen", url: "http://localhost:7860" }, // default TG-UI port
};

// Use environment variable to specify allowed origin
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];


app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS not allowed from this origin: " + origin));
  },
  credentials: true, // if you need cookies or auth headers
}));


// runtime selection (in-memory). Default priority: USE_MOCK_ENV -> openai (if key) -> local (if available)
let runtimeSelection = {
  mode: USE_MOCK_ENV ? "mock" : (OPENAI_KEY ? "openai" : "mock"),
  localBackend: "ollama", // which local backend to call if mode === 'local'
};

function getAvailableOptions() {
  const opts = [{ id: "mock", label: "Mock (no-cost, dev only)" }];
  if (OPENAI_KEY) opts.push({ id: "openai", label: "OpenAI (cloud)" });
  // Always show local options; backend will validate reachability when selected
  opts.push({ id: "local:ollama", label: "Local: Ollama (http://localhost:11434)" });
  opts.push({ id: "local:textgen", label: "Local: Text-Generation-WebUI (http://localhost:7860)" });
  return opts;
}

/* ---------- Helpers (parsing & chunking) ---------- */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
function chunkText(text, maxTokensPerChunk = 3000) {
  const maxChars = maxTokensPerChunk * 4;
  const chunks = [];
  let pos = 0;
  while (pos < text.length) {
    let end = Math.min(pos + maxChars, text.length);
    if (end < text.length) {
      const nl = text.lastIndexOf("\n", end);
      const dot = text.lastIndexOf(".", end);
      const breakPos = Math.max(nl, dot);
      if (breakPos > pos + 50) end = breakPos + 1;
    }
    chunks.push(text.slice(pos, end).trim());
    pos = end;
  }
  return chunks.filter(Boolean);
}

/* ---------- File parsers (same as before) ---------- */
async function parsePDF(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text || "";
}
async function parseDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result?.value || "";
}
async function parseRTF(filePath) {
  const data = await fs.readFile(filePath, "utf8");
  return new Promise((resolve, reject) => {
    rtf2text.fromString(data, (err, text) => {
      if (err) return reject(err);
      resolve(text || "");
    });
  });
}
async function parseHTML(filePath) {
  const html = await fs.readFile(filePath, "utf8");
  return htmlToText(html, { wordwrap: false });
}
async function parseTXT(filePath) {
  return fs.readFile(filePath, "utf8");
}
async function parseXLSX(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheetNames = wb.SheetNames || [];
  const pieces = [];
  for (const name of sheetNames) {
    const sheet = wb.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv && csv.trim()) pieces.push(`--- Sheet: ${name} ---\n${csv}`);
  }
  return pieces.join("\n\n");
}
async function convertDocToDocx(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const ext = ".docx";
    return new Promise((resolve, reject) => {
      libre.convert(buffer, ext, undefined, async (err, done) => {
        if (err) return reject(err);
        const outPath = `${filePath}.converted${ext}`;
        await fs.writeFile(outPath, done);
        resolve(outPath);
      });
    });
  } catch (err) {
    throw err;
  }
}

async function extractTextFromUploadedFile(file) {
  const ext = path.extname(file.originalname || file.filename || "").toLowerCase();
  const filePath = file.path;
  try {
    if (ext === ".pdf") return await parsePDF(filePath);
    if (ext === ".docx") return await parseDOCX(filePath);
    if (ext === ".doc") {
      try {
        const converted = await convertDocToDocx(filePath);
        const text = await parseDOCX(converted);
        await fs.unlink(converted).catch(() => {});
        return text;
      } catch (e) {
        const raw = await fs.readFile(filePath, "utf8").catch(() => "");
        return raw;
      }
    }
    if (ext === ".rtf") return await parseRTF(filePath);
    if (ext === ".html" || ext === ".htm") return await parseHTML(filePath);
    if (ext === ".txt" || ext === ".md") return await parseTXT(filePath);
    if (ext === ".xls" || ext === ".xlsx") return await parseXLSX(filePath);
    const tryText = await fs.readFile(filePath, "utf8").catch(() => null);
    if (tryText && tryText.trim()) return tryText;
    try {
      return await parsePDF(filePath);
    } catch (e) {
      throw new Error(`Unsupported file type (${ext || "unknown"}) or failed parsing.`);
    }
  } finally {
    // caller cleans up
  }
}

/* ---------- LLM call wrappers (OpenAI, Ollama, TextGen) ---------- */

// OpenAI chat completions (same endpoint you used)
async function callOpenAI(messages, model = "gpt-4o-mini", max_tokens = 1200) {
  if (!OPENAI_KEY) throw new Error("NO_OPENAI_KEY");
  const url = "https://api.openai.com/v1/chat/completions";
  const body = { model, messages, max_tokens, temperature: 0.15 };
  const resp = await axios.post(url, body, {
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    timeout: 120000,
  });
  const choices = resp.data.choices || [];
  return choices.map((c) => c.message?.content).filter(Boolean).join("\n\n");
}

// Ollama: simple /api/chat endpoint (compatible) - example
// Ollama default API: POST http://localhost:11434/api/chat
// We'll send a minimal request with messages -> get back JSON with output text
async function callOllama(messages, model = "llama2", max_tokens = 1200) {
  // build prompt: join user/system similar to OpenAI
  // Ollama API might accept messages or prompt; check docs. We'll send a "prompt" built from messages.
  const url = `${LOCAL_LLMS.ollama.url}/api/chat`; // default Ollama listen port
  const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
  const body = { model, prompt, max_tokens };
  const resp = await axios.post(url, body, { timeout: 120000 });
  // Ollama responses vary — try to return text safely
  return resp.data?.output?.[0]?.content || resp.data?.text || JSON.stringify(resp.data);
}

// Text-Generation-WebUI: it offers an API endpoint at /api/v1/generate; we'll post prompts
async function callTextGenWebUI(messages, model = "gptq-model", max_tokens = 1200) {
  const url = `${LOCAL_LLMS.textgen.url}/api/v1/generate`;
  const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
  const body = { model, input: prompt, max_new_tokens: max_tokens };
  const resp = await axios.post(url, body, { timeout: 120000 });
  // API returns generations array
  if (resp.data?.results && Array.isArray(resp.data.results) && resp.data.results[0]?.generated_text) {
    return resp.data.results[0].generated_text;
  }
  return JSON.stringify(resp.data);
}

// High-level call wrapper: decides by runtimeSelection.mode
async function callSelectedLLM(messages, model, max_tokens = 1200) {
  // Mock mode forced by env
  if (USE_MOCK_ENV || runtimeSelection.mode === "mock") {
    return JSON.stringify({
      risks: ["Example risk: ambiguous deliverable timeline"],
      unclear: ["Example unclear: acceptance criteria for Module X"],
      remediation: ["Request clarification on deliverables and acceptance tests"]
    });
  }

  // OpenAI
  if (runtimeSelection.mode === "openai") {
    return await callOpenAI(messages, model, max_tokens);
  }

  // Local
  if (runtimeSelection.mode === "local") {
    // prefer selected local backend
    const backend = runtimeSelection.localBackend || "ollama";
    try {
      if (backend === "ollama") return await callOllama(messages, model, max_tokens);
      if (backend === "textgen") return await callTextGenWebUI(messages, model, max_tokens);
      // unknown backend: error
      throw new Error("UNKNOWN_LOCAL_BACKEND");
    } catch (err) {
      // bubble up for fallback handling
      throw err;
    }
  }

  throw new Error("NO_LLM_SELECTED");
}

/* ---------- API endpoints for LLM selection ---------- */

// list available options
app.get("/llm-options", (req, res) => {
  return res.json({ ok: true, options: getAvailableOptions(), current: runtimeSelection });
});

// set selection: body { mode: "mock" | "openai" | "local", localBackend?: "ollama"|"textgen" }
app.post("/llm-select", (req, res) => {
  const { mode, localBackend } = req.body || {};
  if (!mode) return res.status(400).json({ ok: false, error: "missing_mode" });

  if (!["mock", "openai", "local"].includes(mode)) {
    return res.status(400).json({ ok: false, error: "invalid_mode" });
  }
  runtimeSelection.mode = mode;
  if (localBackend) runtimeSelection.localBackend = localBackend;
  return res.json({ ok: true, selected: runtimeSelection });
});

/* ---------- Main /analyze route (uses callSelectedLLM) ---------- */

app.post("/analyze", upload.single("file"), async (req, res) => {
  let uploadedPath = null;
  try {
    let text = "";

    if (req.file) {
      uploadedPath = req.file.path;
      text = await extractTextFromUploadedFile(req.file);
      await fs.unlink(uploadedPath).catch(() => {});
      uploadedPath = null;
    } else if (req.body && req.body.text) {
      text = req.body.text;
    } else {
      return res.status(400).json({ ok: false, error: "no_input", message: "No file uploaded and no text provided." });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "empty_document" });
    }

    // chunk then call LLM for each chunk
    const chunks = chunkText(text, 2500);
    const results = [];
    const analysisInstruction = `You are an expert SOW/legal/contract analyst.
For the given SOW excerpt, provide:
1) A short list of likely hidden or risky clauses (max 6 items) — label as "risks".
2) A short list of items that are unclear or missing (max 6 items) — label as "unclear".
3) A concise suggested remediation or question to ask the vendor for each risk/unclear item (label as "remediation").
Return JSON only with keys: risks (array of strings), unclear (array of strings), remediation (array of short strings). Do not include any extra text.`;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const messages = [
        { role: "system", content: analysisInstruction },
        { role: "user", content: `SOW excerpt (chunk ${i + 1}/${chunks.length}):\n\n${chunk}` },
      ];
      // high-level call
      const raw = await callSelectedLLM(messages, "gpt-4o-mini", 900);
      results.push({ chunkIndex: i, raw });
    }

    // Combine
    const combinePrompt = [
      { role: "system", content: "You are an expert SOW analyst. Combine multiple partial JSON results from previous analysis into a single deduplicated JSON with keys: risks, unclear, remediation. Keep each array short (max 12 items). Provide output as JSON only." },
      { role: "user", content: `Here are the raw JSON outputs from chunk analyses:\n\n${results.map(r => r.raw).join("\n\n---\n\n")}` },
    ];
    const combinedRaw = await callSelectedLLM(combinePrompt, "gpt-4o-mini", 800);

    // parse JSON
    let combinedJSON = null;
    try {
      const firstBrace = combinedRaw.indexOf("{");
      const jsonText = firstBrace >= 0 ? combinedRaw.slice(firstBrace) : combinedRaw;
      combinedJSON = JSON.parse(jsonText);
    } catch (e) {
      return res.json({ ok: false, parseError: e.message, combinedRaw, parts: results });
    }

    return res.json({ ok: true, mode: runtimeSelection, chunks: chunks.length, analysis: combinedJSON, rawParts: results.map(r => ({ i: r.chunkIndex, raw: r.raw })) });

  } catch (err) {
    console.error("Analyze error:", err?.response?.data || err.message || err);
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    // quota / billing detection for OpenAI
    if (err?.response?.data?.error?.code === "insufficient_quota" || /quota|insufficient/i.test(err?.message || "")) {
      return res.status(402).json({ ok: false, error: "quota_exceeded", message: "OpenAI quota exhausted." });
    }
    // local server unreachable handling
    if (err.code === 'ECONNREFUSED' || err?.message?.toLowerCase().includes('connect') || err?.message?.toLowerCase().includes('failed')) {
      return res.status(502).json({ ok: false, error: "backend_unreachable", message: "Selected LLM backend unreachable or returned an error.", details: err.message || err });
    }
    const status = err?.response?.status || 500;
    const data = err?.response?.data || { message: err.message || "Processing failed" };
    return res.status(status).json({ ok: false, error: "processing_failed", message: data });
  }
});

// ----------------- mount routers / routes -----------------
// example: direct routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));



/* ---------- Start server ---------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`Server running on port ${PORT}`);

  // ✅ Log registered routes AFTER the server is listening
  printRoutes(app);
});

