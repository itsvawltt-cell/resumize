import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { loadDb, saveDb } from "./server/db";
import { User, ResumeAnalysis } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Set generous payload limits for base64 file payloads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Helper to initialize Gemini client safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined in the secrets workspace.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// Helper to call OpenRouter API if key is entered by local client
async function callOpenRouter(apiKey: string, model: string, systemPrompt: string, userPrompt: string, base64?: string, fileType?: string): Promise<any> {
  const modelName = model || "google/gemini-2.5-flash";
  let content: any = userPrompt;

  if (base64) {
    content = [
      { type: "text", text: userPrompt },
      {
        type: "image_url",
        image_url: {
          url: `data:${fileType || "application/pdf"};base64,${base64}`
        }
      }
    ];
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://ai.studio/build",
      "X-Title": "Resumize ATS Suite",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API status error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const textOutput = result.choices?.[0]?.message?.content || "";
  
  const startIndex = textOutput.indexOf("{");
  const endIndex = textOutput.lastIndexOf("}");
  if (startIndex === -1 || endIndex === -1) {
    try {
      return JSON.parse(textOutput);
    } catch {
      throw new Error("Unable to parse structured JSON response from OpenRouter provider.");
    }
  }

  const cleanedJson = textOutput.substring(startIndex, endIndex + 1);
  try {
    return JSON.parse(cleanedJson);
  } catch (parseError) {
    console.error("OpenRouter JSON parse failed, text output was:", textOutput);
    throw new Error("Unable to parse structured JSON response from OpenRouter.");
  }
}

// Authentication Middlewares
function getAuthUser(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  const db = loadDb();
  // Simplified secure token check: token is the user ID in this architecture
  const user = db.users.find(u => u.id === token);
  return user || null;
}

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized access. Please login or register to continue." });
    return;
  }
  (req as any).user = user;
  next();
};

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Access denied. Admin role required." });
    return;
  }
  (req as any).user = user;
  next();
};

// ==================== AUTH API ENDPOINTS ====================

app.post("/api/auth/signup", (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    res.status(400).json({ error: "Please enter all required fields: Email, Password, and Full Name." });
    return;
  }

  const db = loadDb();
  const lowerEmail = email.toLowerCase().trim();
  if (db.users.some(u => u.email.toLowerCase() === lowerEmail)) {
    res.status(400).json({ error: "An account with this email address already exists. Please login instead." });
    return;
  }

  const newUserId = "u-" + Math.random().toString(36).substring(2, 11);
  const isFirstUser = db.users.length === 0;
  // If user is itsvawltt@gmail.com, make them an admin automatically
  const role = (lowerEmail === "itsvawltt@gmail.com") ? "admin" : "user";

  const newUser: User = {
    id: newUserId,
    email: lowerEmail,
    fullName: fullName.trim(),
    role,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.passwords[newUserId] = password; // simple clear-text mock database password helper
  saveDb(db);

  res.status(201).json({
    user: { ...newUser, token: newUserId }
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Please provide both email and password." });
    return;
  }

  const db = loadDb();
  const lowerEmail = email.toLowerCase().trim();
  const user = db.users.find(u => u.email.toLowerCase() === lowerEmail);

  if (!user || db.passwords[user.id] !== password) {
    res.status(401).json({ error: "Invalid email credentials or incorrect password. Please try again." });
    return;
  }

  res.json({
    user: { ...user, token: user.id }
  });
});

app.get("/api/auth/me", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  res.json({ user });
});

// ==================== DASHBOARD STATS API ====================

