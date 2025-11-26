import express from 'express';
import InstituteContent from '../models/InstituteContent.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadFields, uploadCourseImage } from '../middleware/upload.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// Upload course image to Cloudinary
router.post('/upload-course-image/:instituteId', authenticateToken, uploadCourseImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const result = await uploadToCloudinary(req.file, `mobishaala/institutes/${req.params.instituteId}/courses`);
    
    res.json({
      success: true,
      imageUrl: result.secure_url,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Course image upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading image'
    });
  }
});

// Public route - Get content for an institute (no authentication required)
router.get('/public/:instituteId', async (req, res) => {
  try {
    let content = await InstituteContent.findOne({ instituteId: req.params.instituteId });
    
    if (!content) {
      // Return empty content structure if doesn't exist
      content = {
        instituteId: req.params.instituteId,
        hero: {
          badge: '',
          headline: '',
          description: '',
          backgroundImage: '',
          stats: []
        },
        courses: {
          title: '',
          subtitle: '',
          courses: []
        },
        journey: {
          title: '',
          subtitle: '',
          modules: []
        },
        testimonials: {
          title: '',
          subtitle: '',
          testimonials: []
        },
        faq: {
          title: '',
          subtitle: '',
          faqs: []
        }
      };
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get public content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching content'
    });
  }
});

// Get content for an institute (requires authentication)
router.get('/:instituteId', authenticateToken, async (req, res) => {
  try {
    let content = await InstituteContent.findOne({ instituteId: req.params.instituteId });
    
    if (!content) {
      // Create default content if doesn't exist
      content = new InstituteContent({
        instituteId: req.params.instituteId,
        hero: {
          badge: '',
          headline: '',
          description: '',
          backgroundImage: '',
          stats: []
        },
        courses: {
          title: '',
          subtitle: '',
          courses: []
        },
        journey: {
          title: '',
          subtitle: '',
          modules: []
        },
        testimonials: {
          title: '',
          subtitle: '',
          testimonials: []
        },
        faq: {
          title: '',
          subtitle: '',
          faqs: []
        }
      });
      await content.save();
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching content'
    });
  }
});

// Update content for an institute
const conditionalUpload = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    uploadFields(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid form data'
        });
      }
      next();
    });
  } else {
    next();
  }
};

router.put('/:instituteId', authenticateToken, conditionalUpload, async (req, res) => {
  try {
    console.log('📝 [InstituteContent] PUT request for', req.params.instituteId);
    console.log('📥 Raw payload type:', req.is('multipart/form-data') ? 'multipart/form-data' : 'application/json');
    console.log('📥 Raw body preview:', JSON.stringify(req.body).slice(0, 500));
    
    let content = await InstituteContent.findOne({ instituteId: req.params.instituteId });
    
    if (!content) {
      content = new InstituteContent({ instituteId: req.params.instituteId });
    }

    // Handle background image upload
    if (req.files?.backgroundImage?.[0]) {
      try {
        const result = await uploadToCloudinary(req.files.backgroundImage[0], 'mobishaala/institutes/hero');
        req.body.hero = req.body.hero ? JSON.parse(req.body.hero) : {};
        req.body.hero.backgroundImage = result.secure_url;
      } catch (error) {
        console.error('Image upload error:', error);
      }
    }

    // Update sections - handle both JSON strings and objects
    if (req.body.hero) {
      try {
        content.hero = typeof req.body.hero === 'string' ? JSON.parse(req.body.hero) : req.body.hero;
      } catch (e) {
        console.error('Error parsing hero:', e);
      }
    }
    if (req.body.courses) {
      try {
        const parsedCourses = typeof req.body.courses === 'string' ? JSON.parse(req.body.courses) : req.body.courses;
        console.log('📘 Courses payload after parse:', JSON.stringify(parsedCourses).slice(0, 500));
        content.courses = parsedCourses;
      } catch (e) {
        console.error('Error parsing courses:', e);
      }
    }
    if (req.body.journey) {
      try {
        content.journey = typeof req.body.journey === 'string' ? JSON.parse(req.body.journey) : req.body.journey;
      } catch (e) {
        console.error('Error parsing journey:', e);
      }
    }
    if (req.body.testimonials) {
      try {
        content.testimonials = typeof req.body.testimonials === 'string' ? JSON.parse(req.body.testimonials) : req.body.testimonials;
      } catch (e) {
        console.error('Error parsing testimonials:', e);
      }
    }
    if (req.body.faq) {
      try {
        content.faq = typeof req.body.faq === 'string' ? JSON.parse(req.body.faq) : req.body.faq;
      } catch (e) {
        console.error('Error parsing faq:', e);
      }
    }

    content.updatedAt = Date.now();
    await content.save();
    console.log('✅ Content saved for', req.params.instituteId);

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: content
    });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating content'
    });
  }
});

export default router;
