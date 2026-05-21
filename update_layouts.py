import os
import re

files = [
    'JobAppList.js',
    'TargetCompanyList.js',
    'StudyLogList.js',
    'QuestionBankList.js',
    'MilestoneList.js',
    'ReminderList.js',
    'OfferList.js',
    'MockInterviewList.js'
]

base_dir = r"e:\progress_tracker\frontend\src\components"

for f in files:
    path = os.path.join(base_dir, f)
    if not os.path.exists(path):
        continue
    
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # 1. Add Import
    if 'RightSidebarWidgets' not in content:
        import_match = list(re.finditer(r'^import .*;$', content, re.MULTILINE))
        if import_match:
            last_import = import_match[-1]
            content = content[:last_import.end()] + "\nimport RightSidebarWidgets from './RightSidebarWidgets';" + content[last_import.end():]
            
    # 2. Replace start
    form_name = f.replace('List.js', 'Form')
    # Find the pattern where we return (<div...> then <FormName
    # Example: return (\n    <div className="section-page">\n      <JobAppForm
    # We will replace it with return (\n <div className="dashboard-grid">\n <div className="dp-left-col">\n <JobAppForm
    start_pattern = re.compile(rf'return\s*\(\s*<div[^>]*>\s*<{form_name}')
    match = start_pattern.search(content)
    if match:
        content = content[:match.start()] + f'return (\n    <div className="dashboard-grid">\n      <div className="dp-left-col">\n      <{form_name}' + content[match.end():]
    
    # 3. Replace end
    # Only replace the VERY LAST </div> ); } in the file.
    end_pattern = r'(\s*)</div>\s*\);\s*}\s*$'
    match = re.search(end_pattern, content)
    if match:
        spaces = match.group(1)
        replacement = f"{spaces}</div>\n{spaces}  <RightSidebarWidgets />\n{spaces}</div>\n  );\n}}"
        content = re.sub(end_pattern, replacement, content)
        
    with open(path, 'w', encoding='utf-8') as file:
        file.write(content)
    
    print(f"Updated {f}")
