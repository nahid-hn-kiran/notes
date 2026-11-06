import { Router } from 'express';
import { defaultNoteController } from '../controllers/noteController.js';

export function createNoteRouter(controller = defaultNoteController) {
  const router = Router();

  router.get('/', controller.listNotes);
  router.post('/', controller.createNote);
  router.get('/:id', controller.getNote);
  router.patch('/:id', controller.updateNote);
  router.delete('/:id', controller.deleteNote);

  return router;
}

export const noteRouter = createNoteRouter();
