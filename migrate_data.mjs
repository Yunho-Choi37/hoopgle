import { createClient } from '@supabase/supabase-js';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore";

// --- Configuration ---

// Supabase Config (from your previous file)
const supabaseUrl = 'https://nwggbjyuuhtnrxdhzofo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Z2dianl1dWh0bnJ4ZGh6b2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2ODgyMTYsImV4cCI6MjA2NzI2NDIxNn0.a0eIxwPj8GEZNChQxIIm5622bPIqRg7pTXeqTrX5riI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Firebase Config (from your provided config)
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

// --- Migration Logic ---

async function migrateData() {
    console.log("Starting migration...");
    console.log("Fetching data from Supabase...");

    let allRecords = [];
    let page = 0;
    const pageSize = 1000;

    // 1. Fetch all records from Supabase
    while (true) {
        const { data, error } = await supabase
            .from('2025 주말리그 선수기록')
            .select('*')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching from Supabase:', error);
            break;
        }

        if (data && data.length > 0) {
            allRecords = allRecords.concat(data);
            console.log(`Fetched ${data.length} records (Total: ${allRecords.length})`);
        }

        if (!data || data.length < pageSize) {
            break;
        }
        page++;
    }

    console.log(`Total records to migrate: ${allRecords.length}`);

    // 2. Upload to Firestore
    const collectionName = 'player_records';
    let successCount = 0;
    let failCount = 0;

    // Batching is better, but for simplicity and avoiding size limits, we'll do parallel promises in chunks
    const chunkSize = 50;

    for (let i = 0; i < allRecords.length; i += chunkSize) {
        const chunk = allRecords.slice(i, i + chunkSize);
        const promises = chunk.map(async (record) => {
            try {
                // We use addDoc to let Firestore generate an ID, or we could use setDoc if we had a unique ID.
                // Since the original data might not have a clean unique ID (it has 'id' but maybe we want to keep it?),
                // let's just add it. If we want to preserve the Supabase ID, we can use setDoc.
                // Let's try to preserve Supabase ID if possible to avoid duplicates on re-run.

                if (record.id) {
                    await setDoc(doc(db, collectionName, String(record.id)), record);
                } else {
                    await addDoc(collection(db, collectionName), record);
                }
                successCount++;
            } catch (e) {
                console.error("Error uploading record:", e);
                failCount++;
            }
        });

        await Promise.all(promises);
        console.log(`Processed ${Math.min(i + chunkSize, allRecords.length)} / ${allRecords.length}`);
    }

    console.log("Migration finished!");
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);

    // Exit process
    process.exit(0);
}

migrateData();
