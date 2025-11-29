import express from 'express';
import HeroSectionSettings from '../models/HeroSectionSettings.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadFields } from '../middleware/upload.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// Public route - Get active slides (no authentication required)
router.get('/public', async (req, res) => {
  try {
    const settings = await HeroSectionSettings.getSettings();
    const activeSlides = settings.slides.filter(slide => slide.isActive);
    res.json({
      success: true,
      data: {
        slides: activeSlides
      }
    });
  } catch (error) {
    console.error('Get public hero section settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hero section settings'
    });
  }
});

// Get all settings (requires authentication)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await HeroSectionSettings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get hero section settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hero section settings'
    });
  }
});

// Update settings (requires authentication)
router.put('/', authenticateToken, uploadFields, async (req, res) => {
  try {
    let settings = await HeroSectionSettings.findOne();
    
    if (!settings) {
      settings = await HeroSectionSettings.getSettings();
    }

    // Parse slides from FormData or JSON
    let slides = [];
    if (req.body.slides) {
      // If JSON body
      if (typeof req.body.slides === 'string') {
        slides = JSON.parse(req.body.slides);
      } else {
        slides = req.body.slides;
      }
    } else {
      // If FormData, parse from body
      const slideTypes = ['direct', 'institutions', 'students', 'teachers'];
      slides = slideTypes.map((type, index) => {
        const slideTypeKey = `slides[${index}][type]`;
        const taglineKey = `slides[${index}][tagline]`;
        const descriptionKey = `slides[${index}][description]`;
        const isActiveKey = `slides[${index}][isActive]`;
        
        // Check if this slide data exists in FormData
        if (req.body[slideTypeKey] && req.body[slideTypeKey] === type) {
          const slide = {
            type: type,
            tagline: req.body[taglineKey] || '',
            description: req.body[descriptionKey] || '',
            points: [],
            highlightWords: [],
            isActive: req.body[isActiveKey] === 'true' || req.body[isActiveKey] === true
          };

          // Parse points
          let pointIndex = 0;
          while (req.body[`slides[${index}][points][${pointIndex}]`]) {
            const point = req.body[`slides[${index}][points][${pointIndex}]`];
            if (point && point.trim()) {
              slide.points.push(point);
            }
            pointIndex++;
          }

          // Parse highlightWords
          let highlightIndex = 0;
          while (req.body[`slides[${index}][highlightWords][${highlightIndex}]`]) {
            const word = req.body[`slides[${index}][highlightWords][${highlightIndex}]`];
            if (word && word.trim()) {
              slide.highlightWords.push(word);
            }
            highlightIndex++;
          }

          return slide;
        } else {
          // Keep existing slide if not in FormData
          const existingSlide = settings.slides.find(s => s.type === type);
          return existingSlide || {
            type: type,
            tagline: '',
            description: '',
            points: [],
            highlightWords: [],
            isActive: true,
            image: ''
          };
        }
      });
    }

    if (slides && Array.isArray(slides)) {
      // Process each slide
      const updatedSlides = await Promise.all(
        slides.map(async (slide, index) => {
          const slideData = {
            type: slide.type,
            tagline: slide.tagline || '',
            highlightWords: Array.isArray(slide.highlightWords) ? slide.highlightWords.filter(w => w && w.trim()) : [],
            description: slide.description || '',
            points: Array.isArray(slide.points) ? slide.points.filter(p => p && p.trim()) : [],
            isActive: slide.isActive !== undefined ? (slide.isActive === true || slide.isActive === 'true') : true
          };

          // Handle image upload if provided
          if (req.files && req.files[`slideImage_${index}`] && req.files[`slideImage_${index}`][0]) {
            try {
              const imageResult = await uploadToCloudinary(
                req.files[`slideImage_${index}`][0],
                'mobishaala/hero/images'
              );
              slideData.image = imageResult.secure_url;
            } catch (error) {
              console.error('Image upload error:', error);
              // Keep existing image if upload fails
              const existingSlide = settings.slides.find(s => s.type === slide.type);
              if (existingSlide) {
                slideData.image = existingSlide.image;
              }
            }
          } else {
            // Keep existing image if no new image provided
            const existingSlide = settings.slides.find(s => s.type === slide.type);
            if (existingSlide) {
              slideData.image = existingSlide.image || '';
            }
          }

          return slideData;
        })
      );

      settings.slides = updatedSlides;
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Hero section settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update hero section settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating hero section settings'
    });
  }
});

export default router;

