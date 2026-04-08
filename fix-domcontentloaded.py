#!/usr/bin/env python3
"""
Update all HTML pages to use window.onPageReady() for SPA navigation compatibility.
Converts DOMContentLoaded event listeners to work with SPA page navigation.
"""

import os
import re
from pathlib import Path

def convert_domcontentloaded_to_onpageready(html_content):
    """
    Convert document.addEventListener('DOMContentLoaded', ...) to window.onPageReady(...)
    """
    
    # Pattern 1: Single-line DOMContentLoaded
    pattern1 = r"document\.addEventListener\s*\(\s*['\"]DOMContentLoaded['\"]\s*,\s*\(\s*\)\s*=>\s*\{([^}]+)\}\s*\)"
    
    # More complex pattern for multi-line with proper brace matching
    # This is harder, so we'll use a more straightforward replacement
    
    replacements = 0
    original_content = html_content
    
    # Replace document.addEventListener('DOMContentLoaded', ...
    # We need to be careful with the braces
    
    # Pattern for: document.addEventListener('DOMContentLoaded', () => { ... })
    # where ... is the function body
    
    lines = html_content.split('\n')
    new_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this line contains DOMContentLoaded
        if 'addEventListener' in line and 'DOMContentLoaded' in line:
            # Find the complete listener code
            start_line = i
            
            # Extract the function body
            listener_match = None
            listener_prefix = None
            after_func = None
            async_prefix = ''

            # Handle arrow functions and normal functions
            for pattern in [
                r'async\s*\(\s*\)\s*=>\s*\{',
                r'\(\s*\)\s*=>\s*\{',
                r'async\s+function\s*\(\s*\)\s*\{',
                r'function\s*\(\s*\)\s*\{'
            ]:
                match = re.search(pattern, line)
                if match:
                    listener_match = match
                    listener_prefix = line[:match.start()]
                    after_func = line[match.end():]
                    async_prefix = 'async ' if 'async' in pattern else ''
                    break

            if listener_match:
                # Collect all lines until we find the closing brace
                brace_count = after_func.count('{') - after_func.count('}')
                body_lines = [after_func]
                i += 1

                while i < len(lines):
                    body_lines.append(lines[i])
                    brace_count += lines[i].count('{') - lines[i].count('}')
                    if brace_count <= 0 and '});' in lines[i]:
                        break
                    i += 1

                # Now reconstruct with window.onPageReady
                try:
                    full_body = '\n'.join(body_lines)

                    # Remove the trailing }); from last occurrences
                    full_body = re.sub(r'\}\s*\)\s*;?\s*$', ';', full_body)

                    indent = len(listener_prefix) - len(listener_prefix.lstrip())
                    indent_str = ' ' * indent
                    
                    new_code = f"{indent_str}window.onPageReady({async_prefix}() => {{\n{full_body}\n{indent_str}}});"

                    new_lines.append(new_code)
                    replacements += 1
                    i += 1
                    continue
                except Exception as e:
                    print(f"  ⚠️  Could not parse DOMContentLoaded at line {start_line}: {e}")
                    new_lines.append(line)
                    i += 1
                    continue
        
        new_lines.append(line)
        i += 1
    
    new_content = '\n'.join(new_lines)
    
    # Also do a simple regex replacement for single-line cases
    # document.addEventListener('DOMContentLoaded', () => { ... });
    
    return new_content, replacements


def update_html_page(file_path):
    """Update a single HTML page"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content, replacements = convert_domcontentloaded_to_onpageready(content)
        
        if replacements > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ {file_path.name}: {replacements} replacement(s)")
            return True
        else:
            # Check for simple pattern
            if 'addEventListener' in content and 'DOMContentLoaded' in content:
                print(f"⚠️  {file_path.name}: Contains DOMContentLoaded but couldn't convert automatically")
                # Show the line
                for i, line in enumerate(content.split('\n'), 1):
                    if 'DOMContentLoaded' in line:
                        print(f"   Line {i}: {line.strip()[:80]}")
            return False
            
    except Exception as e:
        print(f"✗ Error updating {file_path.name}: {e}")
        return False


def main():
    """Main function"""
    pages_dir = Path(__file__).parent / 'client' / 'pages'
    
    if not pages_dir.exists():
        print(f"Error: Pages directory not found: {pages_dir}")
        return
    
    print(f"🔍 Scanning {pages_dir} for DOMContentLoaded usage...")
    print()
    
    html_files = sorted(pages_dir.glob('*.html'))
    updated_count = 0
    found_count = 0
    
    for html_file in html_files:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'DOMContentLoaded' in content:
            found_count += 1
            if update_html_page(html_file):
                updated_count += 1
    
    print()
    print(f"Summary:")
    print(f"  Found: {found_count} pages with DOMContentLoaded")
    print(f"  Updated: {updated_count} pages successfully")
    print()
    
    if found_count > 0:
        print("⚠️  Manual verification recommended!")
        print("Check that window.onPageReady() conversions look correct.")


if __name__ == '__main__':
    main()
