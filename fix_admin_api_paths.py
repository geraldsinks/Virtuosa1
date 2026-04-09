import os
dir_pages = 'c:/Users/HP USER/Desktop/Virtuosa/client/pages'
dir_js = 'c:/Users/HP USER/Desktop/Virtuosa/client/js'
for prefix in ['admin-transactions', 'admin-disputes', 'admin-support', 'admin-live-chat', 'strategic-analytics', 'admin-retention']:
    for base in [dir_pages, dir_js]:
        for ext in ['.js', '.html']:
            path = os.path.join(base, prefix+ext)
            if os.path.exists(path):
                content = open(path, encoding='utf-8').read()
                # Use window.API_BASE
                content = content.replace("window.authHelper.authenticatedFetch('/api/", "adminFetch(window.API_BASE + '/")
                content = content.replace("window.authHelper.authenticatedFetch(`/api/", "adminFetch(`${window.API_BASE}/")
                content = content.replace("fetch('/api/", "fetch(window.API_BASE + '/")
                content = content.replace("fetch(`/api/", "fetch(`${window.API_BASE}/")
                open(path, 'w', encoding='utf-8').write(content)
                print('Fixed', path)
