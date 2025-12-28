//! Application menu configuration.

use std::sync::Mutex;
use tauri::{
    AppHandle, Runtime,
    menu::{CheckMenuItem, Menu, Submenu},
};

/// Menu item IDs for file actions.
pub const SHOW_HIDDEN_FILES_ID: &str = "show_hidden_files";
pub const OPEN_ID: &str = "open";
pub const SHOW_IN_FINDER_ID: &str = "show_in_finder";
pub const COPY_PATH_ID: &str = "copy_path";
pub const COPY_FILENAME_ID: &str = "copy_filename";
pub const GET_INFO_ID: &str = "get_info";
pub const QUICK_LOOK_ID: &str = "quick_look";

/// Context for the current menu selection.
#[derive(Clone, Default)]
pub struct MenuContext {
    pub path: String,
    pub filename: String,
}

/// Stores references to menu items and current context.
pub struct MenuState<R: Runtime> {
    pub show_hidden_files: Mutex<Option<CheckMenuItem<R>>>,
    pub context: Mutex<MenuContext>,
}

impl<R: Runtime> Default for MenuState<R> {
    fn default() -> Self {
        Self {
            show_hidden_files: Mutex::new(None),
            context: Mutex::new(MenuContext::default()),
        }
    }
}

/// Builds the application menu with default macOS items plus a custom View and File submenu enhancements.
pub fn build_menu<R: Runtime>(
    app: &AppHandle<R>,
    show_hidden_files: bool,
) -> tauri::Result<(Menu<R>, CheckMenuItem<R>)> {
    // Start with the default menu (includes app menu with Quit, Hide, etc.)
    let menu = Menu::default(app)?;

    // Add File menu items
    let open_item = tauri::menu::MenuItem::with_id(app, OPEN_ID, "Open", true, None::<&str>)?;
    let show_in_finder_item =
        tauri::menu::MenuItem::with_id(app, SHOW_IN_FINDER_ID, "Show in Finder", true, Some("Opt+Cmd+O"))?;
    let copy_path_item =
        tauri::menu::MenuItem::with_id(app, COPY_PATH_ID, "Copy path to clipboard", true, Some("Ctrl+Cmd+C"))?;
    let copy_filename_item =
        tauri::menu::MenuItem::with_id(app, COPY_FILENAME_ID, "Copy filename", true, None::<&str>)?;
    let get_info_item = tauri::menu::MenuItem::with_id(app, GET_INFO_ID, "Get info", true, Some("Cmd+I"))?;
    let quick_look_item = tauri::menu::MenuItem::with_id(app, QUICK_LOOK_ID, "Quick look", true, None::<&str>)?;

    // Find the existing File submenu and add our items to it
    for item in menu.items()? {
        if let tauri::menu::MenuItemKind::Submenu(submenu) = item
            && submenu.text()? == "File"
        {
            submenu.prepend(&tauri::menu::PredefinedMenuItem::separator(app)?)?;
            submenu.prepend(&quick_look_item)?;
            submenu.prepend(&get_info_item)?;
            submenu.prepend(&copy_filename_item)?;
            submenu.prepend(&copy_path_item)?;
            submenu.prepend(&show_in_finder_item)?;
            submenu.prepend(&open_item)?;
            break;
        }
    }

    // Create our Show Hidden Files toggle
    let show_hidden_item = CheckMenuItem::with_id(
        app,
        SHOW_HIDDEN_FILES_ID,
        "Show Hidden Files",
        true, // enabled
        show_hidden_files,
        Some("Cmd+Shift+."),
    )?;

    // Find the existing View submenu and add our item to it
    // The default menu on macOS has: App, File, Edit, View, Window, Help
    let mut found_view = false;
    for item in menu.items()? {
        if let tauri::menu::MenuItemKind::Submenu(submenu) = item
            && submenu.text()? == "View"
        {
            // Add separator then our item
            submenu.append(&tauri::menu::PredefinedMenuItem::separator(app)?)?;
            submenu.append(&show_hidden_item)?;
            found_view = true;
            break;
        }
    }

    // If View menu wasn't found (unlikely), create one
    if !found_view {
        let view_menu = Submenu::with_items(app, "View", true, &[&show_hidden_item])?;
        menu.append(&view_menu)?;
    }

    Ok((menu, show_hidden_item))
}

/// Builds a context menu for a specific file.
pub fn build_context_menu<R: Runtime>(
    app: &AppHandle<R>,
    filename: &str,
    is_directory: bool,
) -> tauri::Result<Menu<R>> {
    let menu = Menu::new(app)?;

    let open_item = tauri::menu::MenuItem::with_id(app, OPEN_ID, "Open", true, None::<&str>)?;
    let show_in_finder_item =
        tauri::menu::MenuItem::with_id(app, SHOW_IN_FINDER_ID, "Show in Finder", true, Some("Opt+Cmd+O"))?;
    let copy_path_item =
        tauri::menu::MenuItem::with_id(app, COPY_PATH_ID, "Copy path to clipboard", true, Some("Ctrl+Cmd+C"))?;
    let copy_filename_item = tauri::menu::MenuItem::with_id(
        app,
        COPY_FILENAME_ID,
        format!("Copy \"{}\"", filename),
        true,
        Some("Cmd+C"),
    )?;
    let get_info_item = tauri::menu::MenuItem::with_id(app, GET_INFO_ID, "Get info", true, Some("Cmd+I"))?;
    let quick_look_item = tauri::menu::MenuItem::with_id(app, QUICK_LOOK_ID, "Quick look", true, None::<&str>)?;

    // Add items to menu
    if !is_directory {
        menu.append(&open_item)?;
    }
    menu.append(&show_in_finder_item)?;
    menu.append(&tauri::menu::PredefinedMenuItem::separator(app)?)?;
    menu.append(&copy_filename_item)?;
    menu.append(&copy_path_item)?;
    menu.append(&tauri::menu::PredefinedMenuItem::separator(app)?)?;
    menu.append(&get_info_item)?;
    menu.append(&quick_look_item)?;

    Ok(menu)
}
