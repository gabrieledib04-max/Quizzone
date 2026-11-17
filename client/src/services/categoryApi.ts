import { getServerUrl } from './socket';
import {
  Category,
  NetworkInfo,
  QuestionType,
  SavedQuestion,
} from '../types/shared';

export interface QuestionPayload {
  type: QuestionType;
  text: string;
  options: string[];
  correctOptionIndex: number;
  hostNote?: string;
}

const ADMIN_PASSWORD_KEY = 'livequiz_admin_password';

export function getAdminPassword(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(ADMIN_PASSWORD_KEY) || '';
}

export function setAdminPassword(password: string): void {
  if (typeof window === 'undefined') return;
  if (password) {
    sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
  } else {
    sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
  }
}

export function clearAdminPassword(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
}

function getAdminHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const password = getAdminPassword();
  if (password) {
    headers['x-admin-password'] = password;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Errore HTTP ${res.status}`);
  }
  return data;
}

export const categoryApi = {
  getAdminPassword,
  setAdminPassword,
  clearAdminPassword,

  async verifyAdminPassword(
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${getServerUrl()}/api/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAdminPassword(password);
        return { success: true };
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        success: false,
        error: data.error || 'Password amministratore errata.',
      };
    } catch {
      return {
        success: false,
        error: 'Impossibile contattare il server. Verifica la connessione.',
      };
    }
  },

  async getNetworkInfo(): Promise<NetworkInfo> {
    const res = await fetch(`${getServerUrl()}/api/network-info`);
    return handleResponse<NetworkInfo>(res);
  },

  async fetchCategories(): Promise<Category[]> {
    const res = await fetch(`${getServerUrl()}/api/categories`);
    const data = await handleResponse<{ categories: Category[] }>(res);
    return data.categories;
  },

  async createCategory(
    name: string,
    description = '',
    color?: string
  ): Promise<{ category: Category; categories: Category[] }> {
    const res = await fetch(`${getServerUrl()}/api/categories`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ name, description, color }),
    });
    return handleResponse<{ category: Category; categories: Category[] }>(res);
  },

  async updateCategory(
    categoryId: string,
    updates: { name?: string; description?: string; color?: string }
  ): Promise<{ category: Category; categories: Category[] }> {
    const res = await fetch(`${getServerUrl()}/api/categories/${categoryId}`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<{ category: Category; categories: Category[] }>(res);
  },

  async deleteCategory(categoryId: string): Promise<Category[]> {
    const res = await fetch(`${getServerUrl()}/api/categories/${categoryId}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    const data = await handleResponse<{ categories: Category[] }>(res);
    return data.categories;
  },

  async addQuestion(
    categoryId: string,
    payload: QuestionPayload
  ): Promise<{
    question: SavedQuestion;
    category: Category;
    categories: Category[];
  }> {
    const res = await fetch(
      `${getServerUrl()}/api/categories/${categoryId}/questions`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
    return handleResponse<{
      question: SavedQuestion;
      category: Category;
      categories: Category[];
    }>(res);
  },

  async updateQuestion(
    categoryId: string,
    questionId: string,
    payload: Partial<QuestionPayload>
  ): Promise<{
    question: SavedQuestion;
    category: Category;
    categories: Category[];
  }> {
    const res = await fetch(
      `${getServerUrl()}/api/categories/${categoryId}/questions/${questionId}`,
      {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
    return handleResponse<{
      question: SavedQuestion;
      category: Category;
      categories: Category[];
    }>(res);
  },

  async deleteQuestion(
    categoryId: string,
    questionId: string
  ): Promise<Category[]> {
    const res = await fetch(
      `${getServerUrl()}/api/categories/${categoryId}/questions/${questionId}`,
      {
        method: 'DELETE',
        headers: getAdminHeaders(),
      }
    );
    const data = await handleResponse<{ categories: Category[] }>(res);
    return data.categories;
  },

  async reorderQuestions(
    categoryId: string,
    questionIds: string[]
  ): Promise<Category[]> {
    const res = await fetch(
      `${getServerUrl()}/api/categories/${categoryId}/reorder`,
      {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ questionIds }),
      }
    );
    const data = await handleResponse<{ categories: Category[] }>(res);
    return data.categories;
  },
};
