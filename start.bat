@echo off
chcp 65001 > nul
echo ========================================================
echo   SKCT 마스터 오답노트 로컬 서버 시작
echo ========================================================
echo.
echo 브라우저에서 사이트를 여는 중입니다: http://localhost:8080
start http://localhost:8080
echo.
echo 서버를 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
python -m http.server 8080
