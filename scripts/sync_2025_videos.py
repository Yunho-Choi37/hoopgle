import json
import re
import os

INPUT_2025_STREAMS = "scratch/streams_2025_raw.json"
INPUT_2025_RECORDS = "scratch/records_2025_firestore.json"
OUTPUT_2025_JSON = "public/data/records_2025.json"
EXISTING_GAME_VIDEOS = "public/data/game_videos.json"

ALIAS_MAP = {
    # High School Aliases
    "홍대부고": "홍익사대부속고등학교",
    "홍익사대부고": "홍익사대부속고등학교",
    "강사부고": "강원사대부속고등학교",
    "강원사대": "강원사대부속고등학교",
    "강원사대부고": "강원사대부속고등학교",
    "광신방예고": "광신방송예술고등학교",
    "광신고": "광신방송예술고등학교",
    "대전여상": "대전여자상업고등학교",
    "경북에너지고": "경북에너지기술고",
    "경북에너지": "경북에너지기술고",
    "경북E고": "경북에너지기술고",
    "화양고": "여수화양고등학교",
    "신흥고": "청주신흥고등학교",
    "쌍용고": "천안쌍용고등학교",
    "중앙고": "부산중앙고등학교",
    "분당경영고": "분당경영고등학교",
    "분당경영": "분당경영고등학교",
    "김해가야": "가야고등학교",
    "가야고": "가야고등학교",
    "동주여고": "동주여자고등학교",
    "마산여고": "마산여자고등학교",
    "상주여고": "상주여자고등학교",
    "선일여고": "선일여자고등학교",
    "수원여고": "수원여자고등학교",
    "숙명여고": "숙명여자고등학교",
    "숭의여고": "숭의여자고등학교",
    "온양여고": "온양여자고등학교",
    "인성여고": "인성여자고등학교",
    "청주여고": "청주여자고등학교",
    "춘천여고": "춘천여자고등학교",
    "효성여고": "효성여자고등학교",
    "기전여고": "기전여자고등학교",
    
    # Middle School Aliases
    "홍대부중": "홍익사대부속중학교",
    "홍익사대부중": "홍익사대부속중학교",
    "단대부중": "단국사대부속중학교",
    "단국사대부중": "단국사대부속중학교",
    "홍농중": "영광홍농중학교",
    "동수중": "인천동수중학교",
    "인천동수": "인천동수중학교",
    "성성중": "천안성성중학교",
    "월평중": "대전월평중학교",
    "인천안남중": "안남중학교",
    "안남중": "안남중학교",
    "분당구미": "구미중학교",
    "구미중": "구미중학교",
    "수원제일": "수원제일중학교",
    "동주여중": "동주여자중학교",
    "마산여중": "마산여자중학교",
    "삼천포여중": "삼천포여자중학교",
    "상주여중": "상주여자중학교",
    "선일여중": "선일여자중학교",
    "숙명여중": "숙명여자중학교",
    "숭의여중": "숭의여자중학교",
    "온양여중": "온양여자중학교",
    "인성여중": "인성여자중학교",
    "청주여중": "청주여자중학교",
}

def clean_team_name(name, other_name="", canonical_teams=None):
    if not name:
        return ""
    name = re.sub(r"^[#@\s]+", "", name)
    name = re.sub(r"[\s#]+$", "", name).strip()
    
    if name in ALIAS_MAP:
        return ALIAS_MAP[name]
        
    if canonical_teams and name in canonical_teams:
        return name
        
    if name.endswith("여고"):
        cand = name[:-2] + "여자고등학교"
        if not canonical_teams or cand in canonical_teams:
            return cand
    elif name.endswith("여중"):
        cand = name[:-2] + "여자중학교"
        if not canonical_teams or cand in canonical_teams:
            return cand
    elif name.endswith("고") and not name.endswith("고등학교"):
        cand = name[:-1] + "고등학교"
        if not canonical_teams or cand in canonical_teams:
            return cand
    elif name.endswith("중") and not name.endswith("중학교"):
        cand = name[:-1] + "중학교"
        if not canonical_teams or cand in canonical_teams:
            return cand
            
    if "수피아" in name:
        if "중" in other_name or "여중" in other_name:
            return "수피아여자중학교"
        else:
            return "수피아여자고등학교"
            
    if canonical_teams:
        for db_t in canonical_teams:
            base_db = db_t.replace("고등학교", "").replace("중학교", "").replace("여자", "").replace("기술고", "")
            base_name = name.replace("고등학교", "").replace("중학교", "").replace("여자", "").replace("고", "").replace("중", "")
            if base_db and base_name and (base_db == base_name or base_name in base_db or base_db in base_name):
                if ("중" in name and "중" in db_t) or ("고" in name and "고" in db_t):
                    return db_t

    return name

