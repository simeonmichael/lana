/**
 * OpenRouter AI Client
 * Used for RAG queries and course generation
 */

import OpenAI from "openai";

// Initialize OpenAI client with OpenRouter base URL
const getOpenAIClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "Lana Career Platform",
    },
  });
};

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Generate embeddings using OpenRouter's embedding model
 * Uses google/gemini-embedding-001 with 768 dimensions to match Pinecone index
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAIClient();

    const response = await openai.embeddings.create({
      model: "google/gemini-embedding-001",
      input: text,
      dimensions: 768,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    // Fallback to simple hash-based embedding if API fails
    return generateFallbackEmbedding(text, 768);
  }
}

/**
 * Fallback embedding generation when API is unavailable
 */
function generateFallbackEmbedding(text: string, dimensions: number = 768): number[] {
  const embedding = new Array(dimensions).fill(0);
  const words = text.toLowerCase().split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const hash = word.split("").reduce((acc, char, idx) => {
      return acc + char.charCodeAt(0) * (idx + 1);
    }, 0);

    // Distribute word influence across embedding dimensions
    for (let j = 0; j < 8; j++) {
      const idx = (hash + j * 97) % dimensions;
      embedding[idx] += Math.sin(hash * (j + 1) * 0.01) * 0.1;
    }
  }

  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

/**
 * Send a chat completion request to OpenRouter
 */
