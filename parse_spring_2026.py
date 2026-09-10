import os
import re
import json
import time
import requests
import pdfplumber

DOWNLOAD_DIR = "downloads/2026_spring"
OUTPUT_JSON = "spring_2026_records.json"
BASE_URL = "http://www.kssbf.or.kr"

def fetch_all_pdf_links():
    print("Step 1: Fetching all 2026 Spring match PDF links from kssbf.or.kr...")
    all_files = []
    page = 1
    while True:
        url = f"http://www.kssbf.or.kr/game/contest.php?bmode=list&ctchk=B&page={page}"
        try:
            resp = requests.get(url, timeout=10)
            resp.encoding = 'utf-8'
            matches = re.findall(r"/home/recfile_download\.php\?file=([a-zA-Z0-9_\.]+\.pdf)", resp.text)
            if not matches:
                break
            new_in_page = [m for m in matches if m not in all_files]
            if not new_in_page and page > 1:
                break
            for m in matches:
                if m not in all_files:
                    all_files.append(m)
            print(f"  Page {page}: found {len(matches)} links (cumulative: {len(all_files)})")
            page += 1
            time.sleep(0.2)
        except Exception as e:
            print(f"  Error fetching page {page}: {e}")
            break

    print(f"Total unique PDF files found: {len(all_files)}")
    return all_files

def download_pdfs(pdf_files):
    print("\nStep 2: Downloading PDFs...")
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    
    downloaded_paths = []
    for idx, filename in enumerate(pdf_files):
        local_path = os.path.join(DOWNLOAD_DIR, filename)
        if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
            downloaded_paths.append((filename, local_path))
            continue
            
        url = f"http://www.kssbf.or.kr/home/recfile_download.php?file={filename}"
        try:
            r = requests.get(url, timeout=15)
            if r.status_code == 200 and len(r.content) > 1000:
                with open(local_path, "wb") as f:
                    f.write(r.content)
                downloaded_paths.append((filename, local_path))
            else:
                print(f"  [Failed] {filename} (Status: {r.status_code})")
        except Exception as e:
            print(f"  [Error] {filename}: {e}")
            
        if (idx + 1) % 20 == 0 or (idx + 1) == len(pdf_files):
            print(f"  Downloaded {idx + 1} / {len(pdf_files)}...")
        time.sleep(0.1)
        
    print(f"Downloaded {len(downloaded_paths)} PDFs successfully.")
    return downloaded_paths

