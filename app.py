from flask import Flask, request, render_template, redirect, url_for, session, flash
import smtplib
from email.mime.text import MIMEText
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import traceback
import os
import urllib.request
import xml.etree.ElementTree as ET
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'srle rydo bygh zfpq')  # Change this to a random string or set SECRET_KEY in environment

from api import api_bp
app.register_blueprint(api_bp)

# ---------------------- DATABASE ----------------------
def get_db():
    conn = sqlite3.connect('users.db')
    conn.row_factory = sqlite3.Row  # Allows accessing columns by name
    return conn

def init_db():
    with get_db() as conn:
        c = conn.cursor()
        # users table
        c.execute('''CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE,
                    phone_number TEXT,
                    location TEXT
                )''')
        # admin table
        c.execute('''CREATE TABLE IF NOT EXISTS admins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE,
                    password TEXT
                )''')
        try:
            c.execute("INSERT INTO admins (username, password) VALUES (?, ?)", 
                     ('admin', generate_password_hash('admin123')))
        except sqlite3.IntegrityError:
            pass

        # Volunteer Application 
        c.execute('''CREATE TABLE IF NOT EXISTS volunteers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        email TEXT NOT NULL,
                        phone_number TEXT,
                        location TEXT,
                        skills TEXT,
                        availability TEXT,
                        interests TEXT,
                        status TEXT DEFAULT 'pending',
                        activity_status TEXT DEFAULT 'Available',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')
        
        # Report a Missing Person 
        c.execute('''CREATE TABLE IF NOT EXISTS missing_reports (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        person_name TEXT NOT NULL,
                        age INTEGER,
                        gender TEXT,
                        last_known_location TEXT NOT NULL,
                        date_last_seen TEXT,
                        physical_description TEXT,
                        additional_info TEXT,
                        photo TEXT,
                        reporter_name TEXT NOT NULL,
                        reporter_contact TEXT NOT NULL,
                        relationship_to_person TEXT,
                        status TEXT DEFAULT 'pending'
                    )''')

        # Contact Messages
        c.execute('''CREATE TABLE IF NOT EXISTS contact_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        email TEXT NOT NULL,
                        subject TEXT,
                        message TEXT NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')

        # Emergency Alerts
        c.execute('''CREATE TABLE IF NOT EXISTS alerts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        location TEXT NOT NULL,
                        message TEXT NOT NULL,
                        severity TEXT DEFAULT 'high',
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')

        # Product Orders
        c.execute('''CREATE TABLE IF NOT EXISTS orders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        product_name TEXT NOT NULL,
                        price REAL NOT NULL,
                        customer_name TEXT,
                        contact_info TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')

        # Incidents
        c.execute('''CREATE TABLE IF NOT EXISTS incidents (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        description TEXT NOT NULL,
                        location TEXT NOT NULL,
                        severity TEXT,
                        reporter_name TEXT,
                        reporter_contact TEXT,
                        status TEXT DEFAULT 'Pending',
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')
                    
        # Migration for existing incidents table
        try:
            c.execute("ALTER TABLE incidents ADD COLUMN severity TEXT")
            c.execute("ALTER TABLE incidents ADD COLUMN reporter_name TEXT")
            c.execute("ALTER TABLE incidents ADD COLUMN reporter_contact TEXT")
            c.execute("ALTER TABLE incidents ADD COLUMN status TEXT DEFAULT 'Pending'")
        except sqlite3.OperationalError:
            pass # Columns already exist

        # Resource Requests
        c.execute('''CREATE TABLE IF NOT EXISTS resource_requests (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        requester_name TEXT NOT NULL,
                        contact_info TEXT NOT NULL,
                        resource_type TEXT NOT NULL,
                        quantity TEXT,
                        location TEXT NOT NULL,
                        urgency TEXT,
                        status TEXT DEFAULT 'Pending',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')

        # Report Sightings
        c.execute('''CREATE TABLE IF NOT EXISTS report_sightings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        person_name TEXT NOT NULL,
                        date_time TEXT NOT NULL,
                        location TEXT NOT NULL,
                        details TEXT NOT NULL,
                        contact_info TEXT NOT NULL,
                        photo TEXT,
                        status TEXT DEFAULT 'Pending Review',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')

        conn.commit()

init_db()


# ---------------------- EMAIL CONFIG ----------------------
# Load from .env or fallback
EMAIL_CONFIG = {
    'sender_email': os.environ.get('SENDER_EMAIL', "amoghshigwan18@gmail.com"),
    'sender_password': os.environ.get('EMAIL_APP_PASSWORD', "bdlwewwgyndempyn").replace(" ", ""),
    'smtp_server': "smtp.gmail.com",
    'smtp_port': 465,
    'use_ssl': True
}

# ---------------------- EMAIL FUNCTION ----------------------
def send_alert_email(to_email, location, alert_message):
    """Send emergency alert email to a user"""
    subject = f"🚨 Emergency Alert for {location} 🚨"
    body = f"""
Emergency Alert Notification

Location: {location}
Message: {alert_message}

Please take necessary precautions and follow local authorities' instructions.

Stay safe,
Disaster Management Team
"""
    msg = MIMEText(body, "plain")
    msg['Subject'] = subject
    msg['From'] = EMAIL_CONFIG['sender_email']
    msg['To'] = to_email

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
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return False

# ---------------------- ADMIN DASHBOARD ----------------------
@app.route('/admin/dashboard', methods=['GET', 'POST'])
def admin_dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    with get_db() as conn:
        users = conn.execute("SELECT id, email, location FROM users ORDER BY email").fetchall()
        volunteers_list = conn.execute("SELECT * FROM volunteers ORDER BY created_at DESC").fetchall()
        missing_reports_list = conn.execute("SELECT * FROM missing_reports ORDER BY id DESC").fetchall()
        contact_messages_list = conn.execute("SELECT * FROM contact_messages ORDER BY timestamp DESC").fetchall()
        orders_list = conn.execute("SELECT * FROM orders ORDER BY timestamp DESC").fetchall()
        incidents_list = conn.execute("SELECT * FROM incidents ORDER BY timestamp DESC").fetchall()
        resource_requests_list = conn.execute("SELECT * FROM resource_requests ORDER BY created_at DESC").fetchall()
        sightings_list = conn.execute("SELECT * FROM report_sightings ORDER BY created_at DESC").fetchall()
    
    if request.method == 'POST':
        location = request.form.get('location')
        message = request.form.get('message')
        
        if not location or not message:
            return render_template('admin_dashboard.html', users=users, error="Both location and message are required!")
        
        try:
            with get_db() as conn:
                conn.execute("INSERT INTO alerts (location, message) VALUES (?, ?)", (location, message))
                conn.commit()

                target_users = conn.execute(
                    "SELECT email FROM users WHERE lower(location) LIKE ?", 
                    (f"%{location.lower()}%",)
                ).fetchall()
                
                if not target_users:
                    return render_template('admin_dashboard.html', 
                                        users=users,
                                        volunteers=volunteers_list, 
                                        missing_reports=missing_reports_list, 
                                        contact_messages=contact_messages_list,
                                        result=f"Alert posted! (No users found for '{location}')",
                                        last_location=location,
                                        last_message=message,
                                        orders=orders_list,
                                        incidents=incidents_list,
                                        resource_requests=resource_requests_list,
                                        sightings=sightings_list)
                
                success_count = 0
                for user in target_users:
                    if send_alert_email(user['email'], location, message):
                        success_count += 1
                
                result = f"Alert posted & sent to {success_count}/{len(target_users)} users"
                return render_template('admin_dashboard.html', 
                                    users=users,
                                    volunteers=volunteers_list, 
                                    missing_reports=missing_reports_list, 
                                    contact_messages=contact_messages_list,
                                    result=result,
                                    last_location=location,
                                    last_message=message,
                                    orders=orders_list,
                                    incidents=incidents_list,
                                    resource_requests=resource_requests_list,
                                    sightings=sightings_list)
        except Exception as e:
            print(f"Error in admin_dashboard: {e}")
            return render_template('admin_dashboard.html', users=users, error=f"An error occurred: {e}")

    error = session.pop('dashboard_error', None)
    result = session.pop('dashboard_result', None)
    
    return render_template('admin_dashboard.html', 
                           users=users, 
                           volunteers=volunteers_list, 
                           missing_reports=missing_reports_list, 
                           contact_messages=contact_messages_list,
                           orders=orders_list,
                           incidents=incidents_list,
                           resource_requests=resource_requests_list,
                           sightings=sightings_list,
                           error=error,
                           result=result)

@app.route('/admin/reply_message', methods=['POST'])
def reply_message():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    email = request.form.get('email')
    subject = request.form.get('subject')
    reply_text = request.form.get('reply_text')
    
    if not email or not reply_text:
        session['dashboard_error'] = "Email and reply text are required."
        return redirect(url_for('admin_dashboard'))
    
    msg = MIMEText(reply_text, "plain")
    msg['Subject'] = subject if subject.startswith("Re:") else f"Re: {subject}"
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
        session['dashboard_result'] = f"Reply sent to {email} successfully!"
    except Exception as e:
        session['dashboard_error'] = f"Failed to send email: {e}"
        
    return redirect(url_for('admin_dashboard'))

# ---------------------- ROUTES ----------------------
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        phone_number = request.form.get('phone_number')
        location = request.form.get('location')
        
        if not email or not location:
            flash("Email and location are required!", "error")
            return redirect(url_for('register'))
        
        try:
            with get_db() as conn:
                conn.execute("INSERT INTO users (email, phone_number, location) VALUES (?, ?, ?)", (email, phone_number, location))
                conn.commit()
            flash("Registration successful! You'll now receive alerts.", "success")
            return redirect(url_for('register'))
        except sqlite3.IntegrityError:
            flash("This email is already registered!", "error")
            return redirect(url_for('register'))
    
    return render_template('register.html')

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        with get_db() as conn:
            admin = conn.execute("SELECT password FROM admins WHERE username = ?", (username,)).fetchone()
        
        if admin and check_password_hash(admin['password'], password):
            session['admin_logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        else:
            return render_template('admin_login.html', error="Invalid credentials!")
    
    return render_template('admin_login.html')

@app.route('/admin/delete_user/<int:user_id>', methods=['POST'])
def delete_user(user_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    with get_db() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('home'))

@app.route('/admin/approve_volunteer/<int:vol_id>', methods=['POST'])
def approve_volunteer(vol_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    with get_db() as conn:
        conn.execute("UPDATE volunteers SET status = 'approved' WHERE id = ?", (vol_id,))
        conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route('/admin/reject_volunteer/<int:vol_id>', methods=['POST'])
def reject_volunteer(vol_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    with get_db() as conn:
        conn.execute("DELETE FROM volunteers WHERE id = ?", (vol_id,))
        conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route('/admin/volunteer/<int:vol_id>/toggle_activity', methods=['POST'])
def toggle_volunteer_activity(vol_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    with get_db() as conn:
        vol = conn.execute("SELECT activity_status FROM volunteers WHERE id = ?", (vol_id,)).fetchone()
        if vol:
            new_status = 'Busy' if vol['activity_status'] == 'Available' else 'Available'
            conn.execute("UPDATE volunteers SET activity_status = ? WHERE id = ?", (new_status, vol_id))
            conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route('/admin/approve_report/<int:report_id>', methods=['POST'])
def approve_report(report_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    with get_db() as conn:
        conn.execute("UPDATE missing_reports SET status = 'approved' WHERE id = ?", (report_id,))
        conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route('/admin/reject_report/<int:report_id>', methods=['POST'])
def reject_report(report_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    with get_db() as conn:
        conn.execute("DELETE FROM missing_reports WHERE id = ?", (report_id,))
        conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route("/reports", methods=["GET", "POST"])
def reports():
    if request.method == "POST":
        person_name = request.form.get("person_name")
        age = request.form.get("age")
        gender = request.form.get("gender")
        last_known_location = request.form.get("last_known_location")
        date_last_seen = request.form.get("date_last_seen")
        physical_description = request.form.get("physical_description")
        additional_info = request.form.get("additional_info")
        photo = request.files.get("photo")
        reporter_name = request.form.get("reporter_name")
        reporter_contact = request.form.get("reporter_contact")
        relationship_to_person = request.form.get("relationship_to_person")
        
        with get_db() as conn:
            photo_filename = None
            if photo:
                photo_filename = photo.filename
                photo.save(os.path.join('static/uploads', photo_filename))
            conn.execute('''INSERT INTO missing_reports
                      (person_name, age, gender, last_known_location, date_last_seen, physical_description, additional_info, photo, reporter_name, reporter_contact, relationship_to_person
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                      (person_name, age, gender, last_known_location, date_last_seen, physical_description, additional_info, photo_filename, reporter_name, reporter_contact, relationship_to_person))
            conn.commit()
        flash("Missing person report submitted successfully!", "success")
        return redirect(url_for('missing'))
    return redirect(url_for('missing'))

@app.route("/report_sighting", methods=["POST"])
def report_sighting():
    person_name = request.form.get("person_name")
    date_time = request.form.get("date_time")
    location = request.form.get("location")
    details = request.form.get("details")
    contact_info = request.form.get("contact_info")
    photo = request.files.get("photo")
    
    photo_filename = None
    if photo and photo.filename:
        photo_filename = photo.filename
        photo.save(os.path.join('static/uploads', photo_filename))
        
    with get_db() as conn:
        conn.execute('''INSERT INTO report_sightings
                    (person_name, date_time, location, details, contact_info, photo)
                    VALUES (?, ?, ?, ?, ?, ?)''',
                    (person_name, date_time, location, details, contact_info, photo_filename))
        conn.commit()
    
    flash("Sighting report securely submitted to command center.", "success")
    return redirect(url_for('missing'))

@app.route("/volunteers", methods=['GET', 'POST'])
def volunteers():       
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        skills = request.form.get('skills')
        phone_number = request.form.get('phone_number')
        location = request.form.get('location')
        availability = request.form.get('availability')
        interests = request.form.get('interests')
        
        if not name or not email or not skills:
            flash("All fields are required!", "error")
            return redirect(url_for('volunteers'))
        
        try:
            with get_db() as conn:
                conn.execute(
                    '''INSERT INTO volunteers 
                       (name, email, phone_number, location, skills, availability, interests, status, created_at) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))''',
                    (name, email, phone_number, location, skills, availability, interests)
                )
                conn.commit()
            flash("Volunteer registration successful! Awaiting approval.", "success")
            return redirect(url_for('volunteers'))
        except sqlite3.IntegrityError:
            flash("There was an error registering the volunteer.", "error")
            return redirect(url_for('volunteers'))
    
    with get_db() as conn:
        volunteers = conn.execute("SELECT * FROM volunteers WHERE status = 'approved' ORDER BY created_at DESC").fetchall()
    return render_template("volunteers.html", volunteers=volunteers)

@app.route('/about')
def about():
    return render_template('aboutus.html')

@app.route('/contacts')
def contacts():
    return render_template('contacts.html')


@app.route('/emergency')
def emergency():
    return render_template('emergency.html')

@app.route('/firstaid')
def firstaid():
    return render_template('firstaid.html')

@app.route('/missing')
def missing():
    name_query = request.args.get('name', '').strip()
    location_query = request.args.get('location', '').strip()
    age_range = request.args.get('age_range', '')

    with get_db() as conn:
        total_missing = conn.execute("SELECT COUNT(*) FROM missing_reports").fetchone()[0]
        
        query = "SELECT * FROM missing_reports WHERE 1=1"
        params = []
        if name_query:
            query += " AND lower(person_name) LIKE ?"
            params.append(f"%{name_query.lower()}%")
        if location_query:
            query += " AND lower(last_known_location) LIKE ?"
            params.append(f"%{location_query.lower()}%")
        if age_range:
            if age_range == '0-12': query += " AND age BETWEEN 0 AND 12"
            elif age_range == '13-17': query += " AND age BETWEEN 13 AND 17"
            elif age_range == '18-59': query += " AND age BETWEEN 18 AND 59"
            elif age_range == '60+': query += " AND age >= 60"
        query += " ORDER BY id DESC"
        reports = conn.execute(query, params).fetchall()

        # Fetch sightings for the missing persons to show on their cards
        sightings = conn.execute("SELECT * FROM report_sightings ORDER BY created_at DESC").fetchall()
        
        # Group sightings by person_name
        sightings_by_person = {}
        for s in sightings:
            name = s['person_name']
            if name not in sightings_by_person:
                sightings_by_person[name] = []
            sightings_by_person[name].append(s)

    return render_template('missing.html', reports=reports, total_missing=total_missing, sightings_by_person=sightings_by_person)

@app.route('/protection')
def protection():
    return render_template('protecthome.html')

@app.route('/routes')
def routes():
    return render_template('routes.html')

@app.route('/contact_team', methods=['POST'])
def contact_team():
    name = request.form.get('name')
    email = request.form.get('email')
    subject_type = request.form.get('subject')
    message = request.form.get('message')
    
    target_email = "amoghshigwan18@gmail.com"
    email_subject = f"New Contact: {subject_type} from {name}"
    email_body = f"New Message:\n\nName: {name}\nEmail: {email}\nSubject: {subject_type}\n\nMessage:\n{message}"
    
    try:
        with get_db() as conn:
            conn.execute("INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)", 
                         (name, email, subject_type, message))
            conn.commit()
    except Exception as e:
        flash("Message save failed.", "danger")
        return redirect(url_for('about'))
    
    msg = MIMEText(email_body, "plain")
    msg['Subject'] = email_subject
    msg['From'] = EMAIL_CONFIG['sender_email']
    msg['To'] = target_email

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
        flash("Message sent successfully!", "success")
    except Exception as e:
        flash("Message received (Simulated email due to config).", "success")
    return redirect(url_for('about'))

@app.route('/user')
def user():
    with get_db() as conn:
        alerts = conn.execute("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 20").fetchall()
    return render_template('user.html', alerts=alerts)


@app.route('/report_incident', methods=['GET', 'POST'])
def report_incident():
    if request.method == 'POST':
        title = request.form.get('title')
        description = request.form.get('description')
        location = request.form.get('location')
        severity = request.form.get('severity')
        reporter_name = request.form.get('reporter_name')
        reporter_contact = request.form.get('reporter_contact')
        
        if title and description and location and reporter_name and reporter_contact:
            with get_db() as conn:
                conn.execute('''INSERT INTO incidents 
                               (title, description, location, severity, reporter_name, reporter_contact, status) 
                               VALUES (?, ?, ?, ?, ?, ?, 'Pending')''', 
                               (title, description, location, severity, reporter_name, reporter_contact))
                conn.commit()
            flash("Incident reported successfully! Status is Pending.", "success")
            return redirect(url_for('report_incident'))
        else:
            flash("All required fields must be filled to report an incident.", "error")
            
    with get_db() as conn:
        incidents = conn.execute("SELECT * FROM incidents ORDER BY timestamp DESC").fetchall()
        
    return render_template('report_incident.html', incidents=incidents)

@app.route('/resource_request', methods=['GET', 'POST'])
def resource_request():
    if request.method == 'POST':
        requester_name = request.form.get('requester_name')
        contact_info = request.form.get('contact_info')
        resource_type = request.form.get('resource_type')
        quantity = request.form.get('quantity')
        location = request.form.get('location')
        urgency = request.form.get('urgency')
        
        if requester_name and contact_info and resource_type and location:
            with get_db() as conn:
                conn.execute('''INSERT INTO resource_requests 
                               (requester_name, contact_info, resource_type, quantity, location, urgency, status) 
                               VALUES (?, ?, ?, ?, ?, ?, 'Pending')''', 
                               (requester_name, contact_info, resource_type, quantity, location, urgency))
                conn.commit()
            flash("Resource request submitted successfully!", "success")
            return redirect(url_for('resource_request'))
        else:
            flash("Please fill all required fields.", "error")
            
    with get_db() as conn:
        requests = conn.execute("SELECT * FROM resource_requests ORDER BY created_at DESC").fetchall()
        
    return render_template('resource_request.html', requests=requests)

@app.route('/admin/update_incident/<int:incident_id>', methods=['POST'])
def update_incident(incident_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    status = request.form.get('status')
    if status:
        with get_db() as conn:
            conn.execute("UPDATE incidents SET status = ? WHERE id = ?", (status, incident_id))
            conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route('/news')
def news_page():
    return render_template('news.html')


@app.route('/admin/update_resource_request/<int:request_id>', methods=['POST'])
def update_resource_request(request_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    status = request.form.get('status')
    if status:
        with get_db() as conn:
            conn.execute("UPDATE resource_requests SET status = ? WHERE id = ?", (status, request_id))
            conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route('/admin/delete_incident/<int:incident_id>', methods=['POST'])
def delete_incident(incident_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    with get_db() as conn:
        conn.execute("DELETE FROM incidents WHERE id = ?", (incident_id,))
        conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route('/admin/delete_resource_request/<int:request_id>', methods=['POST'])
def delete_resource_request(request_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    with get_db() as conn:
        conn.execute("DELETE FROM resource_requests WHERE id = ?", (request_id,))
        conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route('/admin/update_sighting/<int:sighting_id>', methods=['POST'])
def update_sighting(sighting_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    status = request.form.get('status')
    if status:
        with get_db() as conn:
            conn.execute("UPDATE report_sightings SET status = ? WHERE id = ?", (status, sighting_id))
            conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

@app.route('/admin/delete_sighting/<int:sighting_id>', methods=['POST'])
def delete_sighting(sighting_id):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    with get_db() as conn:
        conn.execute("DELETE FROM report_sightings WHERE id = ?", (sighting_id,))
        conn.commit()
    return redirect(request.referrer or url_for('admin_dashboard'))

if __name__ == '__main__':
    app.run(debug=True, host='localhost')