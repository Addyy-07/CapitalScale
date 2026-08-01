import express from 'express';

import ExtractionController from '../../controllers/extraction.controller.js';
import { protect, authorizeRoles, requireInternalSecret, ROLES } from '../../middleware/auth.js';











const router = express.Router();





// ─── Internal-only AI-service → backend callback routes ──────────────────────────
// BUG-03 FIX (extended): These routes are called by the Python AI service
// with x-internal-secret header. Apply requireInternalSecret here.

router.patch(
  '/loans/:loanId/extraction-status',
  requireInternalSecret,
  ExtractionController.handleExtractionStatus
);


router.patch(
  '/loans/:loanId/missing-info',
  requireInternalSecret,
  ExtractionController.handleMissingInfo
);


// ─── User-facing routes (require valid JWT) ──────────────────────────────
router.use(protect);


router.post(
  '/loans/:loanId/extract',
  authorizeRoles(ROLES.BANK_ADMIN, ROLES.SUPER_ADMIN),
  ExtractionController.triggerExtraction
);


router.post(
  '/loans/:loanId/reextract',
  authorizeRoles(ROLES.BANK_ADMIN, ROLES.SUPER_ADMIN),
  ExtractionController.reExtractLoan
);


router.get(
  '/loans/:loanId/extraction',
  ExtractionController.getExtractionResult
);

export default router;
