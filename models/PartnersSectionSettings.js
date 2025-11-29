import mongoose from 'mongoose';

const partnersSectionSettingsSchema = new mongoose.Schema({
  headline: {
    type: String,
    default: 'Students Working With Top Companies Like'
  },
  stats: [
    {
      number: {
        type: String,
        required: true
      },
      label: {
        type: String,
        required: true
      }
    }
  ],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
partnersSectionSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure only one document exists
partnersSectionSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Create default settings
    settings = new this({
      headline: 'Students Working With Top Companies Like',
      stats: [
        { number: '220+', label: 'Hiring Partners' },
        { number: '40+', label: 'University Collabs' },
        { number: '25,000+', label: 'Careers Transformed' },
        { number: '400+', label: 'Team Size' }
      ]
    });
    await settings.save();
  }
  return settings;
};

const PartnersSectionSettings = mongoose.model('PartnersSectionSettings', partnersSectionSettingsSchema);

export default PartnersSectionSettings;

