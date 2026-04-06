#!/usr/bin/env python3
"""
Script to remove old header script references from pages that already have unified header
"""

import os
import re
from pathlib import Path

def remove_old_header_scripts(page_path):
    """Remove old header script references from a page"""
    try:
        with open(page_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if page uses unified header
        if 'unified-header.js' not in content:
            print(f"- {page_path.name} does not use unified header")
            return True
        
        # Patterns for old header scripts to remove
        old_script_patterns = [
            r'<script\s+src=["\'][^"\']*header\.js["\']>\s*</script>',
            r'<script\s+src=["\'][^"\']*mobile-header\.js["\']>\s*</script>',
            r'<script\s+src=["\'][^"\']*mobile-menu\.js["\']>\s*</script>',
            # Also match without closing tag (some might be malformed)
            r'<script\s+src=["\'][^"\']*header\.js["\']>',
            r'<script\s+src=["\'][^"\']*mobile-header\.js["\']>',
            r'<script\s+src=["\'][^"\']*mobile-menu\.js["\']>',
        ]
        
        original_content = content
        removed_any = False
        
        # Remove old header scripts
        for pattern in old_script_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                removed_any = True
                for match in matches:
                    content = content.replace(match, '')
                    print(f"  - Removed: {match}")
        
        # Clean up extra whitespace
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        
        if removed_any:
            # Write updated content
            with open(page_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Cleaned up old header scripts from {page_path.name}")
        else:
            print(f"- {page_path.name} has no old header scripts to remove")
        
        return True
        
    except Exception as e:
        print(f"Error cleaning {page_path.name}: {e}")
        return False

def main():
    """Clean old header scripts from all HTML pages"""
    pages_dir = Path("c:/Users/HP USER/Desktop/Virtuosa/client/pages")
    
    if not pages_dir.exists():
        print(f"Pages directory not found: {pages_dir}")
        return
    
    html_files = list(pages_dir.glob("*.html"))
    print(f"Checking {len(html_files)} HTML pages for old header scripts...")
    
    success_count = 0
    for html_file in html_files:
        if remove_old_header_scripts(html_file):
            success_count += 1
    
    print(f"\n✅ Successfully processed {success_count}/{len(html_files)} pages")

if __name__ == "__main__":
    main()
