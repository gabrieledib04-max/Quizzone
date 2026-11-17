import { create } from 'zustand';
import { categoryApi, QuestionPayload } from '../services/categoryApi';
import { Category, SavedQuestion } from '../types/shared';

interface CategoryStoreState {
  categories: Category[];
  selectedCategoryId: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadCategories: () => Promise<void>;
  selectCategory: (categoryId: string | null) => void;
  createCategory: (
    name: string,
    description?: string,
    color?: string
  ) => Promise<Category | null>;
  updateCategory: (
    categoryId: string,
    updates: { name?: string; description?: string; color?: string }
  ) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  addQuestion: (
    categoryId: string,
    payload: QuestionPayload
  ) => Promise<SavedQuestion | null>;
  updateQuestion: (
    categoryId: string,
    questionId: string,
    payload: Partial<QuestionPayload>
  ) => Promise<boolean>;
  deleteQuestion: (categoryId: string, questionId: string) => Promise<boolean>;
  moveQuestion: (
    categoryId: string,
    questionId: string,
    direction: 'up' | 'down'
  ) => Promise<boolean>;
  clearError: () => void;
}

export const useCategoryStore = create<CategoryStoreState>((set, get) => ({
  categories: [],
  selectedCategoryId: null,
  loading: false,
  saving: false,
  error: null,

  loadCategories: async () => {
    set({ loading: true, error: null });
    try {
      const categories = await categoryApi.fetchCategories();
      const currentSelected = get().selectedCategoryId;
      const stillExists = categories.some((c) => c.id === currentSelected);
      set({
        categories,
        selectedCategoryId: stillExists
          ? currentSelected
          : categories[0]?.id || null,
        loading: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore caricamento categorie.';
      set({ loading: false, error: message });
    }
  },

  selectCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId });
  },

  createCategory: async (name, description = '', color) => {
    set({ saving: true, error: null });
    try {
      const res = await categoryApi.createCategory(name, description, color);
      set({
        categories: res.categories,
        selectedCategoryId: res.category.id,
        saving: false,
      });
      return res.category;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore creazione categoria.';
      set({ saving: false, error: message });
      return null;
    }
  },

  updateCategory: async (categoryId, updates) => {
    set({ saving: true, error: null });
    try {
      const res = await categoryApi.updateCategory(categoryId, updates);
      set({ categories: res.categories, saving: false });
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore aggiornamento categoria.';
      set({ saving: false, error: message });
      return false;
    }
  },

  deleteCategory: async (categoryId) => {
    set({ saving: true, error: null });
    try {
      const categories = await categoryApi.deleteCategory(categoryId);
      const currentSelected = get().selectedCategoryId;
      set({
        categories,
        selectedCategoryId:
          currentSelected === categoryId
            ? categories[0]?.id || null
            : currentSelected,
        saving: false,
      });
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore eliminazione categoria.';
      set({ saving: false, error: message });
      return false;
    }
  },

  addQuestion: async (categoryId, payload) => {
    set({ saving: true, error: null });
    try {
      const res = await categoryApi.addQuestion(categoryId, payload);
      set({ categories: res.categories, saving: false });
      return res.question;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore salvataggio domanda.';
      set({ saving: false, error: message });
      return null;
    }
  },

  updateQuestion: async (categoryId, questionId, payload) => {
    set({ saving: true, error: null });
    try {
      const res = await categoryApi.updateQuestion(
        categoryId,
        questionId,
        payload
      );
      set({ categories: res.categories, saving: false });
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore modifica domanda.';
      set({ saving: false, error: message });
      return false;
    }
  },

  deleteQuestion: async (categoryId, questionId) => {
    set({ saving: true, error: null });
    try {
      const categories = await categoryApi.deleteQuestion(categoryId, questionId);
      set({ categories, saving: false });
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore eliminazione domanda.';
      set({ saving: false, error: message });
      return false;
    }
  },

  moveQuestion: async (categoryId, questionId, direction) => {
    const category = get().categories.find((c) => c.id === categoryId);
    if (!category) return false;

    const index = category.questions.findIndex((q) => q.id === questionId);
    if (index === -1) return false;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= category.questions.length) {
      return false;
    }

    const ids = category.questions.map((q) => q.id);
    const temp = ids[index];
    ids[index] = ids[targetIndex];
    ids[targetIndex] = temp;

    set({ saving: true, error: null });
    try {
      const categories = await categoryApi.reorderQuestions(categoryId, ids);
      set({ categories, saving: false });
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore riordino domande.';
      set({ saving: false, error: message });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
