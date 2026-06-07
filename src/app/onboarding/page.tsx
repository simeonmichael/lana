"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, Button, Mascot, StepProgress, Spinner } from "@/components/ui";
import {
  ArrowRight,
  ArrowLeft,
  Brain,
  Heart,
  Target,
  Lightbulb,
  GraduationCap,
} from "lucide-react";

const aptitudeQuestions = [
  {
    id: "interests",
    category: "interests",
    question: "What activities do you enjoy most?",
    description: "Share what you like to do in your free time or at work",
    icon: Heart,
    placeholder: "e.g. Working with technology, creative writing, helping people...",
  },
  {
    id: "learning_style",
    category: "learning",
    question: "How do you learn best?",
    description: "Describe the methods that help you absorb new information",
    icon: Brain,
    placeholder: "e.g. Watching videos, hands-on practice, reading...",
  },
  {
    id: "strengths",
    category: "strengths",
    question: "What are your strongest skills?",
    description: "Tell us what you're good at",
    icon: Target,
    placeholder: "e.g. Problem-solving, communication, attention to detail...",
  },
  {
    id: "goals",
    category: "goals",
    question: "What's most important to you in a career?",
    description: "Share what matters most to you professionally",
    icon: Lightbulb,
    placeholder: "e.g. Growth, work-life balance, making an impact...",
  },
  {
    id: "education",
    category: "education",
    question: "What's your current education level?",
    description: "Describe your educational background",
    icon: GraduationCap,
    placeholder: "e.g. Secondary school, university student, graduate...",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCheckingAptitude, setIsCheckingAptitude] = React.useState(true);

  // Redirect to dashboard if user has already completed aptitude (e.g. after Google OAuth)
  React.useEffect(() => {
    fetch("/api/profile/aptitude")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.aptitudeCompleted) {
          router.replace("/dashboard");
          return;
        }
        setIsCheckingAptitude(false);
      })
      .catch(() => setIsCheckingAptitude(false));
  }, [router]);

  const currentQuestion = aptitudeQuestions[currentStep];
  const totalSteps = aptitudeQuestions.length;
  const isLastStep = currentStep === totalSteps - 1;

  const handleChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const canProceed = () => {
    const answer = answers[currentQuestion.id];
    return typeof answer === "string" && answer.trim().length > 0;
  };

  const handleNext = async () => {
    if (isLastStep) {
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/profile/aptitude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers,
            userType: "Employed",
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Redirect to recommendations page to show career matches
          router.push("/recommendations");
          router.refresh();
        } else {
          console.error("Failed to save aptitude:", data.error);
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error saving aptitude:", error);
        router.push("/dashboard");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const Icon = currentQuestion.icon;

  if (isCheckingAptitude) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-primary text-3xl font-bold">Aptitude Assessment</h1>
          <p className="text-muted-foreground mt-2">
            Help us understand your interests and strengths to recommend the best career paths for
            you.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <StepProgress steps={totalSteps} currentStep={currentStep + 1} />
        </div>

        {/* Question Card */}
        <Card variant="elevated" className="animate-fade-in">
          <CardContent className="p-8">
            {/* Header with mascot */}
            <div className="mb-6 flex items-start gap-4">
              <Mascot size="md" mood="thinking" animate={false} />
              <div className="flex-1">
                <div className="text-primary mb-2 flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium tracking-wide uppercase">
                    {currentQuestion.category}
                  </span>
                </div>
                <h2 className="text-foreground text-2xl font-bold">{currentQuestion.question}</h2>
                <p className="text-muted-foreground mt-1">{currentQuestion.description}</p>
              </div>
            </div>

            {/* Open-ended answer */}
            <div className="mt-8">
              <textarea
                value={answers[currentQuestion.id] ?? ""}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={currentQuestion.placeholder}
                rows={4}
                className="bg-input border-border placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full resize-none rounded-xl border px-4 py-3 text-base transition-all duration-200 focus:ring-2 focus:outline-none"
              />
            </div>

            {/* Navigation */}
            <div className="border-border mt-8 flex items-center justify-between border-t pt-6">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>

              <span className="text-muted-foreground text-sm">
                {currentStep + 1} of {totalSteps}
              </span>

              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {isLastStep ? "Complete" : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Skip option */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Skip for now, I&apos;ll complete this later
          </button>
        </div>
      </div>
    </div>
  );
}
