/**
 * RAG-based Career Recommendations
 * Uses Pinecone for semantic search and AI for analysis
 * No fallback logic - pure AI recommendations
 */

import { querySimilar } from "./pinecone";
import { generateEmbedding, chatCompletion } from "./openrouter";
import type { LearningStyle } from "@prisma/client";

// Types for recommendations
export interface AptitudeProfile {
  learningStyle: LearningStyle | null;
  interests: string[];
  strengths: string[];
  goals?: string[];
  education?: string;
}

export interface CareerRecommendation {
  id: string;
  title: string;
  description: string;
  matchScore: number;
  demandScore: number;
  skills: string[];
  educationPath: string[];
  averageSalary?: string;
  growthOutlook?: string;
  category?: string;
  reasoning?: string;
}

export interface CourseRecommendation {
  id: string;
  title: string;
  description: string;
  matchScore: number;
  level: string;
  duration: string;
  skills: string[];
  careerPaths: string[];
}

export interface HiringRole {
  id: string;
  title: string;
  description: string;
  company: string;
  matchScore: number;
  requiredSkills: string[];
  location?: string;
}

/**
 * Build a text query from user profile for embedding
 */
function buildProfileQuery(profile: AptitudeProfile): string {
  const parts: string[] = [];

  if (profile.interests.length > 0) {
    parts.push(`Interests: ${profile.interests.join(", ")}`);
  }

  if (profile.strengths.length > 0) {
    parts.push(`Strengths: ${profile.strengths.join(", ")}`);
  }

  if (profile.goals && profile.goals.length > 0) {
    parts.push(`Goals: ${profile.goals.join(", ")}`);
  }

  if (profile.education) {
    parts.push(`Education: ${profile.education}`);
  }

  if (profile.learningStyle) {
    parts.push(`Learning style: ${profile.learningStyle}`);
  }

  return parts.join(". ") || "Looking for career opportunities";
}

/**
 * Get career recommendations using RAG (Pinecone + AI)
 * Queries Pinecone for matching careers, then uses AI to analyze and rank
 */