app.get("/api/dashboard/stats", requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = loadDb();
  const myAnalyses = db.analyses
    .filter(a => a.userId === user.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const totalAnalyses = myAnalyses.length;
  const lastScore = totalAnalyses > 0 ? myAnalyses[totalAnalyses - 1].atsScore : 0;

  // Build a nice trend array representing historical progression
  const scoreTrend = myAnalyses.map(a => ({
    date: new Date(a.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
    score: a.atsScore
  }));

  // Build a stateful dynamic checklist based on latest metrics
  let checkedKeywords = false;
  let checkedMetrics = false;
  let checkedGrammar = false;
  let checkedHeaders = false;

  if (totalAnalyses > 0) {
    const latest = myAnalyses[totalAnalyses - 1];
    checkedKeywords = latest.scores.keywords >= 75;
    checkedMetrics = latest.scores.experience >= 80;
    checkedGrammar = latest.grammarIssues.length === 0;
    checkedHeaders = latest.scores.formatting >= 80;
  }

  const checklist = [
    { id: "c1", text: "Integrate ATS-compliant standard headers", done: checkedHeaders || totalAnalyses > 0 },
    { id: "c2", text: "Achieve a Keywords match rating over 75%", done: checkedKeywords },
    { id: "c3", text: "Incorporate metrics and KPIs in current role", done: checkedMetrics },
    { id: "c4", text: "Address all AI identified spelling or grammar typos", done: checkedGrammar && totalAnalyses > 0 },
    { id: "c5", text: "Get an overall ATS scoring rating of 80+", done: lastScore >= 80 }
  ];

  res.json({
    totalAnalyses,
    lastScore,
    scoreTrend,
    checklist
  });
});

// ==================== HISTORY API ENDPOINTS ====================

app.get("/api/history", requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = loadDb();
  const records = db.analyses
    .filter(a => a.userId === user.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // newest first
  res.json(records);
});

app.get("/api/history/:id", requireAuth, (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const db = loadDb();
  const record = db.analyses.find(a => a.id === id);

  if (!record) {
    res.status(404).json({ error: "Analysis history record not found." });
    return;
  }

  if (record.userId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Access denied to third party records." });
    return;
  }

  res.json(record);
});

app.delete("/api/history/:id", requireAuth, (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const db = loadDb();
  const index = db.analyses.findIndex(a => a.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Record not found." });
    return;
  }

  if (db.analyses[index].userId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Unauthorized operation." });
    return;
  }

  db.analyses.splice(index, 1);
  saveDb(db);
  res.json({ success: true, message: "History record successfully deleted." });
});

// ==================== ADMIN CONTROL PANEL API ====================

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const db = loadDb();
  const avg = db.analyses.length > 0 
    ? Math.round(db.analyses.reduce((sum, a) => sum + a.atsScore, 0) / db.analyses.length) 
    : 0;

  res.json({
    totalUsers: db.users.length,
    totalAnalyses: db.analyses.length,
    averageScore: avg,
    analysesByType: {
      "PDF Uploads": db.analyses.filter(a => a.filename.endsWith(".pdf")).length,
      "Word Documents": db.analyses.filter(a => a.filename.endsWith(".docx") || a.filename.endsWith(".doc")).length,
      "Plain Text": db.analyses.filter(a => a.filename.endsWith(".txt") || a.filename === "Pasted Core Text").length
    }
  });
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  const db = loadDb();
  // Do not send actual passwords
  const mappedUsers = db.users.map(u => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    createdAt: u.createdAt,
    analysesCount: db.analyses.filter(a => a.userId === u.id).length
  }));
  res.json(mappedUsers);
});

app.get("/api/admin/analyses", requireAdmin, (req, res) => {
  const db = loadDb();
  res.json(db.analyses);
});

// ==================== CORE RESUME ANALYZER (AI) ====================

