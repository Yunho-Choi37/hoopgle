import requests
import re
from urllib.parse import urljoin

BASE_URL = "http://www.kssbf.or.kr"
CONTEST_URL = "http://www.kssbf.or.kr/game/contest.php?bmode=list&ctchk=B"

def get_spring_pdf_links():
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    resp = requests.get(CONTEST_URL, headers=headers)
    resp.encoding = 'utf-8'
    html = resp.text
    
    # Match links like: /home/recfile_download.php?file=rec_20260314141600.pdf
    pattern = r"/home/recfile_download\.php\?file=([a-zA-Z0-9_\.]+\.pdf)"
    matches = re.findall(pattern, html)
    
    # Remove duplicates while preserving order
    unique_files = list(dict.fromkeys(matches))
    print(f"Found {len(unique_files)} match record PDFs in 2026 Spring Contest (ctchk=B)!")
    for idx, f in enumerate(unique_files[:10]):
        print(f"  [{idx+1}] {f}")
    if len(unique_files) > 10:
        print(f"  ... and {len(unique_files) - 10} more.")
    return unique_files

if __name__ == "__main__":
    get_spring_pdf_links()
