import { sendTestEmailNotification } from '../services/emailWorker';

async function runTest() {
  console.log("--- Starting Test Email Simulation ---");
  const email = "ayelebelayneh23@gmail.com";
  const docId = "DOC-12345";
  const status = "delivered";
  
  const result = await sendTestEmailNotification(email, docId, status);
  console.log("--- Test Result ---");
  console.log(result);
}

runTest().catch(console.error);
