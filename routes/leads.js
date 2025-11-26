import express from 'express';
import Lead from '../models/Lead.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const sanitizeString = (value = '') => value?.toString().trim();

router.post('/callback', async (req, res) => {
  try {
    const { instituteId, name, email, phone, focusArea } = req.body;

    if (!instituteId || !name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const lead = await Lead.create({
      instituteId: sanitizeString(instituteId),
      type: 'callback',
      name: sanitizeString(name),
      email: sanitizeString(email),
      phone: sanitizeString(phone),
      focusArea: sanitizeString(focusArea),
    });

    res.json({
      success: true,
      data: lead,
      message: 'Callback request submitted',
    });
  } catch (error) {
    console.error('Callback lead error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error submitting callback request',
    });
  }
});

router.post('/course-purchase', async (req, res) => {
  try {
    const {
      instituteId,
      name,
      email,
      phone,
      city,
      mode,
      notes,
      courseId,
      courseTitle,
      price,
      originalPrice,
    } = req.body;

    if (!instituteId || !name || !email || !phone || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const lead = await Lead.create({
      instituteId: sanitizeString(instituteId),
      type: 'course_purchase',
      name: sanitizeString(name),
      email: sanitizeString(email),
      phone: sanitizeString(phone),
      city: sanitizeString(city),
      mode: sanitizeString(mode),
      message: sanitizeString(notes),
      courseId: sanitizeString(courseId),
      courseTitle: sanitizeString(courseTitle),
      price: Number(price) || 0,
      originalPrice: Number(originalPrice) || 0,
    });

    res.json({
      success: true,
      data: lead,
      message: 'Course purchase intent submitted',
    });
  } catch (error) {
    console.error('Course purchase lead error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error submitting purchase intent',
    });
  }
});

router.get('/:instituteId', authenticateToken, async (req, res) => {
  try {
    const leads = await Lead.find({ instituteId: req.params.instituteId }).sort({ createdAt: -1 });
    const callbacks = leads.filter((lead) => lead.type === 'callback');
    const purchases = leads.filter((lead) => lead.type === 'course_purchase');

    res.json({
      success: true,
      data: {
        callbacks,
        purchases,
      },
    });
  } catch (error) {
    console.error('Fetch leads error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching leads',
    });
  }
});

export default router;


