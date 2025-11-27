import mongoose from 'mongoose';

const instituteContentSchema = new mongoose.Schema({
  instituteId: {
    type: String,
    required: true,
    ref: 'Institute'
  },
  // Hero Section
  hero: {
    badge: { type: String, default: '' },
    headline: { type: String, default: '' },
    description: { type: String, default: '' },
    backgroundImage: { type: String, default: '' },
    stats: [{
      topLabel: String,
      label: String,
      value: String
    }],
    focusOptions: [{ type: String }]
  },
  // Courses Section
  courses: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    courses: [{
      id: String,
      title: String,
      description: String,
      price: { type: Number, default: 0 },
      originalPrice: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      image: String,
      category: String,
      language: { type: String, default: 'Hindi' },
      mode: { type: String, default: 'Online' },
      phase: String,
      enabled: { type: Boolean, default: true }
    }]
  },
  // Journey/Platform Section
  journey: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    modules: [{
      heading: String,
      detail: String
    }]
  },
  // Testimonials Section
  testimonials: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    testimonials: [{
      name: String,
      quote: String,
      location: String
    }]
  },
  // FAQ Section
  faq: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    faqs: [{
      question: String,
      answer: String
    }]
  },
  // Footer Section
  footer: {
    quickLinks: [
      {
        label: { type: String },
        href: { type: String }
      }
    ],
    socialLinks: [
      {
        platform: { type: String },
        label: { type: String },
        url: { type: String }
      }
    ]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

instituteContentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const InstituteContent = mongoose.model('InstituteContent', instituteContentSchema);

export default InstituteContent;

