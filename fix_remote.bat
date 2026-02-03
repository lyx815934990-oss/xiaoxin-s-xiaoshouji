@echo off
chcp 65001 >nul
echo 正在更新远程仓库地址...
git remote set-url origin https://github.com/lyx815934990-oss/xiaoshouji.git
echo.
echo 检查更新后的远程地址：
git remote -v
echo.
echo 完成！现在可以执行 git push -u origin main 来推送代码了

