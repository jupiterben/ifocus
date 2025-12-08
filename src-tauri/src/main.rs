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
    Foundation::{HWND, POINT},
    Graphics::Gdi::ScreenToClient,
    UI::WindowsAndMessaging::{
        FindWindowA, FindWindowExA, GetDesktopWindow, SetParent,
        SetWindowPos, HWND_BOTTOM, SWP_NOACTIVATE, SWP_FRAMECHANGED,
        SendMessageTimeoutA, SMTO_NORMAL,
        GetWindowLongW, SetWindowLongW, GWL_STYLE,
        WS_CAPTION, WS_THICKFRAME, WS_SYSMENU,
    },
    Graphics::Dwm::DwmSetWindowAttribute,
};

static IS_WALLPAPER_MODE: AtomicBool = AtomicBool::new(false);
static IS_MINI_MODE: AtomicBool = AtomicBool::new(false);

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

#[derive(serde::Serialize)]
struct MonitorInfo {
    name: String,
    position: (i32, i32),
    size: (u32, u32),
    scale_factor: f64,
    is_primary: bool,
}

#[tauri::command]
fn get_available_monitors(window: tauri::WebviewWindow) -> Result<Vec<MonitorInfo>, String> {
    let monitors = window
        .available_monitors()
        .map_err(|e| format!("无法获取显示器列表: {}", e))?;
    
    let mut monitor_list = Vec::new();
    let primary_monitor = window
        .primary_monitor()
        .ok()
        .flatten();
    
    for (index, monitor) in monitors.iter().enumerate() {
        let size = monitor.size();
        let position = monitor.position();
        let scale_factor = monitor.scale_factor();
        let is_primary = primary_monitor
            .as_ref()
            .map(|pm| pm.name() == monitor.name())
            .unwrap_or(false);
        
        monitor_list.push(MonitorInfo {
            name: format!("显示器 {} ({})", index + 1, if is_primary { "主显示器" } else { "" }),
            position: (position.x, position.y),
            size: (size.width, size.height),
            scale_factor,
            is_primary,
        });
    }
    
    Ok(monitor_list)
}

#[tauri::command]
fn toggle_wallpaper_mode(window: tauri::WebviewWindow, monitor_index: Option<usize>) -> Result<bool, String> {
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
                    
                    // 获取显示器信息
                    let (width, height, pos_x, pos_y) = if let Some(index) = monitor_index {
                        let monitors = window
                            .available_monitors()
                            .map_err(|e| format!("无法获取显示器列表: {}", e))?;
                        let monitor = monitors.get(index).ok_or(format!("显示器索引 {} 无效", index))?;
                        let size = monitor.size();
                        let position = monitor.position();
                        (size.width, size.height, position.x, position.y)
                    } else {
                        // 默认使用主显示器
                        let monitor = window
                            .primary_monitor()
                            .map_err(|e| format!("无法获取主显示器: {}", e))?
                            .ok_or("未找到主显示器".to_string())?;
                        let size = monitor.size();
                        let position = monitor.position();
                        (size.width, size.height, position.x, position.y)
                    };
                    
                    // 设置无边框全屏
                    let _ = window.set_decorations(false);
                    let _ = window.set_resizable(false);
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                        width,
                        height,
                    }));
                    
                    // 先将窗口移动到目标位置（屏幕坐标）
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                        x: pos_x,
                        y: pos_y,
                    }));
                    
                    // 使用 Windows API 强制移除标题栏样式
                    let style = GetWindowLongW(hwnd, GWL_STYLE);
                    let new_style = style & !(WS_CAPTION.0 as i32 | WS_THICKFRAME.0 as i32 | WS_SYSMENU.0 as i32);
                    SetWindowLongW(hwnd, GWL_STYLE, new_style);
                    
                    // 将窗口设置为 WorkerW 的子窗口
                    let _ = SetParent(hwnd, Some(workerw));
                    
                    // 将屏幕坐标转换为相对于 WorkerW 的坐标
                    let mut screen_point = POINT {
                        x: pos_x,
                        y: pos_y,
                    };
                    let _ = ScreenToClient(workerw, &mut screen_point);
                    
                    // 使用相对于 WorkerW 的坐标重新设置窗口位置
                    // 这样可以确保窗口在正确的显示器位置上显示
                    // 使用 SWP_FRAMECHANGED 确保窗口样式更改生效
                    let _ = SetWindowPos(
                        hwnd,
                        Some(HWND_BOTTOM),
                        screen_point.x,
                        screen_point.y,
                        width as i32,
                        height as i32,
                        SWP_NOACTIVATE | SWP_FRAMECHANGED,
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

#[tauri::command]
fn toggle_mini_mode(window: tauri::WebviewWindow) -> Result<bool, String> {
    let is_mini = IS_MINI_MODE.load(Ordering::SeqCst);
    
    if is_mini {
        // 退出 mini 模式，恢复普通窗口
        window.set_decorations(true).map_err(|e| e.to_string())?;
        window.set_resizable(true).map_err(|e| e.to_string())?;
        window.set_always_on_top(false).map_err(|e| e.to_string())?;
        window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: 800,
            height: 600,
        })).map_err(|e| e.to_string())?;
        window.center().map_err(|e| e.to_string())?;
        IS_MINI_MODE.store(false, Ordering::SeqCst);
        Ok(false)
    } else {
        // 进入 mini 模式：小窗口、置顶、可拖动、无边框
        window.set_decorations(false).map_err(|e| e.to_string())?;
        window.set_resizable(false).map_err(|e| e.to_string())?;
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
        window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: 160,
            height: 35,
        })).map_err(|e| e.to_string())?;
        
        // 在 Windows 上设置窗口圆角
        #[cfg(windows)]
        {
            unsafe {
                if let Ok(hwnd) = window.hwnd() {
                    let hwnd = HWND(hwnd.0 as *mut std::ffi::c_void);
                    // DWMWA_WINDOW_CORNER_PREFERENCE = 33
                    // DWMWCP_ROUND = 2 (圆角)
                    let corner_preference: u32 = 2;
                    use windows::Win32::Graphics::Dwm::DWMWINDOWATTRIBUTE;
                    let _ = DwmSetWindowAttribute(
                        hwnd,
                        DWMWINDOWATTRIBUTE(33), // DWMWA_WINDOW_CORNER_PREFERENCE
                        &corner_preference as *const _ as *const std::ffi::c_void,
                        std::mem::size_of::<u32>() as u32,
                    );
                }
            }
        }
        
        // 设置窗口可拖动（通过 CSS 的 -webkit-app-region: drag）
        IS_MINI_MODE.store(true, Ordering::SeqCst);
        Ok(true)
    }
}