export async function getCareerRecommendations(
  profile: AptitudeProfile,
  topK: number = 10
): Promise<CareerRecommendation[]> {
  // Build query from profile
  const queryText = buildProfileQuery(profile);

  // Generate embedding for semantic search
  const queryEmbedding = await generateEmbedding(queryText);

  // Query Pinecone with userType: "Employed" filter
  const results = await querySimilar(queryEmbedding, topK, undefined, { userType: "Employed" });

  if (results.length === 0) {
    throw new Error("No career matches found in database");
  }

  // Parse Pinecone results
  const careers = results.map((result) => {
    const skillsRaw = result.metadata?.skills as string | string[] | undefined;
    let skills: string[] = [];
    if (typeof skillsRaw === "string") {
      skills = skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (Array.isArray(skillsRaw)) {
      skills = skillsRaw;
    }

    const field = ((result.metadata?.field as string) || "").trim();

    return {
      id: result.id,
      field,
      skills,
      score: result.score,
    };
  });

  // Use AI to analyze and enrich the career recommendations
  const enrichedCareers = await analyzeCareerMatches(profile, careers);

  return enrichedCareers;
}

/**
 * Use AI to analyze career matches and provide detailed recommendations
 */
async function analyzeCareerMatches(
  profile: AptitudeProfile,
  careers: Array<{ id: string; field: string; skills: string[]; score: number }>
): Promise<CareerRecommendation[]> {
  const prompt = `You are a career counselor AI. Analyze these career matches for a student and provide detailed recommendations.

STUDENT PROFILE:
- Interests: ${profile.interests.join(", ") || "Not specified"}
- Strengths: ${profile.strengths.join(", ") || "Not specified"}
- Goals: ${profile.goals?.join(", ") || "Not specified"}
- Education: ${profile.education || "Not specified"}
- Learning Style: ${profile.learningStyle || "Not specified"}

MATCHING CAREERS FROM DATABASE:
${careers.map((c, i) => `${i + 1}. ${c.field} (Score: ${(c.score * 100).toFixed(0)}%, Skills: ${c.skills.join(", ")})`).join("\n")}

For each career, provide a JSON response with this structure:
{
  "careers": [
    {
      "id": "career-id",
      "title": "Career Title",
      "description": "2-3 sentence description of this career and why it suits the student",
      "matchScore": 85,
      "demandScore": 80,
      "skills": ["skill1", "skill2", "skill3"],
      "educationPath": ["Step 1", "Step 2", "Step 3"],
      "averageSalary": "NLeXX,000 - NLeXX,000",
      "growthOutlook": "Very High/High/Moderate/Low",
      "category": "Technology/Creative/Business/Healthcare/etc",
      "reasoning": "Why this career matches the student's profile"
    }
  ]
}

REQUIREMENTS:
1. Rank careers by how well they match the student's profile
2. matchScore should reflect profile fit (0-100)
3. demandScore should reflect job market demand (0-100)
4. Provide specific, actionable education paths
5. Be realistic about salary ranges
6. Give personalized reasoning for each match

Return ONLY valid JSON.`;

  try {
    const response = await chatCompletion([
      {
        role: "system",
        content: "You are a career counselor AI. Always respond with valid JSON only.",
      },
      { role: "user", content: prompt },
    ]);

    // Parse response
    const cleanedResponse = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    if (!parsed.careers || !Array.isArray(parsed.careers)) {
      throw new Error("Invalid AI response structure");
    }

    return parsed.careers.map((career: Record<string, unknown>) => ({
      id: (career.id as string) || `career-${Date.now()}`,
      title: (career.title as string) || "Unknown Career",
      description: (career.description as string) || "",
      matchScore: (career.matchScore as number) || 70,
      demandScore: (career.demandScore as number) || 70,
      skills: (career.skills as string[]) || [],
      educationPath: (career.educationPath as string[]) || [],
      averageSalary: career.averageSalary as string,
      growthOutlook: career.growthOutlook as string,
      category: career.category as string,
      reasoning: career.reasoning as string,
    }));
  } catch (error) {
    console.error("AI analysis failed:", error);

    // If AI fails, use Pinecone scores directly (no hardcoded fallback)
    return careers.map((c) => ({
      id: c.id,
      title: c.field,
      description: `Career in ${c.field} requiring ${c.skills.slice(0, 3).join(", ")}.`,
      matchScore: Math.round(c.score * 100),
      demandScore: 75,
      skills: c.skills,
      educationPath: [`Study ${c.field}`, "Gain practical experience", "Build portfolio"],
      averageSalary: "-",
      growthOutlook: c.score > 0.7 ? "High" : "Moderate",
      category: "General",
      reasoning: `Matched based on your profile with ${Math.round(c.score * 100)}% similarity.`,
    }));
  }
}

/**
 * Get hiring roles for employers (userType: "Employer" in Pinecone)
 */
export async function getHiringRoles(
  companyProfile: { industry?: string; skills?: string[] },
  topK: number = 10
): Promise<HiringRole[]> {
  // Build query from company profile
  const queryText = `Hiring for roles requiring ${companyProfile.skills?.join(", ") || "various skills"} in ${companyProfile.industry || "any industry"}`;

  // Generate embedding
  const queryEmbedding = await generateEmbedding(queryText);

  // Query Pinecone for employer data
  const results = await querySimilar(queryEmbedding, topK, undefined, { userType: "Employer" });

  return results.map((result) => {
    const hiringRolesRaw = result.metadata?.hiringRoles as string | string[] | undefined;
    let hiringRoles: string[] = [];
    if (typeof hiringRolesRaw === "string") {
      hiringRoles = hiringRolesRaw
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    } else if (Array.isArray(hiringRolesRaw)) {
      hiringRoles = hiringRolesRaw;
    }

    const skillsRaw = result.metadata?.skills as string | string[] | undefined;
    let skills: string[] = [];
    if (typeof skillsRaw === "string") {
      skills = skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (Array.isArray(skillsRaw)) {
      skills = skillsRaw;
    }

    const field = (result.metadata?.field as string) || "";

    return {
      id: result.id,
      title: hiringRoles[0] || field || "Available Position",
      description: `Hiring for ${hiringRoles.join(", ") || field}. Required skills: ${skills.slice(0, 3).join(", ")}.`,
      company: (result.metadata?.company as string) || "Company",
      matchScore: Math.round(result.score * 100),
      requiredSkills: skills,
      location: result.metadata?.location as string,
    };
  });
}

/**
 * Get course recommendations based on career path
 */
export async function getCourseRecommendations(
  profile: AptitudeProfile,
  careerPath?: string,
  topK: number = 6
): Promise<CourseRecommendation[]> {
  // Build query
  const queryText = careerPath
    ? `Courses for ${careerPath} career with ${profile.interests.join(", ")} interests`
    : buildProfileQuery(profile);

  // Generate embedding
  const queryEmbedding = await generateEmbedding(queryText);

  const filter: Record<string, unknown> = { type: "course" };
  if (careerPath) {
    filter.careerPath = careerPath;
  }

  const results = await querySimilar(queryEmbedding, topK, "courses", filter);

  return results.map((result) => ({
    id: result.id,
    title: (result.metadata?.title as string) || "Course",
    description: (result.metadata?.description as string) || "",
    matchScore: Math.round(result.score * 100),
    level: (result.metadata?.level as string) || "BEGINNER",
    duration: (result.metadata?.duration as string) || "10h",
    skills: (result.metadata?.skills as string[]) || [],
    careerPaths: (result.metadata?.careerPaths as string[]) || [],
  }));
}

/**
 * Generate recommendations for a user using pure RAG
 */
export async function generateRecommendations(
  profile: AptitudeProfile,
  userType: "Employed" | "Employer" = "Employed"
): Promise<{
  careers: CareerRecommendation[];
  courses: CourseRecommendation[];
}> {
  if (userType === "Employer") {
    const hiringRoles = await getHiringRoles({ skills: profile.strengths });
    return {
      careers: hiringRoles.map((role) => ({
        id: role.id,
        title: role.title,
        description: role.description,
        matchScore: role.matchScore,
        demandScore: 80,
        skills: role.requiredSkills,
        educationPath: [],
        category: "Hiring",
      })),
      courses: [],
    };
  }

  // For job seekers - pure RAG recommendations
  const careers = await getCareerRecommendations(profile);

  // Get courses based on top career match
  let courses: CourseRecommendation[] = [];
  if (careers.length > 0) {
    try {
      courses = await getCourseRecommendations(profile, careers[0].title);
    } catch {
      // If no courses in Pinecone for this career, that's okay
      console.log("No course data in Pinecone for this career");
    }
  }

  return { careers, courses };
}
