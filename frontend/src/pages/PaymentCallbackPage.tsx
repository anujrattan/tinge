/**
 * Razorpay embedded checkout returns here after the backend verifies the payment
 * and redirects to /payment-callback?status=…&order_number=…&payment_status=…
 *
 * The seamless UX (confirming → success animation → order confirmed) lives in
 * OrderSuccessPage so COD and prepaid share one celebration flow.
 */
export { OrderSuccessPage as PaymentCallbackPage } from './OrderSuccessPage';
