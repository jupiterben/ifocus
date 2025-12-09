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
    Foundation::HWND,
    Graphics::Dwm::DwmSetWindowAttribute,
};

static IS_MINI_MODE: AtomicBool = AtomicBool::new(false);

// 统一的应用状态结构
#[derive(Clone, serde::Serialize)]
struct AppState {
    mini_mode: bool,
}

impl AppState {
    fn current() -> Self {
        Self {
            mini_mode: IS_MINI_MODE.load(Ordering::SeqCst),
        }
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

#[tauri::command]
fn toggle_mini_mode(window: tauri::WebviewWindow) -> Result<AppState, String> {
    let is_mini = IS_MINI_MODE.load(Ordering::SeqCst);
    
    if is_mini {
        // 退出 mini 模式：先清除大小限制，再恢复可调整
        window.set_min_size(Some(tauri::Size::Physical(tauri::PhysicalSize {
            width: 600,
            height: 400,
        }))).map_err(|e| e.to_string())?;
        window.set_max_size(None::<tauri::Size>).map_err(|e| e.to_string())?;
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
        // 进入 mini 模式：设置固定大小（min = max = size）
        let mini_size = tauri::Size::Physical(tauri::PhysicalSize {
            width: 200,
            height: 35,
        });
        window.set_decorations(false).map_err(|e| e.to_string())?;
        window.set_resizable(false).map_err(|e| e.to_string())?;
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
        window.set_min_size(Some(mini_size.clone())).map_err(|e| e.to_string())?;
        window.set_max_size(Some(mini_size.clone())).map_err(|e| e.to_string())?;
        window.set_size(mini_size).map_err(|e| e.to_string())?;
        
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_app_state,
            toggle_mini_mode
        ])
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let mini_item = MenuItem::with_id(app, "mini", "Mini 模式", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &mini_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("iFocus")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if IS_MINI_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_mini_mode(window.clone());
                            }
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "mini" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = toggle_mini_mode(window);
                        }
                    }
                    "quit" => {
                        if let Some(window) = app.get_webview_window("main") {
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
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
