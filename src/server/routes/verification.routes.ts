/**
 * PureGro Premium Cannabis Care - Verification Routes
 *
 * Client document upload and admin review for B2B compliance verification.
 *
 * GET    /verification/status                      - Own verification status (auth)
 * GET    /verification/documents                   - Own documents list (auth)
 * POST   /verification/documents                   - Upload a doc (auth, multipart)
 * GET    /verification/admin/pending               - All pending docs (admin)
 * PATCH  /verification/admin/:docId/review         - Approve/reject (admin)
 * GET    /verification/admin/client/:clientId      - Docs for specific client (admin)
 */

import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware';
import * as db from '../db';
import * as chatDb from '../chat/chatDb';
import * as telegram from '../chat/telegramService';
import { ALL_DOCUMENT_TYPES, type DocumentType } from '../../world-model/types';
import { emitEvent } from '../n8n/emitter';

const router = Router();

const DOC_TYPE_LABELS: Record<string, string> = {
  cipc_registration: 'CIPC Registration',
  tax_clearance: 'Tax Clearance',
  id_document: 'Director ID',
  proof_of_address: 'Proof of Address',
  bank_confirmation: 'Bank Confirmation',
  cannabis_license: 'Cannabis License',
  bee_certificate: 'BEE Certificate',
};

async function notifyClient(clientId: string, text: string): Promise<void> {
  try {
    const links = await chatDb.getLinksByClientId(clientId);
    for (const link of links) {
      if (link.platform === 'telegram') {
        await telegram.sendMessage(link.platformUserId, text, 'HTML');
      }
    }
  } catch (err) {
    console.error('[VerificationNotify] Failed:', (err as Error).message);
  }
}

// ── Multer config for document uploads ───────────────────────

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'));
    }
  },
});

// ── Get own verification status ──────────────────────────────

router.get(
  '/status',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const clientId = req.authUser!.clientId;
      const result = await db.getClientVerificationStatus(clientId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── List own documents ───────────────────────────────────────

router.get(
  '/documents',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const clientId = req.authUser!.clientId;
      const documents = await db.getClientDocuments(clientId);
      res.json({ documents });
    } catch (err) {
      next(err);
    }
  },
);

// ── Upload a document ────────────────────────────────────────

router.post(
  '/documents',
  requireAuth as never,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'File too large. Maximum 10MB allowed.' });
            return;
          }
        }
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const clientId = req.authUser!.clientId;
      const file = req.file;
      const docType = req.body.docType as string;

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      if (!docType || !ALL_DOCUMENT_TYPES.includes(docType as DocumentType)) {
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        res.status(400).json({
          error: `Invalid document type. Must be one of: ${ALL_DOCUMENT_TYPES.join(', ')}`,
        });
        return;
      }

      const document = await db.upsertClientDocument({
        clientId,
        docType: docType as DocumentType,
        fileName: file.originalname,
        filePath: `/uploads/documents/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      // Emit n8n event
      emitEvent('doc.uploaded', {
        documentId: document.id,
        clientId,
        docType,
        fileName: file.originalname,
      });

      res.status(201).json({ document });
    } catch (err) {
      next(err);
    }
  },
);

// ── Admin: get pending documents ─────────────────────────────

router.get(
  '/admin/pending',
  requireAuth as never,
  requireAdmin as never,
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const documents = await db.getPendingClientDocuments();
      res.json({ documents, count: documents.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── Admin: review a document ─────────────────────────────────

router.patch(
  '/admin/:docId/review',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status, adminNotes } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        res.status(400).json({ error: 'Status must be approved or rejected' });
        return;
      }

      const document = await db.reviewClientDocument(
        req.params.docId as string,
        status,
        adminNotes ?? null,
        req.authUser!.clientId,
      );

      const docLabel = DOC_TYPE_LABELS[document.docType] || document.docType;

      // Emit n8n event
      emitEvent(status === 'approved' ? 'doc.approved' : 'doc.rejected', {
        documentId: req.params.docId,
        clientId: document.clientId,
        docType: document.docType,
        docLabel,
        status,
        adminNotes,
      });

      if (status === 'approved') {
        notifyClient(document.clientId, [
          `<b>Document Approved</b>`,
          ``,
          `Your <b>${docLabel}</b> has been verified.`,
        ].join('\n')).catch(() => {});

        // Check if account was just activated (all required docs approved)
        const client = await db.getClientById(document.clientId);
        if (client && client.status === 'active') {
          const { allApproved } = await db.getClientVerificationStatus(document.clientId);
          if (allApproved) {
            emitEvent('client.activated', {
              clientId: document.clientId,
              companyName: client.companyName,
              email: client.email,
            });
            notifyClient(document.clientId, [
              `<b>Account Verified!</b>`,
              ``,
              `All your documents have been approved.`,
              `Your account is now <b>active</b> - you can place orders!`,
              ``,
              `Tap /order to get started.`,
            ].join('\n')).catch(() => {});
          }
        }
      } else {
        notifyClient(document.clientId, [
          `<b>Document Update Required</b>`,
          ``,
          `Your <b>${docLabel}</b> needs attention.`,
          adminNotes ? `Note: ${adminNotes}` : 'Please re-upload a valid document.',
          ``,
          `Upload at jig.cleva-ai.co.za/verification`,
        ].join('\n')).catch(() => {});
      }

      res.json({ document });
    } catch (err) {
      next(err);
    }
  },
);

// ── Admin: docs for a specific client ────────────────────────

router.get(
  '/admin/client/:clientId',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const clientId = req.params.clientId as string;
      const result = await db.getClientVerificationStatus(clientId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
