@echo off
chcp 65001 >nul
set "ROOT=E:\王全的工作台\02-BIM项目文件\018-starmap"
title StarMap - 监视影像目录并自动发布
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\工具\watch-media.ps1" -Root "%ROOT%"