export async function chatCompletion(
  messages: Message[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const {
    // fallback model
    model = "x-ai/grok-4.1-fast:free",
    temperature = 0.7,
    maxTokens = 4000,
  } = options;

  try {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Chat completion failed:", error);
    throw error;
  }
}

/**
 * RAG: Combine context from Pinecone with AI generation
 */
export async function ragQuery(
  query: string,
  context: string[],
  systemPrompt?: string
): Promise<string> {
  const contextText = context.join("\n\n---\n\n");

  const messages: Message[] = [
    {
      role: "system",
      content:
        systemPrompt ||
        `You are an AI career counselor helping students find their ideal career paths. 
Use the provided context to give personalized, accurate recommendations.
Always be encouraging and specific in your advice.`,
    },
    {
      role: "user",
      content: `Context from career database:\n${contextText}\n\n---\n\nUser query: ${query}`,
    },
  ];

  return chatCompletion(messages);
}

/**
 * Generate course structure for a career path
 */
export async function generateCourseStructure(
  careerPath: string,
  skills: string[],
  userLevel: string = "beginner"
): Promise<{
  title: string;
  slug: string;
  description: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: number;
  skills: string[];
  careerPaths: string[];
  topics: {
    title: string;
    description: string;
    order: number;
    duration: number;
    section: string;
    sectionOrder: number;
    searchQuery: string;
  }[];
}> {
  const prompt = `You are a curriculum designer from MIT/Stanford/Harvard. Create a comprehensive, well-structured professional course for "${careerPath}".

Skills: ${skills.join(", ")}
Level: ${userLevel}

IMPORTANT NAMING RULES:
1. DO NOT include "${careerPath}" in topic titles - it's redundant since the course is already about ${careerPath}
2. Use NATURAL, CONCISE topic titles like a real university course
3. Examples of GOOD titles: "Introduction & Overview", "Core Principles", "Working with Colors", "Building Your First Project"
4. Examples of BAD titles: "${careerPath} Introduction", "${careerPath} Fundamentals", "What is ${careerPath}?"

COURSE STRUCTURE REQUIREMENTS:
- Create 15-25 comprehensive topics that cover the field from absolute beginner to job-ready
- Each topic should be substantial enough for 30-60 minutes of video content
- Topics must be organized in logical, progressive order
- Include foundational concepts, practical skills, and real-world applications
- For technical fields, include: basics → fundamentals → intermediate → advanced → professional
- For creative fields, include: theory → tools → techniques → projects → portfolio
- Include field-specific topics relevant to ${careerPath}

Generate JSON:
{
  "title": "Professional course title for ${careerPath}",
  "slug": "url-slug",
  "description": "3-4 sentence comprehensive course description",
  "level": "BEGINNER",
  "duration": total_hours_number,
  "skills": ["skill1", "skill2"],
  "careerPaths": ["${careerPath}"],
  "topics": [
    {
      "title": "Natural topic title WITHOUT course name",
      "description": "Detailed 2-3 sentence description covering what will be learned, including key subtopics",
      "order": 1,
      "duration": 30-60,
      "section": "Section Name",
      "sectionOrder": 1,
      "searchQuery": "${careerPath} specific search query for YouTube"
    }
  ]
}

ORGANIZE TOPICS INTO THESE SECTIONS:

SECTION 1: "Introduction & Foundations" (Topics 1-5)
- Start with absolute basics: what the field is, why it matters
- Core concepts, terminology, and fundamental understanding
- Tools and environment setup
- Industry overview and career paths

SECTION 2: "Core Fundamentals" (Topics 6-12)
- Essential principles and techniques
- Basic skills and methodologies
- Hands-on practice and first projects
- Building a solid foundation

SECTION 3: "Intermediate Skills" (Topics 13-18)
- More advanced techniques
- Real-world applications
- Problem-solving approaches
- Intermediate projects

SECTION 4: "Advanced & Professional" (Topics 19-23)
- Advanced concepts and techniques
- Industry standards and best practices
- Complex projects and case studies
- Professional workflows

SECTION 5: "Career Launch" (Topics 24-25+)
- Portfolio development
- Interview preparation
- Job search strategies
- Capstone project

For ${careerPath}, ensure topics are:
- Field-specific and relevant
- Progressive in difficulty
- Practical and hands-on
- Industry-aligned
- Comprehensive enough for a complete learning path

Return ONLY valid JSON.`;

  const messages: Message[] = [
    {
      role: "system",
      content:
        "You are an expert curriculum designer. You create well-structured, progressive learning paths. Always respond with valid JSON only.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const response = await chatCompletion(messages, {
    temperature: 0.3,
    maxTokens: 4000, // Increased for comprehensive course structures
  });

  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and ensure required fields
    return {
      title: parsed.title || `${careerPath} Mastery`,
      slug: parsed.slug || careerPath.toLowerCase().replace(/\s+/g, "-"),
      description: parsed.description || `Learn the essential skills for a career in ${careerPath}`,
      level: parsed.level || "BEGINNER",
      duration: parsed.duration || 20,
      skills: parsed.skills || skills,
      careerPaths: parsed.careerPaths || [careerPath],
      topics: (parsed.topics || []).map((t: Record<string, unknown>, idx: number) => ({
        title: cleanTopicTitle(t.title as string, careerPath) || `Topic ${idx + 1}`,
        description: (t.description as string) || "",
        order: (t.order as number) || idx + 1,
        duration: (t.duration as number) || 30,
        section: (t.section as string) || inferSection(idx),
        sectionOrder: (t.sectionOrder as number) || (idx % 6) + 1,
        searchQuery: (t.searchQuery as string) || `${careerPath} ${t.title || "tutorial"}`,
      })),
    };
  } catch (error) {
    console.error("Failed to parse course structure:", error);

    // Return a fallback structure with comprehensive topics
    return createFallbackCourseStructure(careerPath, skills);
  }
}

/**
 * Clean topic title by removing redundant course name references
 */
function cleanTopicTitle(title: string | undefined, careerPath: string): string {
  if (!title) return "";

  // Patterns to remove
  const patterns = [
    new RegExp(`^${careerPath}\\s*[-:]?\\s*`, "i"),
    new RegExp(`\\s*[-:]?\\s*${careerPath}$`, "i"),
    new RegExp(`\\bin\\s+${careerPath}\\b`, "i"),
    new RegExp(`\\bfor\\s+${careerPath}\\b`, "i"),
    new RegExp(`\\bof\\s+${careerPath}\\b`, "i"),
    /^(Introduction to|Intro to)\s+/i,
  ];

  let cleaned = title;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  // Ensure first letter is capitalized
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned || title; // Fallback to original if cleaning removed everything
}

/**
 * Infer section name based on topic order
 */
function inferSection(index: number): string {
  if (index < 5) return "Introduction & Foundations";
  if (index < 12) return "Core Fundamentals";
  if (index < 18) return "Intermediate Skills";
  if (index < 23) return "Advanced & Professional";
  return "Career Launch";
}

