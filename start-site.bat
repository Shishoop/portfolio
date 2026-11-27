@echo off
rem Double-click to preview the portfolio at http://localhost:4173
start "" http://localhost:4173
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
