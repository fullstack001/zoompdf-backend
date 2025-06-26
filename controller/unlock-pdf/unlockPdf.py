import sys
import os
import pikepdf

def unlock_pdf_with_password_or_list(pdf_path, output_pdf_path, password, password_list_path):
    """
    Unlock a password-protected PDF using a provided password or a password list if no password is provided.
    """
    try:
        print(f"Attempting to unlock PDF: {pdf_path}")
        sys.stdout.flush()

        # Ensure the input PDF exists
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"Input file does not exist: {pdf_path}")

        # Attempt to unlock the PDF with the provided password
        if password:
            try:
                print(f"Trying provided password: {password}")
                sys.stdout.flush()

                with pikepdf.open(pdf_path, password=password) as pdf:
                    # Save the unlocked PDF
                    pdf.save(output_pdf_path)
                    print(f"PDF unlocked successfully with provided password.")
                    sys.stdout.flush()
                    return True
            except pikepdf.PasswordError:
                print("require_password")
                sys.stdout.flush()
                return False
        
        # If no password is provided, use the password list
        if not os.path.exists(password_list_path):
            raise FileNotFoundError(f"Password list does not exist: {password_list_path}")

        with open(password_list_path, 'r') as f:
            passwords = f.read().splitlines()

        for pwd in passwords:
            try:
                print(f"Trying password from list: {pwd}")
                sys.stdout.flush()

                with pikepdf.open(pdf_path, password=pwd) as pdf:
                    # Save the unlocked PDF
                    pdf.save(output_pdf_path)
                    print(f"PDF unlocked successfully with password from list: {pwd}")
                    sys.stdout.flush()
                    return True
            except pikepdf.PasswordError:
                continue

        print("require_password")
        sys.stdout.flush()
        return False

    except Exception as e:
        print(f"Unexpected error while unlocking PDF: {e}")
        sys.stdout.flush()
        return False

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python unlockPdf.py <pdf_path> <output_pdf_path> <password> <password_list_path>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_pdf_path = sys.argv[2]
    password = sys.argv[3]
    password_list_path = sys.argv[4]

    success = unlock_pdf_with_password_or_list(pdf_path, output_pdf_path, password, password_list_path)
    sys.exit(0 if success else 1)
