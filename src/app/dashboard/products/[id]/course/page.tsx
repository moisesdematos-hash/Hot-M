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
}

interface Module {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
}

interface CourseData {
  id: string;
  productId: string;
  title: string;
  description: string | null;
  modules: Module[];
}

export default function CreatorCourseEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: productId } = use(params);

  const [course, setCourse] = useState<CourseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New module modal/form
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [isSubmittingModule, setIsSubmittingModule] = useState(false);

  // New lesson form
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<'VIDEO' | 'AUDIO' | 'PDF' | 'TEXT'>('VIDEO');
  const [lessonUrl, setLessonUrl] = useState('');
  const [lessonBody, setLessonBody] = useState('');
  const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);

  const loadCurriculum = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/lms/courses/${productId}`);
      const data = await res.json();

      if (res.ok) {
        setCourse(data);
      } else {
        setError(data.error || 'Falha ao carregar grade do curso.');
      }
    } catch {
      setError('Erro de conexão ao carregar dados do curso.');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    setIsSubmittingModule(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/v1/lms/courses/${productId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newModuleTitle.trim(),
          orderIndex: course?.modules.length ?? 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar módulo.');
      }

      setSuccess('Módulo criado com sucesso!');
      setNewModuleTitle('');
      setIsAddingModule(false);
      await loadCurriculum();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao criar módulo.');
    } finally {
      setIsSubmittingModule(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Deseja realmente excluir este módulo e todas as suas aulas?')) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/v1/lms/modules/${moduleId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir módulo.');
      }

      setSuccess('Módulo excluído com sucesso.');
      await loadCurriculum();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir módulo.');
    }
  };

  const handleCreateLesson = async (e: React.FormEvent, moduleId: string) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;

    setIsSubmittingLesson(true);
    setError(null);
    setSuccess(null);

    try {
      const currentMod = course?.modules.find((m) => m.id === moduleId);
      const res = await fetch(`/api/v1/lms/modules/${moduleId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: lessonTitle.trim(),
          contentType: lessonType,
          contentUrl: lessonUrl.trim() || undefined,
          bodyText: lessonBody.trim() || undefined,
          orderIndex: currentMod?.lessons.length ?? 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao adicionar aula.');
      }

      setSuccess('Aula adicionada com sucesso!');
      setLessonTitle('');
      setLessonUrl('');
      setLessonBody('');
      setActiveModuleForLesson(null);
      await loadCurriculum();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar aula.');
    } finally {
      setIsSubmittingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Deseja realmente remover esta aula?')) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/v1/lms/lessons/${lessonId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao remover aula.');
      }

      setSuccess('Aula excluída com sucesso.');
      await loadCurriculum();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao remover aula.');
    }
  };

  const totalLessons = course?.modules.reduce((acc, m) => acc + m.lessons.length, 0) ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
              <Link href="/dashboard/products" className="hover:text-blue-600 transition-colors">
                Produtos
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-medium">Gestão do Curso (LMS)</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Grade Curricular: {course?.title || 'Curso Digital'}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/library/courses/${productId}`}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              Visualizar como Aluno
            </Link>
            <button
              onClick={() => setIsAddingModule(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
            >
              + Novo Módulo
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold ml-2">✕</button>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Módulos</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{course?.modules.length ?? 0}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Aulas</span>
            <p className="text-2xl font-black text-blue-600 mt-1">{totalLessons}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entrega</span>
            <p className="text-base font-bold text-emerald-600 mt-2">Área de Membros Nativa</p>
          </div>
        </div>

        {/* Add module form modal */}
        {isAddingModule && (
          <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm bg-blue-50/20">
            <h3 className="text-base font-bold text-slate-900 mb-4">Adicionar Novo Módulo</h3>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Módulo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Módulo 1 — Fundamentos do Negócio Digital"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddingModule(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModule}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmittingModule ? 'Salvando...' : 'Salvar Módulo'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-sm animate-pulse">Carregando módulos e aulas do curso...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!course?.modules || course.modules.length === 0) && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              📚
            </div>
            <h3 className="text-base font-semibold text-slate-900">Nenhum módulo criado ainda</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Comece adicionando módulos para estruturar as etapas de aprendizado dos seus alunos.
            </p>
            <button
              onClick={() => setIsAddingModule(true)}
              className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Criar Primeiro Módulo
            </button>
          </div>
        )}

        {/* Modules & Lessons List */}
        {!isLoading && course?.modules && course.modules.length > 0 && (
          <div className="space-y-4">
            {course.modules.map((mod, modIdx) => (
              <div
                key={mod.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Module Header */}
                <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {modIdx + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{mod.title}</h3>
                      <p className="text-xs text-slate-500">{mod.lessons.length} aulas cadastradas</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setActiveModuleForLesson(activeModuleForLesson === mod.id ? null : mod.id);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      + Nova Aula
                    </button>
                    <button
                      onClick={() => handleDeleteModule(mod.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Excluir Módulo
                    </button>
                  </div>
                </div>

                {/* Add Lesson Form */}
                {activeModuleForLesson === mod.id && (
                  <div className="p-5 bg-blue-50/30 border-b border-blue-100">
                    <h4 className="text-sm font-bold text-slate-900 mb-3">Adicionar Aula ao Módulo {modIdx + 1}</h4>
                    <form onSubmit={(e) => handleCreateLesson(e, mod.id)} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Título da Aula</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Aula 01 — Boas-vindas e Visão Geral"
                            value={lessonTitle}
                            onChange={(e) => setLessonTitle(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Conteúdo</label>
                          <select
                            value={lessonType}
                            onChange={(e) => setLessonType(e.target.value as 'VIDEO' | 'AUDIO' | 'PDF' | 'TEXT')}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="VIDEO">Vídeo (YouTube / Vimeo / MP4)</option>
                            <option value="AUDIO">Áudio / Podcast</option>
                            <option value="PDF">Material PDF / Ebook</option>
                            <option value="TEXT">Artigo / Texto</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          URL do Conteúdo {lessonType === 'VIDEO' ? '(Embed ou link MP4/YouTube)' : '(Download ou mídia)'}
                        </label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={lessonUrl}
                          onChange={(e) => setLessonUrl(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Notas, Material de Apoio ou Transcrição
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Texto de apoio, resumo dos conceitos e links complementares..."
                          value={lessonBody}
                          onChange={(e) => setLessonBody(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setActiveModuleForLesson(null)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingLesson}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isSubmittingLesson ? 'Salvando...' : 'Adicionar Aula'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Lessons in module */}
                {mod.lessons.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400">
                    Nenhuma aula cadastrada neste módulo ainda.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {mod.lessons.map((lesson, lIdx) => (
                      <div
                        key={lesson.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-bold text-slate-400 w-5 text-right">
                            {lIdx + 1}.
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            lesson.contentType === 'VIDEO'
                              ? 'bg-red-50 text-red-600'
                              : lesson.contentType === 'AUDIO'
                              ? 'bg-purple-50 text-purple-600'
                              : lesson.contentType === 'PDF'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {lesson.contentType}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{lesson.title}</p>
                            {lesson.contentUrl && (
                              <p className="text-xs text-slate-400 font-mono truncate max-w-md">
                                {lesson.contentUrl}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors text-xs"
                            title="Remover aula"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
