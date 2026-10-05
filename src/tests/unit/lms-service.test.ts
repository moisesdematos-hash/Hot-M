import { describe, it, expect, vi } from 'vitest';
import { LmsService } from '@/modules/lms/lms-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('LmsService Unit Tests (Phase 14 - LMS)', () => {
  const creatorId = 'creator-uuid-1';
  const otherUserId = 'stranger-uuid-2';
  const studentId = 'student-uuid-3';
  const productId = 'prod-course-uuid';
  const courseId = 'course-uuid-1';
  const moduleId = 'module-uuid-1';
  const lessonId = 'lesson-uuid-1';

  it('prevents non-owner from managing course (IDOR defense)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: productId, creator_id: creatorId, title: 'Curso Pro' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const lmsService = new LmsService(mockSupabase);

    await expect(
      lmsService.getOrCreateCourse(productId, otherUserId)
    ).rejects.toThrow('FORBIDDEN');
  });

  it('creates module and lessons for course owner', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: productId, creator_id: creatorId, title: 'Curso Pro' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'courses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: courseId, product_id: productId, title: 'Curso Pro' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'modules') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: moduleId,
                    course_id: courseId,
                    title: 'Módulo 1: Fundamentos',
                    order_index: 0,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: moduleId,
                    course_id: courseId,
                    courses: { product_id: productId, products: { creator_id: creatorId } },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'lessons') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: lessonId,
                    module_id: moduleId,
                    title: 'Aula 1: Introdução',
                    content_type: 'VIDEO',
                    content_url: 'https://cdn.example.com/video1.mp4',
                    body_text: 'Notas da aula',
                    order_index: 0,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const lmsService = new LmsService(mockSupabase);

    const mod = await lmsService.createModule(productId, creatorId, {
      title: 'Módulo 1: Fundamentos',
    });
    expect(mod.id).toBe(moduleId);
    expect(mod.title).toBe('Módulo 1: Fundamentos');

    const lesson = await lmsService.createLesson(moduleId, creatorId, {
      title: 'Aula 1: Introdução',
      contentType: 'VIDEO',
      contentUrl: 'https://cdn.example.com/video1.mp4',
      bodyText: 'Notas da aula',
    });
    expect(lesson.id).toBe(lessonId);
    expect(lesson.contentType).toBe('VIDEO');
  });

  it('redacts content URLs for unentitled users (DRM protection)', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'courses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: courseId, product_id: productId, title: 'Curso Pro' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: productId, creator_id: creatorId },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null, // No entitlement!
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'modules') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: moduleId, course_id: courseId, title: 'Mod 1', order_index: 0 }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'lessons') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: lessonId,
                      module_id: moduleId,
                      title: 'Aula Secreta',
                      content_type: 'VIDEO',
                      content_url: 'https://super-secret-video.mp4',
                      body_text: 'Segredo exclusivo',
                      order_index: 0,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'student_progress') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const lmsService = new LmsService(mockSupabase);
    const curriculum = await lmsService.getCourseCurriculum(productId, otherUserId);

    expect(curriculum.hasAccess).toBe(false);
    expect(curriculum.modules[0]?.lessons[0]?.isLocked).toBe(true);
    expect(curriculum.modules[0]?.lessons[0]?.contentUrl).toBeNull();
    expect(curriculum.modules[0]?.lessons[0]?.bodyText).toBeNull();
  });

  it('allows entitled student to mark lesson progress and updates percentage', async () => {
    let completedState = false;

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: lessonId,
                    module_id: moduleId,
                    modules: {
                      courses: {
                        product_id: productId,
                        products: { creator_id: creatorId },
                      },
                    },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: productId, creator_id: creatorId },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: 'ent-1', is_active: true },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'student_progress') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockImplementation(() =>
                    Promise.resolve({
                      data: completedState
                        ? { id: 'prog-1', is_completed: true }
                        : null,
                      error: null,
                    })
                  ),
                }),
              }),
            }),
            insert: vi.fn().mockImplementation(() => {
              completedState = true;
              return Promise.resolve({ error: null });
            }),
            update: vi.fn().mockImplementation((data: { is_completed: boolean }) => {
              completedState = data.is_completed;
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const lmsService = new LmsService(mockSupabase);

    // 1. First toggle: marks completed
    const result1 = await lmsService.toggleLessonProgress(lessonId, studentId);
    expect(result1.isCompleted).toBe(true);
    expect(completedState).toBe(true);

    // 2. Second toggle: unmarks completed
    const result2 = await lmsService.toggleLessonProgress(lessonId, studentId);
    expect(result2.isCompleted).toBe(false);
    expect(completedState).toBe(false);
  });
});
