// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod github_oauth;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};
use tracing::{info, warn, error, debug};

#[cfg(windows)]
use windows::Win32::{
    Foundation::HWND,
    Graphics::Dwm::DwmSetWindowAttribute,
};

static IS_MINI_MODE: AtomicBool = AtomicBool::new(false);

// 初始化日志系统
fn init_logging() {
    use tracing_subscriber::{fmt, prelude::*, EnvFilter};
    use tracing_appender::rolling::{RollingFileAppender, Rotation};
    
    // 获取日志目录
    let log_dir = std::env::var("IFOCUS_LOG_DIR")
        .unwrap_or_else(|_| {
            dirs::cache_dir()
                .map(|p| p.join("ifocus").join("logs").to_string_lossy().to_string())
                .unwrap_or_else(|| "./logs".to_string())
        });
    
    // 创建按天滚动的日志文件
    let file_appender = RollingFileAppender::new(
        Rotation::DAILY,
        &log_dir,
        "ifocus.log",
    );
    
    // 配置日志级别：开发模式 DEBUG，生产模式 INFO
    let env_filter = if cfg!(debug_assertions) {
        EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| EnvFilter::new("ifocus=debug,tauri=info"))
    } else {
        EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| EnvFilter::new("ifocus=info,tauri=warn"))
    };
    
    // 构建日志订阅者
    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt::layer().with_writer(std::io::stdout))  // 输出到控制台
        .with(fmt::layer().with_writer(file_appender).with_ansi(false))  // 输出到文件
        .init();
    
    info!("日志系统初始化完成，日志目录: {}", log_dir);
}

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

// GitHub OAuth 回调处理
#[tauri::command]
async fn handle_github_oauth(code: String) -> Result<github_oauth::AuthResult, String> {
    info!("开始处理 GitHub OAuth，code: {}...", &code[..std::cmp::min(8, code.len())]);
    let result = github_oauth::handle_oauth_callback(code).await;
    match &result {
        Ok(auth) => info!("GitHub OAuth 成功，用户: {}", auth.user.login),
        Err(e) => error!("GitHub OAuth 失败: {}", e),
    }
    result
}

// 获取完整应用状态
#[tauri::command]
fn get_app_state() -> AppState {
    AppState::current()
}

#[tauri::command]
fn toggle_mini_mode(window: tauri::WebviewWindow) -> Result<AppState, String> {
    let is_mini = IS_MINI_MODE.load(Ordering::SeqCst);
    debug!("切换 Mini 模式: {} -> {}", is_mini, !is_mini);
    
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
    // 初始化日志系统
    init_logging();
    
    // 加载 .env 文件（如果存在）
    dotenv::dotenv().ok();
    info!("iFocus 应用启动");
    
    let mut builder = tauri::Builder::default();
    
    // 配置单实例插件（必须在 deep-link 之前）
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            info!("检测到新实例启动，参数: {:?}, 工作目录: {:?}", argv, cwd);
            
            // deep-link 插件会自动处理 argv 中的 URL
            // 如果有 deep-link URL，会触发 deep-link://new-url 事件
            
            // 显示并聚焦主窗口
            if let Some(window) = app.get_webview_window("main") {
                debug!("显示并聚焦主窗口");
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }
    
    builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_app_state,
            toggle_mini_mode,
            handle_github_oauth
        ])
        .setup(|app| {
            info!("Deep link 插件已初始化，协议: ifocus://");
            
            // 监听 deep-link 事件（通过 DeepLinkExt trait）
            use tauri_plugin_deep_link::DeepLinkExt;
            
            app.deep_link().on_open_url(|_event| {
                // 注意：deep-link://new-url 事件会由插件自动发送到前端
                // 前端的 onOpenUrl 会接收到这个事件
                info!("收到 deep link 事件");
            });
            
            // Windows/Linux 开发模式下强制注册所有 scheme
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Err(e) = app.deep_link().register_all() {
                    error!("注册 deep-link schemes 失败: {}", e);
                } else {
                    info!("已注册所有配置的 deep-link schemes");
                }
            }
            
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let mini_item = MenuItem::with_id(app, "mini", "Mini 模式", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &mini_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("iFocus")
                .on_menu_event(|app, event| {
                    debug!("托盘菜单事件: {}", event.id.as_ref());
                    match event.id.as_ref() {
                    "show" => {
                            info!("触发显示窗口");
                        if let Some(window) = app.get_webview_window("main") {
                            if IS_MINI_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_mini_mode(window.clone());
                            }
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "mini" => {
                            info!("触发 Mini 模式切换");
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = toggle_mini_mode(window);
                        }
                    }
                    "quit" => {
                            info!("触发退出应用");
                        if let Some(window) = app.get_webview_window("main") {
                            if IS_MINI_MODE.load(Ordering::SeqCst) {
                                let _ = toggle_mini_mode(window);
                            }
                        }
                        app.exit(0);
                    }
                    _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        debug!("托盘图标左键点击");
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if IS_MINI_MODE.load(Ordering::SeqCst) {
                                debug!("退出 Mini 模式");
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
                debug!("窗口关闭请求，将窗口隐藏到托盘");
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
