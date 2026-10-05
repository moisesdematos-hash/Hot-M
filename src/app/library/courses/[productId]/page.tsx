'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';

interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  contentType: 'VIDEO' | 'AUDIO' | 'PDF' | 'TEXT';
  contentUrl: string | null;
  bodyText: string | null;
  orderIndex: number;
  isCompleted: boolean;
  completedAt: string | null;
  isLocked: boolean;
}

interface Module {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
}

interface CourseCurriculum {
  id: string;
  productId: string;
  title: string;
  description: string | null;
  hasAccess: boolean;
  modules: Module[];
  progress: {
    totalLessons: number;
    completedLessons: number;
    percentage: number;
  };
}

export default function StudentCourseClassroomPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);

  const [curriculum, setCurriculum] = useState<CourseCurriculum | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingProgress, setIsTogglingProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/lms/courses/${productId}`);
      const data = await res.json();

      if (res.ok) {
        setCurriculum(data);
        // Default to first lesson if none selected
        if (!activeLessonId && data.modules && data.modules.length > 0) {
          const firstMod = data.modules[0];
          if (firstMod?.lessons && firstMod.lessons.length > 0) {
            setActiveLessonId(firstMod.lessons[0]!.id);
          }
        }
      } else {
        setError(data.error || 'Erro ao carregar o curso.');
      }
    } catch {
      setError('Falha de conexão com a plataforma de aprendizagem.');
    } finally {
      setIsLoading(false);
    }
  }, [productId, activeLessonId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // Flatten lessons for linear navigation (Prev / Next)
  const allLessons: Lesson[] = [];
  if (curriculum?.modules) {
    for (const mod of curriculum.modules) {
      for (const l of mod.lessons) {
        allLessons.push(l);
      }
    }
  }

  const currentLessonIndex = allLessons.findIndex((l) => l.id === activeLessonId);
  const currentLesson = currentLessonIndex !== -1 ? allLessons[currentLessonIndex] : null;

  const handleToggleProgress = async (lessonId: string) => {
    setIsTogglingProgress(true);
    try {
      const res = await fetch(`/api/v1/lms/lessons/${lessonId}/progress`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok) {
        // Optimistically update in place
        setCurriculum((prev) => {
          if (!prev) return null;
          let newlyCompletedCount = prev.progress.completedLessons;
          const updatedModules = prev.modules.map((m) => ({
            ...m,
            lessons: m.lessons.map((l) => {
              if (l.id === lessonId) {
                if (data.isCompleted && !l.isCompleted) newlyCompletedCount++;
                if (!data.isCompleted && l.isCompleted) newlyCompletedCount--;
                return {
                  ...l,
                  isCompleted: data.isCompleted,
                  completedAt: data.completedAt,
                };
              }
              return l;
            }),
          }));

          const pct =
            prev.progress.totalLessons > 0
              ? Math.round((newlyCompletedCount / prev.progress.totalLessons) * 100)
              : 0;

          return {
            ...prev,
            modules: updatedModules,
            progress: {
              ...prev.progress,
              completedLessons: newlyCompletedCount,
              percentage: pct,
            },
          };
        });
      }
    } catch {
      // non-blocking
    } finally {
      setIsTogglingProgress(false);
    }
  };

  const handleNextLesson = () => {
    if (currentLessonIndex < allLessons.length - 1) {
      const next = allLessons[currentLessonIndex + 1];
      if (next) setActiveLessonId(next.id);
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      const prev = allLessons[currentLessonIndex - 1];
      if (prev) setActiveLessonId(prev.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Carregando sala de aula...</p>
      </div>
    );
  }

  if (error || !curriculum) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl text-center border border-slate-700">
          <p className="text-red-400 font-semibold mb-4">{error || 'Curso não encontrado.'}</p>
          <Link
            href="/library"
            className="inline-flex px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Voltar para Meus Produtos
          </Link>
        </div>
      </div>
    );
  }

  // DRM & Entitlement Gate: Access Denied barrier
  if (!curriculum.hasAccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-900/40 text-blue-400 border border-blue-700/50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl font-black">
            🔒
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{curriculum.title}</h2>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            Este conteúdo é exclusivo para alunos matriculados com acesso ativo.
          </p>
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/library"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Meus Produtos
            </Link>
            <Link
              href={`/products`}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all"
            >
              Adquirir Curso
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/library"
            className="text-slate-400 hover:text-white transition-colors text-xs flex items-center space-x-1"
          >
            <span>←</span>
            <span>Biblioteca</span>
          </Link>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
            {curriculum.title}
          </h1>
        </div>

        {/* Global Progress */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400">Progresso</span>
            <p className="text-xs font-bold text-blue-400">
              {curriculum.progress.completedLessons} de {curriculum.progress.totalLessons} aulas ({curriculum.progress.percentage}%)
            </p>
          </div>
          <div className="w-24 sm:w-32 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${curriculum.progress.percentage}%` }}
            />
          </div>
        </div>
      </header>

      {/* Classroom Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-5xl mx-auto w-full">
          {currentLesson ? (
            <div className="space-y-6">
              {/* Media Player Container */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl aspect-video relative flex items-center justify-center">
                {currentLesson.contentType === 'VIDEO' ? (
                  currentLesson.contentUrl ? (
                    currentLesson.contentUrl.includes('youtube.com') ||
                    currentLesson.contentUrl.includes('youtu.be') ||
                    currentLesson.contentUrl.includes('vimeo.com') ? (
                      <iframe
                        src={
                          currentLesson.contentUrl.includes('youtube.com/watch?v=')
                            ? currentLesson.contentUrl.replace('watch?v=', 'embed/')
                            : currentLesson.contentUrl.includes('youtu.be/')
                            ? currentLesson.contentUrl.replace('youtu.be/', 'youtube.com/embed/')
                            : currentLesson.contentUrl
                        }
                        title={currentLesson.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={currentLesson.contentUrl}
                        controls
                        className="w-full h-full bg-black object-contain"
                      />
                    )
                  ) : (
                    <div className="text-center p-6 text-slate-500">
                      <div className="text-3xl mb-2">🎬</div>
                      <p className="text-sm">Nenhum link de vídeo configurado nesta aula.</p>
                    </div>
                  )
                ) : currentLesson.contentType === 'AUDIO' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-900">
                    <div className="text-4xl mb-4">🎙️</div>
                    <audio src={currentLesson.contentUrl || ''} controls className="w-full max-w-md" />
                  </div>
                ) : currentLesson.contentType === 'PDF' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-900">
                    <div className="text-4xl mb-3">📄</div>
                    <p className="text-sm font-semibold mb-3">Material Complementar em PDF</p>
                    {currentLesson.contentUrl && (
                      <a
                        href={currentLesson.contentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 bg-blue-600 rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors shadow-lg"
                      >
                        Baixar Arquivo PDF
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-900 text-slate-300">
                    <div className="text-4xl mb-2">📖</div>
                    <p className="text-sm font-semibold">Leitura e Exercícios</p>
                  </div>
                )}
              </div>

              {/* Lesson Info & Actions Bar */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-blue-400 uppercase">
                    Aula Atual
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">{currentLesson.title}</h2>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleToggleProgress(currentLesson.id)}
                    disabled={isTogglingProgress}
                    className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                      currentLesson.isCompleted
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <span>{currentLesson.isCompleted ? '✓ Concluída' : 'Marcar como Concluída'}</span>
                  </button>
                </div>
              </div>

              {/* Lesson Body / Notes */}
              {currentLesson.bodyText && (
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-slate-200">Material de Apoio e Resumo</h3>
                  <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                    {currentLesson.bodyText}
                  </div>
                </div>
              )}

              {/* Navigation buttons: Prev / Next */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={handlePrevLesson}
                  disabled={currentLessonIndex <= 0}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Aula Anterior
                </button>
                <button
                  onClick={handleNextLesson}
                  disabled={currentLessonIndex >= allLessons.length - 1}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima Aula →
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">
              <p>Nenhuma aula disponível no curso.</p>
            </div>
          )}
        </main>

        {/* Sidebar: Modules & Lessons Curriculum */}
        <aside className="w-full lg:w-80 xl:w-96 bg-slate-900/60 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
            Grade Curricular
          </h3>
          <div className="space-y-4">
            {curriculum.modules.map((mod, modIdx) => (
              <div key={mod.id} className="space-y-1.5">
                <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Módulo {modIdx + 1}: {mod.title}</span>
                  <span className="text-[10px] text-slate-500">
                    {mod.lessons.filter((l) => l.isCompleted).length}/{mod.lessons.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {mod.lessons.map((lesson) => {
                    const isActive = lesson.id === activeLessonId;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white font-semibold shadow-md'
                            : 'bg-slate-900/40 hover:bg-slate-800 text-slate-300 border border-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              lesson.isCompleted
                                ? isActive
                                  ? 'bg-white text-blue-600'
                                  : 'bg-emerald-500 text-white'
                                : isActive
                                ? 'bg-blue-700 text-white'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {lesson.isCompleted ? '✓' : '•'}
                          </span>
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        <span className="text-[10px] opacity-60 uppercase font-mono">
                          {lesson.contentType}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
