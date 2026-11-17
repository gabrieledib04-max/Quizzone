import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
  Category,
  CATEGORY_COLORS,
  QuestionType,
  SavedQuestion,
} from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CreateQuestionInput {
  type: QuestionType;
  text: string;
  options: string[];
  correctOptionIndex: number;
  hostNote?: string;
}

export interface UpdateQuestionInput {
  type?: QuestionType;
  text?: string;
  options?: string[];
  correctOptionIndex?: number;
  hostNote?: string;
}

interface LegacyQuizSet {
  id: string;
  title: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
  questions?: Array<{
    id: string;
    type: QuestionType;
    text: string;
    options?: string[];
    correctOptionIndex?: number;
    hostNote?: string;
    createdAt?: number;
    updatedAt?: number;
  }>;
}

interface PersistedLibraryData {
  version?: number;
  categories?: Category[];
  quizzes?: LegacyQuizSet[];
}

export class QuestionStore {
  private filePath: string;
  private categories: Category[] = [];
  private initialized: boolean = false;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(customFilePath?: string) {
    this.filePath =
      customFilePath ||
      path.resolve(__dirname, '..', 'data', 'quiz-library.json');
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedLibraryData;

      if (Array.isArray(parsed.categories)) {
        this.categories = parsed.categories.map((cat, idx) => ({
          id: cat.id || uuidv4(),
          name: cat.name || `Categoria ${idx + 1}`,
          description: cat.description || '',
          color:
            cat.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
          createdAt: cat.createdAt || Date.now(),
          updatedAt: cat.updatedAt || Date.now(),
          questions: Array.isArray(cat.questions)
            ? cat.questions.map((q) => ({
                id: q.id || uuidv4(),
                type: q.type || 'MULTIPLE_CHOICE',
                text: q.text || '',
                options: Array.isArray(q.options) ? [...q.options] : [],
                correctOptionIndex:
                  typeof q.correctOptionIndex === 'number'
                    ? q.correctOptionIndex
                    : -1,
                hostNote: q.hostNote,
                createdAt: q.createdAt || Date.now(),
                updatedAt: q.updatedAt || Date.now(),
              }))
            : [],
        }));
      } else if (Array.isArray(parsed.quizzes)) {
        // Migrazione automatica dalla vecchia struttura (quizzes -> categories senza punti)
        const now = Date.now();
        this.categories = parsed.quizzes.map((quiz, idx) => ({
          id: quiz.id || uuidv4(),
          name: quiz.title || `Categoria ${idx + 1}`,
          description: quiz.description || '',
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
          createdAt: quiz.createdAt || now,
          updatedAt: now,
          questions: (quiz.questions || []).map((q) => ({
            id: q.id || uuidv4(),
            type: q.type || 'MULTIPLE_CHOICE',
            text: q.text || '',
            options: Array.isArray(q.options) ? [...q.options] : [],
            correctOptionIndex:
              typeof q.correctOptionIndex === 'number'
                ? q.correctOptionIndex
                : -1,
            hostNote: q.hostNote,
            createdAt: q.createdAt || now,
            updatedAt: now,
          })),
        }));
        await this.persist();
      } else {
        this.categories = this.createDefaultCategories();
        await this.persist();
      }
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        this.categories = this.createDefaultCategories();
        await this.persist();
      } else {
        console.error(
          'Errore lettura archivio categorie, inizializzo predefinite:',
          err
        );
        this.categories = this.createDefaultCategories();
        await this.persist();
      }
    }

    this.initialized = true;
  }

  private createDefaultCategories(): Category[] {
    const now = Date.now();
    return [
      {
        id: uuidv4(),
        name: 'Cultura & Tecnologia',
        description:
          'Domande miste su tecnologia, innovazione e curiosità generali.',
        color: CATEGORY_COLORS[0],
        createdAt: now,
        updatedAt: now,
        questions: [
          {
            id: uuidv4(),
            type: 'MULTIPLE_CHOICE',
            text: 'Qual è il protocollo standard per la comunicazione real-time bidirezionale su Web?',
            options: ['HTTP/1.1', 'WebSocket', 'FTP', 'SMTP'],
            correctOptionIndex: 1,
            hostNote: 'WebSocket mantiene il canale aperto full-duplex.',
            createdAt: now,
            updatedAt: now,
          },
          {
            id: uuidv4(),
            type: 'MULTIPLE_CHOICE',
            text: 'In quale anno è stato presentato il primo iPhone da Steve Jobs?',
            options: ['2005', '2007', '2008', '2010'],
            correctOptionIndex: 1,
            hostNote: 'Gennaio 2007 al Macworld Expo.',
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
      {
        id: uuidv4(),
        name: 'Scienza & Spazio',
        description: 'Pianeti, fisica e scoperte scientifiche.',
        color: CATEGORY_COLORS[1],
        createdAt: now,
        updatedAt: now,
        questions: [
          {
            id: uuidv4(),
            type: 'MULTIPLE_CHOICE',
            text: 'Quale pianeta del sistema solare è conosciuto come il "Pianeta Rosso"?',
            options: ['Venere', 'Marte', 'Giove', 'Saturno'],
            correctOptionIndex: 1,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    ];
  }

  private persist(): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      const payload: PersistedLibraryData = {
        version: 2,
        categories: this.categories,
      };
      const json = JSON.stringify(payload, null, 2);
      const tmpPath = `${this.filePath}.${process.pid}.tmp`;
      try {
        await fs.writeFile(tmpPath, json, 'utf-8');
        await fs.rename(tmpPath, this.filePath);
      } catch {
        await fs.writeFile(this.filePath, json, 'utf-8');
        await fs.unlink(tmpPath).catch(() => {});
      }
    });
    return this.writeQueue;
  }

  public getCategories(): Category[] {
    return this.categories.map((cat) => ({
      ...cat,
      questions: cat.questions.map((item) => ({
        ...item,
        options: [...item.options],
      })),
    }));
  }

  public getCategoryById(categoryId: string): Category | undefined {
    return this.categories.find((c) => c.id === categoryId);
  }

  public async createCategory(
    name: string,
    description = '',
    color?: string
  ): Promise<Category> {
    await this.init();
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Il nome della categoria è obbligatorio.');
    }

    const chosenColor =
      color && CATEGORY_COLORS.includes(color as (typeof CATEGORY_COLORS)[number])
        ? color
        : CATEGORY_COLORS[this.categories.length % CATEGORY_COLORS.length];

    const now = Date.now();
    const category: Category = {
      id: uuidv4(),
      name: trimmedName,
      description: description.trim(),
      color: chosenColor,
      questions: [],
      createdAt: now,
      updatedAt: now,
    };

    this.categories.push(category);
    await this.persist();
    return category;
  }

  public async updateCategory(
    categoryId: string,
    updates: { name?: string; description?: string; color?: string }
  ): Promise<Category> {
    await this.init();
    const category = this.categories.find((c) => c.id === categoryId);
    if (!category) {
      throw new Error('Categoria non trovata.');
    }

    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) {
        throw new Error('Il nome della categoria non può essere vuoto.');
      }
      category.name = trimmed;
    }

    if (updates.description !== undefined) {
      category.description = updates.description.trim();
    }

    if (
      updates.color &&
      CATEGORY_COLORS.includes(updates.color as (typeof CATEGORY_COLORS)[number])
    ) {
      category.color = updates.color;
    }

    category.updatedAt = Date.now();
    await this.persist();
    return category;
  }

  public async deleteCategory(categoryId: string): Promise<void> {
    await this.init();
    const index = this.categories.findIndex((c) => c.id === categoryId);
    if (index === -1) {
      throw new Error('Categoria non trovata.');
    }

    this.categories.splice(index, 1);
    await this.persist();
  }

  private validateAndNormalizeQuestion(
    input: CreateQuestionInput
  ): Omit<SavedQuestion, 'id' | 'createdAt' | 'updatedAt'> {
    const text = input.text.trim();
    if (!text) {
      throw new Error('Il testo della domanda è obbligatorio.');
    }

    const hostNote = input.hostNote?.trim() || undefined;

    if (input.type === 'VOICE_ONLY') {
      return {
        type: 'VOICE_ONLY',
        text,
        options: [],
        correctOptionIndex: -1,
        hostNote,
      };
    }

    const cleanedOptions = input.options.map((opt) => opt.trim());
    if (cleanedOptions.length < 2 || cleanedOptions.length > 4) {
      throw new Error('Una domanda a risposta multipla richiede da 2 a 4 opzioni.');
    }
    if (cleanedOptions.some((opt) => !opt)) {
      throw new Error('Tutte le opzioni di risposta devono essere compilate.');
    }
    if (
      input.correctOptionIndex < 0 ||
      input.correctOptionIndex >= cleanedOptions.length
    ) {
      throw new Error('Seleziona una risposta corretta valida.');
    }

    return {
      type: 'MULTIPLE_CHOICE',
      text,
      options: cleanedOptions,
      correctOptionIndex: input.correctOptionIndex,
      hostNote,
    };
  }

  public async addQuestion(
    categoryId: string,
    input: CreateQuestionInput
  ): Promise<{ question: SavedQuestion; category: Category }> {
    await this.init();
    const category = this.categories.find((c) => c.id === categoryId);
    if (!category) {
      throw new Error('Categoria non trovata.');
    }

    const normalized = this.validateAndNormalizeQuestion(input);
    const now = Date.now();
    const question: SavedQuestion = {
      id: uuidv4(),
      ...normalized,
      createdAt: now,
      updatedAt: now,
    };

    category.questions.push(question);
    category.updatedAt = now;
    await this.persist();

    return { question, category };
  }

  public async updateQuestion(
    categoryId: string,
    questionId: string,
    updates: UpdateQuestionInput
  ): Promise<{ question: SavedQuestion; category: Category }> {
    await this.init();
    const category = this.categories.find((c) => c.id === categoryId);
    if (!category) {
      throw new Error('Categoria non trovata.');
    }

    const index = category.questions.findIndex((q) => q.id === questionId);
    if (index === -1) {
      throw new Error('Domanda non trovata.');
    }

    const existing = category.questions[index];
    const merged: CreateQuestionInput = {
      type: updates.type ?? existing.type,
      text: updates.text ?? existing.text,
      options: updates.options ?? existing.options,
      correctOptionIndex:
        updates.correctOptionIndex ?? existing.correctOptionIndex,
      hostNote:
        updates.hostNote !== undefined ? updates.hostNote : existing.hostNote,
    };

    const normalized = this.validateAndNormalizeQuestion(merged);
    const now = Date.now();
    const updated: SavedQuestion = {
      id: existing.id,
      ...normalized,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    category.questions[index] = updated;
    category.updatedAt = now;
    await this.persist();

    return { question: updated, category };
  }

  public async deleteQuestion(
    categoryId: string,
    questionId: string
  ): Promise<Category> {
    await this.init();
    const category = this.categories.find((c) => c.id === categoryId);
    if (!category) {
      throw new Error('Categoria non trovata.');
    }

    const index = category.questions.findIndex((q) => q.id === questionId);
    if (index === -1) {
      throw new Error('Domanda non trovata.');
    }

    category.questions.splice(index, 1);
    category.updatedAt = Date.now();
    await this.persist();
    return category;
  }

  public async reorderQuestions(
    categoryId: string,
    orderedIds: string[]
  ): Promise<Category> {
    await this.init();
    const category = this.categories.find((c) => c.id === categoryId);
    if (!category) {
      throw new Error('Categoria non trovata.');
    }

    const map = new Map(category.questions.map((q) => [q.id, q]));
    const reordered: SavedQuestion[] = [];

    for (const id of orderedIds) {
      const q = map.get(id);
      if (q) {
        reordered.push(q);
        map.delete(id);
      }
    }
    for (const q of map.values()) {
      reordered.push(q);
    }

    category.questions = reordered;
    category.updatedAt = Date.now();
    await this.persist();
    return category;
  }
}
