#!/usr/bin/env python3
"""
Update all HTML pages to include the Navigation Bootstrap system
This ensures the navigation system is available on all pages

Usage:
    python3 update-pages-for-navigation-bootstrap.py [--dry-run]
"""

import os
import glob
import re
from pathlib import Path

def should_update_page(content):
    """Check if page needs navigation bootstrap"""
    return 'navigation-bootstrap.js' not in content

def add_bootstrap_script(content):
    """Add navigation bootstrap to page"""
    # Find the head section
    head_pattern = r'(<head[^>]*>)'
    head_match = re.search(head_pattern, content, re.IGNORECASE)
    
    if not head_match:
        print("ERROR: Could not find <head> tag")
        return content
    
    head_end_pos = head_match.end()
    
    # Find where to insert (after other early scripts, before defer scripts)
    # Look for the first Tailwind or Lucide script
    insert_pattern = r'<script[^>]*(?:tailwindcss|lucide)[^>]*></script>'
    insert_pos = head_end_pos
    
    for match in re.finditer(insert_pattern, content[head_end_pos:], re.IGNORECASE):
        insert_pos = head_end_pos + match.end()
        break
    
    # If no early scripts found, insert before first defer script
    if insert_pos == head_end_pos:
        defer_pattern = r'<script[^>]*defer[^>]*>'
        for match in re.finditer(defer_pattern, content[head_end_pos:]):
            insert_pos = head_end_pos + match.start()
            break
    
    # If still no position, insert before </head>
    if insert_pos == head_end_pos:
        insert_pos = content.find('</head>')
        if insert_pos == -1:
            print("ERROR: Could not find insertion point")
            return content
    
    # Create the bootstrap script tag
    bootstrap_tag = '''
    <!-- CRITICAL: Global Navigation Bootstrap (enables SPA navigation on all pages) -->
    <script src="/js/navigation-bootstrap.js"></script>
    '''
    
    # Insert the script
    new_content = content[:insert_pos] + bootstrap_tag + content[insert_pos:]
    
    return new_content

def update_page(file_path, dry_run=False):
    """Update a single page file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if not should_update_page(content):
            print(f"✓ Already has bootstrap: {file_path}")
            return True
        
        new_content = add_bootstrap_script(content)
        
        if dry_run:
            print(f"[DRY RUN] Would update: {file_path}")
            return True
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✓ Updated: {file_path}")
        return True
    
    except Exception as e:
        print(f"✗ ERROR updating {file_path}: {e}")
        return False

def main():
    """Main function"""
    import sys
    
    dry_run = '--dry-run' in sys.argv
    
    # Get the pages directory
    script_dir = Path(__file__).parent
    pages_dir = script_dir / 'client' / 'pages'
    
    if not pages_dir.exists():
        print(f"ERROR: Pages directory not found: {pages_dir}")
        return 1
    
    print(f"Updating HTML pages in: {pages_dir}")
    print(f"Dry run: {dry_run}\n")
    
    # Find all HTML files (exclude backups and master template)
    html_files = []
    for html_file in sorted(pages_dir.glob('*.html')):
        if html_file.name.endswith('.backup') or html_file.name == 'master-template.html':
            continue
        html_files.append(html_file)
    
    print(f"Found {len(html_files)} HTML pages to process\n")
    
    # Update each file
    success_count = 0
    for html_file in html_files:
        if update_page(str(html_file), dry_run):
            success_count += 1
    
    print(f"\n{'=' * 60}")
    print(f"Results: {success_count}/{len(html_files)} pages processed successfully")
    
    if dry_run:
        print("\nTo apply changes, run: python3 update-pages-for-navigation-bootstrap.py")
    else:
        print("\n✓ All pages have been updated with Navigation Bootstrap!")
        print("✓ Navigation system is now available globally on all pages")
    
    return 0 if success_count == len(html_files) else 1

if __name__ == '__main__':
    exit(main())
