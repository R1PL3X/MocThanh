@echo off
title MORIOO Wooden Furniture Server
echo ========================================================
echo   DANG KHOI DONG HE THONG NGAN HANG MORIOO ^& BACKEND FLASK
echo ========================================================
echo.
python database.py
echo Khoi dong may chu tai http://localhost:5000 ...
python app.py
pause
