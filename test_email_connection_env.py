import smtplib
from email.mime.text import MIMEText
import traceback
import os
from dotenv import load_dotenv

load_dotenv()

EMAIL_CONFIG = {
    'sender_email': os.environ.get('SENDER_EMAIL', "amoghshigwan18@gmail.com"),
    'sender_password': os.environ.get('EMAIL_APP_PASSWORD', "bdlwewwgyndempyn").replace(" ", ""),
    'smtp_server': "smtp.gmail.com",
    'smtp_port': 465,
    'use_ssl': True
}

def test_send():
    subject = "Test Alert Logic (ENV)"
    body = "This is a test email to verify SMTP credentials from .env."
    msg = MIMEText(body, "plain")
    msg['Subject'] = subject
    msg['From'] = EMAIL_CONFIG['sender_email']
    msg['To'] = EMAIL_CONFIG['sender_email']

    print(f"Testing with Email: {EMAIL_CONFIG['sender_email']}")
    # don't print password

    try:
        print("Connecting to SMTP server...")
        with smtplib.SMTP_SSL(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port']) as server:
            print("Logging in...")
            server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])
            print("Sending message...")
            server.send_message(msg)
        print("✅ Email sent successfully!")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        # traceback.print_exc()

if __name__ == "__main__":
    test_send()
