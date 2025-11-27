import express from 'express';
import Inquiry from '../models/Inquiry.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const sanitize = (value = '') => value?.toString().trim();

router.post('/', async (req, res) => {
  try {
    const {
      name,
      businessName,
      businessEmail,
      whatsappNumber,
      source = 'website',
      notes = '',
    } = req.body;

    if (!name || !businessName || !businessEmail || !whatsappNumber) {
      return res.status(400).json({
        success: false,
        message: 'Name, business name, business email, and WhatsApp number are required',
      });
    }

    const inquiry = await Inquiry.create({
      name: sanitize(name),
      businessName: sanitize(businessName),
      businessEmail: sanitize(businessEmail).toLowerCase(),
      whatsappNumber: sanitize(whatsappNumber),
      source: sanitize(source),
      notes: sanitize(notes),
    });

    res.json({
      success: true,
      message: 'Inquiry submitted successfully',
      data: inquiry,
    });
  } catch (error) {
    console.error('Inquiry submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit inquiry',
    });
  }
});

router.get('/', authenticateToken, async (_req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: inquiries,
    });
  } catch (error) {
    console.error('Fetch inquiries error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch inquiries',
    });
  }
});

router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['new', 'contacted', 'converted', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found',
      });
    }

    res.json({
      success: true,
      data: inquiry,
      message: 'Status updated',
    });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update status',
    });
  }
});

export default router;



