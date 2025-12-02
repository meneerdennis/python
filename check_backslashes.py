#!/usr/bin/env python3

import re

def find_backslashes(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"File length: {len(content)} characters")
    print("\nLooking for backslashes...")
    
    for i, char in enumerate(content):
        if char == '\\':
            # Find which line this character is on
            line_start = content.rfind('\n', 0, i) + 1
            line_end = content.find('\n', i)
            if line_end == -1:
                line_end = len(content)
            
            line_num = content[:line_start].count('\n') + 1
            col_pos = i - line_start + 1
            
            print(f"Found backslash at position {i}, line {line_num}, column {col_pos}")
            print(f"Context: '{content[max(0, i-10):i+10]}'")
            print(f"Line content: '{content[line_start:line_end]}'")
            print("---")

if __name__ == "__main__":
    find_backslashes("docs/hoofdstuk1.md")