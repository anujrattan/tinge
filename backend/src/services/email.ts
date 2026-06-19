import { Resend } from "resend";
import { config } from "../config/index.js";
import { supabaseAdmin } from "./supabase.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Public logo URL hosted on Supabase (used in all email templates)
// Source: https://ujvcdrrgbeljckbijoee.supabase.co/storage/v1/object/public/category-images/invoice-logo.png
const EMAIL_LOGO_URL =
  "https://ujvcdrrgbeljckbijoee.supabase.co/storage/v1/object/public/category-images/invoice-logo.png";

export type EmailIntent =
  | "order_confirmation_customer"
  | "order_confirmation_admin"
  | "order_status_update_customer"
  | "return_status_update_customer";

export interface SendEmailOptions {
  intent: EmailIntent;
  to?: string | string[]; // optional for admin intents; can be resolved dynamically
  data: any;
}

const hasResendConfig = !!config.resend.apiKey;

const resendClient = hasResendConfig ? new Resend(config.resend.apiKey) : null;

function buildOrderConfirmationCustomerEmail(data: any): {
  subject: string;
  html: string;
} {
  const order = data.order || {};
  const orderNumber = order.order_number ?? data.orderNumber;
  const totalAmount = order.total_amount ?? data.totalAmount;
  const subtotal = order.subtotal ?? 0;
  const taxAmount = order.tax_amount ?? 0;
  const shippingCost = order.shipping_cost ?? 0;
  const codFee = order.cod_fee ?? 0;
  const gateway = order.gateway || "COD";
  const items: any[] = data.items || [];

  // Extract first name from user_name (format: "FirstName LastName" or just "FirstName")
  const userName = order.user_name || "";
  const firstName = userName.split(" ")[0] || "Customer";

  // Logo served via Supabase public URL
  const logoUrl = EMAIL_LOGO_URL;

  // Format: Product Name (Size: X, Color: Y)
  const itemsRows = items
    .map((item) => {
      const variantParts = [];
      if (item.size) variantParts.push(`Size: ${item.size}`);
      if (item.color) variantParts.push(`Color: ${item.color}`);
      const variantText = variantParts.length > 0 ? ` (${variantParts.join(", ")})` : "";
      
      return `
        <tr>
          <td style="padding:12px 16px;font-size:15px;color:#111827;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${
            item.product_name || "Item"
          }${variantText}</td>
          <td style="padding:12px 16px;font-size:15px;color:#4b5563;text-align:center;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${
            item.quantity ?? 1
          }</td>
          <td style="padding:12px 16px;font-size:15px;color:#111827;text-align:right;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">₹${
            item.total_price?.toLocaleString("en-IN") ?? 0
          }</td>
        </tr>
      `;
    })
    .join("");

  const subject = `Your Luxe Threads order ${orderNumber} is placed`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin:0;padding:0;background-color:#f3f4f6;">
      <div style="background-color:#f3f4f6;padding:24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background:linear-gradient(90deg,#8b5cf6,#ec4899);padding:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:80px;vertical-align:middle;">
                    <img src="${logoUrl}" alt="Luxe Threads" style="max-width:80px;height:auto;display:block;" />
                  </td>
                  <td style="vertical-align:middle;text-align:right;">
                    <p style="margin:0;font-size:18px;color:#ffffff;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      ORDER PLACED
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding:32px 24px 24px 24px;">
              <p style="font-size:20px;color:#111827;margin:0 0 12px 0;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                Thank you for your order, ${firstName}!
              </p>
              <p style="font-size:15px;color:#4b5563;margin:0 0 24px 0;line-height:1.6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                Your order <strong style="color:#111827;">#${orderNumber}</strong> has been placed. We'll confirm this order within 2 hours.
              </p>
            </td>
          </tr>
          
          <!-- Order Items Table -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th align="left" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Product</th>
                    <th align="center" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Qty</th>
                    <th align="right" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Order Summary -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="width:60%;"></td>
                  <td style="width:40%;padding-top:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;color:#111827;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      <tr>
                        <td align="left" style="padding:6px 0;color:#4b5563;font-weight:400;">Subtotal</td>
                        <td align="right" style="padding:6px 0;font-weight:500;">₹${subtotal.toLocaleString("en-IN")}</td>
                      </tr>
                      ${taxAmount > 0 ? `
                      <tr>
                        <td align="left" style="padding:6px 0;color:#4b5563;font-weight:400;">Tax (GST)</td>
                        <td align="right" style="padding:6px 0;font-weight:500;">₹${taxAmount.toLocaleString("en-IN")}</td>
                      </tr>
                      ` : ""}
                      ${shippingCost > 0 ? `
                      <tr>
                        <td align="left" style="padding:6px 0;color:#4b5563;font-weight:400;">Shipping</td>
                        <td align="right" style="padding:6px 0;font-weight:500;">₹${shippingCost.toLocaleString("en-IN")}</td>
                      </tr>
                      ` : ""}
                      ${codFee > 0 && gateway === "COD" ? `
                      <tr>
                        <td align="left" style="padding:6px 0;color:#4b5563;font-weight:400;">COD Fee</td>
                        <td align="right" style="padding:6px 0;font-weight:500;">₹${codFee.toLocaleString("en-IN")}</td>
                      </tr>
                      ` : ""}
                      <tr style="border-top:2px solid #e5e7eb;margin-top:8px;">
                        <td align="left" style="padding:12px 0 6px 0;color:#111827;font-weight:600;font-size:16px;">Order Total</td>
                        <td align="right" style="padding:12px 0 6px 0;font-weight:700;font-size:16px;color:#8b5cf6;">₹${totalAmount.toLocaleString("en-IN")}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Preparing Order Notice -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <div style="background-color:#f0f9ff;border-left:4px solid #3b82f6;padding:16px;border-radius:6px;">
                <p style="margin:0 0 8px 0;font-size:14px;color:#1e40af;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  📦 Preparing Your Order
                </p>
                <p style="margin:0;font-size:14px;color:#1e3a8a;line-height:1.6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  Your order is now under review. Our team will connect with you briefly to reconfirm the details before we move ahead. This allows us to maintain the highest standards of quality and accuracy.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding:0 24px 32px 24px;">
              <a
                href="${config.frontendUrl}/orders"
                style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(90deg,#8b5cf6,#ec4899);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 6px rgba(139,92,246,0.3);"
              >
                View your orders
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#111827;padding:20px 24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                You're receiving this email because you placed an order at Luxe Threads.
              </p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

function buildOrderConfirmationAdminEmail(data: any): {
  subject: string;
  html: string;
} {
  const order = data.order || {};
  const orderNumber = order.order_number ?? data.orderNumber;
  const totalAmount = order.total_amount ?? data.totalAmount;
  const customerEmail = order.user_email;
  const customerName = order.user_name || "Customer";
  const items: any[] = data.items || [];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const gateway = order.gateway || "COD";
  const paymentStatus = order.payment_status || "pending";

  // Logo served via Supabase public URL
  const logoUrl = EMAIL_LOGO_URL;

  // Format: Product Name (Size: X, Color: Y)
  const itemsRows = items
    .slice(0, 5) // Show first 5 items
    .map((item) => {
      const variantParts = [];
      if (item.size) variantParts.push(`Size: ${item.size}`);
      if (item.color) variantParts.push(`Color: ${item.color}`);
      const variantText = variantParts.length > 0 ? ` (${variantParts.join(", ")})` : "";
      
      return `
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#111827;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${
            item.product_name || "Item"
          }${variantText}</td>
          <td style="padding:12px 16px;font-size:14px;color:#4b5563;text-align:center;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${
            item.quantity ?? 1
          }</td>
          <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:right;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">₹${
            item.total_price?.toLocaleString("en-IN") ?? 0
          }</td>
        </tr>
      `;
    })
    .join("");

  const subject = `🆕 New Order: ${orderNumber}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin:0;padding:0;background-color:#f3f4f6;">
      <div style="background-color:#f3f4f6;padding:24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(90deg,#8b5cf6,#ec4899);padding:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:80px;vertical-align:middle;">
                    <img src="${logoUrl}" alt="Luxe Threads" style="max-width:80px;height:auto;display:block;" />
                  </td>
                  <td style="vertical-align:middle;text-align:right;">
                    <p style="margin:0;font-size:18px;color:#ffffff;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      New Order Received
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Alert Box -->
          <tr>
            <td style="padding:24px 24px 0 24px;">
              <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:6px;">
                <p style="margin:0;font-size:15px;color:#92400e;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  ⚡ Action Required: New order needs processing
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Order Details -->
          <tr>
            <td style="padding:24px 24px 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0 0 8px 0;font-size:18px;color:#111827;font-weight:700;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      Order #${orderNumber}
                    </p>
                    <p style="margin:0;font-size:14px;color:#6b7280;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      ${new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                    </p>
                  </td>
                  <td align="right" style="padding-bottom:16px;">
                    <span style="display:inline-block;padding:8px 16px;background-color:#fef3c7;color:#92400e;border-radius:6px;font-size:13px;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      PENDING
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Customer Info -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <div style="background-color:#f9fafb;padding:16px;border-radius:8px;border:1px solid #e5e7eb;">
                <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  Customer Information
                </p>
                <p style="margin:4px 0;font-size:15px;color:#111827;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  ${customerName}
                </p>
                <p style="margin:4px 0;font-size:14px;color:#4b5563;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  ${customerEmail || "N/A"}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Order Items -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                Order Items (${itemCount} ${itemCount === 1 ? 'item' : 'items'})
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th align="left" style="padding:12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Product</th>
                    <th align="center" style="padding:12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Qty</th>
                    <th align="right" style="padding:12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                  ${items.length > 5 ? `
                  <tr>
                    <td colspan="3" style="padding:12px;text-align:center;font-size:13px;color:#6b7280;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      + ${items.length - 5} more item${items.length - 5 === 1 ? '' : 's'}
                    </td>
                  </tr>
                  ` : ""}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Order Summary -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="width:60%;"></td>
                  <td style="width:40%;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;color:#111827;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      <tr>
                        <td align="left" style="padding:8px 0;color:#4b5563;font-weight:400;">Order Total</td>
                        <td align="right" style="padding:8px 0;font-weight:700;font-size:18px;color:#8b5cf6;">₹${totalAmount.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:4px 0;color:#6b7280;font-size:13px;">Payment Method</td>
                        <td align="right" style="padding:4px 0;font-size:13px;color:#6b7280;font-weight:500;">${gateway}</td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:4px 0;color:#6b7280;font-size:13px;">Payment Status</td>
                        <td align="right" style="padding:4px 0;font-size:13px;color:#6b7280;font-weight:500;">${paymentStatus.toUpperCase()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding:0 24px 32px 24px;">
              <a
                href="${config.frontendUrl}/admin?tab=orders"
                style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(90deg,#8b5cf6,#ec4899);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 6px rgba(139,92,246,0.3);"
              >
                View Order in Admin Console
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#111827;padding:20px 24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                This is an automated notification from Luxe Threads Admin System.
              </p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

function buildOrderStatusUpdateCustomerEmail(data: any): {
  subject: string;
  html: string;
} {
  const order = data.order || {};
  const orderNumber = order.order_number ?? data.orderNumber;
  const newStatus = order.status ?? data.status;
  const oldStatus = data.oldStatus || "pending";
  const userName = order.user_name || "";
  const firstName = userName.split(" ")[0] || "Customer";
  const trackingNumber = order.tracking_number;
  const trackingUrl = order.tracking_url;
  const shippingPartner = order.shipping_partner;
  const items: any[] = data.items || [];

  // Logo served via Supabase public URL
  const logoUrl = EMAIL_LOGO_URL;

  // Status-specific messages
  const statusMessages: Record<string, { title: string; message: string; color: string }> = {
    processing: {
      title: "Order Processing",
      message: "We've received your order and are preparing it for production.",
      color: "#3b82f6",
    },
    confirmed: {
      title: "Order Confirmed",
      message: "Your order has been confirmed and is ready for production.",
      color: "#10b981",
    },
    shipped: {
      title: "Order Shipped! 🚚",
      message: "Great news! Your order has been shipped and is on its way to you.",
      color: "#8b5cf6",
    },
    delivered: {
      title: "Order Delivered! ✅",
      message: "Your order has been delivered. We hope you love your purchase!",
      color: "#10b981",
    },
    cancelled: {
      title: "Order Cancelled",
      message: "Your order has been cancelled. If you have any questions, please contact our support team.",
      color: "#ef4444",
    },
    failed: {
      title: "Order Failed",
      message: "We encountered an issue processing your order. Our team will contact you shortly.",
      color: "#ef4444",
    },
  };

  const statusInfo = statusMessages[newStatus] || {
    title: "Order Status Updated",
    message: `Your order status has been updated to ${newStatus}.`,
    color: "#6b7280",
  };

  const subject = `Your Luxe Threads order ${orderNumber} - ${statusInfo.title}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin:0;padding:0;background-color:#f3f4f6;">
      <div style="background-color:#f3f4f6;padding:24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background:linear-gradient(90deg,#8b5cf6,#ec4899);padding:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:80px;vertical-align:middle;">
                    <img src="${logoUrl}" alt="Luxe Threads" style="max-width:80px;height:auto;display:block;" />
                  </td>
                  <td style="vertical-align:middle;text-align:right;">
                    <p style="margin:0;font-size:18px;color:#ffffff;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      Order Status Update
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Status Update -->
          <tr>
            <td style="padding:32px 24px 24px 24px;">
              <p style="font-size:20px;color:#111827;margin:0 0 12px 0;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                Hello ${firstName},
              </p>
              <p style="font-size:15px;color:#4b5563;margin:0 0 24px 0;line-height:1.6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                ${statusInfo.message}
              </p>
              
              <div style="background-color:#f9fafb;border-left:4px solid ${statusInfo.color};padding:16px;border-radius:6px;margin-bottom:24px;">
                <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  Order Number
                </p>
                <p style="margin:0;font-size:18px;color:#111827;font-weight:700;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  #${orderNumber}
                </p>
                <p style="margin:8px 0 0 0;font-size:14px;color:#4b5563;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  Status: <strong style="color:${statusInfo.color};">${statusInfo.title.toUpperCase()}</strong>
                </p>
              </div>
              
              ${newStatus === "shipped" && (trackingNumber || trackingUrl || shippingPartner) ? `
              <div style="background-color:#f0f9ff;border:1px solid #3b82f6;padding:16px;border-radius:6px;margin-bottom:24px;">
                <p style="margin:0 0 12px 0;font-size:15px;color:#1e40af;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  📦 Tracking Information
                </p>
                ${shippingPartner ? `
                <p style="margin:4px 0;font-size:14px;color:#1e3a8a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  <strong>Shipping Partner:</strong> ${shippingPartner}
                </p>
                ` : ""}
                ${trackingNumber ? `
                <p style="margin:4px 0;font-size:14px;color:#1e3a8a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  <strong>Tracking Number:</strong> <span style="font-family:monospace;background-color:#dbeafe;padding:2px 6px;border-radius:4px;">${trackingNumber}</span>
                </p>
                ` : ""}
                ${trackingUrl ? `
                <p style="margin:12px 0 0 0;">
                  <a href="${trackingUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(90deg,#3b82f6,#2563eb);color:#ffffff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 6px rgba(59,130,246,0.3);">
                    Track Your Order →
                  </a>
                </p>
                ` : ""}
              </div>
              ` : ""}
            </td>
          </tr>
          
          ${items.length > 0 ? `
          <!-- Product Details Section -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <p style="margin:0 0 16px 0;font-size:16px;color:#111827;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                Your Order Items
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th align="left" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Product</th>
                    <th align="center" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Qty</th>
                    <th align="right" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item) => {
                    const variantParts = [];
                    if (item.size) variantParts.push(`Size: ${item.size}`);
                    if (item.color) variantParts.push(`Color: ${item.color}`);
                    const variantText = variantParts.length > 0 ? ` (${variantParts.join(", ")})` : "";
                    
                    return `
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#111827;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                          ${item.product_name || "Item"}${variantText}
                        </td>
                        <td style="padding:12px 16px;font-size:14px;color:#4b5563;text-align:center;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                          ${item.quantity ?? 1}
                        </td>
                        <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:right;font-weight:500;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                          ₹${(item.total_price || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </td>
          </tr>
          ` : ""}
          
          <!-- CTA Buttons -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    ${newStatus === "shipped" && trackingUrl ? `
                    <a
                      href="${trackingUrl}"
                      target="_blank"
                      style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(90deg,#3b82f6,#2563eb);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 6px rgba(59,130,246,0.3);margin-right:12px;"
                    >
                      Track Your Order
                    </a>
                    ` : ""}
                    <a
                      href="${config.frontendUrl}/order-details/${orderNumber}"
                      style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(90deg,#8b5cf6,#ec4899);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 6px rgba(139,92,246,0.3);"
                    >
                      View Order Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Preparing Order Notice -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <div style="background-color:#f0f9ff;border-left:4px solid #3b82f6;padding:16px;border-radius:6px;">
                <p style="margin:0 0 8px 0;font-size:14px;color:#1e40af;font-weight:600;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  📦 Preparing Your Order
                </p>
                <p style="margin:0;font-size:14px;color:#1e3a8a;line-height:1.6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  Your order is now under review. Our team will connect with you briefly to reconfirm the details before we move ahead. This allows us to maintain the highest standards of quality and accuracy.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#111827;padding:20px 24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                You're receiving this email because you placed an order at Luxe Threads.
              </p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

function buildReturnStatusUpdateCustomerEmail(data: any): {
  subject: string;
  html: string;
} {
  const returnRequest = data.returnRequest || {};
  const order = data.order || {};
  const orderItem = data.orderItem || {};
  const orderNumber = order.order_number || "";
  const status = returnRequest.status || "updated";
  const ran = returnRequest.return_number || "Pending approval";
  const logoUrl = EMAIL_LOGO_URL;

  const statusMessages: Record<string, { title: string; message: string; color: string }> = {
    pending_review: {
      title: "Return request received",
      message: "We have received your return request and our team is reviewing it.",
      color: "#f59e0b",
    },
    approved: {
      title: "Return approved",
      message: `Your return has been approved. Your Return Authorization Number (RAN) is ${ran}. Please follow the return instructions below.`,
      color: "#10b981",
    },
    awaiting_shipment: {
      title: "Awaiting your return shipment",
      message: "Please ship the item back using the instructions we provided.",
      color: "#3b82f6",
    },
    in_transit: {
      title: "Return in transit",
      message: "We are tracking your return shipment.",
      color: "#3b82f6",
    },
    received: {
      title: "Return received",
      message: "We have received your returned item and are inspecting it.",
      color: "#8b5cf6",
    },
    completed: {
      title: "Return completed",
      message:
        returnRequest.type === "exchange"
          ? "Your exchange has been processed. We will ship your replacement shortly."
          : "Your refund has been processed. It may take 5-7 business days to reflect in your account.",
      color: "#10b981",
    },
    rejected: {
      title: "Return request declined",
      message:
        returnRequest.rejection_reason ||
        "Unfortunately we could not approve this return request. Contact support if you have questions.",
      color: "#ef4444",
    },
    cancelled: {
      title: "Return cancelled",
      message: "Your return request has been cancelled.",
      color: "#6b7280",
    },
  };

  const statusInfo = statusMessages[status] || {
    title: "Return update",
    message: `Your return status is now: ${status}.`,
    color: "#6b7280",
  };

  const shipBlock =
    status === "approved" && (returnRequest.return_ship_to || returnRequest.return_ship_instructions)
      ? `
        <div style="background-color:#f0fdf4;border:1px solid #10b981;padding:16px;border-radius:6px;margin:16px 0;">
          <p style="margin:0 0 8px 0;font-size:14px;color:#065f46;font-weight:600;">Return instructions</p>
          ${returnRequest.return_ship_to ? `<p style="margin:4px 0;font-size:14px;color:#047857;"><strong>Ship to:</strong> ${returnRequest.return_ship_to}</p>` : ""}
          ${returnRequest.return_ship_instructions ? `<p style="margin:8px 0 0 0;font-size:14px;color:#047857;line-height:1.5;">${returnRequest.return_ship_instructions}</p>` : ""}
          <p style="margin:12px 0 0 0;font-size:13px;color:#047857;">Include your RAN <strong>${ran}</strong> inside the package.</p>
        </div>
      `
      : "";

  const subject = `Return update — Order #${orderNumber}`;

  const html = `
    <!DOCTYPE html>
    <html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter,sans-serif;">
      <table width="100%" style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#FF7A59,#FFC371);padding:20px 24px;">
          <img src="${logoUrl}" alt="Tinge" style="max-width:72px;height:auto;" />
        </td></tr>
        <tr><td style="padding:24px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">${statusInfo.title}</h1>
          <p style="margin:0 0 16px 0;font-size:15px;color:#4b5563;line-height:1.6;">${statusInfo.message}</p>
          <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280;">Order #${orderNumber}</p>
          <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280;">Item: ${orderItem.product_name || "Product"}${orderItem.size ? ` · ${orderItem.size}` : ""}</p>
          <p style="margin:0;font-size:13px;color:${statusInfo.color};font-weight:600;">Status: ${status.replace(/_/g, " ")}</p>
          ${shipBlock}
          <p style="margin:24px 0 0 0;">
            <a href="${config.frontendUrl}/order-details/${orderNumber}" style="display:inline-block;padding:12px 24px;background:#1E1B22;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View order</a>
          </p>
        </td></tr>
      </table>
    </body></html>
  `;

  return { subject, html };
}

function buildEmail(intent: EmailIntent, data: any): {
  subject: string;
  html: string;
} {
  switch (intent) {
    case "order_confirmation_customer":
      return buildOrderConfirmationCustomerEmail(data);
    case "order_confirmation_admin":
      return buildOrderConfirmationAdminEmail(data);
    case "order_status_update_customer":
      return buildOrderStatusUpdateCustomerEmail(data);
    case "return_status_update_customer":
      return buildReturnStatusUpdateCustomerEmail(data);
    default:
      return {
        subject: "Luxe Threads notification",
        html: "<p>No template implemented for this email intent.</p>",
      };
  }
}

async function getAdminRecipientEmails(): Promise<string[]> {
  const emails: string[] = [];
  
  try {
    // First, get admin emails from user_profiles table
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("email, role")
      .eq("role", "admin");

    if (!error && data) {
      const profileEmails = (data || [])
        .map((row: any) => row.email)
        .filter((email: string | null) => !!email);
      emails.push(...profileEmails);
    } else if (error) {
      console.error("[EMAIL] Error fetching admin recipients from user_profiles:", error);
    }
  } catch (err) {
    console.error("[EMAIL] Unexpected error fetching admin recipients:", err);
  }

  // Also include RESEND_ADMIN_EMAIL from config if set
  if (config.resend.adminEmail) {
    const adminEmail = config.resend.adminEmail.trim();
    if (adminEmail && !emails.includes(adminEmail)) {
      emails.push(adminEmail);
    }
  }

  return emails;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!hasResendConfig || !resendClient) {
    console.warn(
      "[EMAIL] Resend API key not configured. Skipping email send.",
      { intent: options.intent }
    );
    return;
  }

  let to: string[] = [];

  if (options.to) {
    to = Array.isArray(options.to) ? options.to : [options.to];
  }

  // For admin-facing intents, allow dynamic resolution of admin recipients
  if (options.intent.endsWith("_admin") && to.length === 0) {
    to = await getAdminRecipientEmails();

    // Fallback to configured admin email if no admin users found
    if (to.length === 0 && config.resend.adminEmail) {
      to = [config.resend.adminEmail];
    }
  }

  if (to.length === 0) {
    console.warn(
      "[EMAIL] No recipients resolved for email; skipping send.",
      { intent: options.intent }
    );
    return;
  }

  const { subject, html } = buildEmail(options.intent, options.data);

  try {
    await resendClient.emails.send({
      // Use configured fromEmail; Resend dashboard can override defaults if needed
      from: config.resend.fromEmail,
      to,
      subject,
      html,
    });
    console.log(
      `[EMAIL] Sent email for intent=${options.intent} to=${to.join(", ")}`
    );
  } catch (error: any) {
    console.error(
      `[EMAIL] Error sending email for intent=${options.intent}:`,
      error?.message || error
    );
  }
}