/**
 * Create a fallback course structure with natural topic names and sections
 */
function createFallbackCourseStructure(
  careerPath: string,
  skills: string[]
): {
  title: string;
  slug: string;
  description: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: number;
  skills: string[];
  careerPaths: string[];
  topics: {
    title: string;
    description: string;
    order: number;
    duration: number;
    section: string;
    sectionOrder: number;
    searchQuery: string;
  }[];
} {
  // Topics with natural names (no course name repetition) and proper sections
  const topicTemplates = [
    // Section: Introduction & Foundations (1-5)
    {
      title: "Introduction & Overview",
      desc: "Complete overview of the field, its history, and career opportunities.",
      section: "Introduction & Foundations",
      sectionOrder: 1,
    },
    {
      title: "Industry Landscape",
      desc: "Understanding the current industry, major players, and future trends.",
      section: "Introduction & Foundations",
      sectionOrder: 2,
    },
    {
      title: "Essential Terminology",
      desc: "Key terms, concepts, and vocabulary every professional must know.",
      section: "Introduction & Foundations",
      sectionOrder: 3,
    },
    {
      title: "Tools & Environment Setup",
      desc: "Installing and configuring essential tools and software.",
      section: "Introduction & Foundations",
      sectionOrder: 4,
    },
    {
      title: "Career Paths & Opportunities",
      desc: "Exploring different specializations and career trajectories in the field.",
      section: "Introduction & Foundations",
      sectionOrder: 5,
    },

    // Section: Core Fundamentals (6-12)
    {
      title: "Core Principles",
      desc: "Foundational concepts that form the basis of the discipline.",
      section: "Core Fundamentals",
      sectionOrder: 1,
    },
    {
      title: "Basic Techniques",
      desc: "Essential techniques and methodologies for beginners.",
      section: "Core Fundamentals",
      sectionOrder: 2,
    },
    {
      title: "Your First Project",
      desc: "Hands-on project with step-by-step guidance.",
      section: "Core Fundamentals",
      sectionOrder: 3,
    },
    {
      title: "Working with Tools",
      desc: "Deep dive into primary professional tools.",
      section: "Core Fundamentals",
      sectionOrder: 4,
    },
    {
      title: "Standard Workflows",
      desc: "Standard workflows, processes, and best practices.",
      section: "Core Fundamentals",
      sectionOrder: 5,
    },
    {
      title: "Problem-Solving Mindset",
      desc: "Developing effective problem-solving approaches.",
      section: "Core Fundamentals",
      sectionOrder: 6,
    },
    {
      title: "Fundamentals Project",
      desc: "Complete project applying all fundamental skills learned.",
      section: "Core Fundamentals",
      sectionOrder: 7,
    },

    // Section: Intermediate Skills (13-18)
    {
      title: "Intermediate Techniques",
      desc: "Advanced techniques that separate beginners from intermediates.",
      section: "Intermediate Skills",
      sectionOrder: 1,
    },
    {
      title: "Design Patterns",
      desc: "Common patterns and approaches used by experienced professionals.",
      section: "Intermediate Skills",
      sectionOrder: 2,
    },
    {
      title: "Advanced Tools",
      desc: "Mastering advanced features of professional tools.",
      section: "Intermediate Skills",
      sectionOrder: 3,
    },
    {
      title: "Team Collaboration",
      desc: "Working effectively with teams and version control.",
      section: "Intermediate Skills",
      sectionOrder: 4,
    },
    {
      title: "Quality Assurance",
      desc: "Testing, reviewing, and ensuring quality work.",
      section: "Intermediate Skills",
      sectionOrder: 5,
    },
    {
      title: "Performance Optimization",
      desc: "Techniques for improving efficiency and performance.",
      section: "Intermediate Skills",
      sectionOrder: 6,
    },

    // Section: Advanced & Professional (19-23)
    {
      title: "Advanced Concepts",
      desc: "Expert-level techniques used by senior professionals.",
      section: "Advanced & Professional",
      sectionOrder: 1,
    },
    {
      title: "System Architecture",
      desc: "Understanding and designing large-scale solutions.",
      section: "Advanced & Professional",
      sectionOrder: 2,
    },
    {
      title: "Industry Standards",
      desc: "Understanding and applying industry standards.",
      section: "Advanced & Professional",
      sectionOrder: 3,
    },
    {
      title: "Leadership Skills",
      desc: "Leading teams and projects effectively.",
      section: "Advanced & Professional",
      sectionOrder: 4,
    },
    {
      title: "Real-World Projects",
      desc: "Complex projects with real-world scenarios.",
      section: "Advanced & Professional",
      sectionOrder: 5,
    },

    // Section: Career Launch (24-25+)
    {
      title: "Portfolio Development",
      desc: "Creating a professional portfolio that showcases your best work.",
      section: "Career Launch",
      sectionOrder: 1,
    },
    {
      title: "Interview Preparation",
      desc: "Preparing for technical interviews and assessments.",
      section: "Career Launch",
      sectionOrder: 2,
    },
    {
      title: "Capstone Project",
      desc: "Your final comprehensive project demonstrating professional skills.",
      section: "Career Launch",
      sectionOrder: 3,
    },
    {
      title: "Career Launch Plan",
      desc: "Final steps: job search, applications, and negotiation.",
      section: "Career Launch",
      sectionOrder: 4,
    },
  ];

  // Create final topics list with searchQuery including the career path
  const allTopics = topicTemplates.map((template, idx) => ({
    title: template.title,
    description: template.desc,
    order: idx + 1,
    duration: 35 + Math.floor(Math.random() * 25),
    section: template.section,
    sectionOrder: template.sectionOrder,
    searchQuery: `${careerPath} ${template.title.toLowerCase()} tutorial`,
  }));

  return {
    title: `${careerPath} Mastery Program`,
    slug: careerPath
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, ""),
    description: `A comprehensive curriculum designed to take you from beginner to industry-ready professional. This course covers ${allTopics.length} in-depth topics and prepares you for real-world career success.`,
    level: "BEGINNER",
    duration: Math.ceil(allTopics.reduce((sum, t) => sum + t.duration, 0) / 60),
    skills,
    careerPaths: [careerPath],
    topics: allTopics,
  };
}

