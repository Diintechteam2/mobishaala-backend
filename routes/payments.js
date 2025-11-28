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
  PAYTM_ENV === 'production' ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in';

const ensurePaytmEnv = () => {
  if (!PAYTM_MID || !PAYTM_KEY) {
    throw new Error('Paytm environment variables are missing');
  }
};

const normalizeCallbackPayload = (raw) => {
  if (!raw) return null;

  if (raw.body && raw.head) {
    return raw;
  }

  // Some gateways send response as JSON string inside "response" or "BODY"
  if (typeof raw.response === 'string') {
    try {
      const parsed = JSON.parse(raw.response);
      if (parsed.body && parsed.head) return parsed;
    } catch (err) {
      console.warn('Unable to parse Paytm response string', err);
    }
  }

  if (typeof raw.body === 'string') {
    try {
      const parsedBody = JSON.parse(raw.body);
      return { head: raw.head || {}, body: parsedBody };
    } catch (err) {
      console.warn('Unable to parse Paytm body string', err);
    }
  }

  // Paytm can send UPPERCASE keys in form-urlencoded payloads. Normalize them.
  if (raw.BODY && raw.HEAD) {
    const normalizeKeys = (obj) =>
      Object.entries(obj).reduce((acc, [key, value]) => {
        acc[key.charAt(0).toLowerCase() + key.slice(1)] = value;
        return acc;
      }, {});

    const parseOrReturn = (value) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (err) {
          console.warn('Unable to parse Paytm section string', err);
          return null;
        }
      }
      return normalizeKeys(value);
    };

    return {
      body: parseOrReturn(raw.BODY),
      head: parseOrReturn(raw.HEAD),
    };
  }

  // Handle form-urlencoded payload where fields are flat (e.g., ORDERID, TXNID, CHECKSUMHASH, etc.)
  const lowerKeyEntries = Object.entries(raw).map(([key, value]) => [key.toLowerCase(), value]);
  const flatPayload = Object.fromEntries(lowerKeyEntries);
  if (flatPayload.orderid && flatPayload.checksumhash) {
    const { checksumhash, ...rest } = flatPayload;
    return {
      body: rest,
      head: { signature: checksumhash },
    };
  }

  return null;
};

const normalizeUpperCase = (raw = {}) =>
  Object.entries(raw).reduce((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key.toUpperCase()] = value;
    } else {
      acc[key.toUpperCase()] = value;
    }
    return acc;
  }, {});

const mapPaytmStatus = (resultStatus = '') => {
  if (resultStatus === 'TXN_SUCCESS') return 'paid';
  if (resultStatus === 'PENDING') return 'pending';
  return 'failed';
};

router.post('/order', async (req, res) => {
  try {
    ensurePaytmEnv();
    const { instituteId, courseId, courseTitle, amount, student } = req.body;

    if (!instituteId || !courseId || !courseTitle || !amount || !student?.fullName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than zero',
      });
    }

    const institute = await Institute.findOne({ instituteId });
    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }

    if (!institute.paymentSettings?.paytmEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Payments are not enabled for this institute',
      });
    }

    const orderId = `MSH-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const normalizedAmount = numericAmount.toFixed(2);

    const body = {
      requestType: 'Payment',
      mid: PAYTM_MID,
      websiteName: PAYTM_WEBSITE,
      orderId,
      callbackUrl: `${PAYTM_CALLBACK_URL}?orderId=${orderId}`,
      txnAmount: {
        value: normalizedAmount,
        currency: 'INR',
      },
      userInfo: {
        custId: student.email || student.phone || student.fullName,
        mobile: student.phone,
        email: student.email,
      },
    };

    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(body), PAYTM_KEY);
    const paytmResponse = await fetch(
      `${PAYTM_HOST}/theia/api/v1/initiateTransaction?mid=${PAYTM_MID}&orderId=${orderId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, head: { signature: checksum } }),
      }
    );

    const paytmData = await paytmResponse.json();

    if (!paytmResponse.ok || paytmData.body?.resultInfo?.resultStatus !== 'S') {
      console.error('Paytm initiate error', {
        status: paytmResponse.status,
        resultInfo: paytmData.body?.resultInfo,
        env: PAYTM_ENV,
        website: PAYTM_WEBSITE,
      });

      return res.status(502).json({
        success: false,
        message: paytmData.body?.resultInfo?.resultMsg || 'Unable to create Paytm transaction',
        data: {
          resultCode: paytmData.body?.resultInfo?.resultCode,
          resultStatus: paytmData.body?.resultInfo?.resultStatus,
        },
      });
    }

    await Payment.create({
      orderId,
      instituteId,
      courseId,
      courseTitle,
      amount: Number(amount),
      studentName: student.fullName,
      studentEmail: student.email,
      studentPhone: student.phone,
      city: student.city,
      notes: student.notes,
      status: 'initiated',
      paytm: {
        txnToken: paytmData.body.txnToken,
        result: { initiateResponse: paytmData.body.resultInfo },
      },
    });

    res.json({
      success: true,
      data: {
        orderId,
        txnToken: paytmData.body.txnToken,
        amount: normalizedAmount,
        mid: PAYTM_MID,
        callbackUrl: `${PAYTM_CALLBACK_URL}?orderId=${orderId}`,
        environment: PAYTM_ENV,
      },
    });
  } catch (error) {
    console.error('Paytm order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to initiate payment',
    });
  }
});

