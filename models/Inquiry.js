import mongoose from 'mongoose';

const InquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    businessEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    whatsappNumber: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      default: 'website',
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted', 'archived'],
      default: 'new',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Inquiry', InquirySchema);



