import { generateChatCompletion, LlmMessage } from './llmService';
import {
  updateAiCourseContent,
  updateAiCourseMeta,
  updateAiCourseModelUsed,
  updateAiCourseStatus
} from '../models/aiCourseModel';

type OutlineLesson = {
  title: string;
  type: 'text' | 'quiz';
};

type OutlineSection = {
  title: string;
  lessons: OutlineLesson[];
};

type Outline = {
  title: string;
  description: string | null;
  category: string | null;
  sections: OutlineSection[];
};

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type CourseContent = {
  sections: Array<{
    id: string;
    title: string;
    lessons: Array<
      | { id: string; title: string; type: 'text'; content: string }
      | { id: string; title: string; type: 'quiz'; quiz: { questions: QuizQuestion[] } }
    >;
  }>;
};

const DEFAULT_TEMPERATURE = 0.7;
const OUTLINE_MAX_TOKENS = 1200;
const LESSON_MAX_TOKENS = 1000;
const QUIZ_MAX_TOKENS = 800;

const getGenerationTimeoutMs = () => {
  const raw = Number(process.env.AI_GENERATION_TIMEOUT_MS ?? 30000);
  return Number.isFinite(raw) ? raw : 30000;
};

const getModelUsed = () => process.env.LLM_MODEL ?? null;

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const stripCodeFence = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  const lines = trimmed.split('\n');
  lines.shift();
  if (lines.length && lines[lines.length - 1].trim().startsWith('```')) {
    lines.pop();
  }
  return lines.join('\n').trim();
};

const repairJson = (value: string): string => {
  let result = value;
  // Fix missing closing quote on JSON values before } or ]
  // Targets: "value} → "value"} where the value has no inner quotes
  // Uses :\s*" to anchor on key-value context, avoiding mid-string false positives
  result = result.replace(/(:\s*")([^"]*?)([}\]])/g, '$1$2"$3');
  // Fix trailing commas before } or ]
  result = result.replace(/,\s*([}\]])/g, '$1');
  return result;
};

const closeBrackets = (value: string): string => {
  let opens = 0;
  let openArrays = 0;
  let inString = false;
  let escaped = false;

  for (const ch of value) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') opens += 1;
    if (ch === '}') opens -= 1;
    if (ch === '[') openArrays += 1;
    if (ch === ']') openArrays -= 1;
  }

  return value + ']'.repeat(Math.max(0, openArrays)) + '}'.repeat(Math.max(0, opens));
};

const parseJsonResponse = <T>(value: string): T | null => {
  const cleaned = stripCodeFence(value);

  const tryParse = (payload: string): T | null => {
    try {
      return JSON.parse(payload) as T;
    } catch {
      return null;
    }
  };

  const direct = tryParse(cleaned);
  if (direct) {
    return direct;
  }

  const repaired = tryParse(repairJson(cleaned));
  if (repaired) {
    return repaired;
  }

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const extracted = cleaned.slice(start, end + 1);
    const extractedParsed = tryParse(extracted);
    if (extractedParsed) {
      return extractedParsed;
    }

    const extractedRepaired = tryParse(repairJson(extracted));
    if (extractedRepaired) {
      return extractedRepaired;
    }

    return tryParse(closeBrackets(repairJson(extracted)));
  }

  return null;
};

