/**
 * Career data used across the platform (careers page, search, etc.)
 * In production, this could be replaced with data from RAG/Pinecone
 */

export interface Career {
  id: string;
  title: string;
  description: string;
  demandScore: number;
  averageSalary: string;
  growthOutlook: string;
  skills: string[];
  educationPath: string[];
  category: string;
}

export const SAMPLE_CAREERS: Career[] = [
  {
    id: "1",
    title: "Software Developer",
    description: "Design, develop, and maintain software applications and systems.",
    demandScore: 95,
    averageSalary: "$60,000 - $120,000",
    growthOutlook: "Very High",
    skills: ["Programming", "Problem Solving", "Team Collaboration", "Version Control"],
    educationPath: ["Computer Science Degree", "Coding Bootcamp", "Online Certifications"],
    category: "Technology",
  },
  {
    id: "2",
    title: "Data Analyst",
    description: "Analyze data to help organizations make informed business decisions.",
    demandScore: 88,
    averageSalary: "$50,000 - $90,000",
    growthOutlook: "High",
    skills: ["Data Analysis", "SQL", "Excel", "Data Visualization", "Statistics"],
    educationPath: ["Statistics/Math Degree", "Data Science Bootcamp", "Business Analytics"],
    category: "Technology",
  },
  {
    id: "3",
    title: "Digital Marketer",
    description: "Create and manage marketing campaigns across digital platforms.",
    demandScore: 82,
    averageSalary: "$40,000 - $80,000",
    growthOutlook: "High",
    skills: ["Social Media", "Content Creation", "SEO", "Analytics", "Copywriting"],
    educationPath: ["Marketing Degree", "Digital Marketing Certification", "Practical Experience"],
    category: "Marketing",
  },
  {
    id: "4",
    title: "Healthcare Administrator",
    description: "Manage operations and business affairs of healthcare facilities.",
    demandScore: 78,
    averageSalary: "$55,000 - $100,000",
    growthOutlook: "Moderate",
    skills: ["Management", "Healthcare Knowledge", "Communication", "Budgeting"],
    educationPath: [
      "Healthcare Administration Degree",
      "Business Administration",
      "Certifications",
    ],
    category: "Healthcare",
  },
  {
    id: "5",
    title: "Graphic Designer",
    description: "Create visual concepts to communicate ideas that inspire and inform.",
    demandScore: 75,
    averageSalary: "$35,000 - $70,000",
    growthOutlook: "Moderate",
    skills: ["Design Software", "Creativity", "Typography", "Color Theory", "Communication"],
    educationPath: ["Graphic Design Degree", "Art School", "Online Courses"],
    category: "Creative",
  },
  {
    id: "6",
    title: "Financial Analyst",
    description: "Guide businesses and individuals in decisions about spending money.",
    demandScore: 85,
    averageSalary: "$55,000 - $100,000",
    growthOutlook: "High",
    skills: ["Financial Modeling", "Excel", "Analysis", "Communication", "Attention to Detail"],
    educationPath: ["Finance/Accounting Degree", "CFA Certification", "MBA"],
    category: "Finance",
  },
];
