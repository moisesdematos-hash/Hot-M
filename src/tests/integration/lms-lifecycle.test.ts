import { describe, it, expect, vi } from 'vitest';
import { LmsService } from '@/modules/lms/lms-service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('LMS Lifecycle & Entitlement Access Integration Test (Phase 14 - INV-007)', () => {
  const creatorId = 'creator-lms-100';
  const intruderId = 'intruder-lms-200';
  const studentId = 'buyer-lms-300';
  const productId = 'prod-course-lms-001';
  const courseId = 'course-lms-001';
  const moduleId = 'module-lms-001';
  const lessonId = 'lesson-lms-001';

  // In-memory state for lifecycle
  let studentHasEntitlement = false;
  let studentProgressCompleted = false;

  const mockSupabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: productId,
                  creator_id: creatorId,
                  title: 'Curso Completo de Arquitetura de Software',
                  description: 'Aprenda padrões de projeto enterprise e Clean Architecture.',
                },
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
                data: {
                  id: courseId,
                  product_id: productId,
                  title: 'Curso Completo de Arquitetura de Software',
                  description: 'Aprenda padrões de projeto enterprise e Clean Architecture.',
                },
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: courseId,
                  product_id: productId,
                  title: 'Curso Completo de Arquitetura de Software',
                  description: 'Aprenda padrões de projeto enterprise e Clean Architecture.',
                },
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
                  title: 'Módulo 1: Padrões Arquiteturais',
                  order_index: 0,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (col === 'course_id') {
                return {
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: moduleId,
                        course_id: courseId,
                        title: 'Módulo 1: Padrões Arquiteturais',
                        order_index: 0,
                        created_at: new Date().toISOString(),
                      },
                    ],
                    error: null,
                  }),
                };
              }
              // For IDOR checking
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: val,
                    course_id: courseId,
                    courses: {
                      product_id: productId,
                      products: { creator_id: creatorId },
                    },
                  },
                  error: null,
                }),
              };
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
                  title: 'Aula 01: Clean Architecture na Prática',
                  content_type: 'VIDEO',
                  content_url: 'https://video.hotm.ao/clean-arch-01.mp4',
                  body_text: 'Diagramas e código-fonte no GitHub da aula.',
                  order_index: 0,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: lessonId,
                    module_id: moduleId,
                    title: 'Aula 01: Clean Architecture na Prática',
                    content_type: 'VIDEO',
                    content_url: 'https://video.hotm.ao/clean-arch-01.mp4',
                    body_text: 'Diagramas e código-fonte no GitHub da aula.',
                    order_index: 0,
                    created_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }),
            }),
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

      if (table === 'entitlements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((_col: string, _val: unknown) => ({
                  maybeSingle: vi.fn().mockImplementation(() =>
                    Promise.resolve({
                      data: studentHasEntitlement
                        ? { id: 'ent-lms-1', is_active: true }
                        : null,
                      error: null,
                    })
                  ),
                })),
              }),
            }),
          }),
        };
      }

      if (table === 'student_progress') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockImplementation(() =>
                Promise.resolve({
                  data: studentProgressCompleted
                    ? [{ lesson_id: lessonId, is_completed: true, completed_at: new Date().toISOString() }]
                    : [],
                  error: null,
                })
              ),
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockImplementation(() =>
                  Promise.resolve({
                    data: studentProgressCompleted
                      ? { id: 'prog-lms-1', is_completed: true }
                      : null,
                    error: null,
                  })
                ),
              }),
            }),
          }),
          insert: vi.fn().mockImplementation(() => {
            studentProgressCompleted = true;
            return Promise.resolve({ error: null });
          }),
          update: vi.fn().mockImplementation((data: { is_completed: boolean }) => {
            studentProgressCompleted = data.is_completed;
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }

      return {};
    }),
  } as unknown as SupabaseClient;

  it('orchestrates complete LMS lifecycle: creation -> IDOR defense -> DRM lock -> purchase entitlement -> 100% completion', async () => {
    const lmsService = new LmsService(mockSupabase);

    // 1. Creator sets up course curriculum
    const moduleItem = await lmsService.createModule(productId, creatorId, {
      title: 'Módulo 1: Padrões Arquiteturais',
    });
    expect(moduleItem.id).toBe(moduleId);

    const lessonItem = await lmsService.createLesson(moduleId, creatorId, {
      title: 'Aula 01: Clean Architecture na Prática',
      contentType: 'VIDEO',
      contentUrl: 'https://video.hotm.ao/clean-arch-01.mp4',
      bodyText: 'Diagramas e código-fonte no GitHub da aula.',
    });
    expect(lessonItem.id).toBe(lessonId);

    // 2. IDOR Defense: Intruder cannot alter or add lessons to this course
    await expect(
      lmsService.createModule(productId, intruderId, { title: 'Módulo Invasor' })
    ).rejects.toThrow('FORBIDDEN');

    await expect(
      lmsService.createLesson(moduleId, intruderId, {
        title: 'Aula Invasora',
        contentType: 'TEXT',
      })
    ).rejects.toThrow('FORBIDDEN');

    // 3. DRM Enforcement: Unentitled student views course (pre-purchase)
    studentHasEntitlement = false;
    const lockedCurriculum = await lmsService.getCourseCurriculum(productId, studentId);

    expect(lockedCurriculum.hasAccess).toBe(false);
    expect(lockedCurriculum.modules[0]?.lessons[0]?.isLocked).toBe(true);
    expect(lockedCurriculum.modules[0]?.lessons[0]?.contentUrl).toBeNull(); // DRM Redacted
    expect(lockedCurriculum.modules[0]?.lessons[0]?.bodyText).toBeNull(); // DRM Redacted

    // Unentitled student tries to complete lesson -> BLOCKED (INV-007)
    await expect(
      lmsService.toggleLessonProgress(lessonId, studentId)
    ).rejects.toThrow('FORBIDDEN');

    // 4. Entitlement Granted (simulating successful ProxyPay payment -> Webhook -> Entitlement grant)
    studentHasEntitlement = true;

    // 5. Entitled student accesses course
    const unlockedCurriculum = await lmsService.getCourseCurriculum(productId, studentId);
    expect(unlockedCurriculum.hasAccess).toBe(true);
    expect(unlockedCurriculum.modules[0]?.lessons[0]?.isLocked).toBe(false);
    expect(unlockedCurriculum.modules[0]?.lessons[0]?.contentUrl).toBe('https://video.hotm.ao/clean-arch-01.mp4');
    expect(unlockedCurriculum.modules[0]?.lessons[0]?.bodyText).toBe('Diagramas e código-fonte no GitHub da aula.');
    expect(unlockedCurriculum.progress.percentage).toBe(0);

    // 6. Student watches and completes lesson
    const progressResult = await lmsService.toggleLessonProgress(lessonId, studentId);
    expect(progressResult.isCompleted).toBe(true);

    // 7. Verify updated curriculum progress reaches 100%
    const completedCurriculum = await lmsService.getCourseCurriculum(productId, studentId);
    expect(completedCurriculum.progress.completedLessons).toBe(1);
    expect(completedCurriculum.progress.totalLessons).toBe(1);
    expect(completedCurriculum.progress.percentage).toBe(100);
  });
});
