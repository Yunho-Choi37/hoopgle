import json
import re
import os

INPUT_STREAMS = "scratch/streams_2026_raw.json"
SPRING_DATA = "public/data/spring_2026.json"
OUTPUT_GAME_VIDEOS = "public/data/game_videos.json"

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
}

def load_canonical_teams(records):
    teams = set()
    for r in records:
        if r.get("소속팀"):
            teams.add(r["소속팀"].strip())
    return teams

def clean_team_name(name, other_name="", canonical_teams=None):
    if not name:
        return ""
    name = re.sub(r"^[#@\s]+", "", name)
    name = re.sub(r"[\s#]+$", "", name).strip()
    
    if name in ALIAS_MAP:
        return ALIAS_MAP[name]
        
    if canonical_teams and name in canonical_teams:
        return name
        
    # 女高 / 女中 expansions
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
            
    # Ambiguous names (e.g. 수피아)
    if "수피아" in name:
        if "중" in other_name or "여중" in other_name:
            return "수피아여자중학교"
        else:
            return "수피아여자고등학교"
            
    if canonical_teams:
        # Try matching base stem
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

def parse_date_from_text(text):
    # Matches (2026. 9. 10. 12시 30분) or (2026.04.14) or (2026-04-14)
    m = re.search(r"(\d{4})[.\s-]+(\d{1,2})[.\s-]+(\d{1,2})", text)
    if m:
        y, month, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{y:04d}-{month:02d}-{d:02d}"
    return None

def determine_competition(title, desc=""):
    combined = title + " " + desc
    if "추계" in combined:
        return "제56회 추계 전국남녀중고농구연맹전"
    elif "왕중왕" in combined:
        return "2026 중고농구 주말리그 왕중왕전"
    elif "주말리그" in combined:
        return "2026 중고농구 주말리그 권역별대회"
    elif "연맹회장기" in combined:
        return "2026 연맹회장기 전국남녀중고농구대회"
    elif "협회장기" in combined:
        return "제51회 협회장기 전국남녀중고농구대회"
    elif "춘계" in combined:
        return "제63회 춘계 전국남녀중고농구연맹전"
    return None

def main():
    print("Loading 2026 records and stream metadata...")
    with open(SPRING_DATA, "r", encoding="utf-8") as f:
        records = json.load(f)
        
    canonical_teams = load_canonical_teams(records)
    print(f"Loaded {len(records)} player records and {len(canonical_teams)} canonical teams.")
    
    with open(INPUT_STREAMS, "r", encoding="utf-8") as f:
        streams = json.load(f)
    print(f"Loaded {len(streams)} raw video streams.")

    all_matches = []
    
    for s in streams:
        vid = s["id"]
        title = s["title"]
        desc = s.get("description", "")
        
        comp_name = determine_competition(title, desc)
        if not comp_name:
            continue
            
        lines = desc.split("\n")
        stream_matches = []
        
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
                        "team1": t1,
                        "team2": t2,
                        "raw_team1": raw_t1,
                        "raw_team2": raw_t2,
                        "timestamp_sec": sec,
                        "video_url": f"https://www.youtube.com/watch?v={vid}&t={sec}s",
                        "match_date": m_date
                    }
                    stream_matches.append(match_obj)
                    all_matches.append(match_obj)

        # Edge case: single match in title without description timestamps
        if not stream_matches and ("vs" in title.lower() or "VS" in title or "," in title):
            single_vs = re.search(r"([#@\w가-힣]+)\s*(?:vs|VS|,)\s*([#@\w가-힣]+)", title)
            if single_vs:
                raw_t1, raw_t2 = single_vs.group(1), single_vs.group(2)
                t1 = clean_team_name(raw_t1, raw_t2, canonical_teams)
                t2 = clean_team_name(raw_t2, raw_t1, canonical_teams)
                if t1 in canonical_teams and t2 in canonical_teams:
                    m_date = parse_date_from_text(title)
                    all_matches.append({
                        "video_id": vid,
                        "video_title": title,
                        "comp_name": comp_name,
                        "team1": t1,
                        "team2": t2,
                        "raw_team1": raw_t1,
                        "raw_team2": raw_t2,
                        "timestamp_sec": 0,
                        "video_url": f"https://www.youtube.com/watch?v={vid}",
                        "match_date": m_date
                    })

    print(f"\nExtracted total {len(all_matches)} game videos across all competitions.")
    
    # Save game_videos.json
    os.makedirs(os.path.dirname(OUTPUT_GAME_VIDEOS), exist_ok=True)
    with open(OUTPUT_GAME_VIDEOS, "w", encoding="utf-8") as f:
        json.dump(all_matches, f, ensure_ascii=False, indent=2)
    print(f"Saved to {OUTPUT_GAME_VIDEOS}")

    # Build lookup map:
    # 1. Precise date key: (comp, t1, t2, date)
    # 2. General key: (comp, t1, t2)
    date_video_map = {}
    general_video_map = {}
    
    for m in all_matches:
        c = m["comp_name"]
        t1 = m["team1"]
        t2 = m["team2"]
        url = m["video_url"]
        d = m.get("match_date")
        
        if d:
            date_video_map[f"{c}__{t1}__{t2}__{d}"] = url
            date_video_map[f"{c}__{t2}__{t1}__{d}"] = url
            
        general_video_map[f"{c}__{t1}__{t2}"] = url
        general_video_map[f"{c}__{t2}__{t1}"] = url

    matched_count = 0
    comp_stats = {}
    
    for r in records:
        c = r.get("대회명", "").strip()
        t1 = r.get("소속팀", "").strip()
        t2 = r.get("상대팀", "").strip()
        r_date = r.get("경기일시", "").split()[0] if r.get("경기일시") else ""
        
        comp_stats.setdefault(c, {"total": 0, "matched": 0})
        comp_stats[c]["total"] += 1
        
        # Try date-specific match first
        url = None
        if r_date:
            k_date = f"{c}__{t1}__{t2}__{r_date}"
            url = date_video_map.get(k_date)
            
        # Fallback to general match
        if not url:
            k_gen = f"{c}__{t1}__{t2}"
            url = general_video_map.get(k_gen)
            
        r["videoUrl"] = url
        if url:
            matched_count += 1
            comp_stats[c]["matched"] += 1

    print(f"\n================ MATCHING RESULTS ================")
    print(f"Total player records: {len(records)}")
    print(f"Total records with videoUrl: {matched_count} ({matched_count/len(records)*100:.1f}%)\n")
    
    for c in sorted(comp_stats.keys()):
        stats = comp_stats[c]
        tot = stats["total"]
        m = stats["matched"]
        pct = m / tot * 100 if tot > 0 else 0
        print(f"  • {c}: {m}/{tot} records ({pct:.1f}%)")

    # Write back to spring_2026.json
    with open(SPRING_DATA, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False)
        
    size_mb = os.path.getsize(SPRING_DATA) / (1024 * 1024)
    print(f"\nSaved updated {SPRING_DATA} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
