@echo off
title Khoi Chay Du An HRM
:: Chạy file PowerShell tự động với quyền thực thi tạm thời
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_project.ps1"
pause
