import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  logo: {
    type: String,
    required: true
  },
  row: {
    type: String,
    enum: ['top', 'bottom'],
    required: true,
    default: 'top'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
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

// Update the updatedAt field before saving
partnerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Partner = mongoose.model('Partner', partnerSchema);

export default Partner;