def time_to_sec(t_str):
    parts = list(map(int, t_str.split(":")))
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    elif len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0

def comp_normalize(title, desc=""):
    combined = title + " " + desc
    if "추계" in combined:
        return "2025 추계대회"
    elif "왕중왕" in combined:
        return "2025 왕중왕전"
    elif "주말리그" in combined:
        return "2025 주말리그"
    elif "연맹회장기" in combined:
        return "2025 연맹회장기"
    elif "협회장기" in combined:
        return "2025 협회장기"
    elif "춘계" in combined:
        return "2025 춘계대회"
    elif "종별" in combined:
        return "2025 전국종별"
    return None

def parse_date_from_text(text):
    m = re.search(r"(\d{4})[.\s-]+(\d{1,2})[.\s-]+(\d{1,2})", text)
    if m:
        y, month, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{y:04d}-{month:02d}-{d:02d}"
    return None

def infer_stage(title, comp_name):
    if "결승" in title and "준" not in title:
        return "결승"
    if "준결승" in title or "4강" in title:
        return "4강"
    if "주말리그" in comp_name:
        return "예선"
    m_day = re.search(r"(\d+)일차", title)
    if m_day:
        day = int(m_day.group(1))
        max_d = 11 if "추계" in comp_name else 10
        if day == max_d:
            return "결승"
        elif day == max_d - 1:
            return "4강"
        elif day >= 6:
            return "결선"
        else:
            return "예선"
    return "예선"

