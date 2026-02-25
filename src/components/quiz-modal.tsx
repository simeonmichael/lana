"use client";

import * as React from "react";
import { Button, Progress, Mascot } from "@/components/ui";
import { X, CheckCircle2, XCircle, ChevronRight, RotateCcw, Trophy, Loader2 } from "lucide-react";
import type { Quiz, QuizQuestion } from "@prisma/client";

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz & { questions: QuizQuestion[] };
  topicId: string;
  enrollmentId: string;
  courseSlug: string;
  nextTopicId?: string;
  isLastTopic: boolean;
  onQuizComplete: (passed: boolean) => void;
  isTopicCompleted?: boolean; // If true, show performance view instead of allowing retake
  hasQuizAttempt?: boolean; // If true, user has already taken the quiz - show results only
}

export function QuizModal({
  isOpen,
  onClose,
  quiz,
  topicId,
  enrollmentId,
  courseSlug,
  nextTopicId,
  isLastTopic,
  onQuizComplete,
  isTopicCompleted = false,
  hasQuizAttempt = false,
}: QuizModalProps) {
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showExplanation, setShowExplanation] = React.useState(false);
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);
  const [result, setResult] = React.useState<{
    score: number;
    passed: boolean;
    feedback: Array<{
      questionId: string;
      isCorrect: boolean;
      correctAnswer: number;
    }>;
  } | null>(null);
  const [quizAttempt, setQuizAttempt] = React.useState<{
    score: number;
    passed: boolean;
    answers: Record<string, number>;
    completedAt: string;
  } | null>(null);
  const [isLoadingAttempt, setIsLoadingAttempt] = React.useState(false);

  const questionRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const question = quiz.questions[currentQuestion];
  const options = question?.options as string[];
  const totalQuestions = quiz.questions.length;

  // Check if element is visible in viewport
  const isElementVisible = (
    element: HTMLElement | null,
    container: HTMLElement | null
  ): boolean => {
    if (!element || !container) return false;

    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Check if element is within container's visible area
    return elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom;
  };

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (isTopicCompleted || hasQuizAttempt) {
        // Load quiz attempt for completed topics or if user has already taken the quiz
        loadQuizAttempt();
      } else {
        setCurrentQuestion(0);
        setAnswers({});
        setResult(null);
        setShowExplanation(false);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setQuizAttempt(null);
      }
    }
  }, [isOpen, isTopicCompleted, hasQuizAttempt, topicId]);

  // Handle scrolling when question changes - only scroll if question is not visible
  React.useEffect(() => {
    if (result || !questionRef.current || !contentRef.current) return;

    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (questionRef.current && contentRef.current) {
        // Only scroll if the question is not fully visible
        if (!isElementVisible(questionRef.current, contentRef.current)) {
          questionRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
        }
      }
    });
  }, [currentQuestion, result]);

  async function loadQuizAttempt() {
    setIsLoadingAttempt(true);
    try {
      const response = await fetch(`/api/topics/${topicId}/quiz-attempt`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.attempt) {
          setQuizAttempt(data.attempt);
          // Convert answers to result format for display
          const feedback: Array<{
            questionId: string;
            isCorrect: boolean;
            correctAnswer: number;
          }> = [];

          data.quiz.questions.forEach((q: QuizQuestion) => {
            const userAnswer = data.attempt.answers[q.id];
            feedback.push({
              questionId: q.id,
              isCorrect: userAnswer === q.correctAnswer,
              correctAnswer: q.correctAnswer,
            });
          });

          setResult({
            score: Math.round(data.attempt.score),
            passed: data.attempt.passed,
            feedback,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load quiz attempt:", error);
    } finally {
      setIsLoadingAttempt(false);
    }
  }

  if (!isOpen) return null;

  // If topic is completed or user has already taken the quiz, show performance view only
  if (isTopicCompleted || hasQuizAttempt) {
    if (isLoadingAttempt) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-col items-center justify-center gap-4 p-12">
              <Loader2 className="text-primary h-12 w-12 animate-spin" />
              <p className="text-muted-foreground">Loading quiz performance...</p>
            </div>
          </div>
        </div>
      );
    }

    if (!result || !quizAttempt) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-border from-primary/5 to-secondary/20 border-b bg-gradient-to-r p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-foreground text-xl font-bold">Quiz Performance</h2>
                  <p className="text-muted-foreground text-sm">Topic Completed</p>
                </div>
                <button
                  onClick={onClose}
                  className="bg-muted/50 hover:bg-muted flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                >
                  <X className="text-muted-foreground h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 text-center">
              <p className="text-muted-foreground">No quiz attempt found</p>
              <Button onClick={onClose} className="mt-4">
                Close
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  const handleSelectAnswer = (answerIndex: number) => {
    if (isSubmitting) return;

    setSelectedAnswer(answerIndex);
    setAnswers((prev) => ({
      ...prev,
      [question.id]: answerIndex,
    }));
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;

    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
    } else {
      // Submit quiz
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    // Prevent submission if user has already taken the quiz
    if (hasQuizAttempt) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          topicId,
          enrollmentId,
          answers,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      }
    } catch (error) {
      console.error("Quiz submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    // Only notify parent when quiz is passed; parent handles navigation/state reset
    if (result?.passed) {
      onQuizComplete(true);
    }
    onClose();
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
    setShowExplanation(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={result ? handleContinue : undefined}
      />

      {/* Modal */}
      <div className="animate-fade-in relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-border from-primary/5 to-secondary/20 flex items-center justify-between border-b bg-gradient-to-r p-6">
          <div>
            <h2 className="text-foreground text-xl font-bold">
              {isTopicCompleted || hasQuizAttempt ? "Quiz Performance" : "Topic Quiz"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isTopicCompleted || hasQuizAttempt
                ? isTopicCompleted
                  ? "Topic Completed"
                  : "View Results"
                : result
                  ? "Quiz Complete!"
                  : `Question ${currentQuestion + 1} of ${totalQuestions}`}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-muted/50 hover:bg-muted flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="text-muted-foreground h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="relative max-h-[calc(90vh-180px)] overflow-y-auto p-6">
          {/* Loading Overlay - shown when submitting quiz */}
          {isSubmitting && !isTopicCompleted && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="text-primary h-12 w-12 animate-spin" />
                <div className="text-center">
                  <p className="text-foreground mb-1 text-lg font-semibold">
                    Calculating Your Results
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Please wait while we grade your quiz...
                  </p>
                </div>
              </div>
            </div>
          )}

          {result ? (
            // Results View
            <div className="space-y-6 py-8 text-center">
              <Mascot
                size="lg"
                mood={result.passed ? "celebrating" : "thinking"}
                animate={result.passed}
              />

              <div>
                <div
                  className={`mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 ${
                    result.passed
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {result.passed ? (
                    <>
                      <Trophy className="h-5 w-5" />
                      <span className="font-semibold">Congratulations!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5" />
                      <span className="font-semibold">Keep Practicing!</span>
                    </>
                  )}
                </div>

                <h3 className="text-foreground mb-2 text-3xl font-bold">
                  {Math.round(result.score)}%
                </h3>
                <p className="text-muted-foreground">
                  You got {result.feedback.filter((f) => f.isCorrect).length} out of{" "}
                  {totalQuestions} questions correct
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Passing score: {quiz.passingScore}%
                </p>
              </div>

              {/* Progress visualization */}
              <div className="mx-auto w-full max-w-xs">
                <Progress
                  value={result.score}
                  className={`h-3 ${result.passed ? "[&>div]:bg-success" : "[&>div]:bg-destructive"}`}
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-4 pt-4">
                {result.passed ? (
                  <Button
                    onClick={handleContinue}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                    size="lg"
                  >
                    {isLastTopic ? "Take Final Exam" : "Next Topic"}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={onClose}>
                      Review Content
                    </Button>
                    <Button onClick={handleRetry} leftIcon={<RotateCcw className="h-4 w-4" />}>
                      Try Again
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            // Question View
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="space-y-2">
                <Progress value={((currentQuestion + 1) / totalQuestions) * 100} className="h-2" />
                <div className="text-muted-foreground flex justify-between text-xs">
                  <span>Progress</span>
                  <span>{Math.round(((currentQuestion + 1) / totalQuestions) * 100)}%</span>
                </div>
              </div>

              {/* Question */}
              <div ref={questionRef}>
                <h3 className="text-foreground mb-6 text-lg font-semibold">{question.question}</h3>

                <div className="space-y-3">
                  {options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    let buttonClass = "w-full p-4 rounded-xl border-2 text-left transition-all ";
                    if (isSelected) {
                      buttonClass += "border-primary bg-primary/5 ";
                    } else {
                      buttonClass += "border-border hover:border-primary/50 hover:bg-muted/30 ";
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectAnswer(index)}
                        disabled={showExplanation || isSubmitting}
                        className={buttonClass}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-primary bg-primary text-white"
                                : "border-muted-foreground"
                            }`}
                          >
                            <span className="text-sm font-medium">
                              {String.fromCharCode(65 + index)}
                            </span>
                          </div>
                          <span className={showExplanation && isCorrectAnswer ? "font-medium" : ""}>
                            {option}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && !isTopicCompleted && (
          <div className="border-border bg-muted/30 relative border-t p-6">
            {isSubmitting && (
              <div className="bg-muted/30 absolute inset-0 z-10 rounded-b-2xl backdrop-blur-sm" />
            )}
            <Button
              onClick={handleNext}
              isLoading={isSubmitting}
              disabled={isSubmitting || selectedAnswer === null}
              fullWidth
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              {currentQuestion === totalQuestions - 1 ? "Submit Quiz" : "Next Question"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
