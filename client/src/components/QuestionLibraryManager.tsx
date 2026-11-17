import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '../store/categoryStore';
import {
  Category,
  CATEGORY_COLORS,
  QuestionType,
  SavedQuestion,
} from '../types/shared';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Database,
  Dices,
  Edit3,
  FolderPlus,
  Mic,
  Play,
  Plus,
  Save,
  Tag,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

interface QuestionLibraryManagerProps {
  onLaunchQuestion?: (
    question: SavedQuestion,
    category: Category,
    index: number,
    armImmediately: boolean
  ) => void;
  activeQuestionId?: string | null;
}

export const QuestionLibraryManager: React.FC<QuestionLibraryManagerProps> = ({
  onLaunchQuestion,
  activeQuestionId,
}) => {
  const categories = useCategoryStore((s) => s.categories);
  const selectedCategoryId = useCategoryStore((s) => s.selectedCategoryId);
  const loading = useCategoryStore((s) => s.loading);
  const saving = useCategoryStore((s) => s.saving);
  const error = useCategoryStore((s) => s.error);

  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const selectCategory = useCategoryStore((s) => s.selectCategory);
  const createCategory = useCategoryStore((s) => s.createCategory);
  const updateCategory = useCategoryStore((s) => s.updateCategory);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);
  const addQuestion = useCategoryStore((s) => s.addQuestion);
  const updateQuestion = useCategoryStore((s) => s.updateQuestion);
  const deleteQuestion = useCategoryStore((s) => s.deleteQuestion);
  const moveQuestion = useCategoryStore((s) => s.moveQuestion);
  const clearError = useCategoryStore((s) => s.clearError);

  // Stato creazione/modifica categoria
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatColor, setNewCatColor] = useState<string>(CATEGORY_COLORS[0]);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatColor, setEditCatColor] = useState<string>(CATEGORY_COLORS[0]);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(
    null
  );

  // Stato form domanda
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null
  );
  const [qType, setQType] = useState<QuestionType>('MULTIPLE_CHOICE');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrectIndex, setQCorrectIndex] = useState<number>(0);
  const [qHostNote, setQHostNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) || categories[0] || null;

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQType('MULTIPLE_CHOICE');
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrectIndex(0);
    setQHostNote('');
    setFormError(null);
  };

  const openNewQuestionForm = () => {
    resetQuestionForm();
    setShowQuestionForm(true);
  };

  const openEditQuestionForm = (question: SavedQuestion) => {
    setEditingQuestionId(question.id);
    setQType(question.type);
    setQText(question.text);
    setQOptions(
      question.options.length === 4
        ? [...question.options]
        : [
            question.options[0] || '',
            question.options[1] || '',
            question.options[2] || '',
            question.options[3] || '',
          ]
    );
    setQCorrectIndex(
      question.correctOptionIndex >= 0 ? question.correctOptionIndex : 0
    );
    setQHostNote(question.hostNote || '');
    setFormError(null);
    setShowQuestionForm(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const created = await createCategory(
      newCatName.trim(),
      newCatDesc.trim(),
      newCatColor
    );
    if (created) {
      setNewCatName('');
      setNewCatDesc('');
      setNewCatColor(
        CATEGORY_COLORS[(categories.length + 1) % CATEGORY_COLORS.length]
      );
      setShowNewCatForm(false);
    }
  };

  const handleSaveEditCategory = async (categoryId: string) => {
    if (!editCatName.trim()) return;
    const ok = await updateCategory(categoryId, {
      name: editCatName.trim(),
      description: editCatDesc.trim(),
      color: editCatColor,
    });
    if (ok) {
      setEditingCatId(null);
    }
  };

  const validateQuestionForm = (): boolean => {
    if (!qText.trim()) {
      setFormError('Inserisci il testo della domanda.');
      return false;
    }
    if (qType === 'MULTIPLE_CHOICE') {
      if (qOptions.some((o) => !o.trim())) {
        setFormError('Compila tutte e 4 le opzioni A, B, C, D.');
        return false;
      }
    }
    setFormError(null);
    return true;
  };

  const handleSaveQuestion = async (launchMode?: 'locked' | 'armed') => {
    if (!selectedCategory) return;
    if (!validateQuestionForm()) return;

    const payload = {
      type: qType,
      text: qText.trim(),
      options: qType === 'MULTIPLE_CHOICE' ? qOptions.map((o) => o.trim()) : [],
      correctOptionIndex: qType === 'MULTIPLE_CHOICE' ? qCorrectIndex : -1,
      hostNote: qHostNote.trim() || undefined,
    };

    if (editingQuestionId) {
      const ok = await updateQuestion(
        selectedCategory.id,
        editingQuestionId,
        payload
      );
      if (ok) {
        resetQuestionForm();
        setShowQuestionForm(false);
      }
    } else {
      const created = await addQuestion(selectedCategory.id, payload);
      if (created) {
        if (launchMode && onLaunchQuestion) {
          const updatedCat = useCategoryStore
            .getState()
            .categories.find((c) => c.id === selectedCategory.id);
          const idx = updatedCat
            ? updatedCat.questions.findIndex((q) => q.id === created.id)
            : -1;
          if (updatedCat && idx >= 0) {
            onLaunchQuestion(created, updatedCat, idx, launchMode === 'armed');
          }
        }
        resetQuestionForm();
        setShowQuestionForm(false);
      }
    }
  };

  const handleLaunchRandomFromCategory = () => {
    if (!selectedCategory || !onLaunchQuestion) return;
    if (selectedCategory.questions.length === 0) return;

    const candidates = selectedCategory.questions.filter(
      (q) => q.id !== activeQuestionId
    );
    const pool =
      candidates.length > 0 ? candidates : selectedCategory.questions;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const idx = selectedCategory.questions.findIndex((q) => q.id === chosen.id);
    onLaunchQuestion(chosen, selectedCategory, idx >= 0 ? idx : 0, false);
  };

  return (
    <div className="space-y-5 w-full">
      {/* Banner Persistenza */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Archivio persistente attivo: categorie e domande restano salvate su server anche dopo un riavvio.
          </span>
        </div>
        {saving && (
          <span className="font-bold text-amber-300 animate-pulse shrink-0">
            Salvataggio in corso...
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-sm font-semibold rounded-xl">
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="p-1 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Layout a 2 colonne su desktop: Categorie | Domande */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLONNA SINISTRA: CATEGORIE */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                  Categorie
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCatForm((v) => !v)}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-all"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Nuova</span>
              </button>
            </div>

            {showNewCatForm && (
              <form
                onSubmit={handleCreateCategory}
                className="p-3 bg-slate-900 border border-indigo-500/40 rounded-xl space-y-2.5"
              >
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome categoria (es. Storia, Cinema...)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Descrizione opzionale"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div>
                  <span className="block text-[11px] font-bold text-slate-400 mb-1.5">
                    Colore Categoria
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewCatColor(col)}
                        className={`w-6 h-6 rounded-full transition-all ${
                          newCatColor === col
                            ? 'ring-2 ring-white scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewCatForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={!newCatName.trim() || saving}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
                  >
                    Crea Categoria
                  </button>
                </div>
              </form>
            )}

            {loading && categories.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Caricamento categorie...
              </p>
            ) : categories.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Nessuna categoria salvata. Creane una con "+ Nuova"!
              </p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => {
                  const isSelected = selectedCategory?.id === category.id;
                  const isEditing = editingCatId === category.id;
                  const isConfirmingDelete = confirmDeleteCatId === category.id;

                  return (
                    <div
                      key={category.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/70'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editCatDesc}
                            onChange={(e) => setEditCatDesc(e.target.value)}
                            placeholder="Descrizione opzionale"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {CATEGORY_COLORS.map((col) => (
                              <button
                                key={col}
                                type="button"
                                onClick={() => setEditCatColor(col)}
                                className={`w-5 h-5 rounded-full ${
                                  editCatColor === col
                                    ? 'ring-2 ring-white scale-110'
                                    : 'opacity-65'
                                }`}
                                style={{ backgroundColor: col }}
                              />
                            ))}
                          </div>
                          <div className="flex justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCatId(null)}
                              className="p-1.5 bg-slate-800 text-slate-300 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditCategory(category.id)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              selectCategory(category.id);
                              setConfirmDeleteCatId(null);
                              setShowQuestionForm(false);
                            }}
                            className="text-left flex-1 min-w-0 flex items-start space-x-2.5"
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 mt-1 shadow-sm"
                              style={{ backgroundColor: category.color }}
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-white text-sm truncate">
                                {category.name}
                              </h4>
                              <span className="text-xs text-slate-400">
                                {category.questions.length}{' '}
                                {category.questions.length === 1
                                  ? 'domanda'
                                  : 'domande'}
                              </span>
                            </div>
                          </button>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatId(category.id);
                                setEditCatName(category.name);
                                setEditCatDesc(category.description || '');
                                setEditCatColor(category.color);
                              }}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Modifica categoria"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {isConfirmingDelete ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await deleteCategory(category.id);
                                  setConfirmDeleteCatId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 text-white text-[11px] font-bold rounded"
                              >
                                Conferma
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCatId(category.id)}
                                className="p-1 text-slate-400 hover:text-rose-400"
                                title="Elimina categoria"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLONNA DESTRA: DOMANDE DELLA CATEGORIA */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedCategory ? (
            <div className="bg-card border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
              Crea o seleziona una categoria a sinistra per aggiungere le tue domande salvate.
            </div>
          ) : (
            <>
              {/* Header Categoria + Pulsanti Azione */}
              <div className="bg-card border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                    <h3 className="text-lg font-black text-white">
                      {selectedCategory.name}
                    </h3>
                  </div>
                  {selectedCategory.description && (
                    <p className="text-xs text-slate-400">
                      {selectedCategory.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {onLaunchQuestion && selectedCategory.questions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleLaunchRandomFromCategory}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all active:scale-95"
                      title="Lancia una domanda casuale da questa categoria"
                    >
                      <Dices className="w-4 h-4" />
                      <span>Casuale</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (showQuestionForm && !editingQuestionId) {
                        setShowQuestionForm(false);
                      } else {
                        openNewQuestionForm();
                      }
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Aggiungi Domanda</span>
                  </button>
                </div>
              </div>

              {/* FORM AGGIUNGI / MODIFICA DOMANDA */}
              {showQuestionForm && (
                <div className="bg-card border border-indigo-500/50 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-white text-base">
                      {editingQuestionId
                        ? `Modifica Domanda in "${selectedCategory.name}"`
                        : `Nuova Domanda in "${selectedCategory.name}"`}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuestionForm(false);
                        resetQuestionForm();
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {formError && (
                    <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-bold rounded-xl">
                      {formError}
                    </div>
                  )}

                  {/* Tipo Domanda */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQType('MULTIPLE_CHOICE')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        qType === 'MULTIPLE_CHOICE'
                          ? 'bg-indigo-600/30 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Opzioni A/B/C/D sul PC + Buzzer sul Telefono
                    </button>
                    <button
                      type="button"
                      onClick={() => setQType('VOICE_ONLY')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                        qType === 'VOICE_ONLY'
                          ? 'bg-indigo-600/30 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Domanda Solo a Voce + Buzzer</span>
                    </button>
                  </div>

                  {/* Testo Domanda */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Testo della Domanda (visibile su Telefono e PC)
                    </label>
                    <textarea
                      rows={2}
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder="Scrivi qui la domanda..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Opzioni A/B/C/D (solo per MULTIPLE_CHOICE) */}
                  {qType === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-amber-300">
                        Opzioni di Risposta (visibili SOLO sul PC principale, nascoste sui telefoni):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {qOptions.map((opt, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-slate-400">
                                Opzione {String.fromCharCode(65 + idx)}
                              </label>
                              <button
                                type="button"
                                onClick={() => setQCorrectIndex(idx)}
                                className={`text-xs px-2 py-0.5 rounded font-bold transition-all ${
                                  qCorrectIndex === idx
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {qCorrectIndex === idx
                                  ? '✓ Corretta'
                                  : 'Segna corretta'}
                              </button>
                            </div>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const next = [...qOptions];
                                next[idx] = e.target.value;
                                setQOptions(next);
                              }}
                              placeholder={`Risposta ${String.fromCharCode(65 + idx)}`}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nota Conduttore */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Nota / Soluzione per il Conduttore (opzionale, visibile solo ad Admin)
                    </label>
                    <input
                      type="text"
                      value={qHostNote}
                      onChange={(e) => setQHostNote(e.target.value)}
                      placeholder="Es: Risposta corretta o curiosità da leggere..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-sm"
                    />
                  </div>

                  {/* Azioni Salvataggio */}
                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuestionForm(false);
                        resetQuestionForm();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Annulla
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveQuestion()}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
                    >
                      <Save className="w-4 h-4" />
                      <span>
                        {editingQuestionId
                          ? 'Salva Modifiche'
                          : 'Salva nella Categoria'}
                      </span>
                    </button>

                    {!editingQuestionId && onLaunchQuestion && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveQuestion('locked')}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Salva e Lancia</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* LISTA DOMANDE SALVATE */}
              <div className="space-y-3">
                {selectedCategory.questions.length === 0 ? (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                    Questa categoria è ancora vuota. Clicca{' '}
                    <strong>"+ Aggiungi Domanda"</strong> per inserire la tua prima domanda!
                  </div>
                ) : (
                  selectedCategory.questions.map((question, idx) => {
                    const isCurrentlyActive = activeQuestionId === question.id;

                    return (
                      <div
                        key={question.id}
                        className={`bg-card border rounded-2xl p-4 space-y-3 transition-all ${
                          isCurrentlyActive
                            ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                                #{idx + 1}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  question.type === 'VOICE_ONLY'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                }`}
                              >
                                {question.type === 'VOICE_ONLY'
                                  ? 'Solo Voce'
                                  : 'Multipla (PC)'}
                              </span>
                              {isCurrentlyActive && (
                                <span className="text-[11px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                                  ● IN CORSO
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-white text-base">
                              {question.text}
                            </h4>
                          </div>

                          {/* Azioni riga */}
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0 || saving}
                              onClick={() =>
                                moveQuestion(selectedCategory.id, question.id, 'up')
                              }
                              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Sposta su"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={
                                idx === selectedCategory.questions.length - 1 ||
                                saving
                              }
                              onClick={() =>
                                moveQuestion(
                                  selectedCategory.id,
                                  question.id,
                                  'down'
                                )
                              }
                              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Sposta giù"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditQuestionForm(question)}
                              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400"
                              title="Modifica domanda"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                deleteQuestion(selectedCategory.id, question.id)
                              }
                              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
                              title="Elimina domanda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Opzioni */}
                        {question.type === 'MULTIPLE_CHOICE' &&
                          question.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {question.options.map((opt, optIdx) => {
                                const isRight =
                                  question.correctOptionIndex === optIdx;
                                return (
                                  <div
                                    key={optIdx}
                                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                                      isRight
                                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                                        : 'bg-slate-900/70 border-slate-800 text-slate-300'
                                    }`}
                                  >
                                    <span>
                                      {String.fromCharCode(65 + optIdx)}. {opt}
                                    </span>
                                    {isRight && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        {question.hostNote && (
                          <p className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                            📝 Nota conduttore: {question.hostNote}
                          </p>
                        )}

                        {onLaunchQuestion && (
                          <div className="flex flex-wrap justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                onLaunchQuestion(
                                  question,
                                  selectedCategory,
                                  idx,
                                  false
                                )
                              }
                              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-all"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Lancia (Buzzer Bloccato)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onLaunchQuestion(
                                  question,
                                  selectedCategory,
                                  idx,
                                  true
                                )
                              }
                              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow transition-all"
                            >
                              <Zap className="w-3.5 h-3.5 fill-white" />
                              <span>Lancia & Apri Buzzer</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
