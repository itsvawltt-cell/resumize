export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  createdAt: string;
  token?: string;
}

export interface ScoreBreakdown {
  keywords: number;
  experience: number;
  skills: number;
  formatting: number;
  education: number;
}

export interface GrammarIssue {
  original: string;
  correction: string;
  explanation: string;
}

export interface WordingSuggestion {
  original: string;
  suggested: string;
  context: string;
}

export interface ResumeAnalysis {
  id: string;
  userId: string;
  filename: string;
  parsedText: string;
  timestamp: string;
  atsScore: number;
  scores: ScoreBreakdown;
  missingSkills: string[];
  weakSections: {
    section: string;
    issue: string;
    remedy: string;
  }[];
  grammarIssues: GrammarIssue[];
  improvements: string[];
  strongWordings: WordingSuggestion[];
  summarySuggestions: string[];
  industryRecommendations: string[];
}

export interface JobMatchResult {
  matchScore: number; // 0-100
  matchingKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  gaps: string[];
  recommendations: string[];
}

export interface CoverLetterResult {
  coverLetter: string;
}

export interface KeywordOptimizationResult {
  optimizedResumeText: string;
  addedKeywords: string[];
  explanation: string;
}

export interface DashboardStats {
  totalAnalyses: number;
  lastScore: number;
  scoreTrend: { date: string; score: number }[];
  checklist: { id: string; text: string; done: boolean }[];
}

export interface SystemStats {
  totalUsers: number;
  totalAnalyses: number;
  averageScore: number;
  analysesByType: { [key: string]: number };
}