def parse_single_pdf(filename, pdf_path):
    records = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if not pdf.pages:
                return []
            page = pdf.pages[0]
            text = page.extract_text() or ""
            
            # 1. Metadata
            comp_name_match = re.search(r"대회명\s*:\s*([^\n\r]+)", text)
            comp_name = comp_name_match.group(1).strip() if comp_name_match else "제63회 춘계 전국남녀중고농구연맹전"
            # Cleanup comp_name
            comp_name = comp_name.split()[0] if "대회" in comp_name and len(comp_name) > 40 else comp_name
            if "춘계" in comp_name:
                comp_name = "제63회 춘계 전국남녀중고농구연맹전"
                
            comp_type_match = re.search(r"대회구분\s*:\s*([^\n\r]+)", text)
            raw_comp_type = comp_type_match.group(1).strip() if comp_type_match else ""
            if "중등" in raw_comp_type or "남중" in raw_comp_type or "여중" in raw_comp_type:
                comp_type = "중등부대회"
            elif "고등" in raw_comp_type or "남고" in raw_comp_type or "여고" in raw_comp_type:
                comp_type = "고등부대회"
            else:
                comp_type = raw_comp_type.split()[0] if raw_comp_type else ""

            tables = page.extract_tables()
            if len(tables) < 4:
                return []
                
            score_table = tables[2]
            team1_name = score_table[1][0].strip() if len(score_table) > 1 and score_table[1][0] else ""
            team2_name = score_table[2][0].strip() if len(score_table) > 2 and score_table[2][0] else ""
            
            stat_table = tables[3]
            current_team = team1_name
            current_opponent = team2_name
            
            def safe_int(val, default=0):
                if not val:
                    return default
                val = str(val).strip()
                return int(val) if val.isdigit() else default

            def parse_shot(val):
                if not val:
                    return 0, 0, 0
                parts = str(val).strip().split()
                if len(parts) == 3:
                    return safe_int(parts[0]), safe_int(parts[1]), safe_int(parts[2])
                elif len(parts) == 2:
                    # Attempt and percentage (made=0)
                    a = safe_int(parts[0])
                    pct = safe_int(parts[1])
                    return 0, a, pct
                elif len(parts) == 1:
                    m = safe_int(parts[0])
                    return m, m, 100
                return 0, 0, 0

            def parse_rebounds(val):
                if not val:
                    return 0, 0, 0
                parts = str(val).strip().split()
                if len(parts) == 3:
                    return safe_int(parts[0]), safe_int(parts[1]), safe_int(parts[2])
                elif len(parts) == 2:
                    v1, v2 = safe_int(parts[0]), safe_int(parts[1])
                    return v1, v2 - v1 if v2 >= v1 else 0, v2
                elif len(parts) == 1:
                    tot = safe_int(parts[0])
                    return 0, tot, tot
                return 0, 0, 0

            match_id_str = filename.replace("rec_", "").replace(".pdf", "")

            for row_idx, row in enumerate(stat_table):
                if not row or not row[0]:
                    continue
                first_col = str(row[0]).strip()
                
                if team2_name and team2_name in first_col:
                    current_team = team2_name
                    current_opponent = team1_name
                    continue
                if team1_name and team1_name in first_col:
                    current_team = team1_name
                    current_opponent = team2_name
                    continue
                    
                if first_col in ["TEAM", "TOTA", "TOTAL", "선수명"] or "감독" in first_col or "코치" in first_col or "POINTS" in first_col:
                    continue
                    
                player_name = first_col
                is_starter = "선발" if (len(row) > 1 and row[1] and "*" in str(row[1])) else "비선발"
                jersey_num = safe_int(row[2]) if len(row) > 2 else 0
                
                if len(row) < 10:
                    continue
                    
                q1 = safe_int(row[3])
                q2 = safe_int(row[4])
                q3 = safe_int(row[5])
                q4 = safe_int(row[6])
                ex = safe_int(row[7]) if len(row) > 7 else 0
                tot_pts = safe_int(row[8]) if len(row) > 8 else (q1 + q2 + q3 + q4 + ex)
                playing_time = str(row[9]).strip() if len(row) > 9 and row[9] else "0:00"
                
                p2_m, p2_a, p2_pct = parse_shot(row[10] if len(row) > 10 else "")
                p3_m, p3_a, p3_pct = parse_shot(row[11] if len(row) > 11 else "")
                fg_pct = safe_int(row[12]) if len(row) > 12 else 0
                ft_m, ft_a, ft_pct = parse_shot(row[13] if len(row) > 13 else "")
                
                off_reb, def_reb, tot_reb = parse_rebounds(row[15] if len(row) > 15 else "")
                
                ast = safe_int(row[17]) if len(row) > 17 else 0
                stl = str(safe_int(row[18])) if len(row) > 18 else "0"
                gd = safe_int(row[19]) if len(row) > 19 else 0
                blk = safe_int(row[21]) if len(row) > 21 else 0
                to = safe_int(row[22]) if len(row) > 22 else 0
                tot_fouls = safe_int(row[24]) if len(row) > 24 else 0
                
                # Unique Document ID for Firestore
                doc_id = f"2026_spring_{match_id_str}_{current_team}_{jersey_num}_{player_name}"
                
                record = {
                    "id": doc_id,
                    "선수명": player_name,
                    "선발여부": is_starter,
                    "등번호": jersey_num,
                    "소속팀": current_team,
                    "상대팀": current_opponent,
                    "대회명": comp_name,
                    "대회구분": comp_type,
                    "시즌": "2026",
                    "1Q 득점": q1,
                    "2Q 득점": q2,
                    "3Q 득점": q3,
                    "4Q 득점": q4,
                    "연장 득점": ex,
                    "총득점": tot_pts,
                    "플레잉 타임": playing_time,
                    "2점슛 성공": p2_m,
                    "2점슛 시도": p2_a,
                    "2점 성공률(%)": p2_pct,
                    "3점슛 성공": p3_m,
                    "3점슛 시도": p3_a,
                    "3점 성공률(%)": p3_pct,
                    "필드골 성공률(%)": fg_pct,
                    "자유투 성공": ft_m,
                    "자유투 시도": ft_a,
                    "자유투 성공률(%)": ft_pct,
                    "공격 리바운드": off_reb,
                    "수비 리바운드": def_reb,
                    "총 리바운드": tot_reb,
                    "어시스트": ast,
                    "스틸": stl,
                    "굿디펜스": gd,
                    "블록슛": blk,
                    "턴오버": to,
                    "총 파울": tot_fouls
                }
                records.append(record)
    except Exception as e:
        print(f"Error parsing {filename}: {e}")
    return records

def main():
    pdf_files = fetch_all_pdf_links()
    downloaded = download_pdfs(pdf_files)
    
    print("\nStep 3: Parsing all PDFs...")
    all_records = []
    for idx, (filename, path) in enumerate(downloaded):
        recs = parse_single_pdf(filename, path)
        all_records.extend(recs)
        if (idx + 1) % 25 == 0 or (idx + 1) == len(downloaded):
            print(f"  Parsed {idx + 1} / {len(downloaded)} files (Total records: {len(all_records)})")
            
    print(f"\nParsing Complete! Total extracted player records: {len(all_records)}")
    
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)
    print(f"Saved to {OUTPUT_JSON} (File size: {os.path.getsize(OUTPUT_JSON) / 1024:.1f} KB)")

if __name__ == "__main__":
    main()
