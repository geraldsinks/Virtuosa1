#!/usr/bin/env python3
"""
Script to update all client pages to use the unified header system
"""

import os
import re
from pathlib import Path

def update_page_header_scripts(page_path):
    """Update a single page to use unified header"""
    try:
        with open(page_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if page already uses unified header
        if 'unified-header.js' in content:
            print(f"✓ {page_path.name} already uses unified header")
            return True
        
        # Check if page has any header script references
        header_patterns = [
            r'<script\s+src=["\'][^"\']*header\.js["\']>',
            r'<script\s+src=["\'][^"\']*mobile-header\.js["\']>',
            r'<script\s+src=["\'][^"\']*mobile-menu\.js["\']>'
        ]
        
        has_header_scripts = any(re.search(pattern, content) for pattern in header_patterns)
        
        if not has_header_scripts:
            print(f"- {page_path.name} has no header scripts to replace")
            return True
        
        # Remove old header script references
        for pattern in header_patterns:
            content = re.sub(pattern, '', content)
        
        # Find where to insert unified header script (before other scripts)
        # Look for closing </body> tag or existing script tags
        script_insertion_point = None
        
        # Try to find before other scripts in body
        body_scripts_match = re.search(r'(<body[^>]*>.*?)(<script\s+src=)', content, re.DOTALL)
        if body_scripts_match:
            script_insertion_point = body_scripts_match.end(1)
        else:
            # Insert before closing </body> tag
            body_close_match = re.search(r'</body>', content)
            if body_close_match:
                script_insertion_point = body_close_match.start()
        
        if script_insertion_point:
            # Insert unified header script
            unified_script = '<script src="../js/unified-header.js"></script>\n    '
            content = content[:script_insertion_point] + unified_script + content[script_insertion_point:]
            print(f"✓ Updated {page_path.name} to use unified header")
        else:
            print(f"- Could not find insertion point for {page_path.name}")
            return False
        
        # Write updated content
        with open(page_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
        
    except Exception as e:
        print(f"Error updating {page_path.name}: {e}")
        return False

def main():
    """Update all HTML pages in the client/pages directory"""
    pages_dir = Path("c:/Users/HP USER/Desktop/Virtuosa/client/pages")
    
    if not pages_dir.exists():
        print(f"Pages directory not found: {pages_dir}")
        return
    
    html_files = list(pages_dir.glob("*.html"))
    print(f"Found {len(html_files)} HTML pages to update...")
    
    success_count = 0
    for html_file in html_files:
        if update_page_header_scripts(html_file):
            success_count += 1
    
    print(f"\n✅ Successfully updated {success_count}/{len(html_files)} pages")

if __name__ == "__main__":
    main()
