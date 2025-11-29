import express from 'express';
import Partner from '../models/Partner.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadPartnerLogo } from '../middleware/upload.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// Public route - Get all active partners (no authentication required)
// IMPORTANT: This must be before /:id route to avoid route conflicts
router.get('/public', async (req, res) => {
  try {
    const partners = await Partner.find({ isActive: true })
      .sort({ row: 1, order: 1, createdAt: 1 });
    res.json({
      success: true,
      data: partners,
      count: partners.length
    });
  } catch (error) {
    console.error('Get public partners error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching partners'
    });
  }
});

// Get all partners (requires authentication)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const partners = await Partner.find()
      .sort({ row: 1, order: 1, createdAt: 1 });
    res.json({
      success: true,
      data: partners,
      count: partners.length
    });
  } catch (error) {
    console.error('Get partners error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching partners'
    });
  }
});

// Get single partner by ID (requires authentication)
// IMPORTANT: This must be after /public route to avoid route conflicts
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    console.error('Get partner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching partner'
    });
  }
});

// Create new partner
router.post('/', authenticateToken, uploadPartnerLogo, async (req, res) => {
  try {
    const { name, row, order } = req.body;

    // Validate required fields
    if (!name || !row) {
      return res.status(400).json({
        success: false,
        message: 'Name and row are required fields'
      });
    }

    // Validate row value
    if (!['top', 'bottom'].includes(row)) {
      return res.status(400).json({
        success: false,
        message: 'Row must be either "top" or "bottom"'
      });
    }

    // Upload logo to Cloudinary if provided
    let logoUrl = '';
    if (req.file) {
      try {
        const logoResult = await uploadToCloudinary(req.file, 'mobishaala/partners/logos');
        logoUrl = logoResult.secure_url;
      } catch (error) {
        console.error('Logo upload error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error uploading logo to Cloudinary'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Logo image is required'
      });
    }

    // Create new partner
    const partner = new Partner({
      name: name.trim(),
      logo: logoUrl,
      row: row,
      order: order ? parseInt(order) : 0,
      isActive: true
    });

    await partner.save();

    res.status(201).json({
      success: true,
      message: 'Partner created successfully',
      data: partner
    });
  } catch (error) {
    console.error('Create partner error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating partner'
    });
  }
});

// Update partner
router.put('/:id', authenticateToken, uploadPartnerLogo, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Upload new logo if provided
    if (req.file) {
      try {
        const logoResult = await uploadToCloudinary(req.file, 'mobishaala/partners/logos');
        req.body.logo = logoResult.secure_url;
      } catch (error) {
        console.error('Logo upload error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error uploading logo to Cloudinary'
        });
      }
    }

    // Update fields
    if (req.body.name !== undefined) {
      partner.name = req.body.name.trim();
    }
    if (req.body.row !== undefined) {
      if (!['top', 'bottom'].includes(req.body.row)) {
        return res.status(400).json({
          success: false,
          message: 'Row must be either "top" or "bottom"'
        });
      }
      partner.row = req.body.row;
    }
    if (req.body.order !== undefined) {
      partner.order = parseInt(req.body.order);
    }
    if (req.body.isActive !== undefined) {
      partner.isActive = req.body.isActive === true || req.body.isActive === 'true';
    }
    if (req.body.logo !== undefined) {
      partner.logo = req.body.logo;
    }

    partner.updatedAt = Date.now();
    await partner.save();

    res.json({
      success: true,
      message: 'Partner updated successfully',
      data: partner
    });
  } catch (error) {
    console.error('Update partner error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating partner'
    });
  }
});

// Delete partner
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    res.json({
      success: true,
      message: 'Partner deleted successfully'
    });
  } catch (error) {
    console.error('Delete partner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting partner'
    });
  }
});

export default router;