def main():
    print("Loading 2025 Firestore records...")
    with open(INPUT_2025_RECORDS, "r", encoding="utf-8") as f:
        records = json.load(f)
        
    canonical_teams = set(r.get("소속팀", "").strip() for r in records if r.get("소속팀"))
    print(f"Loaded {len(records)} records and {len(canonical_teams)} teams.")
    
    with open(INPUT_2025_STREAMS, "r", encoding="utf-8") as f:
        streams = json.load(f)
    print(f"Loaded {len(streams)} 2025 raw streams.")

    all_2025_matches = []
    
    for s in streams:
        vid = s["id"]
        title = s["title"]
        desc = s.get("description", "")
        
        comp_name = comp_normalize(title, desc)
        if not comp_name:
            continue
            
        stage = infer_stage(title, comp_name)
        lines = desc.split("\n")
        
        for line in lines:
            l = line.strip()
            if ("vs" in l.lower() or "VS" in l) and any(c.isdigit() for c in l):
                time_m = re.search(r"(\d{1,2}:\d{2}(?::\d{2})?)", l)
                vs_m = re.search(r"([#@\w가-힣]+)\s*(?:vs|VS)\s*([#@\w가-힣]+)", l)
                if time_m and vs_m:
                    raw_t1, raw_t2 = vs_m.group(1), vs_m.group(2)
                    t1 = clean_team_name(raw_t1, raw_t2, canonical_teams)
                    t2 = clean_team_name(raw_t2, raw_t1, canonical_teams)
                    sec = time_to_sec(time_m.group(1))
                    m_date = parse_date_from_text(l) or parse_date_from_text(title)
                    
                    match_obj = {
                        "video_id": vid,
                        "video_title": title,
                        "comp_name": comp_name,
                        "stage": stage,
                        "team1": t1,
                        "team2": t2,
                        "raw_team1": raw_t1,
                        "raw_team2": raw_t2,
                        "timestamp_sec": sec,
                        "video_url": f"https://www.youtube.com/watch?v={vid}&t={sec}s",
                        "match_date": m_date
                    }
                    all_2025_matches.append(match_obj)

    print(f"\nExtracted total {len(all_2025_matches)} matches from 2025 streams.")

    # Update public/data/game_videos.json with 2025 matches
    existing_videos = []
    if os.path.exists(EXISTING_GAME_VIDEOS):
        try:
            with open(EXISTING_GAME_VIDEOS, "r", encoding="utf-8") as f:
                existing_videos = json.load(f)
        except Exception:
            existing_videos = []
            
    # Filter out any older 2025 matches from existing_videos
    existing_2026_only = [v for v in existing_videos if not ("2025" in v.get("comp_name", "") or "55회" in v.get("video_title", "") or "50회" in v.get("video_title", "") or "62회" in v.get("video_title", ""))]
    combined_videos = existing_2026_only + all_2025_matches
    with open(EXISTING_GAME_VIDEOS, "w", encoding="utf-8") as f:
        json.dump(combined_videos, f, ensure_ascii=False, indent=2)
    print(f"Updated {EXISTING_GAME_VIDEOS} (total {len(combined_videos)} videos)")

    # Build video lookup maps
    date_vmap = {}
    general_vmap = {}
    stage_map = {}
    
    for m in all_2025_matches:
        c = m["comp_name"]
        t1 = m["team1"]
        t2 = m["team2"]
        url = m["video_url"]
        st = m["stage"]
        d = m.get("match_date")
        
        if d:
            date_vmap[f"{c}__{t1}__{t2}__{d}"] = url
            date_vmap[f"{c}__{t2}__{t1}__{d}"] = url
            
        general_vmap[f"{c}__{t1}__{t2}"] = url
        general_vmap[f"{c}__{t2}__{t1}"] = url
        
        stage_map[f"{c}__{t1}__{t2}"] = st
        stage_map[f"{c}__{t2}__{t1}"] = st

    # Tag records
    matched_count = 0
    comp_stats = {}
    
    for r in records:
        raw_c = r.get("대회명", "").strip()
        # Clean competition name (remove extra spaces)
        c = " ".join(raw_c.split())
        r["대회명"] = c
        t1 = r.get("소속팀", "").strip()
        t2 = r.get("상대팀", "").strip()
        r_date = r.get("경기일시", "").split()[0] if r.get("경기일시") else ""
        
        comp_stats.setdefault(c, {"total": 0, "matched": 0})
        comp_stats[c]["total"] += 1
        
        url = None
        if r_date:
            url = date_vmap.get(f"{c}__{t1}__{t2}__{r_date}")
        if not url:
            url = general_vmap.get(f"{c}__{t1}__{t2}")
            
        stage = stage_map.get(f"{c}__{t1}__{t2}") or "예선"
        
        r["videoUrl"] = url
        r["경기구분"] = stage
        r["시즌"] = "2025"
        if url:
            matched_count += 1
            comp_stats[c]["matched"] += 1

    print(f"\n================ 2025 MATCHING RESULTS ================")
    print(f"Total 2025 records: {len(records)}")
    print(f"Total records with videoUrl: {matched_count} ({matched_count/len(records)*100:.1f}%)\n")
    
    for c in sorted(comp_stats.keys()):
        stats = comp_stats[c]
        tot = stats["total"]
        m = stats["matched"]
        pct = m / tot * 100 if tot > 0 else 0
        print(f"  • {c}: {m}/{tot} records ({pct:.1f}%)")

    # Save to public/data/records_2025.json
    with open(OUTPUT_2025_JSON, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False)
        
    size_mb = os.path.getsize(OUTPUT_2025_JSON) / (1024 * 1024)
    print(f"\nSaved updated {OUTPUT_2025_JSON} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
