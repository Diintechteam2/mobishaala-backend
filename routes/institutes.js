import express from 'express';
import Institute from '../models/Institute.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateInstituteId } from '../utils/generateInstituteId.js';
import { uploadFields } from '../middleware/upload.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// Public route - Get all Active institutes (no authentication required)
router.get('/public', async (req, res) => {
  try {
    const institutes = await Institute.find({ status: 'Active' }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: institutes,
      count: institutes.length
    });
  } catch (error) {
    console.error('Get public institutes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching institutes'
    });
  }
});

// Get all institutes (requires authentication)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const institutes = await Institute.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: institutes,
      count: institutes.length
    });
  } catch (error) {
    console.error('Get institutes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching institutes'
    });
  }
});

// Get single institute by ID (public - no auth required)
router.get('/public/:id', async (req, res) => {
  try {
    const institute = await Institute.findOne({ instituteId: req.params.id });
    
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    res.json({
      success: true,
      data: institute
    });
  } catch (error) {
    console.error('Get public institute error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching institute'
    });
  }
});

// Get single institute by ID (requires authentication)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const institute = await Institute.findOne({ instituteId: req.params.id });
    
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    res.json({
      success: true,
      data: institute
    });
  } catch (error) {
    console.error('Get institute error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching institute'
    });
  }
});

// Create new institute
router.post('/', authenticateToken, uploadFields, async (req, res) => {
  try {
    const {
      businessName,
      businessOwnerName,
      businessNumber,
      businessEmail,
      businessGSTNumber,
      businessPANNumber,
      businessMobileNumber,
      businessCategory,
      city,
      pinCode,
      businessAddress,
      businessWebsite,
      businessYouTubeChannel,
      annualTurnoverRange,
      status
    } = req.body;

    // Validate required fields
    if (!businessName || !businessOwnerName || !businessNumber || !businessEmail ||
        !businessGSTNumber || !businessPANNumber || !businessMobileNumber ||
        !businessCategory || !city || !pinCode || !businessAddress) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Generate unique institute ID
    let instituteId;
    let isUnique = false;
    while (!isUnique) {
      instituteId = generateInstituteId();
      const existing = await Institute.findOne({ instituteId });
      if (!existing) {
        isUnique = true;
      }
    }

    // Upload images to Cloudinary if provided
    let businessLogoUrl = '';
    let instituteImageUrl = '';

    if (req.files?.businessLogo?.[0]) {
      try {
        const logoResult = await uploadToCloudinary(req.files.businessLogo[0], 'mobishaala/institutes/logos');
        businessLogoUrl = logoResult.secure_url;
      } catch (error) {
        console.error('Logo upload error:', error);
      }
    }

    if (req.files?.instituteImage?.[0]) {
      try {
        const imageResult = await uploadToCloudinary(req.files.instituteImage[0], 'mobishaala/institutes/images');
        instituteImageUrl = imageResult.secure_url;
      } catch (error) {
        console.error('Image upload error:', error);
      }
    }

    // Create new institute
    const institute = new Institute({
      instituteId,
      businessName,
      businessOwnerName,
      businessNumber,
      businessEmail: businessEmail.toLowerCase(),
      businessGSTNumber: businessGSTNumber.toUpperCase(),
      businessPANNumber: businessPANNumber.toUpperCase(),
      businessMobileNumber,
      businessCategory,
      city,
      pinCode,
      businessAddress,
      businessLogo: businessLogoUrl,
      instituteImage: instituteImageUrl,
      businessWebsite: businessWebsite || '',
      businessYouTubeChannel: businessYouTubeChannel || '',
      annualTurnoverRange: annualTurnoverRange || '',
      status: status || 'Draft'
    });

    await institute.save();

    res.status(201).json({
      success: true,
      message: 'Institute created successfully',
      data: institute
    });
  } catch (error) {
    console.error('Create institute error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating institute'
    });
  }
});

// Update institute
router.put('/:id', authenticateToken, uploadFields, async (req, res) => {
  try {
    const institute = await Institute.findOne({ instituteId: req.params.id });
    
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    // Upload new images if provided
    if (req.files?.businessLogo?.[0]) {
      try {
        const logoResult = await uploadToCloudinary(req.files.businessLogo[0], 'mobishaala/institutes/logos');
        req.body.businessLogo = logoResult.secure_url;
      } catch (error) {
        console.error('Logo upload error:', error);
      }
    }

    if (req.files?.instituteImage?.[0]) {
      try {
        const imageResult = await uploadToCloudinary(req.files.instituteImage[0], 'mobishaala/institutes/images');
        req.body.instituteImage = imageResult.secure_url;
      } catch (error) {
        console.error('Image upload error:', error);
      }
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'instituteId') {
        if (key === 'businessEmail') {
          institute[key] = req.body[key].toLowerCase();
        } else if (key === 'businessGSTNumber' || key === 'businessPANNumber') {
          institute[key] = req.body[key].toUpperCase();
        } else if (key === 'status') {
          // Validate status value
          const validStatuses = ['Draft', 'Active', 'Archived'];
          if (validStatuses.includes(req.body[key])) {
            institute[key] = req.body[key];
          }
        } else {
          institute[key] = req.body[key];
        }
      }
    });

    institute.updatedAt = Date.now();
    await institute.save();

    res.json({
      success: true,
      message: 'Institute updated successfully',
      data: institute
    });
  } catch (error) {
    console.error('Update institute error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating institute'
    });
  }
});

// Update payment settings for an institute
router.patch('/:id/payment-settings', authenticateToken, async (req, res) => {
  try {
    const institute = await Institute.findOne({ instituteId: req.params.id });

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    const { paytmEnabled } = req.body;

    institute.paymentSettings = {
      ...institute.paymentSettings,
      paytmEnabled: Boolean(paytmEnabled),
    };
    await institute.save();

    res.json({
      success: true,
      message: 'Payment settings updated',
      data: institute.paymentSettings,
    });
  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to update payment settings',
    });
  }
});

// Delete institute
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const institute = await Institute.findOneAndDelete({ instituteId: req.params.id });
    
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    res.json({
      success: true,
      message: 'Institute deleted successfully'
    });
  } catch (error) {
    console.error('Delete institute error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting institute'
    });
  }
});

export default router;
