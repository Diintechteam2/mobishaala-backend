import express from 'express';
import PartnersSectionSettings from '../models/PartnersSectionSettings.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public route - Get settings (no authentication required)
router.get('/public', async (req, res) => {
  try {
    const settings = await PartnersSectionSettings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get public partners section settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching partners section settings'
    });
  }
});

// Get settings (requires authentication)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await PartnersSectionSettings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get partners section settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching partners section settings'
    });
  }
});

// Update settings (requires authentication)
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { headline, stats } = req.body;

    let settings = await PartnersSectionSettings.findOne();
    
    if (!settings) {
      // Create new settings if doesn't exist
      settings = new PartnersSectionSettings({
        headline: headline || 'Students Working With Top Companies Like',
        stats: stats || [
          { number: '220+', label: 'Hiring Partners' },
          { number: '40+', label: 'University Collabs' },
          { number: '25,000+', label: 'Careers Transformed' },
          { number: '400+', label: 'Team Size' }
        ]
      });
    } else {
      // Update existing settings
      if (headline !== undefined) {
        settings.headline = headline;
      }
      if (stats !== undefined && Array.isArray(stats)) {
        settings.stats = stats;
      }
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Partners section settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update partners section settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating partners section settings'
    });
  }
});

export default router;

