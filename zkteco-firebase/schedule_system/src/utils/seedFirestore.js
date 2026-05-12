import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";

export const seedDatabase = async () => {
    try {
        console.log("Starting Advanced Medical Architecture Database setup...");

        // 1. Seed Specialists
        const specialistsRef = collection(db, "specialists");
        const spec1 = await addDoc(specialistsRef, {
            name: "سارة خالد",
            specialization: "تخاطب", // Speech therapist
            isActive: true
        });
        const spec2 = await addDoc(specialistsRef, {
            name: "أحمد محمود",
            specialization: "تعديل سلوك", // Behavior therapist
            isActive: true
        });

        // 2. Seed Medical CHILDREN Profiles
        const childrenRef = collection(db, "children");
        const child1Doc = await addDoc(childrenRef, {
            personalInfo: { name: "ياسين محمد", DOB: "2018-05-12", guardianPhone: "01000000000" },
            medicalHistory: "شخص بالتوحد في سن 3 سنوات. تأخر شديد في النطق.",
            diagnosis: "توحد",
            activePlanId: null // to be updated
        });
        const child2Doc = await addDoc(childrenRef, {
            personalInfo: { name: "ليان حسن", DOB: "2019-11-20", guardianPhone: "01111111111" },
            medicalHistory: "تأخر في النمو اللغوي بدون أسباب عضوية.",
            diagnosis: "تأخر لغوي",
            activePlanId: null
        });

        // 3. Seed Treatment Plans (With Priority Logic)
        const plansRef = collection(db, "treatmentPlans");
        const plan1 = await addDoc(plansRef, {
            childId: child1Doc.id,
            requiredSpecializations: ["تخاطب"],
            priorityLevel: 1, // Urgent Medical Need
            sessionFrequencyWeekly: 3,
            goals: ["التواصل البصري", "تنمية المهارات اللغوية"],
            status: "active"
        });
        const plan2 = await addDoc(plansRef, {
            childId: child2Doc.id,
            requiredSpecializations: ["تخاطب", "تعديل سلوك"],
            priorityLevel: 3, // Standard
            sessionFrequencyWeekly: 2,
            goals: ["مخارج الحروف"],
            status: "active"
        });

        // Ensure we link child to active plan logically (omitted circular linking for brevity but structural concept remains)

        // 4. Manual Availability (Replaces static dates)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1); // tomorrow
        if (targetDate.getDay() === 5 || targetDate.getDay() === 6) targetDate.setDate(targetDate.getDate() + 2);
        const dateStr = targetDate.toISOString().split('T')[0];

        const availRef = collection(db, "availability");
        // Spec 1 works a split shift
        await addDoc(availRef, {
           specialistId: spec1.id,
           date: dateStr,
           workingBlocks: [
              { startTime: "09:00", endTime: "12:00" }, // Morning Block
              { startTime: "13:00", endTime: "16:00" }  // Afternoon Block
           ]
        });
        // Spec 2 works standard shift
        await addDoc(availRef, {
            specialistId: spec2.id,
            date: dateStr,
            workingBlocks: [{ startTime: "10:00", endTime: "16:00" }]
        });

        // 5. Build Aggressive Denormalized Sessions
        const sStart = new Date(targetDate); sStart.setHours(9, 0, 0, 0);
        const sEnd = new Date(sStart); sEnd.setMinutes(45);

        const sessionsRef = collection(db, "sessions");
        await addDoc(sessionsRef, {
            date: dateStr,
            startTime: Timestamp.fromDate(sStart),
            endTime: Timestamp.fromDate(sEnd),
            status: "scheduled",
            
            // Relational Refs
            childId: child1Doc.id,
            specialistId: spec1.id,
            planId: plan1.id,
            
            // Ultra-Denormalized Data (N+1 Elimination)
            childName: "ياسين محمد",
            diagnosis: "توحد",
            specialistName: "سارة خالد",
            planFocus: "التواصل البصري"
        });
        
        console.log("Master Architecture Database Generated!");
        alert("Clinical Architectural Seed Complete: Patients, Plans, Availability Overrides active!");
    } catch (error) {
        console.error("Error seeding:", error);
    }
};
