import re

PREFIX = re.compile(r"^(?:\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*)?([^:]{1,40}):\s*(.*)$")


def parse_transcript(text: str):
    segments = []
    for line in text.splitlines():
        if not line.strip():
            continue
        match = PREFIX.match(line.strip())
        speaker = "unknown"
        seconds = None
        content = line.strip()
        if match:
            stamp, label, content = match.groups()
            normalized = label.strip().lower()
            speaker = {"rep": "rep", "seller": "rep", "buyer": "buyer", "customer": "buyer"}.get(normalized, "unknown")
            if stamp:
                parts = [int(part) for part in stamp.split(":")]
                seconds = sum(part * 60 ** index for index, part in enumerate(reversed(parts)))
        segments.append({"id": f"s{len(segments) + 1}", "speaker": speaker,
                         "text": content, "start_seconds": seconds, "end_seconds": None})
    return segments


def format_timestamp(seconds):
    if seconds is None:
        return ""
    return f"{int(seconds) // 60:02d}:{int(seconds) % 60:02d}"


def transcript_text(segments):
    return "\n".join(
        f"{('[' + format_timestamp(s['start_seconds']) + '] ') if s.get('start_seconds') is not None else ''}"
        f"{s['speaker']}: {s['text']}" for s in segments
    )
