"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Dialog,
  ConfirmDialog,
  useErrorToast,
  useSuccessToast,
} from "@/components/ui";
import {
  Plus,
  Save,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit2,
  X,
  Loader2,
  ArrowLeft,
  Video,
  FileText,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface Topic {
  id: string;
  title: string;
  description: string | null;
  order: number;
  section: string | null;
  sectionOrder: number | null;
  duration: number;
  videoUrl: string | null;
  pdfUrl: string | null;
  textContent: string | null;
  interactiveUrl: string | null;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: string;
  duration: number;
  skills: string[];
  careerPaths: string[];
  isPublished: boolean;
  topics: Topic[];
}

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = React.useState<Course | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());
  const [editingTopic, setEditingTopic] = React.useState<string | null>(null);
  const [newSectionName, setNewSectionName] = React.useState("");
  const [editingCourse, setEditingCourse] = React.useState(false);
  const [showAddTopicDialog, setShowAddTopicDialog] = React.useState(false);
  const [showDeleteTopicDialog, setShowDeleteTopicDialog] = React.useState<string | null>(null);
  const [topicToDelete, setTopicToDelete] = React.useState<string | null>(null);
  const [newTopicData, setNewTopicData] = React.useState({ section: "", title: "" });
  const [isAddingTopic, setIsAddingTopic] = React.useState(false);
  const [updatingTopicId, setUpdatingTopicId] = React.useState<string | null>(null);
  const errorToast = useErrorToast();
  const successToast = useSuccessToast();
  const [showAIGenerateDialog, setShowAIGenerateDialog] = React.useState(false);
  const [isGeneratingTopics, setIsGeneratingTopics] = React.useState(false);
  const [generatedTopics, setGeneratedTopics] = React.useState<
    Array<{
      title: string;
      description: string;
      section: string;
      sectionOrder: number;
      order: number;
      duration: number;
    }>
  >([]);
  const [numTopicsToGenerate, setNumTopicsToGenerate] = React.useState(20);
  const [isSavingGeneratedTopics, setIsSavingGeneratedTopics] = React.useState(false);
  const [courseFormData, setCourseFormData] = React.useState({
    title: "",
    description: "",
    level: "BEGINNER" as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
    skills: [] as string[],
    careerPaths: [] as string[],
  });
  const [newSkill, setNewSkill] = React.useState("");
  const [newCareerPath, setNewCareerPath] = React.useState("");

  // Load course data
  React.useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
        // Initialize form data
        setCourseFormData({
          title: data.course.title,
          description: data.course.description,
          level: data.course.level,
          skills: data.course.skills || [],
          careerPaths: data.course.careerPaths || [],
        });
        // Expand all sections by default
        const sections = new Set<string>(
          data.course.topics
            .map((t: Topic) => t.section)
            .filter((s: string | null): s is string => s !== null)
        );
        setExpandedSections(sections);
      }
    } catch (error) {
      console.error("Error loading course:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group topics by section and order sections by creation order (minimum order value in section)
  const groupedTopics = React.useMemo(() => {
    if (!course) return new Map<string, Topic[]>();

    const groups = new Map<string, Topic[]>();
    course.topics.forEach((topic) => {
      const section = topic.section || "Uncategorized";
      if (!groups.has(section)) {
        groups.set(section, []);
      }
      groups.get(section)!.push(topic);
    });

    // Sort topics within each section
    groups.forEach((topics) => {
      topics.sort((a, b) => (a.sectionOrder || a.order) - (b.sectionOrder || b.order));
    });

    // Sort sections by the minimum order value of topics in each section (creation order)
    const sortedGroups = new Map<string, Topic[]>();
    const sectionEntries = Array.from(groups.entries()).sort(
      ([sectionA, topicsA], [sectionB, topicsB]) => {
        const minOrderA = Math.min(...topicsA.map((t) => t.order));
        const minOrderB = Math.min(...topicsB.map((t) => t.order));
        return minOrderA - minOrderB;
      }
    );

    sectionEntries.forEach(([section, topics]) => {
      sortedGroups.set(section, topics);
    });

    return sortedGroups;
  }, [course]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Add new section
  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    // Sections are implicit - just add a topic with this section name
    handleAddTopic(newSectionName.trim());
    setNewSectionName("");
  };

  // Add new topic
  const handleAddTopic = async (sectionName?: string) => {
    if (!course) return;

    if (sectionName) {
      // Direct add to section
      setNewTopicData({ section: sectionName, title: "" });
      setShowAddTopicDialog(true);
    } else {
      // Show dialog to choose section
      setNewTopicData({ section: "", title: "" });
      setShowAddTopicDialog(true);
    }
  };

  const handleConfirmAddTopic = async () => {
    if (!course || !newTopicData.title.trim()) {
      errorToast("Validation Error", "Topic title is required");
      return;
    }

    setIsAddingTopic(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTopicData.title.trim(),
          section: newTopicData.section.trim() || null,
          duration: 30,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Update state directly instead of reloading
        const newTopic: Topic = {
          id: data.topic.id,
          title: data.topic.title,
          description: data.topic.description,
          order: data.topic.order,
          section: data.topic.section,
          sectionOrder: data.topic.sectionOrder,
          duration: data.topic.duration,
          videoUrl: data.topic.videoUrl,
          pdfUrl: data.topic.pdfUrl,
          textContent: data.topic.textContent,
          interactiveUrl: data.topic.interactiveUrl,
        };

        setCourse((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            topics: [...prev.topics, newTopic].sort((a, b) => {
              if (a.section !== b.section) {
                const aSection = a.section || "Uncategorized";
                const bSection = b.section || "Uncategorized";
                if (aSection === bSection) {
                  return (a.sectionOrder || a.order) - (b.sectionOrder || b.order);
                }
                return aSection.localeCompare(bSection);
              }
              return (a.sectionOrder || a.order) - (b.sectionOrder || b.order);
            }),
            duration: data.topic.duration
              ? Math.ceil((prev.duration * 60 + data.topic.duration) / 60)
              : prev.duration,
          };
        });

        if (newTopicData.section.trim()) {
          setExpandedSections((prev) => new Set([...prev, newTopicData.section.trim()]));
        }
        setShowAddTopicDialog(false);
        setNewTopicData({ section: "", title: "" });
        successToast("Topic Added", "Topic has been added successfully");
      } else {
        errorToast("Failed to Add Topic", data.error || data.message || "Unknown error");
      }
    } catch (error) {
      console.error("Error adding topic:", error);
      errorToast("Error", "Failed to add topic. Please try again.");
    } finally {
      setIsAddingTopic(false);
    }
  };

  // Update topic
  const handleUpdateTopic = async (topicId: string, updates: Partial<Topic>) => {
    if (!course) return;

    setUpdatingTopicId(topicId);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/topics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: topicId,
          ...updates,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Update state directly instead of reloading
        setCourse((prev) => {
          if (!prev) return prev;
          // Use the updated topic from the API response if available, otherwise merge updates
          const updatedTopic = data.topic
            ? {
                id: data.topic.id,
                title: data.topic.title,
                description: data.topic.description,
                order: data.topic.order,
                section: data.topic.section,
                sectionOrder: data.topic.sectionOrder,
                duration: data.topic.duration,
                videoUrl: data.topic.videoUrl,
                pdfUrl: data.topic.pdfUrl,
                textContent: data.topic.textContent,
                interactiveUrl: data.topic.interactiveUrl,
              }
            : {
                ...prev.topics.find((t) => t.id === topicId)!,
                ...updates,
                section: updates.section ?? prev.topics.find((t) => t.id === topicId)!.section,
                sectionOrder:
                  updates.sectionOrder ?? prev.topics.find((t) => t.id === topicId)!.sectionOrder,
              };

          return {
            ...prev,
            topics: prev.topics.map((t) => (t.id === topicId ? updatedTopic : t)),
            duration: data.topic
              ? Math.ceil(
                  prev.topics.reduce(
                    (sum, t) =>
                      sum + (t.id === topicId ? data.topic.duration || t.duration : t.duration),
                    0
                  ) / 60
                )
              : prev.duration,
          };
        });
        // Don't close the editor - preserve state
        // setEditingTopic(null); // Removed to preserve accordion state
        successToast("Topic Updated", "Topic has been updated successfully");
      } else {
        const errorMsg = data.message || data.error || "Unknown error";
        errorToast("Failed to Update Topic", errorMsg);
        console.error("Update topic error:", data);
      }
    } catch (error) {
      console.error("Error updating topic:", error);
      errorToast("Error", "Failed to update topic. Please check the console for details.");
    } finally {
      setUpdatingTopicId(null);
    }
  };

  // Delete topic
  const handleDeleteTopic = (topicId: string) => {
    setTopicToDelete(topicId);
    setShowDeleteTopicDialog(topicId);
  };

  const handleConfirmDeleteTopic = async () => {
    if (!course || !topicToDelete) return;

    try {
      const response = await fetch(
        `/api/admin/courses/${courseId}/topics?topicId=${topicToDelete}`,
        { method: "DELETE" }
      );

      const data = await response.json();
      if (data.success) {
        // Update state directly instead of reloading
        const topic = course.topics.find((t) => t.id === topicToDelete);
        setCourse((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            topics: prev.topics.filter((t) => t.id !== topicToDelete),
            duration: topic
              ? Math.ceil(Math.max(0, (prev.duration * 60 - topic.duration) / 60))
              : prev.duration,
          };
        });
        setShowDeleteTopicDialog(null);
        setTopicToDelete(null);
        successToast("Topic Deleted", "Topic has been deleted successfully");
      } else {
        errorToast("Failed to Delete Topic", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error deleting topic:", error);
      errorToast("Error", "Failed to delete topic. Please try again.");
    }
  };

  // Update course metadata
  const handleUpdateCourse = async () => {
    if (!course) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseFormData),
      });

      const data = await response.json();
      if (data.success) {
        // Update state directly instead of reloading
        setCourse((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...courseFormData,
            slug: data.course?.slug || prev.slug,
          };
        });
        setEditingCourse(false);
        successToast("Course Updated", "Course has been updated successfully");
      } else {
        errorToast("Failed to Update Course", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error updating course:", error);
      errorToast("Error", "Failed to update course. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Add skill
  const handleAddSkill = () => {
    if (newSkill.trim() && !courseFormData.skills.includes(newSkill.trim())) {
      setCourseFormData({
        ...courseFormData,
        skills: [...courseFormData.skills, newSkill.trim()],
      });
      setNewSkill("");
    }
  };

  // Remove skill
  const handleRemoveSkill = (skill: string) => {
    setCourseFormData({
      ...courseFormData,
      skills: courseFormData.skills.filter((s) => s !== skill),
    });
  };

  // Add career path
  const handleAddCareerPath = () => {
    if (newCareerPath.trim() && !courseFormData.careerPaths.includes(newCareerPath.trim())) {
      setCourseFormData({
        ...courseFormData,
        careerPaths: [...courseFormData.careerPaths, newCareerPath.trim()],
      });
      setNewCareerPath("");
    }
  };

  // Remove career path
  const handleRemoveCareerPath = (path: string) => {
    setCourseFormData({
      ...courseFormData,
      careerPaths: courseFormData.careerPaths.filter((p) => p !== path),
    });
  };

  // Generate topics with AI
  const handleGenerateTopics = async () => {
    if (!course) return;

    setIsGeneratingTopics(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/generate-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numTopics: numTopicsToGenerate }),
      });

      const data = await response.json();
      if (data.success && data.topics) {
        setGeneratedTopics(data.topics);
        successToast("Topics Generated", `Generated ${data.topics.length} topics successfully`);
      } else {
        errorToast("Generation Failed", data.error || "Failed to generate topics");
      }
    } catch (error) {
      console.error("Error generating topics:", error);
      errorToast("Error", "Failed to generate topics. Please try again.");
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  // Save generated topics to database
  const handleSaveGeneratedTopics = async () => {
    if (!course || generatedTopics.length === 0) return;

    setIsSavingGeneratedTopics(true);
    try {
      // Save topics one by one
      const savedTopics: Topic[] = [];

      for (const topicData of generatedTopics) {
        const response = await fetch(`/api/admin/courses/${courseId}/topics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: topicData.title,
            description: topicData.description,
            section: topicData.section,
            sectionOrder: topicData.sectionOrder,
            duration: topicData.duration,
          }),
        });

        const data = await response.json();
        if (data.success && data.topic) {
          savedTopics.push({
            id: data.topic.id,
            title: data.topic.title,
            description: data.topic.description,
            order: data.topic.order,
            section: data.topic.section,
            sectionOrder: data.topic.sectionOrder,
            duration: data.topic.duration,
            videoUrl: data.topic.videoUrl,
            pdfUrl: data.topic.pdfUrl,
            textContent: data.topic.textContent,
            interactiveUrl: data.topic.interactiveUrl,
          });
        }
      }

      // Update course state with new topics
      setCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          topics: [...prev.topics, ...savedTopics].sort((a, b) => {
            if (a.section !== b.section) {
              const aSection = a.section || "Uncategorized";
              const bSection = b.section || "Uncategorized";
              if (aSection === bSection) {
                return (a.sectionOrder || a.order) - (b.sectionOrder || b.order);
              }
              return aSection.localeCompare(bSection);
            }
            return (a.sectionOrder || a.order) - (b.sectionOrder || b.order);
          }),
        };
      });

      // Expand all sections
      const newSections = new Set<string>(generatedTopics.map((t) => t.section));
      setExpandedSections((prev) => new Set([...prev, ...newSections]));

      setShowAIGenerateDialog(false);
      setGeneratedTopics([]);
      successToast("Topics Saved", `Successfully saved ${savedTopics.length} topics`);
    } catch (error) {
      console.error("Error saving topics:", error);
      errorToast("Error", "Failed to save some topics. Please check and try again.");
    } finally {
      setIsSavingGeneratedTopics(false);
    }
  };

  // Publish/Unpublish course
  const handlePublish = async () => {
    if (!course) return;

    setIsSaving(true);
    try {
      const method = course.isPublished ? "DELETE" : "POST";

      const response = await fetch(`/api/admin/courses/${courseId}/publish`, {
        method,
      });

      const data = await response.json();
      if (data.success) {
        // Update state directly instead of reloading
        setCourse((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            isPublished: !prev.isPublished,
            publishedAt: data.course?.publishedAt ? new Date(data.course.publishedAt) : null,
          };
        });
        successToast(
          course.isPublished ? "Course Unpublished" : "Course Published",
          course.isPublished
            ? "Course has been unpublished"
            : "Course has been published successfully"
        );
      } else {
        errorToast("Failed to Update Course", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error publishing course:", error);
      errorToast("Error", "Failed to update course status. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Course not found</p>
        <Link href="/admin/courses">
          <Button className="mt-4">Back to Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-foreground text-3xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground mt-1">
              {course.careerPaths.join(", ")} • {course.topics.length} topics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePublish}
            disabled={isSaving}
            variant={course.isPublished ? "outline" : "primary"}
            leftIcon={
              course.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />
            }
          >
            {isSaving ? "Saving..." : course.isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Course Information</CardTitle>
            {!editingCourse ? (
              <Button
                onClick={() => setEditingCourse(true)}
                variant="outline"
                size="sm"
                leftIcon={<Edit2 className="h-4 w-4" />}
              >
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateCourse}
                  disabled={isSaving}
                  size="sm"
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={() => {
                    setEditingCourse(false);
                    // Reset form data
                    if (course) {
                      setCourseFormData({
                        title: course.title,
                        description: course.description,
                        level: course.level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
                        skills: course.skills || [],
                        careerPaths: course.careerPaths || [],
                      });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  leftIcon={<X className="h-4 w-4" />}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingCourse ? (
            <>
              <div>
                <label className="text-foreground text-sm font-medium">Title *</label>
                <Input
                  value={courseFormData.title}
                  onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
                  className="mt-1"
                  placeholder="Course title"
                />
              </div>
              <div>
                <label className="text-foreground text-sm font-medium">Description *</label>
                <textarea
                  value={courseFormData.description}
                  onChange={(e) =>
                    setCourseFormData({ ...courseFormData, description: e.target.value })
                  }
                  className="border-border mt-1 w-full resize-none rounded-lg border p-2"
                  rows={4}
                  placeholder="Course description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-foreground text-sm font-medium">Level</label>
                  <select
                    value={courseFormData.level}
                    onChange={(e) =>
                      setCourseFormData({
                        ...courseFormData,
                        level: e.target.value as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
                      })
                    }
                    className="border-border mt-1 w-full rounded-lg border p-2"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="text-foreground text-sm font-medium">Duration</label>
                  <p className="text-muted-foreground mt-1">
                    {course.duration} hours (calculated from topics)
                  </p>
                </div>
              </div>
              <div>
                <label className="text-foreground text-sm font-medium">Skills</label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
                    placeholder="Add skill"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddSkill}
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Add
                  </Button>
                </div>
                {courseFormData.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {courseFormData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-secondary text-secondary-foreground flex items-center gap-1 rounded-full px-2 py-1 text-xs"
                      >
                        {skill}
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-destructive"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-foreground text-sm font-medium">Career Paths</label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={newCareerPath}
                    onChange={(e) => setNewCareerPath(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddCareerPath()}
                    placeholder="Add career path"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddCareerPath}
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Add
                  </Button>
                </div>
                {courseFormData.careerPaths.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {courseFormData.careerPaths.map((path, idx) => (
                      <span
                        key={idx}
                        className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2 py-1 text-xs"
                      >
                        {path}
                        <button
                          onClick={() => handleRemoveCareerPath(path)}
                          className="hover:text-destructive"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-foreground text-sm font-medium">Description</label>
                <p className="text-muted-foreground mt-1">{course.description}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="text-foreground text-sm font-medium">Level</label>
                  <p className="text-muted-foreground mt-1">{course.level}</p>
                </div>
                <div>
                  <label className="text-foreground text-sm font-medium">Duration</label>
                  <p className="text-muted-foreground mt-1">{course.duration} hours</p>
                </div>
              </div>
              {course.skills.length > 0 && (
                <div>
                  <label className="text-foreground text-sm font-medium">Skills</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {course.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {course.careerPaths.length > 0 && (
                <div>
                  <label className="text-foreground text-sm font-medium">Career Paths</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {course.careerPaths.map((path, idx) => (
                      <span
                        key={idx}
                        className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs"
                      >
                        {path}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Sections and Topics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sections & Topics</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAIGenerateDialog(true)}
                size="sm"
                variant="primary"
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                Generate with AI
              </Button>
              <Input
                placeholder="New section name..."
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddSection()}
                className="w-48"
              />
              <Button onClick={handleAddSection} size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Add Section
              </Button>
              <Button
                onClick={() => handleAddTopic()}
                size="sm"
                variant="outline"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Topic
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Array.from(groupedTopics.entries()).map(([section, topics]) => (
            <div key={section} className="mb-4 last:mb-0">
              {/* Section Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSection(section)}
                  className="bg-muted/50 hover:bg-muted flex flex-1 items-center justify-between rounded-lg p-3 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has(section) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                    <h3 className="text-foreground font-semibold">{section}</h3>
                    <span className="text-muted-foreground text-sm">({topics.length} topics)</span>
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddTopic(section)}
                  leftIcon={<Plus className="h-3 w-3" />}
                >
                  Add Topic
                </Button>
              </div>

              {/* Topics in Section */}
              {expandedSections.has(section) && (
                <div className="mt-2 space-y-2 pl-6">
                  {topics.map((topic) => (
                    <TopicEditor
                      key={topic.id}
                      topic={topic}
                      isEditing={editingTopic === topic.id}
                      isUpdating={updatingTopicId === topic.id}
                      onEdit={() => setEditingTopic(topic.id)}
                      onCancel={() => setEditingTopic(null)}
                      onSave={(updates) => handleUpdateTopic(topic.id, updates)}
                      onDelete={() => handleDeleteTopic(topic.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {groupedTopics.size === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No topics yet</p>
              <Button onClick={() => handleAddTopic()} leftIcon={<Plus className="h-4 w-4" />}>
                Add First Topic
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Generate Topics Dialog */}
      <Dialog
        isOpen={showAIGenerateDialog}
        onClose={() => {
          setShowAIGenerateDialog(false);
          setGeneratedTopics([]);
        }}
        title="Generate Topics with AI"
        description="AI will generate comprehensive course topics organized into sections based on top university curriculum standards"
        size="xl"
      >
        <div className="space-y-6">
          {generatedTopics.length === 0 ? (
            <>
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Number of Topics to Generate
                </label>
                <Input
                  type="number"
                  min="15"
                  max="30"
                  value={numTopicsToGenerate}
                  onChange={(e) => setNumTopicsToGenerate(parseInt(e.target.value) || 20)}
                  className="w-full"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Recommended: 20-25 topics for a comprehensive course
                </p>
              </div>
              <Button
                onClick={handleGenerateTopics}
                disabled={isGeneratingTopics}
                className="w-full"
                leftIcon={
                  isGeneratingTopics ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )
                }
              >
                {isGeneratingTopics ? "Generating Topics..." : "Generate Topics"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Review and customize the generated topics before saving. You can edit titles,
                    descriptions, sections, and durations.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGeneratedTopics([]);
                      setNumTopicsToGenerate(20);
                    }}
                  >
                    Generate Again
                  </Button>
                </div>

                {/* Group topics by section */}
                {Array.from(
                  new Map(
                    generatedTopics.map((t) => [
                      t.section,
                      generatedTopics.filter((topic) => topic.section === t.section),
                    ])
                  ).entries()
                )
                  .sort(([a], [b]) => {
                    const order = [
                      "Introduction & Foundations",
                      "Core Fundamentals",
                      "Intermediate Skills",
                      "Advanced & Professional",
                      "Career Launch",
                    ];
                    const aIndex = order.indexOf(a);
                    const bIndex = order.indexOf(b);
                    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                  })
                  .map(([section, topics]) => (
                    <div key={section} className="border-border space-y-3 rounded-lg border p-4">
                      <h3 className="text-foreground text-lg font-semibold">{section}</h3>
                      <div className="space-y-3">
                        {topics
                          .sort((a, b) => a.sectionOrder - b.sectionOrder)
                          .map((topic, topicIdx) => {
                            // Find the global index of this topic in generatedTopics array
                            const globalIndex = generatedTopics.findIndex(
                              (t) =>
                                t.section === topic.section &&
                                t.sectionOrder === topic.sectionOrder &&
                                t.order === topic.order
                            );

                            return (
                              <div
                                key={`${topic.section}-${topic.sectionOrder}-${topic.order}`}
                                className="bg-muted/50 space-y-2 rounded-lg p-4"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      value={topic.title}
                                      onChange={(e) => {
                                        const updated = [...generatedTopics];
                                        if (globalIndex !== -1) {
                                          updated[globalIndex].title = e.target.value;
                                          setGeneratedTopics(updated);
                                        }
                                      }}
                                      className="font-medium"
                                    />
                                    <textarea
                                      value={topic.description}
                                      onChange={(e) => {
                                        const updated = [...generatedTopics];
                                        if (globalIndex !== -1) {
                                          updated[globalIndex].description = e.target.value;
                                          setGeneratedTopics(updated);
                                        }
                                      }}
                                      className="border-border w-full resize-none rounded-lg border p-2 text-sm"
                                      rows={2}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="30"
                                      max="120"
                                      value={topic.duration}
                                      onChange={(e) => {
                                        const updated = [...generatedTopics];
                                        if (globalIndex !== -1) {
                                          updated[globalIndex].duration =
                                            parseInt(e.target.value) || 30;
                                          setGeneratedTopics(updated);
                                        }
                                      }}
                                      className="w-20"
                                    />
                                    <span className="text-muted-foreground text-xs">min</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        if (globalIndex !== -1) {
                                          setGeneratedTopics(
                                            generatedTopics.filter((_, idx) => idx !== globalIndex)
                                          );
                                        }
                                      }}
                                    >
                                      <Trash2 className="text-destructive h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="border-border flex items-center justify-end gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAIGenerateDialog(false);
                    setGeneratedTopics([]);
                  }}
                  disabled={isSavingGeneratedTopics}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveGeneratedTopics}
                  disabled={isSavingGeneratedTopics || generatedTopics.length === 0}
                  leftIcon={
                    isSavingGeneratedTopics ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )
                  }
                >
                  {isSavingGeneratedTopics
                    ? `Saving ${generatedTopics.length} Topics...`
                    : `Save ${generatedTopics.length} Topics`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>

      {/* Add Topic Dialog */}
      <Dialog
        isOpen={showAddTopicDialog}
        onClose={() => {
          setShowAddTopicDialog(false);
          setNewTopicData({ section: "", title: "" });
        }}
        title="Add New Topic"
        description="Create a new topic for this course"
      >
        <div className="space-y-4">
          <div>
            <label className="text-foreground text-sm font-medium">Section Name</label>
            <Input
              value={newTopicData.section}
              onChange={(e) => setNewTopicData({ ...newTopicData, section: e.target.value })}
              className="mt-1"
              placeholder="Leave empty for Uncategorized"
            />
          </div>
          <div>
            <label className="text-foreground text-sm font-medium">Topic Title *</label>
            <Input
              value={newTopicData.title}
              onChange={(e) => setNewTopicData({ ...newTopicData, title: e.target.value })}
              className="mt-1"
              placeholder="Enter topic title"
              required
            />
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddTopicDialog(false);
                setNewTopicData({ section: "", title: "" });
              }}
              disabled={isAddingTopic}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAddTopic}
              disabled={isAddingTopic || !newTopicData.title.trim()}
            >
              {isAddingTopic ? "Adding..." : "Add Topic"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Topic Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteTopicDialog !== null}
        onClose={() => {
          setShowDeleteTopicDialog(null);
          setTopicToDelete(null);
        }}
        onConfirm={handleConfirmDeleteTopic}
        title="Delete Topic"
        description="Are you sure you want to delete this topic? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

// Topic Editor Component
interface TopicEditorProps {
  topic: Topic;
  isEditing: boolean;
  isUpdating?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: Partial<Topic>) => void;
  onDelete: () => void;
}

function TopicEditor({
  topic,
  isEditing,
  isUpdating = false,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: TopicEditorProps) {
  const [formData, setFormData] = React.useState({
    title: topic.title,
    description: topic.description || "",
    section: topic.section || "",
    sectionOrder: topic.sectionOrder || null,
    duration: topic.duration,
    videoUrl: topic.videoUrl || "",
    pdfUrl: topic.pdfUrl || "",
    textContent: topic.textContent || "",
    interactiveUrl: topic.interactiveUrl || "",
  });
  const [isFetchingVideoInfo, setIsFetchingVideoInfo] = React.useState(false);
  const videoUrlTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Update form data when topic changes
  React.useEffect(() => {
    setFormData({
      title: topic.title,
      description: topic.description || "",
      section: topic.section || "",
      sectionOrder: topic.sectionOrder || null,
      duration: topic.duration,
      videoUrl: topic.videoUrl || "",
      pdfUrl: topic.pdfUrl || "",
      textContent: topic.textContent || "",
      interactiveUrl: topic.interactiveUrl || "",
    });
    // Reset previous URL ref when topic changes
    previousVideoUrlRef.current = topic.videoUrl || "";
  }, [
    topic.id,
    topic.title,
    topic.description,
    topic.section,
    topic.sectionOrder,
    topic.duration,
    topic.videoUrl,
    topic.pdfUrl,
    topic.textContent,
    topic.interactiveUrl,
  ]);

  // Track previous video URL to avoid refetching
  const previousVideoUrlRef = React.useRef<string>(topic.videoUrl || "");

  // Fetch YouTube video info when URL is pasted/changed
  const fetchVideoInfo = React.useCallback(async (url: string) => {
    // Check if it's a YouTube URL and different from previous
    const youtubeRegex =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?\s]+)/;
    if (!youtubeRegex.test(url) || url === previousVideoUrlRef.current) {
      return; // Not a YouTube URL or same URL, skip
    }

    // Only fetch if URL looks complete (has video ID)
    const videoIdMatch = url.match(youtubeRegex);
    if (!videoIdMatch || !videoIdMatch[1]) {
      return; // URL not complete yet
    }

    previousVideoUrlRef.current = url;
    setIsFetchingVideoInfo(true);
    try {
      const response = await fetch("/api/youtube/video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: url }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        // Update duration and transcript
        setFormData((prev) => ({
          ...prev,
          duration: data.data.duration || prev.duration,
          textContent: data.data.transcript || prev.textContent, // Only update if transcript available
        }));
      }
    } catch (error) {
      console.error("Error fetching video info:", error);
      // Silently fail - user can still manually enter duration and notes
    } finally {
      setIsFetchingVideoInfo(false);
    }
  }, []); // Empty deps - using refs and setFormData which are stable

  // Handle video URL input change (called from debounced onChange)
  const handleVideoUrlChange = (url: string) => {
    fetchVideoInfo(url);
  };

  // Also handle on blur for immediate fetch when user leaves field
  const handleVideoUrlBlur = (url: string) => {
    // Clear timeout since we're fetching immediately
    if (videoUrlTimeoutRef.current) {
      clearTimeout(videoUrlTimeoutRef.current);
      videoUrlTimeoutRef.current = null;
    }
    fetchVideoInfo(url);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (videoUrlTimeoutRef.current) {
        clearTimeout(videoUrlTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = () => {
    onSave({
      title: formData.title,
      description: formData.description || null,
      section: formData.section || null,
      sectionOrder: formData.sectionOrder || null,
      duration: formData.duration,
      videoUrl: formData.videoUrl || null,
      pdfUrl: formData.pdfUrl || null,
      textContent: formData.textContent || null,
      interactiveUrl: formData.interactiveUrl || null,
    });
  };

  if (isEditing) {
    return (
      <Card className="border-primary border-2">
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="text-foreground text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-foreground text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="border-border mt-1 w-full resize-none rounded-lg border p-2"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-foreground text-sm font-medium">Section</label>
              <Input
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="mt-1"
                placeholder="Section name"
              />
            </div>
            <div>
              <label className="text-foreground text-sm font-medium">Section Order</label>
              <Input
                type="number"
                value={formData.sectionOrder || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sectionOrder: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="mt-1"
                placeholder="Order in section"
              />
            </div>
            <div>
              <label className="text-foreground text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })
                }
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-foreground flex items-center gap-2 text-sm font-medium">
              <Video className="h-4 w-4" />
              Video URL (YouTube or uploaded)
              {isFetchingVideoInfo && <Loader2 className="text-primary h-4 w-4 animate-spin" />}
            </label>
            <Input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => {
                const newUrl = e.target.value;
                setFormData({ ...formData, videoUrl: newUrl });

                // Clear existing timeout
                if (videoUrlTimeoutRef.current) {
                  clearTimeout(videoUrlTimeoutRef.current);
                }

                // Set new timeout to fetch after user stops typing
                videoUrlTimeoutRef.current = setTimeout(() => {
                  handleVideoUrlChange(newUrl);
                }, 1500); // Wait 1.5 seconds after user stops typing
              }}
              onBlur={(e) => handleVideoUrlBlur(e.target.value)}
              className="mt-1"
              placeholder="https://youtube.com/watch?v=... or uploaded video URL"
            />
            {isFetchingVideoInfo && (
              <p className="text-muted-foreground mt-1 text-xs">
                Fetching video duration and transcript...
              </p>
            )}
          </div>
          <div>
            <label className="text-foreground flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              PDF URL
            </label>
            <Input
              type="url"
              value={formData.pdfUrl}
              onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
              className="mt-1"
              placeholder="https://example.com/document.pdf"
            />
          </div>
          <div>
            <label className="text-foreground flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              Notes/Text Content
            </label>
            <textarea
              value={formData.textContent}
              onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
              className="border-border mt-1 w-full resize-none rounded-lg border p-2"
              rows={4}
              placeholder="Additional notes, reading material, etc."
            />
          </div>
          <div>
            <label className="text-foreground flex items-center gap-2 text-sm font-medium">
              <LinkIcon className="h-4 w-4" />
              Interactive URL
            </label>
            <Input
              type="url"
              value={formData.interactiveUrl}
              onChange={(e) => setFormData({ ...formData, interactiveUrl: e.target.value })}
              className="mt-1"
              placeholder="https://example.com/interactive-content"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              leftIcon={
                isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )
              }
              disabled={isUpdating}
              isLoading={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              leftIcon={<X className="h-4 w-4" />}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={onDelete}
              variant="outline"
              className="text-destructive hover:text-destructive"
              leftIcon={<Trash2 className="h-4 w-4" />}
              disabled={isUpdating}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="border-border hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">#{topic.order}</span>
          <h4 className="text-foreground font-medium">{topic.title}</h4>
        </div>
        {topic.description && (
          <p className="text-muted-foreground mt-1 text-sm">{topic.description}</p>
        )}
        <div className="mt-2 flex items-center gap-4">
          {topic.videoUrl && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Video className="h-3 w-3" />
              Video
            </span>
          )}
          {topic.pdfUrl && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" />
              PDF
            </span>
          )}
          {topic.textContent && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Notes
            </span>
          )}
          <span className="text-muted-foreground text-xs">{topic.duration} min</span>
        </div>
      </div>
      <Button onClick={onEdit} variant="ghost" size="icon">
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
