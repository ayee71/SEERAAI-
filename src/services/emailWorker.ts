/**
 * Background worker service to simulate email dispatch for legal document status updates.
 */

export interface EmailNotificationResponse {
  success: boolean;
  message: string;
  email: string;
  documentId: string;
  status: string;
  receiptId: string;
  timestamp: string;
}

/**
 * Generates a pre-formatted message for social media/SMS sharing.
 */
export function generateTrilingualInvitation(
  link: string,
  institutionName: string,
  accessCode: string
): string {
  return `SAIORETHIO - Courtroom Session Invitation / Affeerraa / ጥሪ
  
  Institution: ${institutionName}
  Access Link: ${link}
  Access Code: ${accessCode}
  
  [Oromoo] Linkii kana banuun walgahii dhaddachaatti makamaa.
  [Amharic] ይህን ሊንክ በመጫን ወደ ፍርድ ቤት ስብሰባ ይግቡ።
  [English] Please open this link to join the courtroom session.`;
}

export function generateShareableLinkMessage(link: string, institutionName: string): string {
  return `SAIORETHIO - SeeraAI Legal Kiosk Access
  
  Institution: ${institutionName}
  Access Link: ${link}
  
  Please open this link in your browser to connect to the courtroom session.`;
}

/**
 * Simulates a background email dispatch process for legal document status updates.
 */
export function sendKioskLinkEmail(
  email: string,
  link: string,
  recipientName: string
): Promise<EmailNotificationResponse> {
  console.log(`[EmailWorker] Simulating email dispatch to: ${email}`);
  console.log(`[EmailWorker] Kiosk Link: ${link}`);

  return new Promise<EmailNotificationResponse>((resolve) => {
    setTimeout(() => {
      const receiptId = `kiosk_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const result: EmailNotificationResponse = {
        success: true,
        message: `Successfully sent Kiosk access link to ${recipientName} at ${email}.`,
        email,
        documentId: 'kiosk-link',
        status: 'delivered',
        receiptId,
        timestamp: new Date().toISOString(),
      };

      console.log(`[EmailWorker] Dispatch completed successfully:`, result);
      resolve(result);
    }, 1000);
  });
}

export function sendTestEmailNotification(
  email: string,
  documentId: string,
  status: string
): Promise<EmailNotificationResponse> {
  console.log(`[EmailWorker] Simulating email dispatch to: ${email}`);
  console.log(`[EmailWorker] Legal Document ID: ${documentId} | Status Update: ${status}`);

  return new Promise<EmailNotificationResponse>((resolve) => {
    setTimeout(() => {
      const receiptId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const result: EmailNotificationResponse = {
        success: true,
        message: `Successfully simulated '${status}' status report email dispatch to ${email} for legal document #${documentId}.`,
        email,
        documentId,
        status,
        receiptId,
        timestamp: new Date().toISOString(),
      };

      console.log(`[EmailWorker] Dispatch completed successfully:`, result);
      resolve(result);
    }, 1000);
  });
}
