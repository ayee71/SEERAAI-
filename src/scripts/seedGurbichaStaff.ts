import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export async function seedGurbichaStaff() {
  const institutionId = 'court_gurbicha_001';
  
  const staffMembers = [
    {
      id: "staff-1",
      fullName: "Abbaa Seeraa Caalaa Tasfaayee",
      email: "caalaa.judge@gurbicha.court.gov.et",
      phone: "+251 911 123456",
      role: "court_admin", // Given they are 'Admin Abbaa Seeraa'
      bench: "Dhaddacha Hariiroo Hawaasaa 1ffaa",
      badge: "MMA-GUR-JUDGE-01",
      status: "active"
    },
    {
      id: "staff-2",
      fullName: "Ofiisara Seeraa Gadaa Toleeraa",
      email: "gadaa.officer@gurbicha.court.gov.et",
      phone: "+251 912 234567",
      role: "court_staff",
      bench: "Dhaddacha Hariiroo Hawaasaa & Yakkaa",
      badge: "MMA-GUR-OFFICER-01",
      status: "active"
    },
    {
      id: "staff-3",
      fullName: "Aadde Boontuu Dabalaa",
      email: "boontuu.ktas@gurbicha.court.gov.et",
      phone: "+251 913 345678",
      role: "court_staff",
      bench: "Kutaa Teknoolojii & Automation (KTAS)",
      badge: "MMA-GUR-KTAS-01",
      status: "active"
    },
    {
      id: "staff-4",
      fullName: "Abbaa Seeraa Geetaachoo Toleeraa",
      email: "geetaachoo.judge@gurbicha.court.gov.et",
      phone: "+251 914 456789",
      role: "judge",
      bench: "Dhaddacha Yakkaa Aanaa",
      badge: "MMA-GUR-JUDGE-02",
      status: "active"
    },
    {
      id: "staff-5",
      fullName: "Ofiisara Seeraa Tolasaa Firoomsaa",
      email: "tolasaa.officer@gurbicha.court.gov.et",
      phone: "+251 915 567890",
      role: "court_staff",
      bench: "Dhaddacha Lafa & Maatii",
      badge: "MMA-GUR-OFFICER-02",
      status: "active"
    }
  ];

  for (const staff of staffMembers) {
    // Note: In a real system, we would create Auth users too.
    // For now, we seed the court_users collection so they can be recognized on sign-up/login
    await setDoc(doc(db, 'court_users', staff.id), {
      institutionId: institutionId,
      courtId: institutionId,
      fullName: staff.fullName,
      email: staff.email,
      usernameOrEmail: staff.email,
      phone: staff.phone,
      role: staff.role,
      bench: staff.bench,
      licenseNumber: staff.badge,
      status: staff.status,
      userId: staff.id, // This will be updated with real UID upon actual sign-up
      passcode: '123456' // Default passcode
    });
  }

  console.log('Gurbicha court staff seeded successfully.');
}
