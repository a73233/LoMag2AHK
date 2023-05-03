// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(non_snake_case)]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

use std::env;
use std::fmt::Write;
use std::path::{Path, PathBuf};
use tokio::fs::{OpenOptions};
use tokio::io::AsyncWriteExt;

fn create_ahk_script(codigos: Vec<i64>, x: String, y: String, color: String) -> String {
    let capacity = 500 + (codigos.len() * 10); // Adjust capacity as needed
    let mut script = String::with_capacity(capacity);

    script.push_str("; ! represents the Alt key, ^ the Ctrl key\n\n!q:: ExitApp\n^q:: ExitApp\n\n!E:: ExitApp\n^e:: ExitApp\n\n!w:: Pause\n^w:: Pause\n\n!r:: Reload\n\n!s::\n\n");
    write!(script, "xLoc := {}\nyLoc := {}\n\n", x, y).unwrap();
    write!(script, "Codigos := [{}]\n", codigos.iter().map(ToString::to_string).collect::<Vec<String>>().join(", ")).unwrap();
    script.push_str("\nfor index, codigo in Codigos {\n\tSend, %codigo%\n\tSend, {Enter}\n\tSleep, 1500\n");
    write!(script, "\tPixelSearch, Px, Py, xLoc, yLoc, xLoc, yLoc, {}, 3, RGB", color).unwrap();
    script.push_str("\n\tif (ErrorLevel == 0) {\n\t\tSend, {Enter}\n\t}\n}");

    script
}

// async fn write_file_to_desktop(codigos: Vec<i64>, x: String, y: String, color: String) -> String {
//     let content = create_ahk_script(codigos, x, y, color);
//     let desktop_path = if cfg!(windows) {
//         let username = whoami::username();
//         format!("C:\\Users\\{}\\Desktop", username)
//     } else {
//         let home_dir = env::var("HOME").unwrap();
//         format!("{}/Desktop", home_dir)
//     };
//     let file_path = format!("{}/LoMagBarcodes.ahk", desktop_path);
//     let result = fs::write(file_path, content);
//     match result {
//         Ok(_) => "File Created on Desktop: LoMagBarcodes.ahk".to_string(),
//         Err(_) => "Error Creating File.".to_string(),
//     }
// }

#[cfg(windows)]
fn get_desktop_path() -> Option<PathBuf> {
    env::var("USERPROFILE").ok().map(|profile| PathBuf::from(profile).join("Desktop"))
}

#[cfg(not(windows))]
fn get_desktop_path() -> Option<PathBuf> {
    dirs::home_dir().map(|home_dir| home_dir.join("Desktop"))
}

#[tauri::command]
async fn write_file_to_desktop(codigos: Vec<i64>, x: String, y: String, color: String) -> String {
    let content = create_ahk_script(codigos, x, y, color);
    let desktop_path = get_desktop_path().unwrap_or_else(|| Path::new(".").to_owned());
    let file_path = desktop_path.join("LoMagBarcodes.ahk");

    // Check if the file exists
    if file_path.exists() {
        // Delete the existing file
        if let Err(err) = std::fs::remove_file(&file_path) {
            return format!("Error deleting existing file: {}", err);
        }
    }

    // Create a new file
    let mut file = match OpenOptions::new()
        .write(true)
        .create(true)
        .open(&file_path)
        .await
    {
        Ok(file) => file,
        Err(err) => return format!("Error creating file: {}", err),
    };

    // Write content to the file
    if let Err(err) = file.write_all(content.as_bytes()).await {
        return format!("Error writing content to file: {}", err);
    }

    "File Created on Desktop: LoMagBarcodes.ahk".to_string()
}


// #[tauri::command]
// fn write_config_file(path: String, contents: String) -> String {
//     if let Err(err) = std::fs::write(path, contents){
//         return format!("Error writing Config file: {}", err);
//     }
//     "Config file saved successfully".to_string()
// }

// #[tauri::command]
// fn read_config_file(path: String) -> String {
//     match std::fs::read_to_string(path) {
//         Ok(contents) => contents,
//         Err(error) => {
//             eprintln!("Error reading config file: {:?}", error);
//             String::new()  // Return an empty string or handle the error accordingly
//         }
//     }
// }

#[tauri::command]
async fn write_config_file(file: String, contents: String) -> String {
    let documents_dir = match dirs::document_dir() {
        Some(dir) => dir,
        None => return "Failed to get Documents directory".to_string(),
    };

    let config_dir = documents_dir.join("LoMag2AHK");

    if !config_dir.exists() {
        if let Err(err) = std::fs::create_dir_all(&config_dir) {
            return format!("Error creating directory: {}", err);
        }
    }

    let file_path = config_dir.join(&file);

    if let Err(err) = tokio::fs::File::create(&file_path).await {
        return format!("Error creating file: {}", err);
    }

    let absolute_path = match file_path.canonicalize() {
        Ok(path) => path,
        Err(err) => return format!("Error getting absolute path: {}", err),
    };

    if let Err(err) = tokio::fs::write(&absolute_path, contents).await {
        return format!("Error writing config file: {}", err);
    }

    "Config file saved successfully".to_string()
}

#[tauri::command]
fn read_config_file(file: String) -> String {
    let documents_dir = match dirs::document_dir() {
        Some(dir) => dir,
        None => return "Failed to get Documents directory".to_string(),
    };

    let config_dir = documents_dir.join("LoMag2AHK");
    let file_path = config_dir.join(file);

    match std::fs::read_to_string(&file_path) {
        Ok(contents) => contents,
        Err(error) => {
            eprintln!("Error reading config file: {:?}", error);
            String::new() // Return an empty string or handle the error accordingly
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![write_file_to_desktop, write_config_file, read_config_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
