import mongoose from 'mongoose';

const heroSectionSettingsSchema = new mongoose.Schema({
  slides: [
    {
      type: {
        type: String,
        enum: ['direct', 'institutions', 'students', 'teachers'],
        required: true
      },
      tagline: {
        type: String,
        required: true
      },
      highlightWords: {
        type: [String],
        default: []
      },
      description: {
        type: String,
        required: true
      },
      points: [{
        type: String,
        required: true
      }],
      image: {
        type: String,
        default: ''
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }
  ],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
heroSectionSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure only one document exists and initialize with defaults
heroSectionSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Create default settings
    settings = new this({
      slides: [
        {
          type: 'direct',
          tagline: "India's first AI-Enabled Education Network",
          highlightWords: ["India's first", "Education Network"],
          description: "Mobishaala stands as a bridge between traditional teaching excellence and futuristic AI intelligence — enabling every educator to scale, every student to succeed, and every institute to thrive in the new digital era.",
          points: [
            "Orchestrate your institute's sales, marketing & software with AI-powered Mobishaala.",
            "Agentic AI End - to - End Support"
          ],
          image: '/mobishaalaheroimage-1.jpg',
          isActive: true
        },
        {
          type: 'institutions',
          tagline: "Empowering Institutions, Teachers & Students With Agentic AI",
          highlightWords: ["Empowering", "Agentic AI"],
          description: "AI that streamlines operations, boosts efficiency, and accelerates growth.",
          points: [
            "Automate administrative tasks and focus on what matters most.",
            "Data-driven insights to optimize performance and student outcomes."
          ],
          image: '/mobishaalaheroimage-1.jpg',
          isActive: true
        },
        {
          type: 'students',
          tagline: "Empowering Institutions, Teachers & Students With Agentic AI",
          highlightWords: ["Empowering", "Agentic AI"],
          description: "AI that personalizes learning and improves outcomes with guided support.",
          points: [
            "Personalized learning paths tailored to your pace and style.",
            "24/7 AI tutor support for instant help and guidance."
          ],
          image: '/mobishaalaheroimage-1.jpg',
          isActive: true
        },
        {
          type: 'teachers',
          tagline: "Empowering Institutions, Teachers & Students With Agentic AI",
          highlightWords: ["Empowering", "Agentic AI"],
          description: "AI that reduces workload and enhances teaching quality with smart tools.",
          points: [
            "Automated grading and assessment to save time.",
            "AI-powered content creation and lesson planning assistance."
          ],
          image: '/mobishaalaheroimage-1.jpg',
          isActive: true
        }
      ]
    });
    await settings.save();
  }
  return settings;
};

const HeroSectionSettings = mongoose.model('HeroSectionSettings', heroSectionSettingsSchema);

export default HeroSectionSettings;

