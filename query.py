import os
import urllib.request
import json
import ssl

def run():
    env = {}
    if os.path.exists('.env.local'):
        with open('.env.local', 'r') as f:
            for line in f:
                parts = line.strip().split('=')
                if len(parts) >= 2:
                    env[parts[0]] = '='.join(parts[1:]).strip('"\'')
    
    url = env.get('VITE_SUPABASE_URL')
    key = env.get('VITE_SUPABASE_ANON_KEY')
    
    req_url = f"{url}/rest/v1/_webhook_debug?select=decision,parsed,error_msg&order=created_at.desc&limit=3"
    req = urllib.request.Request(req_url, headers={'apikey': key, 'Authorization': f"Bearer {key}"})
    
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, context=ctx) as res:
            data = json.loads(res.read().decode('utf-8'))
            print("=== WEBHOOK DEBUG ===")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(e)
        
run()
