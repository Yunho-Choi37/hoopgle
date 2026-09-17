import json
import re
import subprocess
import os

CHANNEL_URL = "https://www.youtube.com/channel/UCo-yzranRXEB4VnesIUpgFg/streams"
OUTPUT_FILE = "public/data/game_videos.json"

def normalize_team_name(name):
    if not name:
        return ""
    name = re.sub(r'^[#@\s]+', '', name)
    name = re.sub(r'[\s#]+$', '', name)
    name = name.strip()
    
    # Check middle/high school suffix
    if name.endswith("고") and not name.endswith("고등학교"):
        name = name[:-1] + "고등학교"
    elif name.endswith("중") and not name.endswith("중학교"):
        name = name[:-1] + "중학교"
    return name

def time_to_seconds(time_str):
    parts = list(map(int, time_str.split(':')))
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    elif len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0

def fetch_streams(limit=60):
    print(f"Fetching recent {limit} streams list...")
    cmd = [
        ".venv/bin/yt-dlp",
        "--flat-playlist",
        "-I", f"1:{limit}",
        "-J",
        CHANNEL_URL
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Failed to fetch stream list:", res.stderr)
        return []
    
    data = json.loads(res.stdout)
    return data.get("entries", [])

def extract_matches_from_video(video_id, title):
    url = f"https://www.youtube.com/watch?v={video_id}"
    cmd = [
        ".venv/bin/yt-dlp",
        "--dump-json",
        "--no-playlist",
        url
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        return []
    
    video_data = json.loads(res.stdout)
    desc = video_data.get("description", "")
    matches = []
    
    # Pattern 1: 🏀 1:50:40 #용산고 vs #무룡고 (2026. 9. 10. 12시 30분)
    # Pattern 2: 1:50:40 용산고 vs 무룡고
    # Pattern 3: 16:35 #숙명여고 vs #온양여고
    lines = desc.split('\n')
    for line in lines:
        line_clean = line.strip()
        if not ("vs" in line_clean or "VS" in line_clean):
            continue
        
        # Match time format HH:MM:SS or MM:SS
        time_match = re.search(r'(\d{1,2}:\d{2}(?::\d{2})?)', line_clean)
        vs_match = re.search(r'([#\w가-힣]+)\s*(?:vs|VS)\s*([#\w가-힣]+)', line_clean)
        
        if time_match and vs_match:
            raw_time = time_match.group(1)
            t_sec = time_to_seconds(raw_time)
            raw_team1 = vs_match.group(1)
            raw_team2 = vs_match.group(2)
            
            norm_team1 = normalize_team_name(raw_team1)
            norm_team2 = normalize_team_name(raw_team2)
            
            date_match = re.search(r'\((\d{4}[.\s-]+\d{1,2}[.\s-]+\d{1,2}[^)]*)\)', line_clean)
            match_date = date_match.group(1).strip() if date_match else ""
            
            # Determine competition name from title or description
            comp_name = ""
            if "추계" in title:
                comp_name = "제56회 추계 전국남녀중고농구연맹전"
            elif "춘계" in title:
                comp_name = "제63회 춘계 전국남녀중고농구연맹전"
            elif "협회장기" in title:
                comp_name = "제51회 협회장기 전국남녀중고농구대회"
            elif "연맹회장기" in title:
                comp_name = "2026 연맹회장기 전국남녀중고농구대회"
            elif "왕중왕" in title:
                comp_name = "2026 중고농구 주말리그 왕중왕전"
            elif "주말리그" in title:
                comp_name = "2026 중고농구 주말리그 권역별대회"
            
            matches.append({
                "video_id": video_id,
                "video_title": title,
                "comp_name": comp_name,
                "team1": norm_team1,
                "team2": norm_team2,
                "raw_team1": raw_team1,
                "raw_team2": raw_team2,
                "raw_time": raw_time,
                "timestamp_sec": t_sec,
                "video_url": f"https://www.youtube.com/watch?v={video_id}&t={t_sec}s",
                "match_date": match_date
            })
            
    return matches

def main():
    streams = fetch_streams(limit=50)
    print(f"Total streams found: {len(streams)}")
    all_matches = []
    
    for i, s in enumerate(streams):
        vid = s.get("id")
        title = s.get("title", "")
        if not vid:
            continue
        print(f"[{i+1}/{len(streams)}] Processing {vid}: {title[:40]}...")
        matches = extract_matches_from_video(vid, title)
        if matches:
            print(f"   -> Found {len(matches)} matches")
            all_matches.extend(matches)
            
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_matches, f, ensure_ascii=False, indent=2)
        
    print(f"\nSuccessfully saved {len(all_matches)} game videos to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
