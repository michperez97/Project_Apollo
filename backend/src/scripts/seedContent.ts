import pool from '../config/database';

async function seedContent() {
  // Get course ID
  const courseRes = await pool.query(
    'SELECT id FROM courses WHERE title = $1 ORDER BY id DESC LIMIT 1',
    ['Data Structures & Algorithms']
  );
  const courseId = courseRes.rows[0]?.id;
  if (!courseId) {
    console.log('Course not found');
    return;
  }
  console.log('Course ID:', courseId);

  // Create sections
  const sections = [
    { title: 'Introduction to Data Structures', position: 1 },
    { title: 'Arrays and Linked Lists', position: 2 },
    { title: 'Stacks and Queues', position: 3 },
    { title: 'Trees and Graphs', position: 4 },
  ];

  for (const section of sections) {
    const existing = await pool.query(
      'SELECT id FROM course_sections WHERE course_id = $1 AND title = $2',
      [courseId, section.title]
    );

    if (existing.rows[0]) {
      console.log('Section exists:', section.title);
      continue;
    }

    await pool.query(
      'INSERT INTO course_sections (course_id, title, position) VALUES ($1, $2, $3)',
      [courseId, section.title, section.position]
    );
    console.log('Created section:', section.title);
  }

  // Get section IDs
  const sectionsRes = await pool.query(
    'SELECT id, title, position FROM course_sections WHERE course_id = $1 ORDER BY position',
    [courseId]
  );

  // Lessons for each section
  const lessonData: Record<number, Array<{title: string, type: string, duration: number, preview: boolean}>> = {
    1: [
      { title: 'What are Data Structures?', type: 'video', duration: 480, preview: true },
      { title: 'Why Data Structures Matter', type: 'video', duration: 360, preview: true },
      { title: 'Big-O Notation Basics', type: 'video', duration: 720, preview: false },
      { title: 'Course Overview', type: 'text', duration: 0, preview: false },
    ],
    2: [
      { title: 'Arrays: Introduction', type: 'video', duration: 540, preview: false },
      { title: 'Array Operations & Complexity', type: 'video', duration: 600, preview: false },
      { title: 'Linked Lists: Singly & Doubly', type: 'video', duration: 900, preview: false },
      { title: 'Practice: Array vs Linked List', type: 'quiz', duration: 0, preview: false },
    ],
    3: [
      { title: 'Stack Data Structure', type: 'video', duration: 480, preview: false },
      { title: 'Queue Data Structure', type: 'video', duration: 480, preview: false },
      { title: 'Real-world Applications', type: 'text', duration: 0, preview: false },
      { title: 'Quiz: Stacks & Queues', type: 'quiz', duration: 0, preview: false },
    ],
    4: [
      { title: 'Binary Trees', type: 'video', duration: 720, preview: false },
      { title: 'Tree Traversal Algorithms', type: 'video', duration: 840, preview: false },
      { title: 'Introduction to Graphs', type: 'video', duration: 660, preview: false },
      { title: 'Graph Algorithms: BFS & DFS', type: 'video', duration: 900, preview: false },
      { title: 'Final Assessment', type: 'quiz', duration: 0, preview: false },
    ],
  };

  for (const section of sectionsRes.rows) {
    const lessons = lessonData[section.position as number] || [];
    let pos = 1;
    for (const lesson of lessons) {
      const existing = await pool.query(
        'SELECT id FROM course_lessons WHERE section_id = $1 AND title = $2',
        [section.id, lesson.title]
      );

      if (existing.rows[0]) {
        console.log('  Lesson exists:', lesson.title);
        pos++;
        continue;
      }

      await pool.query(
        `INSERT INTO course_lessons (course_id, section_id, title, lesson_type, position, duration_seconds, is_preview, content)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [courseId, section.id, lesson.title, lesson.type, pos, lesson.duration || null, lesson.preview, 'Sample content for ' + lesson.title]
      );
      console.log('  Created lesson:', lesson.title);
      pos++;
    }
  }

  console.log('Done seeding content!');
  await pool.end();
}

seedContent().catch(e => { console.error(e); process.exit(1); });
