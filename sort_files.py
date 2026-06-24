import os
import re

TEMPLATES_DIR = "templates"
CSS_DIR = "static/css"
JS_DIR = "static/js"

os.makedirs(CSS_DIR, exist_ok=True)
os.makedirs(JS_DIR, exist_ok=True)

for filename in os.listdir(TEMPLATES_DIR):
    if not filename.endswith(".html"):
        continue
    
    filepath = os.path.join(TEMPLATES_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract style blocks
    style_pattern = r"{%\s*block\s+styles\s*%}\s*<style>\s*(.*?)\s*</style>\s*{%\s*endblock\s*%}"
    style_matches = re.findall(style_pattern, content, re.DOTALL | re.IGNORECASE)
    
    # If there are styles not inside a block but just in <style>
    if not style_matches:
        style_pattern = r"<style>\s*(.*?)\s*</style>"
        style_matches = re.findall(style_pattern, content, re.DOTALL | re.IGNORECASE)
        if style_matches:
            css_content = "\n".join(style_matches)
            css_filename = filename.replace(".html", ".css")
            with open(os.path.join(CSS_DIR, css_filename), "w", encoding="utf-8") as f:
                f.write(css_content.strip())
            replacement = "<link rel=\"stylesheet\" href=\"{{ url_for('static', filename='css/" + css_filename + "') }}\">"
            content = re.sub(style_pattern, replacement, content, count=1, flags=re.DOTALL | re.IGNORECASE)
            # Remove any remaining
            content = re.sub(style_pattern, "", content, flags=re.DOTALL | re.IGNORECASE)
    else:
        css_content = style_matches[0]
        css_filename = filename.replace(".html", ".css")
        with open(os.path.join(CSS_DIR, css_filename), "w", encoding="utf-8") as f:
            f.write(css_content.strip())
        
        replacement = "{% block styles %}\n<link rel=\"stylesheet\" href=\"{{ url_for('static', filename='css/" + css_filename + "') }}\">\n{% endblock %}"
        content = re.sub(style_pattern, replacement, content, flags=re.DOTALL | re.IGNORECASE)

    # Extract script blocks
    script_pattern = r"{%\s*block\s+scripts\s*%}\s*<script>\s*(.*?)\s*</script>\s*{%\s*endblock\s*%}"
    script_matches = re.findall(script_pattern, content, re.DOTALL | re.IGNORECASE)
    
    if not script_matches:
        script_pattern = r"<script>\s*(.*?)\s*</script>"
        # Exclude empty scripts or very short ones (like simple src scripts)
        # Actually re.findall will find all. Let's do it carefully
        # We only want scripts without src
        script_pattern2 = r"<script>(.*?)</script>"
        script_matches = [m for m in re.findall(script_pattern2, content, re.DOTALL | re.IGNORECASE) if m.strip()]
        if script_matches:
            js_content = "\n".join(script_matches)
            js_filename = filename.replace(".html", ".js")
            with open(os.path.join(JS_DIR, js_filename), "w", encoding="utf-8") as f:
                f.write(js_content.strip())
            replacement = "<script src=\"{{ url_for('static', filename='js/" + js_filename + "') }}\"></script>"
            content = re.sub(script_pattern2, replacement, content, count=1, flags=re.DOTALL | re.IGNORECASE)
            content = re.sub(script_pattern2, "", content, flags=re.DOTALL | re.IGNORECASE)
    else:
        js_content = script_matches[0]
        js_filename = filename.replace(".html", ".js")
        with open(os.path.join(JS_DIR, js_filename), "w", encoding="utf-8") as f:
            f.write(js_content.strip())
        
        replacement = "{% block scripts %}\n<script src=\"{{ url_for('static', filename='js/" + js_filename + "') }}\"></script>\n{% endblock %}"
        content = re.sub(script_pattern, replacement, content, flags=re.DOTALL | re.IGNORECASE)
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
print("Done extracting CSS and JS.")