const normalizeOutline = (value: unknown, fallbackPrompt: string): Outline | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const outline = value as Record<string, unknown>;
  const title =
    normalizeText(outline.title) ?? `AI Course: ${fallbackPrompt.trim().slice(0, 60) || 'Untitled'}`;
  const description = normalizeText(outline.description);
  const category = normalizeText(outline.category);
  const rawSections = Array.isArray(outline.sections) ? outline.sections : [];

  const sections = rawSections
    .map((section) => {
      if (!section || typeof section !== 'object') {
        return null;
      }
      const sectionValue = section as Record<string, unknown>;
      const sectionTitle = normalizeText(sectionValue.title);
      if (!sectionTitle) {
        return null;
      }
      const rawLessons = Array.isArray(sectionValue.lessons) ? sectionValue.lessons : [];
      const lessons = rawLessons
        .map((lesson) => {
          if (!lesson || typeof lesson !== 'object') {
            return null;
          }
          const lessonValue = lesson as Record<string, unknown>;
          const lessonTitle = normalizeText(lessonValue.title);
          if (!lessonTitle) {
            return null;
          }
          const rawType = normalizeText(lessonValue.type);
          const type = rawType === 'quiz' ? 'quiz' : 'text';
          return { title: lessonTitle, type } as OutlineLesson;
        })
        .filter(Boolean) as OutlineLesson[];

      if (!lessons.length) {
        return null;
      }

      return { title: sectionTitle, lessons } as OutlineSection;
    })
    .filter(Boolean) as OutlineSection[];

  if (!sections.length) {
    return null;
  }

  return {
    title,
    description,
    category,
    sections: sections.slice(0, 5).map((section) => ({
      ...section,
      lessons: section.lessons.slice(0, 4)
    }))
  };
};

const fallbackLessonContent = (lessonTitle: string, sectionTitle: string) =>
  `# ${lessonTitle}\n\nThis lesson is still being generated. Please check back soon.\n\n## Key takeaways\n- ${sectionTitle} overview\n- Core concepts for ${lessonTitle}\n- Practical next steps`;

const fallbackQuizQuestions = (lessonId: string, lessonTitle: string): QuizQuestion[] => {
  const prompts = [
    `Which statement best describes ${lessonTitle}?`,
    `What is a key concept from ${lessonTitle}?`,
    `When applying ${lessonTitle}, what matters most?`,
    `What is a common mistake related to ${lessonTitle}?`
  ];

  return prompts.map((question, index) => ({
    id: `${lessonId}-q${index + 1}`,
    question,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: 0,
    explanation: 'Review the lesson content for the correct answer.'
  }));
};

const normalizeQuizQuestions = (
  value: unknown,
  lessonId: string,
  lessonTitle: string
): QuizQuestion[] | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const quiz = value as Record<string, unknown>;
  const rawQuestions = Array.isArray(quiz.questions) ? quiz.questions : [];

  const normalized = rawQuestions
    .map((question, index) => {
      if (!question || typeof question !== 'object') {
        return null;
      }
      const questionValue = question as Record<string, unknown>;
      const questionText =
        normalizeText(questionValue.question) ?? `Question ${index + 1} about ${lessonTitle}`;
      const optionsRaw = Array.isArray(questionValue.options) ? questionValue.options : [];
      const options = optionsRaw
        .map((option) => normalizeText(option))
        .filter(Boolean) as string[];
      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }
      const correctIndex =
        typeof questionValue.correctIndex === 'number' && Number.isFinite(questionValue.correctIndex)
          ? Math.min(3, Math.max(0, Math.floor(questionValue.correctIndex)))
          : 0;
      const explanation =
        normalizeText(questionValue.explanation) ?? 'Review the lesson content for the correct answer.';

      return {
        id: `${lessonId}-q${index + 1}`,
        question: questionText,
        options: options.slice(0, 4),
        correctIndex,
        explanation
      };
    })
    .filter(Boolean) as QuizQuestion[];

  if (!normalized.length) {
    return null;
  }

  while (normalized.length < 4) {
    normalized.push({
      ...fallbackQuizQuestions(lessonId, lessonTitle)[normalized.length],
      id: `${lessonId}-q${normalized.length + 1}`
    });
  }

  return normalized.slice(0, 4);
};

