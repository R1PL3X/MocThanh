import os
import unittest
import json
from app import app
from database import init_db

class MoriooStoreTestCase(unittest.TestCase):
    def setUp(self):
        init_db()
        self.client = app.test_client()

    def test_home_page(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        content = response.data.decode('utf-8')
        self.assertIn('MORIOO', content)
        self.assertIn('Tủ & Kệ', content)
        self.assertIn('Dịch Vụ Khách Hàng', content)

    def test_admin_page(self):
        response = self.client.get('/admin')
        self.assertEqual(response.status_code, 200)
        content = response.data.decode('utf-8')
        self.assertTrue('admin portal' in content.lower() or 'morioo' in content.lower())
        self.assertIn('KPI Nhân Viên', content)

    def test_staff_page(self):
        response = self.client.get('/staff')
        self.assertEqual(response.status_code, 200)
        content = response.data.decode('utf-8', errors='ignore')
        self.assertTrue('staff' in content.lower() or 'nhân viên' in content.lower())
        self.assertTrue('kpi' in content.lower())

    def test_sub_pages(self):
        for path in ['/about', '/stores', '/news', '/b2b', '/policy']:
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200, f"Failed at path {path}")

    def test_api_categories(self):
        response = self.client.get('/api/categories')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        slugs = [c.get('slug') for c in data]
        self.assertIn('tu-ke', slugs)
        self.assertIn('phong-khach', slugs)
        self.assertIn('phong-ngu', slugs)

    def test_api_products(self):
        response = self.client.get('/api/products')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        tu_ke_prod = next((p for p in data if p.get('category') == 'tu-ke' or p.get('category_slug') == 'tu-ke'), None)
        self.assertIsNotNone(tu_ke_prod)

    def test_api_services(self):
        payload = {
            'service_type': 'tu-van',
            'customer_name': 'Nguyễn Văn Test',
            'customer_phone': '0901234567',
            'customer_email': 'test@gmail.com',
            'address': 'Quận 1, TP.HCM',
            'details': {'room_size': '25m2', 'style': 'Wabi-Sabi'}
        }
        res = self.client.post('/api/services', json=payload)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        self.assertIn('code', data)

    def test_api_chat(self):
        payload = {
            'session_id': 'TEST-SESSION-001',
            'message': 'Cho tôi hỏi ở đây có những bàn ghế nào?'
        }
        res = self.client.post('/api/chat/send', json=payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data.get('success'))
        self.assertIn('reply', data)

    def test_api_db_status(self):
        res = self.client.get('/api/db-status')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data.get('mode'), 'supabase')
        self.assertEqual(data.get('status'), 'connected')

if __name__ == '__main__':
    unittest.main()
