import http.server
import socketserver
import os
import sys

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Hỗ trợ URL đẹp giống moccnha (/admin, /admin/products, /staff)
        clean_path = self.path.split('?')[0].split('#')[0].rstrip('/')
        if clean_path in ('/admin', '/admin/orders', '/admin/products', '/admin/revenue', '/admin/quotes'):
            self.path = '/admin.html'
        elif clean_path in ('/staff', '/nhan-vien'):
            self.path = '/staff.html'
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            url = f"http://localhost:{PORT}"
            print("=" * 60)
            print("  MORIOO WOODEN FURNITURE - WEB SERVER RUNNING")
            print(f"  Store: {url}/")
            print(f"  Admin Portal: {url}/admin.html")
            print(f"  Staff Portal: {url}/staff.html")
            print("=" * 60)
            httpd.serve_forever()
    except Exception as e:
        print(f"Server error: {e}")
