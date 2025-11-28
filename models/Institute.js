import mongoose from 'mongoose';

const instituteSchema = new mongoose.Schema({
  instituteId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  businessOwnerName: {
    type: String,
    required: true,
    trim: true
  },
  businessNumber: {
    type: String,
    required: true,
    trim: true
  },
  businessEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  businessGSTNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  businessPANNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  businessMobileNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Mobile number must be 10 digits'
    }
  },
  businessCategory: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  pinCode: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{6}$/.test(v);
      },
      message: 'PIN code must be 6 digits'
    }
  },
  businessAddress: {
    type: String,
    required: true,
    trim: true
  },
  businessLogo: {
    type: String,
    default: ''
  },
  instituteImage: {
    type: String,
    default: ''
  },
  businessWebsite: {
    type: String,
    default: '',
    trim: true
  },
  businessYouTubeChannel: {
    type: String,
    default: '',
    trim: true
  },
  annualTurnoverRange: {
    type: String,
    default: ''
  },
  paymentSettings: {
    paytmEnabled: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Archived'],
    default: 'Draft'
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
instituteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Institute = mongoose.model('Institute', instituteSchema);

export default Institute;

