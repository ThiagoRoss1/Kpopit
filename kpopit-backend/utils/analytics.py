from flask import request
import pycountry

def get_analytics_data():
    return {
        "country": request.headers.get('cf-ipcountry', 'Unknown'),
        "device": request.headers.get('cf-device-type', 'Unknown'),
        "lang": request.headers.get('accept-language', 'Unknown').split(',')[0],

        "source": request.json.get('utm_source', 'organic'),
        "ref": request.json.get('referrer', 'direct'),
        "browser": request.headers.get('user-agent', 'Unknown'),
    }

def get_country_name(country_code):
    try:
        country = pycountry.countries.get(alpha_2=country_code.upper())

        if country:
            flag = "".join([chr(127397 + ord(c)) for c in country.alpha_2.upper()])
            return country.name, flag
        
        return "Unknown", ""
    
    except Exception:
        return country_code, "🌐"