/**
 * Analyze career match using RAG
 */
export async function analyzeCareerMatch(
  userProfile: {
    interests: string[];
    strengths: string[];
    learningStyle: string | null;
    goals?: string[];
  },
  careerData: {
    field: string;
    skills: string[];
  }[]
): Promise<{
  topCareers: {
    title: string;
    matchScore: number;
    reasoning: string;
    keySkills: string[];
  }[];
}> {
  const profileSummary = `
User Profile:
- Interests: ${userProfile.interests.join(", ")}
- Strengths: ${userProfile.strengths.join(", ")}
- Learning Style: ${userProfile.learningStyle || "Not specified"}
- Goals: ${userProfile.goals?.join(", ") || "Not specified"}
`;

  const careerContext = careerData
    .map((c) => `Career: ${c.field}\nRequired Skills: ${c.skills.join(", ")}`)
    .join("\n\n");

  const prompt = `Based on the user profile and available career paths, analyze which careers are the best match.

${profileSummary}

Available Careers:
${careerContext}

Provide a JSON response with the top 5 career matches:
{
  "topCareers": [
    {
      "title": "Career title",
      "matchScore": 0-100,
      "reasoning": "Brief explanation of why this is a good match",
      "keySkills": ["skill1", "skill2", "skill3"]
    }
  ]
}

Consider:
1. How well user interests align with career requirements
2. How user strengths match needed skills
3. Learning style compatibility
4. Career growth potential

Return ONLY valid JSON.`;

  const response = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are an expert career counselor. Analyze career matches objectively and provide actionable insights. Always respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      temperature: 0.3,
      maxTokens: 1500,
    }
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found");
    }
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Failed to parse career analysis");
    return {
      topCareers: careerData.slice(0, 5).map((c, idx) => ({
        title: c.field,
        matchScore: 90 - idx * 10,
        reasoning: `This career aligns with your interests and skills.`,
        keySkills: c.skills.slice(0, 3),
      })),
    };
  }
}