#[tauri::command]
fn get_mini_mode() -> bool {
    IS_MINI_MODE.load(Ordering::SeqCst)
}

// 清理函数：恢复窗口状态，移除 WorkerW 父窗口
#[cfg(windows)]
fn cleanup_wallpaper_mode(window: &tauri::Window) {
    if IS_WALLPAPER_MODE.load(Ordering::SeqCst) {
        unsafe {
            if let Ok(hwnd) = window.hwnd() {
                let hwnd = HWND(hwnd.0 as *mut std::ffi::c_void);
                // 移除父窗口，恢复为独立窗口
                let _ = SetParent(hwnd, None);
            }
        }
        IS_WALLPAPER_MODE.store(false, Ordering::SeqCst);
    }
}

#[cfg(not(windows))]
fn cleanup_wallpaper_mode(_window: &tauri::Window) {
    // 非 Windows 平台不需要清理
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, toggle_wallpaper_mode, get_wallpaper_mode, get_available_monitors, toggle_mini_mode, get_mini_mode])
        .setup(|app| {
            // 创建托盘菜单
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let wallpaper_item = MenuItem::with_id(app, "wallpaper", "桌面背景模式", true, None::<&str>)?;
            let mini_item = MenuItem::with_id(app, "mini", "Mini 模式", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &wallpaper_item, &mini_item, &quit_item])?;

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
                                let _ = toggle_wallpaper_mode(window.clone(), None);
                            }
                            // 如果在 mini 模式，先退出
                            if IS_MINI_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_mini_mode(window.clone());
                            }
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "wallpaper" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = toggle_wallpaper_mode(window, None);
                        }
                    }
                    "mini" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = toggle_mini_mode(window);
                        }
                    }
                    "quit" => {
                        // 退出前清理：如果在桌面背景模式或 mini 模式，先恢复窗口状态
                        if let Some(window) = app.get_webview_window("main") {
                            // 使用 toggle_wallpaper_mode 来完整恢复窗口状态
                            if IS_WALLPAPER_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_wallpaper_mode(window.clone(), None);
                            }
                            // 退出 mini 模式
                            if IS_MINI_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_mini_mode(window);
                            }
                        }
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
                                let _ = toggle_wallpaper_mode(window.clone(), None);
                            }
                            // 如果在 mini 模式，先退出
                            if IS_MINI_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_mini_mode(window.clone());
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
                // 如果在桌面背景模式，先清理窗口状态
                cleanup_wallpaper_mode(&window);
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