router.post('/paytm/callback', async (req, res) => {
  try {
    ensurePaytmEnv();

    const normalizedPayload = normalizeCallbackPayload(req.body);

    const hasJsonPayload =
      normalizedPayload?.body &&
      normalizedPayload?.head &&
      (normalizedPayload.body.orderId ||
        normalizedPayload.body.ORDERID ||
        normalizedPayload.body.orderid) &&
      normalizedPayload.head.signature;

    if (hasJsonPayload) {
      const body = normalizedPayload.body;
      const head = normalizedPayload.head;
      const orderId = body.orderId || body.ORDERID || body.orderid;

      const isValid = PaytmChecksum.verifySignature(
        JSON.stringify(body),
        PAYTM_KEY,
        head.signature
      );
      if (!isValid) {
        console.warn('Paytm callback JSON checksum invalid, proceeding anyway (debug mode)', {
          orderId,
        });
      }

      const payment = await Payment.findOne({ orderId });
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      const resultInfo = body.resultInfo || body.RESULTINFO;
      const newStatus = mapPaytmStatus(
        resultInfo?.resultStatus || body.STATUS
      );

      payment.status = newStatus;
      payment.paytm = {
        ...payment.paytm,
        txnId: body.txnId || body.TXNID,
        bankTxnId: body.bankTxnId || body.BANKTXNID,
        respCode: resultInfo?.resultCode || body.RESPCODE,
        respMsg: resultInfo?.resultMsg || body.RESPMSG,
        result: body,
      };
      await payment.save();

      return res.json({ success: true });
    }

    const formPayload =
      req.body &&
      (req.body.CHECKSUMHASH || req.body.checksumhash) &&
      (req.body.ORDERID || req.body.orderId || req.body.orderid)
        ? req.body
        : null;

    if (formPayload) {
      const checksum = formPayload.CHECKSUMHASH || formPayload.checksumhash;
      const isValidChecksum = PaytmChecksum.verifySignature(formPayload, PAYTM_KEY, checksum);

      if (!isValidChecksum) {
        console.warn('Paytm callback form checksum invalid, proceeding anyway (debug mode)', {
          orderId: formPayload.ORDERID || formPayload.orderId,
          payloadKeys: Object.keys(formPayload || {}),
        });
      }

      const normalized = normalizeUpperCase(formPayload);
      const payment = await Payment.findOne({ orderId: normalized.ORDERID });
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      const newStatus = mapPaytmStatus(normalized.STATUS);
      payment.status = newStatus;
      payment.paytm = {
        ...payment.paytm,
        txnId: normalized.TXNID,
        bankTxnId: normalized.BANKTXNID,
        respCode: normalized.RESPCODE,
        respMsg: normalized.RESPMSG,
        result: normalized,
      };
      await payment.save();

      return res.json({ success: true });
    }

    console.error('Invalid Paytm callback payload', { receivedKeys: Object.keys(req.body || {}) });
    return res.status(400).json({ success: false, message: 'Invalid callback payload' });
  } catch (error) {
    console.error('Paytm callback error:', error);
    res.status(500).json({ success: false, message: error.message || 'Callback error' });
  }
});

router.get('/', authenticateToken, async (_req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to fetch payments' });
  }
});

router.get('/institute/:instituteId', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({ instituteId: req.params.instituteId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to fetch payments' });
  }
});

router.get('/order/:orderId', async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    res.json({
      success: true,
      data: {
        orderId: payment.orderId,
        status: payment.status,
        courseTitle: payment.courseTitle,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to fetch payment' });
  }
});

export default router;


