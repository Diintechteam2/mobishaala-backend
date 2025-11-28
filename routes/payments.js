import express from 'express';
import fetch from 'node-fetch';
import PaytmChecksum from 'paytmchecksum';
import Payment from '../models/Payment.js';
import Institute from '../models/Institute.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const PAYTM_MID = process.env.PAYTM_MID || '';
const PAYTM_KEY = process.env.PAYTM_MERCHANT_KEY || '';
const PAYTM_ENV = (process.env.PAYTM_ENVIRONMENT || 'staging').toLowerCase();
const PAYTM_WEBSITE =
  process.env.PAYTM_WEBSITE ||
  (PAYTM_ENV === 'production' ? 'DEFAULT' : 'WEBSTAGING');

const APP_BASE_URL = (process.env.APP_BASE_URL || 'https://mobishaala-backend-zcxm.onrender.com').replace(/\/$/, '');
const PAYTM_CALLBACK_URL =
  process.env.PAYTM_CALLBACK_URL || `${APP_BASE_URL}/api/payments/paytm/callback`;

const PAYTM_HOST =
  PAYTM_ENV === 'production'
    ? 'https://securegw.paytm.in'
    : 'https://securegw-stage.paytm.in';

const ensurePaytmEnv = () => {
  if (!PAYTM_MID || !PAYTM_KEY) {
    throw new Error('Paytm environment variables are missing');
  }
};

const mapPaytmStatus = (status = '') => {
  if (status === 'TXN_SUCCESS') return 'paid';
  if (status === 'PENDING') return 'pending';
  return 'failed';
};

const extractFlatCallbackPayload = (raw = {}) => {
  const upperCaseMap = Object.entries(raw).reduce((acc, [key, value]) => {
    acc[key.toUpperCase()] = value;
    return acc;
  }, {});

  if (!upperCaseMap.ORDERID || !upperCaseMap.CHECKSUMHASH) return null;

  const { CHECKSUMHASH, ...rest } = upperCaseMap;

  const sortedPayload = Object.keys(rest)
    .sort()
    .reduce((acc, key) => {
      acc[key] = rest[key];
      return acc;
    }, {});

  return {
    checksum: CHECKSUMHASH,
    data: rest,
    payloadString: JSON.stringify(sortedPayload),
  };
};

// ✅ PAYTM ORDER API
router.post('/order', async (req, res) => {
  try {
    ensurePaytmEnv();

    const { instituteId, courseId, courseTitle, amount, student } = req.body;

    if (!instituteId || !courseId || !courseTitle || !amount || !student?.fullName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const institute = await Institute.findOne({ instituteId });
    if (!institute || !institute.paymentSettings?.paytmEnabled) {
      return res.status(400).json({ success: false, message: 'Paytm not enabled' });
    }

    const orderId = `MSH-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    const body = {
      requestType: 'Payment',
      mid: PAYTM_MID,
      websiteName: PAYTM_WEBSITE,
      orderId,
      callbackUrl: `${PAYTM_CALLBACK_URL}?orderId=${orderId}`,
      txnAmount: {
        value: numericAmount.toFixed(2),
        currency: 'INR'
      },
      userInfo: {
        custId: student.email || student.phone || student.fullName,
        mobile: student.phone,
        email: student.email
      }
    };

    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(body), PAYTM_KEY);

    const response = await fetch(
      `${PAYTM_HOST}/theia/api/v1/initiateTransaction?mid=${PAYTM_MID}&orderId=${orderId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, head: { signature: checksum } }),
      }
    );

    const paytmData = await response.json();

    if (!response.ok || paytmData.body?.resultInfo?.resultStatus !== 'S') {
      return res.status(502).json({
        success: false,
        message: paytmData.body?.resultInfo?.resultMsg || 'Paytm order failed'
      });
    }

    await Payment.create({
      orderId,
      instituteId,
      courseId,
      courseTitle,
      amount: numericAmount,
      studentName: student.fullName,
      studentEmail: student.email,
      studentPhone: student.phone,
      status: 'initiated',
      paytm: {
        txnToken: paytmData.body.txnToken
      }
    });

    res.json({
      success: true,
      data: {
        orderId,
        txnToken: paytmData.body.txnToken,
        mid: PAYTM_MID,
        amount: numericAmount.toFixed(2),
        callbackUrl: `${PAYTM_CALLBACK_URL}?orderId=${orderId}`
      }
    });

  } catch (error) {
    console.error('Paytm order error:', error);
    res.status(500).json({ success: false, message: 'Order error' });
  }
});

// ✅ FIXED CALLBACK API
router.post('/paytm/callback', async (req, res) => {
  try {
    ensurePaytmEnv();

    console.log('✅ Paytm Callback Received:', req.body);

    const flatPayload = extractFlatCallbackPayload(req.body);

    if (!flatPayload) {
      console.error('❌ Invalid Paytm callback payload', {
        keys: Object.keys(req.body || {})
      });
      return res.status(400).json({ success: false, message: 'Invalid callback payload' });
    }

    const isValidChecksum = PaytmChecksum.verifySignature(
      flatPayload.payloadString,
      PAYTM_KEY,
      flatPayload.checksum
    );

    if (!isValidChecksum) {
      return res.status(400).json({ success: false, message: 'Checksum mismatch' });
    }

    const orderId = flatPayload.data.ORDERID;
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const newStatus = mapPaytmStatus(flatPayload.data.STATUS);

    payment.status = newStatus;
    payment.paytm = {
      ...payment.paytm,
      txnId: flatPayload.data.TXNID,
      bankTxnId: flatPayload.data.BANKTXNID,
      respCode: flatPayload.data.RESPCODE,
      respMsg: flatPayload.data.RESPMSG,
      result: flatPayload.data
    };

    await payment.save();

    return res.json({ success: true });

  } catch (err) {
    console.error('❌ Callback Error:', err);
    res.status(500).json({ success: false, message: 'Callback processing error' });
  }
});

// ✅ GET ALL PAYMENTS
router.get('/', authenticateToken, async (_req, res) => {
  const payments = await Payment.find().sort({ createdAt: -1 });
  res.json({ success: true, data: payments });
});

// ✅ GET BY INSTITUTE
router.get('/institute/:instituteId', authenticateToken, async (req, res) => {
  const payments = await Payment.find({ instituteId: req.params.instituteId }).sort({ createdAt: -1 });
  res.json({ success: true, data: payments });
});

// ✅ GET SINGLE ORDER
router.get('/order/:orderId', async (req, res) => {
  const payment = await Payment.findOne({ orderId: req.params.orderId });
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }
  res.json({
    success: true,
    data: {
      orderId: payment.orderId,
      status: payment.status,
      courseTitle: payment.courseTitle
    }
  });
});

export default router;
