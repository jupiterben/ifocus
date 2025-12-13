use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AccessTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub scope: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubOAuthError {
    pub error: String,
    pub error_description: String,
    pub error_uri: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubUser {
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResult {
    pub token: String,
    pub user: GitHubUser,
}

// 注意：Client Secret 应该存储在环境变量中
const GITHUB_CLIENT_ID: &str = "Ov23liZpDAtVMTavdA3s";

fn get_client_secret() -> Result<String, String> {
    std::env::var("GITHUB_CLIENT_SECRET")
        .map_err(|_| "未找到 GITHUB_CLIENT_SECRET 环境变量，请在 .env 文件中配置".to_string())
}

/// 使用授权码交换访问令牌
pub async fn exchange_code_for_token(code: &str) -> Result<String, String> {
    println!("🔄 开始交换 access token，code: {}...", &code[..std::cmp::min(8, code.len())]);
    
    let client = reqwest::Client::new();
    let client_secret = get_client_secret()?;
    
    let params = [
        ("client_id", GITHUB_CLIENT_ID),
        ("client_secret", client_secret.as_str()),
        ("code", code),
    ];

    println!("📤 正在向 GitHub 发送 token 交换请求...");
    let response = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .form(&params)
        .send()
        .await
        .map_err(|e| {
            eprintln!("❌ 请求失败: {}", e);
            format!("请求失败: {}", e)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        eprintln!("❌ GitHub 返回错误状态: {}", status);
        return Err(format!("GitHub 返回错误: {}", status));
    }

    println!("📥 收到 GitHub 响应，正在解析...");
    
    // 先获取响应文本，以便在失败时查看原始内容
    let response_text = response
        .text()
        .await
        .map_err(|e| {
            eprintln!("❌ 读取响应失败: {}", e);
            format!("读取响应失败: {}", e)
        })?;
    
    println!("📄 响应内容: {}", response_text);
    
    // 尝试解析为错误响应
    if let Ok(error_response) = serde_json::from_str::<GitHubOAuthError>(&response_text) {
        eprintln!("❌ GitHub OAuth 错误: {}", error_response.error);
        eprintln!("   描述: {}", error_response.error_description);
        return Err(format!(
            "GitHub OAuth 失败: {} - {}",
            error_response.error, error_response.error_description
        ));
    }
    
    // 尝试解析为成功响应
    let token_response: AccessTokenResponse = serde_json::from_str(&response_text)
        .map_err(|e| {
            eprintln!("❌ 解析响应失败: {}", e);
            eprintln!("   响应内容: {}", response_text);
            format!("解析响应失败: {}。响应内容: {}", e, response_text)
        })?;

    println!("✅ Access token 交换成功");
    Ok(token_response.access_token)
}

/// 获取用户信息
pub async fn get_user_info(token: &str) -> Result<GitHubUser, String> {
    println!("🔄 开始获取用户信息...");
    let client = reqwest::Client::new();

    let response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("token {}", token))
        .header("User-Agent", "iFocus-App")
        .send()
        .await
        .map_err(|e| {
            eprintln!("❌ 获取用户信息请求失败: {}", e);
            format!("请求失败: {}", e)
        })?;

    if !response.status().is_success() {
        let status = response.status();
        eprintln!("❌ GitHub API 返回错误状态: {}", status);
        return Err(format!("GitHub 返回错误: {}", status));
    }

    let user: GitHubUser = response
        .json()
        .await
        .map_err(|e| {
            eprintln!("❌ 解析用户信息失败: {}", e);
            format!("解析用户信息失败: {}", e)
        })?;

    println!("✅ 用户信息获取成功: {}", user.login);
    Ok(user)
}

/// 完整的 OAuth 流程：code -> token -> user
pub async fn handle_oauth_callback(code: String) -> Result<AuthResult, String> {
    // 1. 交换 token
    let token = exchange_code_for_token(&code).await?;
    
    // 2. 获取用户信息
    let user: GitHubUser = get_user_info(&token).await?;
    
    Ok(AuthResult { token, user })
}

