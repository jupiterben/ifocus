// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
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

// 统一的应用状态结构
#[derive(Clone, serde::Serialize)]
struct AppState {
    wallpaper_mode: bool,
    mini_mode: bool,
}

impl AppState {
    fn current() -> Self {
        Self {
            wallpaper_mode: IS_WALLPAPER_MODE.load(Ordering::SeqCst),
            mini_mode: IS_MINI_MODE.load(Ordering::SeqCst),
        }
    }
}


#[cfg(windows)]
fn get_workerw() -> Option<HWND> {
    unsafe {
        let progman = FindWindowA(
            windows::core::s!("Progman"),
            None,
        ).ok()?;

        let mut _result = 0usize;
        let _ = SendMessageTimeoutA(
            progman,
            0x052C,
            windows::Win32::Foundation::WPARAM(0),
            windows::Win32::Foundation::LPARAM(0),
            SMTO_NORMAL,
            1000,
            Some(&mut _result as *mut usize),
        );

        let desktop = GetDesktopWindow();
        let mut workerw: Option<HWND> = None;
        let mut hwnd = FindWindowExA(Some(desktop), None, windows::core::s!("WorkerW"), None).ok();
        
        while let Some(h) = hwnd {
            let shelldll = FindWindowExA(Some(h), None, windows::core::s!("SHELLDLL_DefView"), None);
            if shelldll.is_ok() {
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

// 获取完整应用状态
#[tauri::command]
fn get_app_state() -> AppState {
    AppState::current()
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
fn toggle_wallpaper_mode(window: tauri::WebviewWindow, monitor_index: Option<usize>) -> Result<AppState, String> {
    #[cfg(windows)]
    {
        let is_wallpaper = IS_WALLPAPER_MODE.load(Ordering::SeqCst);
        
        if is_wallpaper {
            unsafe {
                let hwnd = window.hwnd().map_err(|e| e.to_string())?;
                let hwnd = HWND(hwnd.0 as *mut std::ffi::c_void);
                
                let _ = SetParent(hwnd, None);
                let _ = window.set_decorations(true);
                let _ = window.set_resizable(true);
                let _ = window.set_always_on_top(false);
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: 800,
                    height: 600,
                }));
                let _ = window.center();
                let _ = window.set_focus();
            }
            IS_WALLPAPER_MODE.store(false, Ordering::SeqCst);
        } else {
            if let Some(workerw) = get_workerw() {
                unsafe {
                    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
                    let hwnd = HWND(hwnd.0 as *mut std::ffi::c_void);
                    
                    let (width, height, pos_x, pos_y) = if let Some(index) = monitor_index {
                        let monitors = window
                            .available_monitors()
                            .map_err(|e| format!("无法获取显示器列表: {}", e))?;
                        let monitor = monitors.get(index).ok_or(format!("显示器索引 {} 无效", index))?;
                        let size = monitor.size();
                        let position = monitor.position();
                        (size.width, size.height, position.x, position.y)
                    } else {
                        let monitor = window
                            .primary_monitor()
                            .map_err(|e| format!("无法获取主显示器: {}", e))?
                            .ok_or("未找到主显示器".to_string())?;
                        let size = monitor.size();
                        let position = monitor.position();
                        (size.width, size.height, position.x, position.y)
                    };
                    
                    let _ = window.set_decorations(false);
                    let _ = window.set_resizable(false);
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                        width,
                        height,
                    }));
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                        x: pos_x,
                        y: pos_y,
                    }));
                    
                    let style = GetWindowLongW(hwnd, GWL_STYLE);
                    let new_style = style & !(WS_CAPTION.0 as i32 | WS_THICKFRAME.0 as i32 | WS_SYSMENU.0 as i32);
                    SetWindowLongW(hwnd, GWL_STYLE, new_style);
                    
                    let _ = SetParent(hwnd, Some(workerw));
                    
                    let mut screen_point = POINT {
                        x: pos_x,
                        y: pos_y,
                    };
                    let _ = ScreenToClient(workerw, &mut screen_point);
                    
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
            } else {
                return Err("无法找到桌面 WorkerW 窗口".to_string());
            }
        }
        
        let state = AppState::current();
        let _ = window.emit("app-state-changed", state.clone());
        Ok(state)
    }
    
    #[cfg(not(windows))]
    {
        let _ = window;
        let _ = monitor_index;
        Err("桌面背景模式仅支持 Windows".to_string())
    }
}

#[tauri::command]
fn toggle_mini_mode(window: tauri::WebviewWindow) -> Result<AppState, String> {
    let is_mini = IS_MINI_MODE.load(Ordering::SeqCst);
    
    if is_mini {
        window.set_decorations(true).map_err(|e| e.to_string())?;
        window.set_resizable(true).map_err(|e| e.to_string())?;
        window.set_always_on_top(false).map_err(|e| e.to_string())?;
        window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: 800,
            height: 600,
        })).map_err(|e| e.to_string())?;
        window.center().map_err(|e| e.to_string())?;
        IS_MINI_MODE.store(false, Ordering::SeqCst);
    } else {
        window.set_decorations(false).map_err(|e| e.to_string())?;
        window.set_resizable(false).map_err(|e| e.to_string())?;
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
        window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: 160,
            height: 35,
        })).map_err(|e| e.to_string())?;
        
        #[cfg(windows)]
        {
            unsafe {
                if let Ok(hwnd) = window.hwnd() {
                    let hwnd = HWND(hwnd.0 as *mut std::ffi::c_void);
                    let corner_preference: u32 = 2;
                    use windows::Win32::Graphics::Dwm::DWMWINDOWATTRIBUTE;
                    let _ = DwmSetWindowAttribute(
                        hwnd,
                        DWMWINDOWATTRIBUTE(33),
                        &corner_preference as *const _ as *const std::ffi::c_void,
                        std::mem::size_of::<u32>() as u32,
                    );
                }
            }
        }
        
        IS_MINI_MODE.store(true, Ordering::SeqCst);
    }
    
    let state = AppState::current();
    let _ = window.emit("app-state-changed", state.clone());
    Ok(state)
}

#[cfg(windows)]
fn cleanup_wallpaper_mode(window: &tauri::Window) {
    if IS_WALLPAPER_MODE.load(Ordering::SeqCst) {
        unsafe {
            if let Ok(hwnd) = window.hwnd() {
                let hwnd = HWND(hwnd.0 as *mut std::ffi::c_void);
                let _ = SetParent(hwnd, None);
            }
        }
        IS_WALLPAPER_MODE.store(false, Ordering::SeqCst);
    }
}

#[cfg(not(windows))]
fn cleanup_wallpaper_mode(_window: &tauri::Window) {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_app_state,
            toggle_wallpaper_mode, 
            get_available_monitors, 
            toggle_mini_mode
        ])
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let wallpaper_item = MenuItem::with_id(app, "wallpaper", "桌面背景模式", true, None::<&str>)?;
            let mini_item = MenuItem::with_id(app, "mini", "Mini 模式", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &wallpaper_item, &mini_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("iFocus")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if IS_WALLPAPER_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_wallpaper_mode(window.clone(), None);
                            }
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
                        if let Some(window) = app.get_webview_window("main") {
                            if IS_WALLPAPER_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_wallpaper_mode(window.clone(), None);
                            }
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
                            if IS_WALLPAPER_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_wallpaper_mode(window.clone(), None);
                            }
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
            if let WindowEvent::CloseRequested { api, .. } = event {
                cleanup_wallpaper_mode(&window);
                if !IS_WALLPAPER_MODE.load(Ordering::SeqCst) {
                    window.hide().unwrap();
                }
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