const buildOutlineMessages = (prompt: string): LlmMessage[] => [
  {
    role: 'system',
    content: [
      'You are an expert instructional designer.',
      'Create a concise course outline for the requested topic.',
      'Return valid JSON only (no markdown, no code fences).',
      'Schema: {"title":"", "description":"", "category":"", "sections":[{"title":"", "lessons":[{"title":"", "type":"text|quiz"}]}]}.',
      'Use 3-5 sections with 2-4 lessons each.',
      'Include at least one quiz lesson per section and label quiz lessons with type "quiz".'
    ].join(' ')
  },
  {
    role: 'user',
    content: `Student request: ${prompt}`
  }
];

const buildLessonMessages = (
  prompt: string,
  courseTitle: string,
  sectionTitle: string,
  lessonTitle: string
): LlmMessage[] => [
  {
    role: 'system',
    content: [
      'You are an expert instructor writing a single lesson.',
      'Return only markdown content (no JSON, no code fences).',
      'Keep it concise and practical: 3-6 short paragraphs plus bullets or steps if helpful.',
      'Avoid quiz questions or question lists.'
    ].join(' ')
  },
  {
    role: 'user',
    content: [
      `Course: ${courseTitle}`,
      `Section: ${sectionTitle}`,
      `Lesson: ${lessonTitle}`,
      `Student request: ${prompt}`,
      'Write the lesson content.'
    ].join('\n')
  }
];

const buildQuizMessages = (
  prompt: string,
  courseTitle: string,
  sectionTitle: string,
  lessonTitle: string
): LlmMessage[] => [
  {
    role: 'system',
    content: [
      'You are an expert instructor creating a short quiz.',
      'Return valid JSON only (no markdown, no code fences).',
      'Schema: {"questions":[{"question":"","options":["A","B","C","D"],"correctIndex":0,"explanation":""}]}',
      'Provide exactly 4 multiple-choice questions.',
      'Options must be short and clear. correctIndex must be 0-3.'
    ].join(' ')
  },
  {
    role: 'user',
    content: [
      `Course: ${courseTitle}`,
      `Section: ${sectionTitle}`,
      `Lesson: ${lessonTitle}`,
      `Student request: ${prompt}`,
      'Create a quiz for this lesson.'
    ].join('\n')
  }
];

const generateOutline = async (prompt: string): Promise<Outline | null> => {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    console.log(`[AI-GEN] Outline attempt ${attempt}/${maxRetries}`);
    const response = await generateChatCompletion(buildOutlineMessages(prompt), {
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: OUTLINE_MAX_TOKENS,
      timeout: getGenerationTimeoutMs()
    });

    if (!response) {
      console.error(`[AI-GEN] Outline attempt ${attempt}: LLM returned null`);
      continue;
    }

    console.log(
      `[AI-GEN] Outline attempt ${attempt}: raw response (first 500 chars):`,
      response.slice(0, 500)
    );

    const parsed = parseJsonResponse<Outline>(response);
    if (!parsed) {
      console.error(`[AI-GEN] Outline attempt ${attempt}: JSON parse failed`);
      continue;
    }
    console.log(`[AI-GEN] Outline attempt ${attempt}: JSON parse succeeded`);

    const normalized = normalizeOutline(parsed, prompt);
    if (!normalized) {
      console.error(`[AI-GEN] Outline attempt ${attempt}: normalization failed`);
      continue;
    }

    console.log(
      `[AI-GEN] Outline success: "${normalized.title}" with ${normalized.sections.length} sections`
    );
    return normalized;
  }

  return null;
};

const generateLessonContent = async (
  prompt: string,
  courseTitle: string,
  sectionTitle: string,
  lessonTitle: string
): Promise<string | null> => {
  const response = await generateChatCompletion(
    buildLessonMessages(prompt, courseTitle, sectionTitle, lessonTitle),
    {
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: LESSON_MAX_TOKENS,
      timeout: getGenerationTimeoutMs()
    }
  );

  return response?.trim() ?? null;
};

