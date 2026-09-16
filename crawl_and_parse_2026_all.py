import os
import re
import json
import time
import requests
import pdfplumber
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "http://www.kssbf.or.kr"
DOWNLOAD_ROOT = "downloads/2026_tournaments"
OUTPUT_JSON = "public/data/spring_2026.json"

TOURNAMENT_MAP = {
    'C': {"name": "제51회 협회장기 전국남녀중고농구대회", "short": "협회장기"},
    'D': {"name": "2026 연맹회장기 전국남녀중고농구대회", "short": "연맹회장기"},
    'H': {"name": "2026 중고농구 주말리그 권역별대회", "short": "주말리그_권역별"},
    'I': {"name": "2026 중고농구 주말리그 왕중왕전", "short": "주말리그_왕중왕전"},
    'G': {"name": "제56회 추계 전국남녀중고농구연맹전", "short": "추계연맹전"}
}

def fetch_pdf_links_for_tournament(ctchk):
    all_files = []
    page = 1
    while True:
        url = f"{BASE_URL}/game/contest.php?bmode=list&ctchk={ctchk}&page={page}"
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
            page += 1
            if page > 20:  # Safety guard
                break
            time.sleep(0.05)
        except Exception as e:
            print(f"  [Error fetching {ctchk} page {page}]: {e}")
            break
    return all_files

def download_file(args):
    filename, ctchk = args
    dest_dir = os.path.join(DOWNLOAD_ROOT, ctchk)
    os.makedirs(dest_dir, exist_ok=True)
    local_path = os.path.join(dest_dir, filename)

    if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
        return filename, local_path, ctchk, "cached"

    url = f"{BASE_URL}/home/recfile_download.php?file={filename}"
    for attempt in range(3):
        try:
            r = requests.get(url, timeout=15)
            if r.status_code == 200 and len(r.content) > 1000:
                with open(local_path, "wb") as f:
                    f.write(r.content)
                return filename, local_path, ctchk, "downloaded"
        except Exception:
            time.sleep(0.5)
    return filename, local_path, ctchk, "failed"

def parse_single_pdf(filename, pdf_path, default_comp_name, ctchk):
    records = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if not pdf.pages:
                return []
            page = pdf.pages[0]
            text = page.extract_text() or ""

            # 1. Metadata
            comp_name_match = re.search(r"대회명\s*:\s*([^\n\r]+)", text)
            raw_comp_name = comp_name_match.group(1).strip() if comp_name_match else default_comp_name
            
            # Standardize competition name
            if "춘계" in raw_comp_name:
                comp_name = "제63회 춘계 전국남녀중고농구연맹전"
            elif "협회장기" in raw_comp_name:
                comp_name = "제51회 협회장기 전국남녀중고농구대회"
            elif "연맹회장기" in raw_comp_name:
                comp_name = "2026 연맹회장기 전국남녀중고농구대회"
            elif "왕중왕" in raw_comp_name:
                comp_name = "2026 중고농구 주말리그 왕중왕전"
            elif "주말리그" in raw_comp_name or "권역" in raw_comp_name:
                comp_name = "2026 중고농구 주말리그 권역별대회"
            elif "추계" in raw_comp_name:
                comp_name = "제56회 추계 전국남녀중고농구연맹전"
            else:
                comp_name = default_comp_name

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

                doc_id = f"2026_{ctchk}_{match_id_str}_{current_team}_{jersey_num}_{player_name}"

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
        print(f"  [Parse Error in {filename}]: {e}")
    return records

def parse_worker(item):
    filename, path, comp_name, ctchk = item
    return parse_single_pdf(filename, path, comp_name, ctchk)

def main():
    print("=" * 60)
    print("🏀 2026 시즌 전체 중고농구 대회 자동 크롤러 및 파서 가동")
    print("=" * 60)

    # 1. Fetch links for all target tournaments
    download_tasks = []
    for ctchk, meta in TOURNAMENT_MAP.items():
        print(f"\n[탐색 중] {meta['name']} (ctchk={ctchk})...")
        links = fetch_pdf_links_for_tournament(ctchk)
        print(f"  -> {len(links)}개 기록지 PDF 발견!")
        for fname in links:
            download_tasks.append((fname, ctchk))

    print(f"\n총 다운로드 대상: {len(download_tasks)}개 경기 PDF")

    # 2. Concurrently download PDFs
    print("\n[다운로드 시작] 병렬 다운로드 진행...")
    downloaded_files = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(download_file, task): task for task in download_tasks}
        completed = 0
        for f in as_completed(futures):
            fname, path, ctchk, status = f.result()
            if status != "failed":
                downloaded_files.append((fname, path, TOURNAMENT_MAP[ctchk]["name"], ctchk))
            completed += 1
            if completed % 100 == 0 or completed == len(download_tasks):
                print(f"  다운로드 진행률: {completed} / {len(download_tasks)} ({len(downloaded_files)}개 성공)")

    print(f"\n총 {len(downloaded_files)}개 PDF 다운로드 완료. 파싱 시작...")

    # 3. Parse PDFs concurrently
    all_new_records = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(parse_worker, item): item for item in downloaded_files}
        completed = 0
        for f in as_completed(futures):
            recs = f.result()
            all_new_records.extend(recs)
            completed += 1
            if completed % 100 == 0 or completed == len(downloaded_files):
                print(f"  파싱 진행률: {completed} / {len(downloaded_files)} (추출된 누적 레코드: {len(all_new_records)}개)")

    print(f"\n[파싱 완료] 신규 추출된 레코드 수: {len(all_new_records)}개")

    # 4. Load existing records (spring 2026)
    existing_records = []
    if os.path.exists(OUTPUT_JSON):
        try:
            with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
                existing_records = json.load(f)
            print(f"기존 2026 데이터 로드 완료: {len(existing_records)}개 레코드")
        except Exception as e:
            print(f"기존 데이터 로드 실패: {e}")

    # 5. Merge and deduplicate
    seen_ids = set()
    combined_records = []

    # Preserve existing spring records
    for r in existing_records:
        r_id = r.get("id") or f"{r.get('선수명')}_{r.get('소속팀')}_{r.get('등번호')}_{r.get('대회명')}_{r.get('총득점')}"
        if r_id not in seen_ids:
            seen_ids.add(r_id)
            combined_records.append(r)

    # Add new tournament records
    added_count = 0
    for r in all_new_records:
        r_id = r.get("id") or f"{r.get('선수명')}_{r.get('소속팀')}_{r.get('등번호')}_{r.get('대회명')}_{r.get('총득점')}"
        if r_id not in seen_ids:
            seen_ids.add(r_id)
            combined_records.append(r)
            added_count += 1

    print(f"\n통합 결과:")
    print(f"  - 기존 레코드: {len(existing_records)}개")
    print(f"  - 신규 추가 레코드: {added_count}개")
    print(f"  - 총 2026 통합 레코드: {len(combined_records)}개")

    comps = set(r.get("대회명") for r in combined_records)
    print("\n포함된 2026 대회 목록:")
    for c in sorted(comps):
        count = sum(1 for r in combined_records if r.get("대회명") == c)
        print(f"  🏆 {c}: {count}개 기록")

    # 6. Save to OUTPUT_JSON
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(combined_records, f, ensure_ascii=False)

    file_size_mb = os.path.getsize(OUTPUT_JSON) / (1024 * 1024)
    print(f"\n파일 저장 완료: {OUTPUT_JSON} (크기: {file_size_mb:.2f} MB)")
    print("=" * 60)

if __name__ == "__main__":
    main()
