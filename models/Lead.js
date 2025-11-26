import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    instituteId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['callback', 'course_purchase'],
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    focusArea: { type: String },
    message: { type: String },
    courseId: { type: String },
    courseTitle: { type: String },
    price: { type: Number },
    originalPrice: { type: Number },
    mode: { type: String },
    city: { type: String },
    status: {
      type: String,
      enum: ['new', 'contacted', 'enrolled'],
      default: 'new',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;

