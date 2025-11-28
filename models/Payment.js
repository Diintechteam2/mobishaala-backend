import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    instituteId: { type: String, required: true },
    courseId: { type: String, required: true },
    courseTitle: { type: String, required: true },
    amount: { type: Number, required: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    studentPhone: { type: String, required: true },
    city: { type: String, default: '' },
    notes: { type: String, default: '' },
    paymentMode: { type: String, default: 'paytm' },
    status: {
      type: String,
      enum: ['initiated', 'pending', 'paid', 'failed'],
      default: 'initiated',
    },
    paytm: {
      txnToken: String,
      txnId: String,
      bankTxnId: String,
      respCode: String,
      respMsg: String,
      result: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;



