import { CourseRecord, searchPublishedCourses } from '../models/courseModel';
import { LlmMessage, generateChatCompletion } from './llmService';

export interface AssistantChatResult {
  reply: string;
  courses: CourseRecord[];
  topic: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const MAX_COURSES = Number(process.env.ASSISTANT_MAX_COURSES ?? 5);

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const extractTopic = (message: string) => {
  const patterns = [/about\s+(.+)/i, /on\s+(.+)/i, /in\s+(.+)/i, /for\s+(.+)/i];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return normalizeWhitespace(match[1]);
    }
  }
  return normalizeWhitespace(message);
};

const courseLine = (course: CourseRecord) => {
  const category = course.category ? ` | ${course.category}` : '';
  const price = course.price && course.price > 0 ? ` | $${course.price}` : ' | Free';
  return `- [${course.id}] ${course.title}${category}${price}`;
};

const fallbackReply = (topic: string, courses: CourseRecord[]) => {
  if (!courses.length) {
    return `I couldn't find any courses matching "${topic}". Try a broader topic or a different keyword.`;
  }

  const lines = courses
    .map((course) => `${course.title} → ${FRONTEND_URL}/course/${course.id}`)
    .join('\n');

  return `Here are ${courses.length} course(s) for "${topic}":\n${lines}`;
};

export const handleAssistantChat = async (message: string): Promise<AssistantChatResult> => {
  const cleaned = normalizeWhitespace(message);
  const topic = extractTopic(cleaned);

  let courses = await searchPublishedCourses(topic, MAX_COURSES);
  if (!courses.length && topic !== cleaned) {
    courses = await searchPublishedCourses(cleaned, MAX_COURSES);
  }

  const systemPrompt = [
    'You are Apollo AI, a course marketplace assistant.',
    'Only recommend courses from the provided list.',
    'If the list is empty, say no courses match and ask for a different topic.',
    `If you provide links, use ${FRONTEND_URL}/course/<id>.`,
    'Keep responses concise (2-6 sentences).'
  ].join(' ');

  const context = courses.length
    ? `Available courses:\n${courses.map(courseLine).join('\n')}`
    : 'Available courses: none.';

  const userPrompt = `User request: ${cleaned}\nTopic: ${topic}\n${context}`;

  const messages: LlmMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const reply = (await generateChatCompletion(messages)) ?? fallbackReply(topic, courses);

  return {
    reply,
    courses,
    topic
  };
};
