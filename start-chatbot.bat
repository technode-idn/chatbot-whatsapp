@echo off

set PM2_HOME=C:\Users\KlikBi\.pm2

cd /d C:\Users\KlikBi\Documents\KlikBiGo\chatbot-whatsapp

C:\Users\KlikBi\AppData\Roaming\npm\pm2.cmd resurrect

exit /b 0