@echo off
chcp 65001 > nul
echo ========================================================
echo   SKCT 오답노트 GitHub Pages 원클릭 배포 스크립트
echo ========================================================
echo.

git status > nul 2>&1
if %errorlevel% neq 0 (
    echo [1/4] Git 저장소를 초기화합니다...
    git init
    git branch -M main
) else (
    echo [1/4] Git 저장소가 이미 존재합니다.
)

echo [2/4] 최신 변경 사항을 스테이징 및 커밋합니다...
git add .
git commit -m "Update SKCT error notes site: %date% %time%"

echo.
git remote -v | findstr "origin" > nul 2>&1
if %errorlevel% neq 0 (
    echo [3/4] 원격 GitHub 저장소가 연결되어 있지 않습니다.
    echo GitHub에서 생성한 저장소 주소를 붙여넣어 주세요.
    echo (예: https://github.com/username/skct-notes.git)
    set /p REPO_URL=">> GitHub Repository URL: "
    if not "%REPO_URL%"=="" (
        git remote add origin %REPO_URL%
    )
) else (
    echo [3/4] 연결된 원격 저장소로 배포를 준비합니다.
)

echo.
echo [4/4] GitHub에 푸시 중...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  배포 완료! GitHub 저장소 Settings ^> Pages에서 활성화하세요.
    echo ========================================================
) else (
    echo.
    echo [!] 푸시 중 문제가 발생했습니다. GitHub URL 및 권한을 확인해주세요.
)

echo.
pause