app.post("/api/analyze", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { base64, fileType, filename, rawText } = req.body;

  if (!base64 && !rawText) {
    res.status(400).json({ error: "Please upload a document file or enter plain text information." });
    return;
  }

  const openrouterKey = req.headers["x-openrouter-key"] as string;
  const openrouterModel = req.headers["x-openrouter-model"] as string;

  if (openrouterKey) {
    try {
      const systemPrompt = `You are a high-end, expert ATS scanner, resume reviewer, and professional recruiter.
Analyze the provided resume document. Your assessment MUST be strictly structural and returned in parsed valid JSON format aligning with our schema.

The schema of the JSON object is:
{
  "atsScore": number (0-100 rating overall match),
  "scores": {
    "keywords": number (0-100 score),
    "experience": number (0-100 score),
    "skills": number (0-100 score),
    "formatting": number (0-100 score),
    "education": number (0-100 score)
  },
  "missingSkills": string[] (list of typical skills missing for this industry resume type),
  "weakSections": [
    {
      "section": string (section name),
      "issue": string (specific feedback),
      "remedy": string (how to repair)
    }
  ],
  "grammarIssues": [
    {
      "original": string (original sentence),
      "correction": string (revised sentence),
      "explanation": string (why corrected)
    }
  ],
  "improvements": string[] (concrete checklist recommendations on formatting, sections, or wording),
  "strongWordings": [
    {
      "original": string (weak phrase),
      "suggested": string (strong action verb alternative),
      "context": string (where to place)
    }
  ],
  "summarySuggestions": string[] (2 or 3 high-impact professional summary ideas based on their experience),
  "industryRecommendations": string[] (career tips specifically tailored to their professional bracket)
}`;

      const userPrompt = rawText 
        ? `Analyze this plain-text resume:\n\n${rawText}` 
        : `Identify, analyze and evaluate the resume thoroughly. Grade all scores accurately based on actual structural recruiter protocols:`;

      const analysisResult = await callOpenRouter(openrouterKey, openrouterModel, systemPrompt, userPrompt, base64, fileType);
      
      const analysisId = "a-" + Math.random().toString(36).substring(2, 11);
      const completeAnalysis: ResumeAnalysis = {
        id: analysisId,
        userId: user.id,
        filename: filename || "Uploaded Document",
        parsedText: base64 ? "[Processed document bin stream]" : rawText,
        timestamp: new Date().toISOString(),
        atsScore: analysisResult.atsScore ?? 72,
        scores: {
          keywords: analysisResult.scores?.keywords ?? 70,
          experience: analysisResult.scores?.experience ?? 75,
          skills: analysisResult.scores?.skills ?? 70,
          formatting: analysisResult.scores?.formatting ?? 80,
          education: analysisResult.scores?.education ?? 85
        },
        missingSkills: analysisResult.missingSkills ?? ["TypeScript", "System Engineering"],
        weakSections: analysisResult.weakSections ?? [],
        grammarIssues: analysisResult.grammarIssues ?? [],
        improvements: analysisResult.improvements ?? [],
        strongWordings: analysisResult.strongWordings ?? [],
        summarySuggestions: analysisResult.summarySuggestions ?? [],
        industryRecommendations: analysisResult.industryRecommendations ?? []
      };

      const db = loadDb();
      db.analyses.push(completeAnalysis);
      saveDb(db);

      res.json(completeAnalysis);
      return;
    } catch (openRouterError: any) {
      console.error("OpenRouter analyze error:", openRouterError);
      res.status(500).json({ error: "OpenRouter provider failed: " + openRouterError.message });
      return;
    }
  }

  const ai = getGeminiClient();

  // If we have no actual API key, we fallback to generating simulated high quality structured data
  // so the application is beautifully client-functional as a prototype even without key activation.
  // BUT we try to call the real Gemini API if the key exists!
  if (!process.env.GEMINI_API_KEY) {
    console.log("No GEMINI_API_KEY set. Generating high-quality realistic fallback analysis reports.");
    
    const randomAts = Math.floor(Math.random() * 25) + 65; // 65 - 90
    const fallbackId = "a-" + Math.random().toString(36).substring(2, 11);
    
    const mockAnalysis: ResumeAnalysis = {
      id: fallbackId,
      userId: user.id,
      filename: filename || "Pasted Core Text",
      parsedText: rawText || "Uploaded document with parsing analysis",
      timestamp: new Date().toISOString(),
      atsScore: randomAts,
      scores: {
        keywords: Math.floor(randomAts * 0.95),
        experience: Math.floor(randomAts * 1.02) > 100 ? 98 : Math.floor(randomAts * 1.02),
        skills: Math.floor(randomAts * 0.9),
        formatting: Math.floor(randomAts * 1.08) > 100 ? 95 : Math.floor(randomAts * 1.08),
        education: 90
      },
      missingSkills: [
        "Kubernetes (K8s)", 
        "Amazon Web Services (AWS)", 
        "Continuous Integration & Continuous Delivery (CI/CD) pipelines", 
        "TypeScript Interfaces", 
        "Jest Unit Testing"
      ],
      weakSections: [
        {
          section: "Work Accomplishments",
          issue: "Accomplishment descriptions focus too heavily on tasks instead of explicit numbers.",
          remedy: "Revise experience bullets. Instead of 'Handled server APIs', say 'Architectured Node.js REST controllers, lowering round-trip API network latency by 14%.'"
        },
        {
          section: "Core Technical Skills Grid",
          issue: "Cluttered arrangement of technologies confusing parsing engine spiders.",
          remedy: "Subdivide technical utilities into 'Languages', 'Libraries & Frameworks', and 'Infrastructure & Cloud'."
        }
      ],
      grammarIssues: [
        {
          original: "Responsible for maintain security setups.",
          correction: "Responsible for maintaining security setups.",
          explanation: "Inconsistent verb gerund structure."
        }
      ],
      improvements: [
        "Reformat and place contact block headers directly under your primary name profile.",
        "Add standard 1-inch margins to enhance layout scanning metrics.",
        "Inject missing DevOps keywords strategically into work statements."
      ],
      strongWordings: [
        {
          original: "Looked after a legacy server suite",
          suggested: "Maintained and modernized high-volume legacy server suites",
          context: "Active engineer position statement"
        }
      ],
      summarySuggestions: [
        "Dynamic, high-efficiency Software Engineer holding track records in architecting scalable Cloud APIs and React interfaces...",
        "Results-focused Solutions Architect dedicated to automating product deployments, eliminating developer operations drag, and maintaining 99.9% uptime arrays..."
      ],
      industryRecommendations: [
        "Insert active GitHub links showing personal open-source libraries or repositories.",
        "Consider consolidating multiple pages into a single dense page if work history spans less than 6 years."
      ]
    };

    const db = loadDb();
    db.analyses.push(mockAnalysis);
    saveDb(db);

    res.json(mockAnalysis);
    return;
  }

  // Real Gemini Call!
  try {
    let contentPart: any;
    if (base64) {
      // PDF or file uploaded
      contentPart = {
        inlineData: {
          mimeType: fileType || "application/pdf",
          data: base64
        }
      };
    } else {
      // Text pasted
      contentPart = {
        text: `Analyze this plain-text resume:\n\n${rawText}`
      };
    }

    const systemPrompt = `You are a high-end, expert ATS scanner, resume reviewer, and professional recruiter.
Analyze the provided resume document (PDF or Text). Your assessment MUST be strictly structural and returned in parsed valid JSON format aligning with our schema.

IMPORTANT: You MUST return ONLY a JSON block, no markdown frames, no text, starting directly with { and ending with }.

The schema of the JSON object is:
{
  "atsScore": number (0-100 rating overall match),
  "scores": {
    "keywords": number (0-100 score),
    "experience": number (0-100 score),
    "skills": number (0-100 score),
    "formatting": number (0-100 score),
    "education": number (0-100 score)
  },
  "missingSkills": string[] (list of typical skills missing for this industry resume type),
  "weakSections": [
    {
      "section": string (section name),
      "issue": string (specific feedback),
      "remedy": string (how to repair)
    }
  ],
  "grammarIssues": [
    {
      "original": string (original sentence),
      "correction": string (revised sentence),
      "explanation": string (why corrected)
    }
  ],
  "improvements": string[] (concrete checklist recommendations on formatting, sections, or wording),
  "strongWordings": [
    {
      "original": string (weak phrase),
      "suggested": string (strong action verb alternative),
      "context": string (where to place)
    }
  ],
  "summarySuggestions": string[] (2 or 3 high-impact professional summary ideas based on their experience),
  "industryRecommendations": string[] (career tips specifically tailored to their professional bracket)
}`;

    const promptMessage = `Identify, analyze and evaluate the resume thoroughly. Grade all scores accurately based on actual structural recruiter protocols:`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [contentPart, { text: promptMessage }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      }
    });

    const textOutput = response.text || "{}";
    const cleanedJson = textOutput.substring(textOutput.indexOf("{"), textOutput.lastIndexOf("}") + 1);
    
    let analysisResult: any;
    try {
      analysisResult = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("Gemini JSON parse failed, text output was:", textOutput);
      throw new Error("Unable to parse structured review feedback from AI model response. Try a cleaner document formatting.");
    }

    const analysisId = "a-" + Math.random().toString(36).substring(2, 11);
    const completeAnalysis: ResumeAnalysis = {
      id: analysisId,
      userId: user.id,
      filename: filename || "Uploaded Document",
      parsedText: base64 ? "[Processed document bin stream]" : rawText,
      timestamp: new Date().toISOString(),
      atsScore: analysisResult.atsScore ?? 72,
      scores: {
        keywords: analysisResult.scores?.keywords ?? 70,
        experience: analysisResult.scores?.experience ?? 75,
        skills: analysisResult.scores?.skills ?? 70,
        formatting: analysisResult.scores?.formatting ?? 80,
        education: analysisResult.scores?.education ?? 85
      },
      missingSkills: analysisResult.missingSkills ?? ["TypeScript", "System Engineering"],
      weakSections: analysisResult.weakSections ?? [],
      grammarIssues: analysisResult.grammarIssues ?? [],
      improvements: analysisResult.improvements ?? [],
      strongWordings: analysisResult.strongWordings ?? [],
      summarySuggestions: analysisResult.summarySuggestions ?? [],
      industryRecommendations: analysisResult.industryRecommendations ?? []
    };

    const db = loadDb();
    db.analyses.push(completeAnalysis);
    saveDb(db);

    res.json(completeAnalysis);

  } catch (error: any) {
    console.error("Error running resume AI analyzer:", error);
    res.status(500).json({ error: error.message || "An error occurred during AI analysis. Please verify your file contents and try again." });
  }
});

