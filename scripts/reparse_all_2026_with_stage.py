import os
import glob
import re
import json
import pdfplumber
from concurrent.futures import ProcessPoolExecutor, as_completed

SPRING_DIR = "downloads/2026_spring"
TOURNAMENTS_DIR = "downloads/2026_tournaments"
OUTPUT_JSON = "public/data/spring_2026.json"

TOURNAMENT_MAP = {
    "C": ("제51회 협회장기 전국남녀중고농구대회", "고등부대회"),
    "D": ("2026 연맹회장기 전국남녀중고농구대회", "고등부대회"),
    "G": ("제56회 추계 전국남녀중고농구연맹전", "고등부대회"),
    "H": ("2026 중고농구 주말리그 권역별대회", "고등부대회"),
    "I": ("2026 중고농구 주말리그 왕중왕전", "고등부대회"),
}

def clean_stage_name(raw_stage):
    if not raw_stage:
        return "예선"
    if "결승" in raw_stage and "준" not in raw_stage:
        return "결승"
    elif "준결승" in raw_stage:
        return "4강"
    elif "결선" in raw_stage:
        return "결선"
    elif "정규" in raw_stage or "예선" in raw_stage:
        return "예선"
    return raw_stage.replace("(", "").replace(")", "").replace("남", "").replace("여", "").strip() or "예선"

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

def parse_pdf_file(pdf_path, default_comp_name):
    filename = os.path.basename(pdf_path)
    records = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if not pdf.pages:
                return []
            page = pdf.pages[0]
            text = page.extract_text() or ""

            # 1. 대회명
            comp_name_match = re.search(r"대회명\s*:\s*([^\n\r]+)", text)
            raw_comp_name = comp_name_match.group(1).strip() if comp_name_match else default_comp_name
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

            # 2. 대회구분
            comp_type_match = re.search(r"대회구분\s*:\s*([^\n\r]+)", text)
            raw_comp_type = comp_type_match.group(1).strip() if comp_type_match else ""
            if "중등" in raw_comp_type or "남중" in raw_comp_type or "여중" in raw_comp_type:
                comp_type = "중등부대회"
            elif "고등" in raw_comp_type or "남고" in raw_comp_type or "여고" in raw_comp_type:
                comp_type = "고등부대회"
            else:
                comp_type = raw_comp_type.split()[0] if raw_comp_type else "고등부대회"

            # 3. 경기구분 (예선, 결선, 4강, 결승)
            stage_match = re.search(r"경기구분\s*:\s*([^\n\r]+)", text)
            raw_stage = stage_match.group(1).strip().split()[0] if stage_match else ""
            clean_stage = clean_stage_name(raw_stage)

            # 4. 경기일시
            date_match = re.search(r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})", text)
            game_date = date_match.group(1) if date_match else ""

            # 5. 경기장
            court_match = re.search(r"경기장\s*:\s*([^\n\r]+)", text)
            raw_court = court_match.group(1).strip() if court_match else ""
            game_court = raw_court.split()[0] if raw_court else ""

            # 6. 경기번호
            num_match = re.search(r"경기번호\s*:\s*(\d+)", text)
            game_num = num_match.group(1) if num_match else ""

            tables = page.extract_tables()
            if len(tables) < 4:
                return []

            score_table = tables[2]
            team1_name = score_table[1][0].strip() if len(score_table) > 1 and score_table[1][0] else ""
            team2_name = score_table[2][0].strip() if len(score_table) > 2 and score_table[2][0] else ""

            stat_table = tables[3]
            current_team = team1_name
            current_opponent = team2_name

            match_id_str = filename.replace("rec_", "").replace(".pdf", "")

            for row in stat_table:
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

                doc_id = f"2026_{match_id_str}_{current_team}_{jersey_num}_{player_name}"

                records.append({
                    "id": doc_id,
                    "선수명": player_name,
                    "선발여부": is_starter,
                    "등번호": jersey_num,
                    "소속팀": current_team,
                    "상대팀": current_opponent,
                    "대회명": comp_name,
                    "대회구분": comp_type,
                    "경기구분": clean_stage,
                    "경기일시": game_date,
                    "경기장": game_court,
                    "경기번호": game_num,
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
                })
    except Exception as e:
        print(f"Error parsing {pdf_path}: {e}")
    return records

def main():
    all_pdf_tasks = []
    
    # 1. 춘계
    spring_files = glob.glob(f"{SPRING_DIR}/*.pdf")
    for p in spring_files:
        all_pdf_tasks.append((p, "제63회 춘계 전국남녀중고농구연맹전"))
        
    # 2. Other tournaments
    for folder, (comp_name, _) in TOURNAMENT_MAP.items():
        folder_files = glob.glob(f"{TOURNAMENTS_DIR}/{folder}/*.pdf")
        for p in folder_files:
            all_pdf_tasks.append((p, comp_name))
            
    print(f"총 파싱 대상 PDF: {len(all_pdf_tasks)}개")
    all_records = []
    
    with ProcessPoolExecutor() as executor:
        futures = [executor.submit(parse_pdf_file, p, name) for p, name in all_pdf_tasks]
        for f in as_completed(futures):
            res = f.result()
            if res:
                all_records.extend(res)
                
    print(f"총 추출된 레코드 수: {len(all_records)}개")
    
    # Deduplicate
    seen = set()
    deduped = []
    for r in all_records:
        key = f"{r['대회명']}_{r['소속팀']}_{r['상대팀']}_{r['선수명']}_{r['등번호']}_{r['총득점']}_{r.get('경기일시', '')}"
        if key not in seen:
            seen.add(key)
            deduped.append(r)
            
    print(f"중복 제거 후 최종 레코드: {len(deduped)}개")
    
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False)
        
    size_mb = os.path.getsize(OUTPUT_JSON) / (1024 * 1024)
    print(f"저장 완료: {OUTPUT_JSON} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
