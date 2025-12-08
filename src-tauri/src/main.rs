// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[cfg(windows)]
use windows::Win32::{
    Foundation::HWND,
    UI::WindowsAndMessaging::{
        FindWindowA, FindWindowExA, GetDesktopWindow, SetParent,
        SetWindowPos, HWND_BOTTOM, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
        SendMessageTimeoutA, SMTO_NORMAL,
    },
};

static IS_WALLPAPER_MODE: AtomicBool = AtomicBool::new(false);

#[cfg(windows)]
fn get_workerw() -> Option<HWND> {
    unsafe {
        // 查找 Progman 窗口
        let progman = FindWindowA(
            windows::core::s!("Progman"),
            None,
        ).ok()?;

        // 发送消息让 Windows 创建 WorkerW
        let mut _result = 0usize;
        let _ = SendMessageTimeoutA(
            progman,
            0x052C, // 特殊消息，让 Windows 创建 WorkerW
            windows::Win32::Foundation::WPARAM(0),
            windows::Win32::Foundation::LPARAM(0),
            SMTO_NORMAL,
            1000,
            Some(&mut _result as *mut usize),
        );

        // 遍历寻找正确的 WorkerW
        let desktop = GetDesktopWindow();
        let mut workerw: Option<HWND> = None;
        let mut hwnd = FindWindowExA(Some(desktop), None, windows::core::s!("WorkerW"), None).ok();
        
        while let Some(h) = hwnd {
            let shelldll = FindWindowExA(Some(h), None, windows::core::s!("SHELLDLL_DefView"), None);
            if shelldll.is_ok() {
                // 找到下一个 WorkerW
                workerw = FindWindowExA(Some(desktop), Some(h), windows::core::s!("WorkerW"), None).ok();
                break;
            }
            hwnd = FindWindowExA(Some(desktop), Some(h), windows::core::s!("WorkerW"), None).ok();
        }

        workerw
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("你好, {}! 欢迎使用 Tauri + React!", name)
}

#[tauri::command]
fn toggle_wallpaper_mode(window: tauri::WebviewWindow) -> Result<bool, String> {
    #[cfg(windows)]
    {
        let is_wallpaper = IS_WALLPAPER_MODE.load(Ordering::SeqCst);
        
        if is_wallpaper {
            // 恢复普通窗口模式
            unsafe {
                let hwnd = window.hwnd().map_err(|e| e.to_string())?;
                let hwnd = HWND(hwnd.0 as *mut std::ffi::c_void);
                
                // 移除父窗口，恢复为独立窗口
                let _ = SetParent(hwnd, None);
                
                // 恢复窗口装饰
                let _ = window.set_decorations(true);
                let _ = window.set_resizable(true);
                let _ = window.set_always_on_top(false);
                
                // 恢复窗口大小
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: 800,
                    height: 600,
                }));
                let _ = window.center();
                let _ = window.set_focus();
            }
            IS_WALLPAPER_MODE.store(false, Ordering::SeqCst);
            Ok(false)
        } else {
            // 进入桌面背景模式
            if let Some(workerw) = get_workerw() {
                unsafe {
                    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
                    let hwnd = HWND(hwnd.0 as *mut std::ffi::c_void);
                    
                    // 获取屏幕尺寸
                    let monitor = window.current_monitor()
                        .map_err(|e| e.to_string())?
                        .ok_or("无法获取显示器信息")?;
                    let size = monitor.size();
                    
                    // 设置无边框全屏
                    let _ = window.set_decorations(false);
                    let _ = window.set_resizable(false);
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                        width: size.width,
                        height: size.height,
                    }));
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                        x: 0,
                        y: 0,
                    }));
                    
                    // 将窗口设置为 WorkerW 的子窗口
                    let _ = SetParent(hwnd, Some(workerw));
                    
                    // 确保窗口在最底层
                    let _ = SetWindowPos(
                        hwnd,
                        Some(HWND_BOTTOM),
                        0, 0, 0, 0,
                        SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
                    );
                }
                IS_WALLPAPER_MODE.store(true, Ordering::SeqCst);
                Ok(true)
            } else {
                Err("无法找到桌面 WorkerW 窗口".to_string())
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        let _ = window;
        Err("桌面背景模式仅支持 Windows".to_string())
    }
}

#[tauri::command]
fn get_wallpaper_mode() -> bool {
    IS_WALLPAPER_MODE.load(Ordering::SeqCst)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, toggle_wallpaper_mode, get_wallpaper_mode])
        .setup(|app| {
            // 创建托盘菜单
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let wallpaper_item = MenuItem::with_id(app, "wallpaper", "桌面背景模式", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &wallpaper_item, &quit_item])?;

            // 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("iFocus")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            // 如果在桌面背景模式，先退出
                            if IS_WALLPAPER_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_wallpaper_mode(window.clone());
                            }
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "wallpaper" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = toggle_wallpaper_mode(window);
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            // 如果在桌面背景模式，先退出
                            if IS_WALLPAPER_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_wallpaper_mode(window.clone());
                            }
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // 点击关闭按钮时隐藏窗口而不是退出
            if let WindowEvent::CloseRequested { api, .. } = event {
                // 如果在桌面背景模式，不处理关闭事件
                if !IS_WALLPAPER_MODE.load(Ordering::SeqCst) {
                    window.hide().unwrap();
                }
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