// ==================== EXTRA PREMIUM SERVICES ====================

// Job Comparison & Match Optimizer
app.post("/api/job-match", requireAuth, async (req, res) => {
  const { resumeId, jobDescription } = req.body;
  if (!resumeId || !jobDescription) {
    res.status(400).json({ error: "Missing resume link metadata or target job description text." });
    return;
  }

  const db = loadDb();
  const resume = db.analyses.find(a => a.id === resumeId);
  if (!resume) {
    res.status(404).json({ error: "Linked resume context was not found. Please re-run main parsing." });
    return;
  }

  const openrouterKey = req.headers["x-openrouter-key"] as string;
  const openrouterModel = req.headers["x-openrouter-model"] as string;

  if (openrouterKey) {
    try {
      const systemPrompt = `You are a specialist recruiter matching a resume against a job description.
Perform a meticulous matching analysis, identifying strengths, gaps and explicit resume recommendations.`;
      
      const userPrompt = `Resume Text Context:
${resume.parsedText || "ATS Scores: " + JSON.stringify(resume.scores)}

Target Job Description:
${jobDescription}

Respond ONLY with a standard JSON structure containing:
{
  "matchScore": number (0-100 score),
  "matchingKeywords": string[],
  "missingKeywords": string[],
  "strengths": string[] (reasons why they match beautifully),
  "gaps": string[] (technologies or competencies missing),
  "recommendations": string[] (explicit resume insertions or changes to align with the post)
}`;

      const matchedData = await callOpenRouter(openrouterKey, openrouterModel, systemPrompt, userPrompt);
      res.json(matchedData);
      return;
    } catch (err: any) {
      console.error("OpenRouter job match error:", err);
      res.status(500).json({ error: "Failed to parse job description comparison on OpenRouter: " + err.message });
      return;
    }
  }

  const ai = getGeminiClient();

  if (!process.env.GEMINI_API_KEY) {
    // Return pristine mock job comparison fallback
    const matchScore = Math.floor(Math.random() * 30) + 55; // 55-85
    res.json({
      matchScore,
      matchingKeywords: ["React", "JavaScript", "RESTful Interfaces", "CSS Solutions"],
      missingKeywords: ["Docker Compose", "Automated Testing", "Performance Performance Optimization (Lighthouse)"],
      strengths: [
        "Strong fundamental frontend application design matching their tech requirements.",
        "Demonstrated history handling critical production UI builds."
      ],
      gaps: [
        "No specified usage of direct serverless container workflows or virtual registries.",
        "Minimal references detailing testing architectures (Jest, Cypress, etc.)."
      ],
      recommendations: [
        "Under your experience bullets, articulate Docker usage: 'Assembled container environments to streamline developer deployments.'",
        "Add a list of quality test tools (e.g., Jest, RTL, Cypress) inside your skills matrix."
      ]
    });
    return;
  }

  try {
    const prompt = `You are a specialist recruiter matching a resume against a job description.
Resume Text Context:
${resume.parsedText || "ATS Scores: " + JSON.stringify(resume.scores)}

Target Job Description:
${jobDescription}

Perform a meticulous matching analysis. Respond ONLY with a standard JSON structure starting with { and ending with } containing:
{
  "matchScore": number (0-100 score),
  "matchingKeywords": string[],
  "missingKeywords": string[],
  "strengths": string[] (reasons why they match beautifully),
  "gaps": string[] (technologies or competencies missing),
  "recommendations": string[] (explicit resume insertions or changes to align with the post)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("Job match error:", err);
    res.status(500).json({ error: "Failed to parse job description comparison: " + err.message });
  }
});

// AI Cover Letter Generator
app.post("/api/cover-letter", requireAuth, async (req, res) => {
  const { resumeId, jobDescription, tone, companyName, jobTitle } = req.body;
  if (!resumeId) {
    res.status(400).json({ error: "Missing link resume document framework." });
    return;
  }

  const db = loadDb();
  const resume = db.analyses.find(a => a.id === resumeId);
  if (!resume) {
    res.status(404).json({ error: "Linked resume context was not found." });
    return;
  }

  const openrouterKey = req.headers["x-openrouter-key"] as string;
  const openrouterModel = req.headers["x-openrouter-model"] as string;

  if (openrouterKey) {
    try {
      const systemPrompt = `You are an expert career agent. Write a compelling, high-converting, professional, and personalized Cover Letter. Return a JSON only with the schema outline.`;
      const userPrompt = `Details:
- Target Company: ${companyName || "Desired Employer"}
- Target Job Title: ${jobTitle || "Desired Position"}
- Desired Output Writing Tone: ${tone || "confident, engaging"}
- Optional Job Description details limits: ${jobDescription || "Standard career standards."}

Applicant Resume Context:
${resume.parsedText || "Scores: " + JSON.stringify(resume.scores)}

Respond ONLY with a standard JSON format:
{
  "coverLetter": "Letter body text with nested carriage returns..."
}`;

      const letterData = await callOpenRouter(openrouterKey, openrouterModel, systemPrompt, userPrompt);
      res.json(letterData);
      return;
    } catch (err: any) {
      console.error("OpenRouter cover letter error:", err);
      res.status(500).json({ error: "Failed generating cover letter with OpenRouter: " + err.message });
      return;
    }
  }

  const ai = getGeminiClient();

  if (!process.env.GEMINI_API_KEY) {
    // Mock cover letter builder
    const company = companyName || "Target Company";
    const title = jobTitle || "Target Role";
    const coverLetter = `Dear hiring manager at ${company},

I am excited to submit my application for the ${title} opportunity. Having analyzed your core competencies and operational mandates, I am confident that my technical expertise, combined with my problem-solving background, matches your operational vision perfectly.

My resume details a successful track record in implementing reliable architectures, and my latest optimization report scoring indicates extremely strong competencies in technical systems coordination. Through my past contributions, I have built a solid foundation of performance optimization, cross-team collaboration, and delivering software on-time.

I look forward to discussing how my experience can empower the engineering team at ${company}. Thank you for your time and consideration.

Sincerely,
Candidate UI Client`;

    res.json({ coverLetter });
    return;
  }

  try {
    const prompt = `You are an expert career agent. Write a compelling, high-converting, professional, and personalized Cover Letter.
Details:
- Target Company: ${companyName || "Desired Employer"}
- Target Job Title: ${jobTitle || "Desired Position"}
- Desired Output Writing Tone: ${tone || "confident, engaging"}
- Optional Job Description details limits: ${jobDescription || "Standard career standards."}

Applicant Resume Context:
${resume.parsedText || "Scores: " + JSON.stringify(resume.scores)}

Generate a highly polished, engaging, single-page Cover letter. Format beautifully with line breaks. Respond ONLY with a standard JSON format:
{
  "coverLetter": "Letter body text with nested carriage returns..."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("Cover letter error:", err);
    res.status(500).json({ error: "Failed generating cover letter with AI: " + err.message });
  }
});

// Resume Keyword Optimizer
app.post("/api/optimize-keywords", requireAuth, async (req, res) => {
  const { resumeId, targetIndustry } = req.body;
  if (!resumeId) {
    res.status(400).json({ error: "Missing resume workspace context id." });
    return;
  }

  const db = loadDb();
  const resume = db.analyses.find(a => a.id === resumeId);
  if (!resume) {
    res.status(404).json({ error: "Target analysis summary not found." });
    return;
  }

  const openrouterKey = req.headers["x-openrouter-key"] as string;
  const openrouterModel = req.headers["x-openrouter-model"] as string;

  if (openrouterKey) {
    try {
      const systemPrompt = `You are an executive CV writer. Optimize this resume with highly parsed, ATS-friendly keyword matches. Return a JSON structure representing the updates.`;
      const userPrompt = `Target industry: ${targetIndustry || "Technology"}
Context:
${resume.parsedText || "Scores: " + JSON.stringify(resume.scores)}

Respond with JSON ONLY containing:
{
  "optimizedResumeText": string (a comprehensive improved outline of user skills/accomplishments),
  "addedKeywords": string[] (list of industry search keywords infused),
  "explanation": string (brief description of what was adjusted)
}`;

      const optimizedData = await callOpenRouter(openrouterKey, openrouterModel, systemPrompt, userPrompt);
      res.json(optimizedData);
      return;
    } catch (err: any) {
      console.error("OpenRouter optimize keywords error:", err);
      res.status(500).json({ error: "Keyword optimizer engine failed on OpenRouter: " + err.message });
      return;
    }
  }

  const ai = getGeminiClient();

  if (!process.env.GEMINI_API_KEY) {
    res.json({
      optimizedResumeText: "Resume text has been optimized with injected industry keywords (CI/CD, Kubernetes, API Gateways).",
      addedKeywords: ["Continuous Delivery Pipelines", "Microservices", "REST controllers", "Scale architectures"],
      explanation: "Added high-traffic recruiter keywords directly into core role bullets."
    });
    return;
  }

  try {
    const prompt = `You are an executive CV writer. Optimize this resume with highly parsed, ATS-friendly keyword matches for the target industry: ${targetIndustry || "Technology"}.
Context:
${resume.parsedText || "Scores: " + JSON.stringify(resume.scores)}

Provide a refined outline. Respond with JSON ONLY containing:
{
  "optimizedResumeText": string (a comprehensive improved outline of user skills/accomplishments),
  "addedKeywords": string[] (list of industry search keywords infused),
  "explanation": string (brief description of what was adjusted)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("Optimize keywords error:", err);
    res.status(500).json({ error: "Keyword optimizer engine failed: " + err.message });
  }
});

// ==================== DEVELOPMENT / PRODUCTION SERVER BOOT ====================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for undefined front-routes (SPA support)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Resume Analyzer running full-stack at http://localhost:${PORT}`);
  });
}

startServer();
