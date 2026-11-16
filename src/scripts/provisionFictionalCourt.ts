import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';

export async function provisionFictionalCourt() {
  const institutionId = 'court_gurbicha_001';
  const adminUid = 'fictional_gurbicha_admin_uid'; // This would be the real Auth UID

  // 1. Provision Institution
  await setDoc(doc(db, 'court_institutions', institutionId), {
    name: 'Mana murtii aanaa gurbicha',
    region: 'Oromia',
    courtLevel: 'FirstInstance',
    adminEmail: 'gurbicha@court.oromia.et',
    adminName: 'Admin Gurbicha',
    accessCode: 'GURBICHA2026',
    status: 'approved',
    adminUid: adminUid
  });

  // 2. Provisioning of the Admin user will happen during sign-up.
  // The system now automatically assigns the 'court_admin' role 
  // if the sign-up email matches the adminEmail in court_institutions.
  console.log('Fictional court institution provisioned successfully.');
}
