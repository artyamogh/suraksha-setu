from flask import Blueprint, request
import smtplib
from email.mime.text import MIMEText
import urllib.request
import xml.etree.ElementTree as ET

api_bp = Blueprint('api', __name__)

@api_bp.route('/process_order', methods=['POST'])
def process_order():
    from app import get_db
    data = request.json
    product_name = data.get('product_name')
    price = data.get('price')
    customer_name = data.get('customer_name', 'Guest')
    contact_info = data.get('contact_info', '')
    
    if not product_name or not price:
        return {"status": "error", "message": "Invalid product data"}, 400
        
    try:
        with get_db() as conn:
            conn.execute("INSERT INTO orders (product_name, price, customer_name, contact_info) VALUES (?, ?, ?, ?)", 
                        (product_name, price, customer_name, contact_info))
            conn.commit()
        return {"status": "success", "message": "Order processed successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500

@api_bp.route('/email_kit', methods=['POST'])
def email_kit():
    from app import EMAIL_CONFIG
    data = request.json
    email = data.get('email')
    location = data.get('location')
    items = data.get('items', [])
    
    if not email or not items:
        return {"status": "error", "message": "Email and items are required"}, 400
        
    subject = f"Your Emergency Kit Checklist for {location}"
    items_html = "\n".join([f"- [x] {item}" for item in items])
    body = f"Emergency Kit Checklist:\n\nLocation: {location}\n\n{items_html}\n\nStay Safe,\nSuraksha Setu Team"
    
    msg = MIMEText(body, "plain")
    msg['Subject'] = subject
    msg['From'] = EMAIL_CONFIG['sender_email']
    msg['To'] = email

    try:
        if EMAIL_CONFIG.get('use_ssl', False):
            with smtplib.SMTP_SSL(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port']) as server:
                server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])
                server.send_message(msg)
        else:
            with smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port']) as server:
                server.starttls()
                server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])
                server.send_message(msg)
        return {"status": "success", "message": "Checklist emailed successfully!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500

@api_bp.route('/api/sos', methods=['POST'])
def handle_sos():
    data = request.json
    print(f"🚨 SOS RECEIVED | Location: {data.get('lat')}, {data.get('lng')}")
    return {"status": "success", "message": "SOS Alert Logged"}

@api_bp.route('/api/news')
def api_news():
    url = "https://news.google.com/rss/search?q=disaster+OR+earthquake+OR+flood+OR+tsunami&hl=en-US&gl=US&ceid=US:en"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
        root = ET.fromstring(xml_data)
        news_items = []
        for item in root.findall('./channel/item')[:20]:
            news_items.append({
                'title': item.find('title').text,
                'link': item.find('link').text,
                'pubDate': item.find('pubDate').text
            })
        return {"status": "success", "news": news_items}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500
