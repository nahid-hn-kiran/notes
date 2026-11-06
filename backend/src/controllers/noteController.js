import { defaultStorage } from '../storage/noteStorage.js';
import {
  idParamSchema,
  createNoteSchema,
  updateNoteSchema,
} from '../validation/noteValidation.js';

export class NoteController {
  constructor(storage = defaultStorage) {
    this.storage = storage;
  }

  listNotes = async (req, res, next) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const notes = await this.storage.getAll({ search });

      return res.status(200).json({
        success: true,
        count: notes.length,
        data: notes,
      });
    } catch (err) {
      next(err);
    }
  };

  getNote = async (req, res, next) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const note = await this.storage.getById(id);

      if (!note) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Note with ID '${id}' was not found`,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: note,
      });
    } catch (err) {
      next(err);
    }
  };

  createNote = async (req, res, next) => {
    try {
      const validated = createNoteSchema.parse(req.body);
      const newNote = await this.storage.create(validated);

      return res.status(201).json({
        success: true,
        data: newNote,
      });
    } catch (err) {
      next(err);
    }
  };

  updateNote = async (req, res, next) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const updates = updateNoteSchema.parse(req.body);

      const updated = await this.storage.update(id, updates);

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Note with ID '${id}' was not found`,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  deleteNote = async (req, res, next) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const deleted = await this.storage.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Note with ID '${id}' was not found`,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Note deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  };
}

export const defaultNoteController = new NoteController();
