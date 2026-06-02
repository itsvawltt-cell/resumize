import fs from 'fs';
import path from 'path';
import { User, ResumeAnalysis } from '../src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface DatabaseSchema {
  users: User[];
  passwords: { [userId: string]: string }; // Simple hash mockup
  analyses: ResumeAnalysis[];
}

function initializeDatabase(): DatabaseSchema {
  const adminId = 'u-admin-1';
  const userId = 'u-user-default';

  const defaultDb: DatabaseSchema = {
    users: [
      {
        id: adminId,
        email: 'itsvawltt@gmail.com',
        fullName: 'Admin User',
        role: 'admin',
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: userId,
        email: 'user@example.com',
        fullName: 'John Doe',
        role: 'user',
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      }
    ],
    passwords: {
      [adminId]: 'admin123',
      [userId]: 'password123'
    },
    analyses: [
      {
        id: 'a-1',
        userId: adminId,
        filename: 'John_Doe_Software_Engineer_v1.pdf',
        parsedText: 'John Doe Software Engineer resume with missing skills and outdated headers.',
        timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        atsScore: 62,
        scores: {
          keywords: 55,
          experience: 70,
          skills: 50,
          formatting: 80,
          education: 90
        },
        missingSkills: ['Kubernetes', 'TypeScript', 'GraphQL', 'CI/CD'],
        weakSections: [
          {
            section: 'Professional Summary',
            issue: 'Too generic and lacks action verbs.',
            remedy: 'Use metrics-focused verbs. E.g., Replace "Responsible for web apps" with "Engineered distributed modern cloud services powering 1.2M monthly users".'
          },
          {
            section: 'Experience',
            issue: 'Impact metrics are missing.',
            remedy: 'Add percentages and revenue metrics to professional achievements.'
          }
        ],
        grammarIssues: [
          {
            original: 'Responsibile for maintaining systems.',
            correction: 'Responsible for maintaining systems.',
            explanation: 'Typo in word "Responsible".'
          }
        ],
        improvements: [
          'Incorporate ATS-friendly section headers.',
          'Inject missing keywords related to modern DevOps pipelines.',
          'Quantify team leadership experiences with dollar amounts or headcount percentages.'
        ],
        strongWordings: [
          {
            original: 'Helped build a React webpage.',
            suggested: 'Spearheaded development of a high-performance React application.',
            context: 'First bullet under Web Developer role.'
          }
        ],
        summarySuggestions: [
          'Accomplished Full-Stack Engineer with 5+ years of experience spearheading distributed cloud applications...',
          'Metrics-driven Developer specialized in React, TypeScript, and high-performance server APIs...'
        ],
        industryRecommendations: [
          'Add a dedicated Certifications section.',
          'Re-order skills section to the top, above experience, for technical screens.'
        ]
      },
      {
        id: 'a-2',
        userId: adminId,
        filename: 'John_Doe_Software_Engineer_v2.pdf',
        parsedText: 'John Doe Software Engineer resume v2 with added skills and better metrics.',
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        atsScore: 78,
        scores: {
          keywords: 75,
          experience: 80,
          skills: 75,
          formatting: 85,
          education: 90
        },
        missingSkills: ['Kubernetes', 'CI/CD'],
        weakSections: [
          {
            section: 'Skills Grid',
            issue: 'Skills are crowded together with no visual groupings.',
            remedy: 'Categorize skills into groups (Languages, Frameworks, Cloud Utilities) for better ATS scanning.'
          }
        ],
        grammarIssues: [],
        improvements: [
          'Structure skill definitions by proficiency or technology category.',
          'Reference cloud DevOps tools specifically.'
        ],
        strongWordings: [
          {
            original: 'Managed a team of juniors.',
            suggested: 'Mentored and guided four junior developers, increasing velocity by 22%.',
            context: 'Lead role experience field.'
          }
        ],
        summarySuggestions: [
          'Senior Solutions Architect and TypeScript Engineer boasting an 82% average delivery velocity improvement across distributed scrum networks...'
        ],
        industryRecommendations: [
          'Prioritize database configurations first when describing backend experience.'
        ]
      },
      {
        id: 'a-3',
        userId: adminId,
        filename: 'John_Doe_Software_Engineer_Final_ATS.pdf',
        parsedText: 'John Doe Software Engineer resume Final with perfect keywords and clear headers.',
        timestamp: new Date(Date.now() - 1 * 6 * 3600 * 1000).toISOString(), // 6 hours ago
        atsScore: 89,
        scores: {
          keywords: 88,
          experience: 90,
          skills: 85,
          formatting: 95,
          education: 90
        },
        missingSkills: ['CI/CD'],
        weakSections: [],
        grammarIssues: [],
        improvements: [
          'Add a personal branding link to GitHub/Portfolio in the header to maximize CTR.'
        ],
        strongWordings: [],
        summarySuggestions: [],
        industryRecommendations: []
      }
    ]
  };

  // If DB file does not exist, write the default db setup
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to create db.json:', error);
  }

  return defaultDb;
}

export function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    return initializeDatabase();
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (e) {
    console.warn('Malformed db.json, rebuilding default data storage...');
    return initializeDatabase();
  }
}

export function saveDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write back data into db.json:', error);
  }
}
