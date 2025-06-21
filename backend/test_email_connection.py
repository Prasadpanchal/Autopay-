# test_email_connection.py
import smtplib
import ssl

SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
SENDER_EMAIL = 'prasadpanchalps@gmail.com' # Gmail Address 
APP_PASSWORD = 'htnu eeqy qhyg lppq'       # Gmail App Password

print(f"Trying to connect to SMTP server: {SMTP_SERVER}:{SMTP_PORT}")

try:
    # Create an SSL/TLS context
    context = ssl.create_default_context()
    
    # Connect to SMTP server
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.ehlo() # Establish a connection
        server.starttls(context=context) # Start TLS (secure connection)
        server.ehlo() # Greet again when TLS starts.
        server.login(SENDER_EMAIL, APP_PASSWORD) # Login
        print("Connection and login successful!")
        print("The server is ready to send email.")

        # Try sending a test email (you can use this line for debugging)
        # receiver_email = 'prasadpanchalps@gmail.com' # To whom you want to send a test email
        # message = "Subject: Test Email from Python Script\n\nThis is a test email sent from your Python application."
        # server.sendmail(SENDER_EMAIL, receiver_email, message)
        # print(f"Test email sent to {receiver_email}.")

except smtplib.SMTPAuthenticationError as e:
    print(f"SMTP login failed: Username or password incorrect. Error: {e}")
    print("Please make sure that MAIL_USERNAME and MAIL_PASSWORD (app password) are correct.")
except smtplib.SMTPConnectError as e:
    print(f"SMTP connection failed: Could not connect to the server. Error: {e}")
    print("Check your firewall, antivirus, or network settings.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")