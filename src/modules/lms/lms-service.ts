import { SupabaseClient } from '@supabase/supabase-js';

export type LessonContentType = 'VIDEO' | 'AUDIO' | 'PDF' | 'TEXT';

export interface LessonItem {
  id: string;
  moduleId: string;
  title: string;
  contentType: LessonContentType;
  contentUrl: string | null;
  bodyText: string | null;
  orderIndex: number;
  createdAt: string;
  isCompleted?: boolean;
  completedAt?: string | null;
  isLocked?: boolean;
}

export interface ModuleItem {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
  lessons: LessonItem[];
}

export interface CourseCurriculum {
  id: string;
  productId: string;
  title: string;
  description: string | null;
  hasAccess: boolean;
  modules: ModuleItem[];
  progress: {
    totalLessons: number;
    completedLessons: number;
    percentage: number;
  };
}

export class LmsService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Retrieves or initializes a course for a given product.
   * Defesa IDOR: Only the product creator can initialize the course.
   */
  async getOrCreateCourse(
    productId: string,
    creatorId: string,
    title?: string,
    description?: string
  ): Promise<{ id: string; productId: string; title: string; description: string | null }> {
    // 1. Verify product ownership
    const { data: product, error: prodError } = await this.client
      .from('products')
      .select('id, creator_id, title, description')
      .eq('id', productId)
      .maybeSingle();

    if (prodError || !product) {
      throw new Error('PRODUCT_NOT_FOUND: Produto não encontrado.');
    }

    if (product.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Apenas o criador legítimo pode gerenciar a grade curricular.');
    }

    // 2. Check if course already exists
    const { data: existingCourse } = await this.client
      .from('courses')
      .select('id, product_id, title, description')
      .eq('product_id', productId)
      .maybeSingle();

    if (existingCourse) {
      return {
        id: existingCourse.id,
        productId: existingCourse.product_id,
        title: existingCourse.title,
        description: existingCourse.description,
      };
    }

    // 3. Create course
    const { data: newCourse, error: createError } = await this.client
      .from('courses')
      .insert({
        product_id: productId,
        title: title || product.title,
        description: description || product.description,
      })
      .select('id, product_id, title, description')
      .single();

    if (createError || !newCourse) {
      throw new Error(`COURSE_CREATION_FAILED: ${createError?.message || 'Falha ao criar curso.'}`);
    }

    return {
      id: newCourse.id,
      productId: newCourse.product_id,
      title: newCourse.title,
      description: newCourse.description,
    };
  }

  /**
   * Checks whether a user has active entitled access to a product course (or is the creator).
   */
  async checkUserAccess(productId: string, userId?: string): Promise<boolean> {
    if (!userId) return false;

    // 1. Check if user is the product creator
    const { data: product } = await this.client
      .from('products')
      .select('creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (product && product.creator_id === userId) {
      return true;
    }

    // 2. Check active entitlement (INV-007)
    const { data: entitlement } = await this.client
      .from('entitlements')
      .select('id, is_active')
      .eq('buyer_id', userId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .maybeSingle();

    return !!entitlement;
  }

  /**
   * Retrieves full course curriculum with modules, lessons, and student progress.
   * If user is unentitled, sensitive content (content_url, body_text) is redacted.
   */
  async getCourseCurriculum(productId: string, userId?: string): Promise<CourseCurriculum> {
    // 1. Get or locate course
    let { data: course } = await this.client
      .from('courses')
      .select('id, product_id, title, description')
      .eq('product_id', productId)
      .maybeSingle();

    if (!course) {
      // Check if product exists
      const { data: product } = await this.client
        .from('products')
        .select('id, creator_id, title, description')
        .eq('id', productId)
        .maybeSingle();

      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND: Produto não encontrado.');
      }

      // Auto-create course container
      const { data: createdCourse } = await this.client
        .from('courses')
        .insert({
          product_id: productId,
          title: product.title,
          description: product.description,
        })
        .select('id, product_id, title, description')
        .single();

      course = createdCourse;
    }

    if (!course) {
      throw new Error('COURSE_NOT_FOUND: Não foi possível obter o curso.');
    }

    // 2. Check access permissions
    const hasAccess = await this.checkUserAccess(productId, userId);

    // 3. Get modules
    const { data: rawModules } = await this.client
      .from('modules')
      .select('id, course_id, title, order_index, created_at')
      .eq('course_id', course.id)
      .order('order_index', { ascending: true });

    const modulesList = rawModules || [];
    const moduleIds = modulesList.map((m) => m.id);

    // 4. Get lessons for these modules
    let lessonsList: Array<{
      id: string;
      module_id: string;
      title: string;
      content_type: LessonContentType;
      content_url: string | null;
      body_text: string | null;
      order_index: number;
      created_at: string;
    }> = [];

    if (moduleIds.length > 0) {
      const { data: rawLessons } = await this.client
        .from('lessons')
        .select('id, module_id, title, content_type, content_url, body_text, order_index, created_at')
        .in('module_id', moduleIds)
        .order('order_index', { ascending: true });

      lessonsList = rawLessons || [];
    }

    // 5. Get user progress if userId provided
    const userProgressMap = new Map<string, { isCompleted: boolean; completedAt: string | null }>();

    if (userId && lessonsList.length > 0) {
      const lessonIds = lessonsList.map((l) => l.id);
      const { data: rawProgress } = await this.client
        .from('student_progress')
        .select('lesson_id, is_completed, completed_at')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);

      if (rawProgress) {
        for (const p of rawProgress) {
          userProgressMap.set(p.lesson_id, {
            isCompleted: p.is_completed,
            completedAt: p.completed_at,
          });
        }
      }
    }

    // 6. Assemble curriculum tree
    let totalLessonsCount = 0;
    let completedLessonsCount = 0;

    const assembledModules: ModuleItem[] = modulesList.map((mod) => {
      const modLessons = lessonsList
        .filter((l) => l.module_id === mod.id)
        .map((l) => {
          totalLessonsCount++;
          const progressInfo = userProgressMap.get(l.id);
          const isCompleted = progressInfo?.isCompleted ?? false;
          if (isCompleted) {
            completedLessonsCount++;
          }

          return {
            id: l.id,
            moduleId: l.module_id,
            title: l.title,
            contentType: l.content_type,
            contentUrl: hasAccess ? l.content_url : null,
            bodyText: hasAccess ? l.body_text : null,
            orderIndex: l.order_index,
            createdAt: l.created_at,
            isCompleted,
            completedAt: progressInfo?.completedAt ?? null,
            isLocked: !hasAccess,
          };
        });

      return {
        id: mod.id,
        courseId: mod.course_id,
        title: mod.title,
        orderIndex: mod.order_index,
        createdAt: mod.created_at,
        lessons: modLessons,
      };
    });

    const percentage =
      totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;

    return {
      id: course.id,
      productId: course.product_id,
      title: course.title,
      description: course.description,
      hasAccess,
      modules: assembledModules,
      progress: {
        totalLessons: totalLessonsCount,
        completedLessons: completedLessonsCount,
        percentage,
      },
    };
  }

  /**
   * Creates a new module in a course.
   * Defesa IDOR: Only product creator can create modules.
   */
  async createModule(
    productId: string,
    creatorId: string,
    data: { title: string; orderIndex?: number }
  ): Promise<ModuleItem> {
    if (!data.title || data.title.trim() === '') {
      throw new Error('INVALID_DATA: Título do módulo é obrigatório.');
    }

    const course = await this.getOrCreateCourse(productId, creatorId);

    const orderIndex = data.orderIndex ?? 0;

    const { data: moduleData, error: modError } = await this.client
      .from('modules')
      .insert({
        course_id: course.id,
        title: data.title.trim(),
        order_index: orderIndex,
      })
      .select('id, course_id, title, order_index, created_at')
      .single();

    if (modError || !moduleData) {
      throw new Error(`MODULE_CREATION_FAILED: ${modError?.message || 'Falha ao criar módulo.'}`);
    }

    return {
      id: moduleData.id,
      courseId: moduleData.course_id,
      title: moduleData.title,
      orderIndex: moduleData.order_index,
      createdAt: moduleData.created_at,
      lessons: [],
    };
  }

  /**
   * Updates an existing module.
   * Defesa IDOR: Only creator of the parent product can update.
   */
  async updateModule(
    moduleId: string,
    creatorId: string,
    data: { title?: string; orderIndex?: number }
  ): Promise<{ id: string; title: string; orderIndex: number }> {
    // 1. Trace module -> course -> product
    const { data: mod } = await this.client
      .from('modules')
      .select('id, course_id, courses(product_id, products(creator_id))')
      .eq('id', moduleId)
      .maybeSingle();

    if (!mod) {
      throw new Error('MODULE_NOT_FOUND: Módulo não encontrado.');
    }

    // Supabase nested relation typing
    const courseRel = mod.courses as unknown as {
      product_id: string;
      products: { creator_id: string };
    };

    if (courseRel?.products?.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Permissão negada para atualizar este módulo.');
    }

    const updatePayload: Record<string, unknown> = {};
    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.orderIndex !== undefined) updatePayload.order_index = data.orderIndex;

    const { data: updated, error } = await this.client
      .from('modules')
      .update(updatePayload)
      .eq('id', moduleId)
      .select('id, title, order_index')
      .single();

    if (error || !updated) {
      throw new Error(`MODULE_UPDATE_FAILED: ${error?.message || 'Falha ao atualizar módulo.'}`);
    }

    return {
      id: updated.id,
      title: updated.title,
      orderIndex: updated.order_index,
    };
  }

  /**
   * Deletes a module and cascades lessons.
   * Defesa IDOR: Only creator can delete.
   */
  async deleteModule(moduleId: string, creatorId: string): Promise<boolean> {
    const { data: mod } = await this.client
      .from('modules')
      .select('id, course_id, courses(product_id, products(creator_id))')
      .eq('id', moduleId)
      .maybeSingle();

    if (!mod) {
      throw new Error('MODULE_NOT_FOUND: Módulo não encontrado.');
    }

    const courseRel = mod.courses as unknown as {
      product_id: string;
      products: { creator_id: string };
    };

    if (courseRel?.products?.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Permissão negada para excluir este módulo.');
    }

    const { error } = await this.client.from('modules').delete().eq('id', moduleId);

    if (error) {
      throw new Error(`MODULE_DELETE_FAILED: ${error.message}`);
    }

    return true;
  }

  /**
   * Creates a lesson in a module.
   * Defesa IDOR: Only creator can create lessons.
   */
  async createLesson(
    moduleId: string,
    creatorId: string,
    data: {
      title: string;
      contentType: LessonContentType;
      contentUrl?: string | null;
      bodyText?: string | null;
      orderIndex?: number;
    }
  ): Promise<LessonItem> {
    if (!data.title || data.title.trim() === '') {
      throw new Error('INVALID_DATA: Título da aula é obrigatório.');
    }

    const validTypes: LessonContentType[] = ['VIDEO', 'AUDIO', 'PDF', 'TEXT'];
    if (!validTypes.includes(data.contentType)) {
      throw new Error(`INVALID_CONTENT_TYPE: Tipo ${data.contentType} inválido.`);
    }

    // Verify creator owns the course
    const { data: mod } = await this.client
      .from('modules')
      .select('id, course_id, courses(product_id, products(creator_id))')
      .eq('id', moduleId)
      .maybeSingle();

    if (!mod) {
      throw new Error('MODULE_NOT_FOUND: Módulo não encontrado.');
    }

    const courseRel = mod.courses as unknown as {
      product_id: string;
      products: { creator_id: string };
    };

    if (courseRel?.products?.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Permissão negada para adicionar aula neste módulo.');
    }

    const { data: lesson, error } = await this.client
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: data.title.trim(),
        content_type: data.contentType,
        content_url: data.contentUrl || null,
        body_text: data.bodyText || null,
        order_index: data.orderIndex ?? 0,
      })
      .select('id, module_id, title, content_type, content_url, body_text, order_index, created_at')
      .single();

    if (error || !lesson) {
      throw new Error(`LESSON_CREATION_FAILED: ${error?.message || 'Falha ao criar aula.'}`);
    }

    return {
      id: lesson.id,
      moduleId: lesson.module_id,
      title: lesson.title,
      contentType: lesson.content_type,
      contentUrl: lesson.content_url,
      bodyText: lesson.body_text,
      orderIndex: lesson.order_index,
      createdAt: lesson.created_at,
    };
  }

  /**
   * Updates an existing lesson.
   * Defesa IDOR: Only creator can update.
   */
  async updateLesson(
    lessonId: string,
    creatorId: string,
    data: {
      title?: string;
      contentType?: LessonContentType;
      contentUrl?: string | null;
      bodyText?: string | null;
      orderIndex?: number;
    }
  ): Promise<LessonItem> {
    // 1. Verify ownership: lesson -> module -> course -> product -> creator
    const { data: lessonRec } = await this.client
      .from('lessons')
      .select('id, module_id, modules(courses(products(creator_id)))')
      .eq('id', lessonId)
      .maybeSingle();

    if (!lessonRec) {
      throw new Error('LESSON_NOT_FOUND: Aula não encontrada.');
    }

    const modRel = lessonRec.modules as unknown as {
      courses: { products: { creator_id: string } };
    };

    if (modRel?.courses?.products?.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Permissão negada para atualizar esta aula.');
    }

    const updatePayload: Record<string, unknown> = {};
    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.contentType !== undefined) updatePayload.content_type = data.contentType;
    if (data.contentUrl !== undefined) updatePayload.content_url = data.contentUrl;
    if (data.bodyText !== undefined) updatePayload.body_text = data.bodyText;
    if (data.orderIndex !== undefined) updatePayload.order_index = data.orderIndex;

    const { data: updated, error } = await this.client
      .from('lessons')
      .update(updatePayload)
      .eq('id', lessonId)
      .select('id, module_id, title, content_type, content_url, body_text, order_index, created_at')
      .single();

    if (error || !updated) {
      throw new Error(`LESSON_UPDATE_FAILED: ${error?.message || 'Falha ao atualizar aula.'}`);
    }

    return {
      id: updated.id,
      moduleId: updated.module_id,
      title: updated.title,
      contentType: updated.content_type,
      contentUrl: updated.content_url,
      bodyText: updated.body_text,
      orderIndex: updated.order_index,
      createdAt: updated.created_at,
    };
  }

  /**
   * Deletes a lesson.
   * Defesa IDOR: Only creator can delete.
   */
  async deleteLesson(lessonId: string, creatorId: string): Promise<boolean> {
    const { data: lessonRec } = await this.client
      .from('lessons')
      .select('id, module_id, modules(courses(products(creator_id)))')
      .eq('id', lessonId)
      .maybeSingle();

    if (!lessonRec) {
      throw new Error('LESSON_NOT_FOUND: Aula não encontrada.');
    }

    const modRel = lessonRec.modules as unknown as {
      courses: { products: { creator_id: string } };
    };

    if (modRel?.courses?.products?.creator_id !== creatorId) {
      throw new Error('FORBIDDEN: Permissão negada para excluir esta aula.');
    }

    const { error } = await this.client.from('lessons').delete().eq('id', lessonId);

    if (error) {
      throw new Error(`LESSON_DELETE_FAILED: ${error.message}`);
    }

    return true;
  }

  /**
   * Toggles completion status of a lesson for an entitled student.
   * Defesa INV-007: Only users with ACTIVE entitlement (or creator) can mark progress.
   */
  async toggleLessonProgress(
    lessonId: string,
    userId: string
  ): Promise<{ isCompleted: boolean; completedAt: string | null }> {
    // 1. Trace lesson to product to verify entitlement
    const { data: lesson } = await this.client
      .from('lessons')
      .select('id, module_id, modules(courses(product_id, products(creator_id)))')
      .eq('id', lessonId)
      .maybeSingle();

    if (!lesson) {
      throw new Error('LESSON_NOT_FOUND: Aula não encontrada.');
    }

    const modRel = lesson.modules as unknown as {
      courses: { product_id: string; products: { creator_id: string } };
    };
    const productId = modRel?.courses?.product_id;
    const creatorId = modRel?.courses?.products?.creator_id;

    if (!productId) {
      throw new Error('CORRUPT_HIERARCHY: Estrutura curricular inconsistente.');
    }

    // Verify user is creator OR has active entitlement
    const isCreator = creatorId === userId;
    if (!isCreator) {
      const hasAccess = await this.checkUserAccess(productId, userId);
      if (!hasAccess) {
        throw new Error('FORBIDDEN: Acesso negado. Adquira o curso para registrar seu progresso.');
      }
    }

    // 2. Check current progress
    const { data: progress } = await this.client
      .from('student_progress')
      .select('id, is_completed')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const now = new Date().toISOString();

    if (!progress) {
      // First time completing
      const { error: insertErr } = await this.client.from('student_progress').insert({
        user_id: userId,
        lesson_id: lessonId,
        is_completed: true,
        completed_at: now,
      });

      if (insertErr) {
        throw new Error(`PROGRESS_UPDATE_FAILED: ${insertErr.message}`);
      }

      return { isCompleted: true, completedAt: now };
    }

    // Toggle status
    const newStatus = !progress.is_completed;
    const completedAt = newStatus ? now : null;

    const { error: updateErr } = await this.client
      .from('student_progress')
      .update({
        is_completed: newStatus,
        completed_at: completedAt,
      })
      .eq('id', progress.id);

    if (updateErr) {
      throw new Error(`PROGRESS_UPDATE_FAILED: ${updateErr.message}`);
    }

    return { isCompleted: newStatus, completedAt };
  }
}
