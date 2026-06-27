import json
import os

CODE_EXTENSIONS = {
    ".py", ".java", ".js", ".mjs", ".c", ".h", ".scala", ".sh", ".ksh", ".pl",
    ".pm", ".es", ".html", ".htm", ".shtml", ".css", ".json", ".xml", ".yaml",
    ".yml", ".md", ".markdown", ".rst", ".diff", ".patch"
}

def route_skill(user_message: str, db_files: list) -> str:
    """
    Determines the appropriate skill based on the user's message and attached files.
    Returns the system prompt content for the selected skill.
    """
    text_content = ""
    file_ids = []
    
    # 1. Parse user message
    try:
        parsed = json.loads(user_message)
        if isinstance(parsed, list):
            for item in parsed:
                if item.get("type") == "input_text":
                    text_content += item.get("text", "") + " "
                elif item.get("type") in ["input_file", "input_image"]:
                    if "file_id" in item:
                        file_ids.append(item["file_id"])
                    elif "file_url" in item or "image_url" in item:
                        # For URLs attached directly
                        pass
        elif isinstance(parsed, dict):
            # Just in case it's a single dict
            if parsed.get("type") == "input_text":
                text_content += parsed.get("text", "") + " "
    except (json.JSONDecodeError, TypeError):
        # Fallback to plain text if not JSON
        text_content = str(user_message)
        
    text_content_lower = text_content.lower()
    
    # 2. Get filenames for attached files
    filenames = []
    if db_files:
        for f in db_files:
            if f.openai_file_id in file_ids:
                filenames.append(f.filename.lower())
                
    # 3. Apply Routing Rules
    
    # Check Code Review
    has_code_file = any(os.path.splitext(fname)[1] in CODE_EXTENSIONS for fname in filenames)
    if has_code_file:
        return _load_skill("code_review")
        
    # Check Resume Review
    has_resume_file = any(os.path.splitext(fname)[1] in {".pdf", ".doc", ".docx"} for fname in filenames)
    has_job_desc_intent = "job description" in text_content_lower or "job" in text_content_lower or "jd" in text_content_lower or "j.d" in text_content_lower
    
    if has_resume_file and has_job_desc_intent:
        return _load_skill("resume_review")
        
    # Check Interview Coach
    interview_keywords = ["interview", "mock interview", "interview questions", "prepare for interview", "technical interview"]
    if any(keyword in text_content_lower for keyword in interview_keywords):
        return _load_skill("interview_coach")
        
    # Fallback to General Chat
    return _load_skill("general_chat")

def _load_skill(skill_name: str) -> str:
    base_path = os.path.join(os.path.dirname(__file__), "..", "skills")
    skill_path = os.path.join(base_path, skill_name, "skill.md")
    try:
        with open(skill_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"Warning: Skill file not found for {skill_name}, falling back to empty string.")
        return ""
