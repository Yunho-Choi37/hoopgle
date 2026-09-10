import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
    apiKey: "AIzaSyBHQC6sTTqTOuQTC1rLRSbwZy8XKobP0Kk",
    authDomain: "hoopgle-hoopdex.firebaseapp.com",
    projectId: "hoopgle-hoopdex",
    storageBucket: "hoopgle-hoopdex.firebasestorage.app",
    messagingSenderId: "838833662960",
    appId: "1:838833662960:web:066f756c78fe42bf20cb35",
    measurementId: "G-QGTVGR6EFF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadSpringRecords() {
    console.log("Reading spring_2026_records.json...");
    if (!fs.existsSync("spring_2026_records.json")) {
        console.error("Error: spring_2026_records.json not found!");
        process.exit(1);
    }

    const rawData = fs.readFileSync("spring_2026_records.json", "utf-8");
    const records = JSON.parse(rawData);
    console.log(`Total records to upload: ${records.length}`);

    const collectionName = 'player_records';
    let successCount = 0;
    let failCount = 0;
    const chunkSize = 50;

    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const promises = chunk.map(async (record) => {
            try {
                // Use custom doc ID to prevent duplicates if re-run
                const docId = record.id || `2026_spring_${Math.random().toString(36).substring(2, 9)}`;
                await setDoc(doc(db, collectionName, String(docId)), record);
                successCount++;
            } catch (e) {
                console.error("Error uploading record:", e);
                failCount++;
            }
        });

        await Promise.all(promises);
        console.log(`Uploaded ${Math.min(i + chunkSize, records.length)} / ${records.length}`);
    }

    console.log("\nUpload completed successfully!");
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    process.exit(0);
}

uploadSpringRecords();