const generateQuizContent = async (
  prompt: string,
  courseTitle: string,
  sectionTitle: string,
  lessonTitle: string
): Promise<{ questions: unknown[] } | null> => {
  const response = await generateChatCompletion(
    buildQuizMessages(prompt, courseTitle, sectionTitle, lessonTitle),
    {
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: QUIZ_MAX_TOKENS,
      timeout: getGenerationTimeoutMs()
    }
  );

  if (!response) {
    return null;
  }

  return parseJsonResponse<{ questions: unknown[] }>(response);
};

const buildCourseContent = async (outline: Outline, prompt: string): Promise<CourseContent> => {
  const sections: CourseContent['sections'] = [];

  for (let sectionIndex = 0; sectionIndex < outline.sections.length; sectionIndex += 1) {
    const section = outline.sections[sectionIndex];
    const sectionId = `s${sectionIndex + 1}`;
    const lessons: CourseContent['sections'][number]['lessons'] = [];
    console.log(`[AI-GEN] Generating section ${sectionIndex + 1}/${outline.sections.length}: ${section.title}`);

    for (let lessonIndex = 0; lessonIndex < section.lessons.length; lessonIndex += 1) {
      const lesson = section.lessons[lessonIndex];
      const lessonId = `${sectionId}-l${lessonIndex + 1}`;
      console.log(`[AI-GEN] Generating ${lesson.type} lesson ${lessonId}: ${lesson.title}`);

      if (lesson.type === 'quiz') {
        const quizPayload = await generateQuizContent(
          prompt,
          outline.title,
          section.title,
          lesson.title
        );
        if (!quizPayload) {
          console.error(`[AI-GEN] Quiz generation failed for ${lessonId}; using fallback questions.`);
        }
        const questions =
          normalizeQuizQuestions(quizPayload, lessonId, lesson.title) ??
          fallbackQuizQuestions(lessonId, lesson.title);

        lessons.push({
          id: lessonId,
          title: lesson.title,
          type: 'quiz',
          quiz: { questions }
        });
        continue;
      }

      const generatedContent = await generateLessonContent(
        prompt,
        outline.title,
        section.title,
        lesson.title
      );
      if (!generatedContent) {
        console.error(`[AI-GEN] Lesson generation failed for ${lessonId}; using fallback content.`);
      }
      const content = generatedContent ?? fallbackLessonContent(lesson.title, section.title);

      lessons.push({
        id: lessonId,
        title: lesson.title,
        type: 'text',
        content
      });
    }

    sections.push({
      id: sectionId,
      title: section.title,
      lessons
    });
  }

  return { sections };
};

const markGenerationFailed = async (recordId: number, error: unknown) => {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`[AI-GEN] Course ${recordId} generation failed: ${reason}`);
  try {
    await updateAiCourseStatus(recordId, 'failed', reason);
  } catch (statusError) {
    console.error(`[AI-GEN] Unable to mark course ${recordId} as failed:`, statusError);
  }
};

export const generateAiCourse = async (
  studentId: number,
  prompt: string,
  recordId: number
): Promise<void> => {
  try {
    console.log(`[AI-GEN] Starting generation for course ${recordId}. Prompt: "${prompt}"`);
    const modelUsed = getModelUsed();
    if (modelUsed) {
      await updateAiCourseModelUsed(recordId, modelUsed);
    }

    const outline = await generateOutline(prompt);
    if (!outline) {
      await markGenerationFailed(recordId, 'Outline generation failed.');
      return;
    }

    console.log(`[AI-GEN] Updating course ${recordId} metadata.`);
    await updateAiCourseMeta(recordId, outline.title, outline.description, outline.category);

    console.log(`[AI-GEN] Building course content for ${recordId}.`);
    const content = await buildCourseContent(outline, prompt);
    await updateAiCourseContent(recordId, content, 'ready');
    console.log(`[AI-GEN] Course ${recordId} generation complete.`);
  } catch (error) {
    await markGenerationFailed(recordId, error);
  }
};
