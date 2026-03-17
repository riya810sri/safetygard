/**
 * Suraksha Backend Server
 * Handles SOS alerts - sends SMS, Calls, WhatsApp & Telegram messages
 * Handles Order Confirmations - sends Email & WhatsApp messages
 *
 * FREE Mode: Telegram & Email (no cost)
 * PAID Mode: Twilio SMS & Calls (requires credits)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// chatbot api
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Telegram Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Email Configuration (Nodemailer)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;

// Admin/Seller Email Configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.SELLER_EMAIL;
const SELLER_EMAIL = process.env.SELLER_EMAIL || process.env.ADMIN_EMAIL;

// WhatsApp Configuration (Twilio)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize email transporter
const emailTransporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === '465',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

//chatbot api logic

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent(message);
    const response = await result.response;

    res.json({ reply: response.text() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generating response" });
  }
});


/**
 * POST /api/send-telegram-alert
 * Sends FREE Telegram messages to all emergency contacts
 */
app.post('/api/send-telegram-alert', async (req, res) => {
  try {
    const { userName, userEmail, location, contacts } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No emergency contacts provided'
      });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'Telegram bot token not configured'
      });
    }

    const googleMapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    
    const results = {
      total: contacts.length,
      sent: 0,
      failed: 0,
      details: []
    };

    // Message template
    const message = `🚨 *SOS EMERGENCY ALERT!* 🚨\n\n` +
      `*${userName || userEmail}* needs immediate help!\n\n` +
      `📍 *Location:*\n${googleMapsLink}\n\n` +
      `Please contact them immediately!\n\n` +
      `_This is an automated alert from Suraksha Safety App_`;

    // Process each contact
    for (const contact of contacts) {
      const contactResult = {
        name: contact.name || 'Unknown',
        telegramId: contact.telegramId,
        success: false,
        error: null
      };

      try {
        if (!contact.telegramId) {
          contactResult.error = 'No Telegram ID';
          results.failed++;
          results.details.push(contactResult);
          continue;
        }

        // Send Telegram message
        const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: contact.telegramId,
            text: message,
            parse_mode: 'Markdown'
          })
        });

        const data = await response.json();

        if (data.ok) {
          contactResult.success = true;
          results.sent++;
          console.log(`✅ Telegram sent to ${contact.name}`);
        } else {
          contactResult.error = data.description || 'Failed to send';
          results.failed++;
          console.error(`❌ Telegram failed for ${contact.name}:`, data.description);
        }

      } catch (error) {
        contactResult.error = error.message;
        results.failed++;
        console.error(`❌ Error sending to ${contact.name}:`, error.message);
      }

      results.details.push(contactResult);

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n🚨 Telegram Alert Summary:');
    console.log(`Total: ${results.total}`);
    console.log(`Sent: ${results.sent}`);
    console.log(`Failed: ${results.failed}\n`);

    res.json({
      success: true,
      message: 'Telegram alerts sent successfully',
      ...results
    });

  } catch (error) {
    console.error('❌ Telegram Alert Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/send-sos-alert
 * Sends SMS and calls via Twilio (PAID)
 */
app.post('/api/send-sos-alert', async (req, res) => {
  try {
    const { userName, userEmail, location, contacts } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No emergency contacts provided'
      });
    }

    const googleMapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    
    const results = {
      total: contacts.length,
      smsSent: 0,
      callsInitiated: 0,
      failed: 0,
      details: []
    };

    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('⚠️ Twilio not configured, skipping SMS/Calls');
      return res.json({
        success: true,
        message: 'Twilio not configured - use Telegram instead',
        ...results
      });
    }

    // Initialize Twilio only if configured
    const twilio = (await import('twilio')).default;
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

    // Process each contact
    for (const contact of contacts) {
      const contactResult = {
        name: contact.name || 'Unknown',
        phone: contact.phone,
        smsSuccess: false,
        callSuccess: false,
        error: null
      };

      try {
        // Format phone number
        let formattedPhone = contact.phone.replace(/[^\d+]/g, '');
        if (!formattedPhone.startsWith('+') && formattedPhone.length === 10) {
          formattedPhone = '+91' + formattedPhone;
        }

        // Send SMS
        try {
          const smsMessage = `🚨 SOS EMERGENCY ALERT! 🚨\n\n${userName || userEmail} needs immediate help!\n\n📍 Location: ${googleMapsLink}\n\nPlease contact them immediately!`;

          await twilioClient.messages.create({
            body: smsMessage,
            from: TWILIO_PHONE_NUMBER,
            to: formattedPhone
          });

          contactResult.smsSuccess = true;
          results.smsSent++;
          console.log(`✅ SMS sent to ${contact.name} (${formattedPhone})`);
        } catch (smsError) {
          console.error(`❌ SMS failed for ${contact.name}:`, smsError.message);
          contactResult.error = `SMS: ${smsError.message}`;
        }

        // Wait before making call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Initiate Call
        try {
          await twilioClient.calls.create({
            twiml: `
              <Response>
                <Say voice="alice" language="en-IN">
                  Emergency alert! ${userName || userEmail} needs immediate help. 
                  Please check your messages and contact them immediately.
                </Say>
              </Response>
            `,
            to: formattedPhone,
            from: TWILIO_PHONE_NUMBER
          });

          contactResult.callSuccess = true;
          results.callsInitiated++;
          console.log(`✅ Call initiated to ${contact.name} (${formattedPhone})`);
        } catch (callError) {
          console.error(`❌ Call failed for ${contact.name}:`, callError.message);
          contactResult.error = contactResult.error 
            ? `${contactResult.error}, Call: ${callError.message}` 
            : `Call: ${callError.message}`;
        }

      } catch (error) {
        console.error(`❌ Error processing contact ${contact.name}:`, error.message);
        contactResult.error = error.message;
        results.failed++;
      }

      results.details.push(contactResult);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    res.json({
      success: true,
      message: 'SOS alerts processed',
      ...results
    });

  } catch (error) {
    console.error('❌ SOS Alert Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/send-order-confirmation
 * Sends order confirmation email and WhatsApp message to customer
 * Also sends admin notification email
 */
app.post('/api/send-order-confirmation', async (req, res) => {
  try {
    const { orderData, selectedPlan, orderNumber } = req.body;

    if (!orderData || !orderData.email || !orderData.phone) {
      return res.status(400).json({
        success: false,
        error: 'Order data with email and phone is required'
      });
    }

    const results = {
      emailSent: false,
      whatsappSent: false,
      adminNotified: false,
      details: {}
    };

    const plan = selectedPlan;
    const customerName = orderData.name;
    const customerEmail = orderData.email;
    const customerPhone = orderData.phone;

    // Send Email Confirmation to Customer
    try {
      if (EMAIL_USER && EMAIL_PASS) {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); padding: 40px 20px; text-align: center; color: white; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 40px 30px; }
                .order-number { background: #f3e8ff; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
                .order-number span { color: #9333ea; font-size: 24px; font-weight: bold; }
                .plan-details { background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; }
                .plan-name { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
                .plan-price { font-size: 28px; font-weight: bold; color: #dc2626; }
                .shipping-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .shipping-details h3 { margin-top: 0; color: #374151; }
                .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
                .button { display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Order Confirmed!</h1>
                  <p>Thank you for choosing Suraksha</p>
                </div>
                <div class="content">
                  <p>Dear ${customerName},</p>
                  <p>Your order has been placed successfully! We're committed to ensuring your safety and security.</p>
                  
                  <div class="order-number">
                    <p style="margin: 0; color: #6b7280;">Order Number</p>
                    <span>${orderNumber}</span>
                  </div>

                  <div class="plan-details">
                    <div class="plan-name">${plan.name}</div>
                    <div class="plan-price">${plan.price}</div>
                    <ul style="margin: 15px 0; padding-left: 20px; color: #4b5563;">
                      ${plan.features.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                  </div>

                  <div class="shipping-details">
                    <h3>📍 Shipping Address</h3>
                    <p style="color: #374151; line-height: 1.6;">
                      ${customerName}<br>
                      ${orderData.address}<br>
                      ${orderData.city} - ${orderData.pincode}<br>
                      📞 ${customerPhone}
                    </p>
                  </div>

                  <div style="text-align: center;">
                    <p style="color: #059669; font-weight: bold;">✅ Payment Method: ${orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                  </div>

                  <div style="text-align: center;">
                    <a href="tel:+919369508929" class="button">📞 Contact Support</a>
                  </div>

                  <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                    Your device will be shipped within 24-48 hours. You'll receive a tracking number once your order is dispatched.
                  </p>
                </div>
                <div class="footer">
                  <p>Suraksha - Your Safety, Our Priority</p>
                  <p>Need help? Contact us at support@suraksha.com or call +91 93695 08929</p>
                </div>
              </div>
            </body>
          </html>
        `;

        await emailTransporter.sendMail({
          from: `"Suraksha Safety" <${EMAIL_USER}>`,
          to: customerEmail,
          subject: `🎉 Order Confirmed! - ${orderNumber}`,
          text: `
            Dear ${customerName},

            Your order has been placed successfully!

            Order Number: ${orderNumber}
            Plan: ${plan.name}
            Price: ${plan.price}

            Shipping Address:
            ${customerName}
            ${orderData.address}
            ${orderData.city} - ${orderData.pincode}
            Phone: ${customerPhone}

            Payment Method: ${orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}

            Your device will be shipped within 24-48 hours.

            Thank you for choosing Suraksha!
          `,
          html: emailHtml
        });

        results.emailSent = true;
        results.details.email = { success: true, to: customerEmail };
        console.log(`✅ Order confirmation email sent to ${customerEmail}`);
      } else {
        results.details.email = { success: false, error: 'Email not configured' };
        console.warn('⚠️ Email not configured, skipping email');
      }
    } catch (emailError) {
      results.details.email = { success: false, error: emailError.message };
      console.error('❌ Email error:', emailError.message);
    }

    // Send WhatsApp Message to Customer via Twilio
    try {
      if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
        const twilio = (await import('twilio')).default;
        const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        // Format phone number
        let formattedPhone = customerPhone.replace(/[^\d+]/g, '');
        if (!formattedPhone.startsWith('+') && formattedPhone.length === 10) {
          formattedPhone = '+91' + formattedPhone;
        }

        const whatsappMessage = `🎉 *Order Confirmed!* 🎉

Dear ${customerName},

Thank you for ordering *${plan.name}*!

📦 *Order Number:* ${orderNumber}
💰 *Price:* ${plan.price}

📍 *Shipping Address:*
${customerName}
${orderData.address}
${orderData.city} - ${orderData.pincode}
📞 ${customerPhone}

💵 *Payment:* ${orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}

Your device will be shipped within 24-48 hours. You'll receive a tracking number once dispatched.

Need help? Call us at +91 93695 08929

Thank you for choosing *Suraksha*! 🛡️`;

        await twilioClient.messages.create({
          from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:${formattedPhone}`,
          body: whatsappMessage
        });

        results.whatsappSent = true;
        results.details.whatsapp = { success: true, to: formattedPhone };
        console.log(`✅ WhatsApp message sent to ${formattedPhone}`);
      } else {
        results.details.whatsapp = { success: false, error: 'Twilio not configured' };
        console.warn('⚠️ Twilio not configured, skipping WhatsApp');
      }
    } catch (whatsappError) {
      results.details.whatsapp = { success: false, error: whatsappError.message };
      console.error('❌ WhatsApp error:', whatsappError.message);
    }

    // Send Admin/Seller Notification Email
    try {
      // Send to both Admin and Seller
      const recipientEmails = [];
      if (process.env.ADMIN_EMAIL) recipientEmails.push(process.env.ADMIN_EMAIL);
      if (process.env.SELLER_EMAIL && process.env.SELLER_EMAIL !== process.env.ADMIN_EMAIL) {
        recipientEmails.push(process.env.SELLER_EMAIL);
      }
      
      if (recipientEmails.length > 0 && EMAIL_USER && EMAIL_PASS) {
        const adminEmail = recipientEmails.join(',');

        const adminEmailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 20px; text-align: center; color: white; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 40px 30px; }
                .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; }
                .order-number { background: #f3e8ff; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
                .order-number span { color: #9333ea; font-size: 24px; font-weight: bold; }
                .customer-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .customer-info h3 { margin-top: 0; color: #374151; }
                .order-details { background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; }
                .action-required { background: #fef3c7; border: 2px dashed #f59e0b; padding: 20px; border-radius: 8px; text-align: center; margin-top: 20px; }
                .action-required h3 { margin: 0 0 10px 0; color: #92400e; }
                .button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px; }
                .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📦 New Order Received!</h1>
                  <p>Action Required: Process this order</p>
                </div>
                <div class="content">
                  <div class="alert-box">
                    <strong>⚠️ New order needs to be processed!</strong>
                  </div>

                  <div class="order-number">
                    <p style="margin: 0; color: #6b7280;">Order Number</p>
                    <span>${orderNumber}</span>
                  </div>

                  <div class="order-details">
                    <h3 style="margin-top: 0; color: #1f2937;">📋 Order Details</h3>
                    <p style="margin: 5px 0;"><strong>Plan:</strong> ${plan.name}</p>
                    <p style="margin: 5px 0;"><strong>Price:</strong> ${plan.price}</p>
                    <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${orderData.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}</p>
                    <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date().toLocaleString('en-IN')}</p>
                  </div>

                  <div class="customer-info">
                    <h3>👤 Customer Information</h3>
                    <p style="margin: 5px 0;"><strong>Name:</strong> ${customerName}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${customerEmail}</p>
                    <p style="margin: 5px 0;"><strong>Phone:</strong> ${customerPhone}</p>
                    <hr style="margin: 15px 0; border: none; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 5px 0;"><strong>Shipping Address:</strong></p>
                    <p style="color: #374151; line-height: 1.6; margin-left: 10px;">
                      ${orderData.address}<br>
                      ${orderData.city} - ${orderData.pincode}
                    </p>
                  </div>

                  <div class="action-required">
                    <h3>✅ Action Required</h3>
                    <p style="color: #92400e; margin: 10px 0;">Please process this order within 24 hours</p>
                    <p style="font-size: 14px; color: #6b7280;">
                      1. Verify payment (if online)<br>
                      2. Pack the device<br>
                      3. Generate shipping label<br>
                      4. Update tracking information
                    </p>
                    <a href="mailto:${customerEmail}" class="button">📧 Contact Customer</a>
                  </div>

                  <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                    This is an automated notification from Suraksha Order Management System.
                  </p>
                </div>
                <div class="footer">
                  <p>Suraksha Order Management System</p>
                  <p>Need help? Contact support at support@suraksha.com</p>
                </div>
              </div>
            </body>
          </html>
        `;

        await emailTransporter.sendMail({
          from: `"Suraksha Orders" <${EMAIL_USER}>`,
          to: adminEmail,
          subject: `📦 NEW ORDER ALERT! - ${orderNumber} - Action Required`,
          text: `
            NEW ORDER RECEIVED!

            Order Number: ${orderNumber}
            Order Date: ${new Date().toLocaleString('en-IN')}

            CUSTOMER DETAILS:
            Name: ${customerName}
            Email: ${customerEmail}
            Phone: ${customerPhone}

            ORDER DETAILS:
            Plan: ${plan.name}
            Price: ${plan.price}
            Payment: ${orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}

            SHIPPING ADDRESS:
            ${orderData.address}
            ${orderData.city} - ${orderData.pincode}

            ACTION REQUIRED: Please process this order within 24 hours.
          `,
          html: adminEmailHtml,
          priority: 'high'
        });

        results.adminNotified = true;
        results.details.admin = { success: true, to: adminEmail };
        console.log(`✅ Admin/Seller notification sent to: ${recipientEmails.join(', ')}`);
      } else {
        results.details.admin = { success: false, error: 'Admin/Seller email not configured' };
        console.warn('⚠️ Admin/Seller email not configured, skipping notification');
      }
    } catch (adminError) {
      results.details.admin = { success: false, error: adminError.message };
      console.error('❌ Admin notification error:', adminError.message);
    }

    // Return results
    res.json({
      success: true,
      message: 'Order confirmation processed',
      ...results
    });

  } catch (error) {
    console.error('❌ Order Confirmation Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Suraksha Backend is running',
    mode: TELEGRAM_BOT_TOKEN ? 'FREE (Telegram)' : 'PAID (Twilio required)',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Suraksha Backend Server');
  console.log(`📡 Running on http://localhost:${PORT}`);
  console.log(`📧 Email: ${EMAIL_USER && EMAIL_PASS ? '✅ Configured' : '⚠️ Not configured'}`);
  console.log(`💬 WhatsApp: ${TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER ? '✅ Configured' : '⚠️ Not configured'}`);
  console.log(`📱 Telegram: ${TELEGRAM_BOT_TOKEN ? '✅ Configured' : '⚠️ Not configured'}`);
  console.log('\n✅ Ready to send SOS alerts and order confirmations!');
});
