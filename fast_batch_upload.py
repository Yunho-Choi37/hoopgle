import json
import requests
import time

PROJECT_ID = "hoopgle-hoopdex"
COMMIT_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:commit"

def convert_to_firestore_fields(record):
    fields = {}
    for k, v in record.items():
        if k == "id":
            continue
        if isinstance(v, bool):
            fields[k] = {"booleanValue": v}
        elif isinstance(v, int):
            fields[k] = {"integerValue": str(v)}
        elif isinstance(v, float):
            fields[k] = {"doubleValue": v}
        else:
            fields[k] = {"stringValue": str(v)}
    return fields

def upload_all():
    print("Reading spring_2026_records.json...")
    with open("spring_2026_records.json", "r", encoding="utf-8") as f:
        records = json.load(f)
    print(f"Total records to upload: {len(records)}")

    # Clean up test_write doc
    try:
        requests.delete(f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/player_records/test_write")
    except:
        pass

    # Batch commit allows up to 500 writes per request
    BATCH_SIZE = 400
    total_batches = (len(records) + BATCH_SIZE - 1) // BATCH_SIZE
    
    success_count = 0
    fail_count = 0

    for b_idx in range(total_batches):
        batch_records = records[b_idx * BATCH_SIZE : (b_idx + 1) * BATCH_SIZE]
        writes = []
        for r in batch_records:
            doc_id = r.get("id")
            doc_name = f"projects/{PROJECT_ID}/databases/(default)/documents/player_records/{doc_id}"
            fields = convert_to_firestore_fields(r)
            writes.append({
                "update": {
                    "name": doc_name,
                    "fields": fields
                }
            })
            
        payload = {"writes": writes}
        
        try:
            resp = requests.post(COMMIT_URL, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
            if resp.status_code == 200:
                success_count += len(batch_records)
                print(f"  Batch {b_idx + 1}/{total_batches}: {len(batch_records)} records committed successfully! (Total: {success_count})")
            else:
                print(f"  Batch {b_idx + 1} failed: HTTP {resp.status_code} - {resp.text[:300]}")
                fail_count += len(batch_records)
        except Exception as e:
            print(f"  Batch {b_idx + 1} error: {e}")
            fail_count += len(batch_records)
            
        time.sleep(0.5)

    print(f"\n======================================")
    print(f"Upload Complete!")
    print(f"Success: {success_count} / {len(records)}")
    print(f"Failed: {fail_count}")
    print(f"======================================")

if __name__ == "__main__":
    upload_all()
