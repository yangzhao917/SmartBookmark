const MessageType = {
    // 书签相关
    BOOKMARKS_UPDATED: 'BOOKMARKS_UPDATED',
    BOOKMARK_STORAGE_UPDATED: 'BOOKMARK_STORAGE_UPDATED',
    
    // tab页相关
    UPDATE_TAB_STATE: 'UPDATE_TAB_STATE',
    
    // 同步相关
    FORCE_SYNC_BOOKMARK: 'FORCE_SYNC_BOOKMARK',
    SYNC_BOOKMARK_CHANGE: 'SYNC_BOOKMARK_CHANGE', // 废弃, 云同步功能已废弃
    EXECUTE_WEBDAV_SYNC: 'EXECUTE_WEBDAV_SYNC',
    EXECUTE_CLOUD_SYNC: 'EXECUTE_CLOUD_SYNC',
    SCHEDULE_SYNC: 'SCHEDULE_SYNC',
    RESET_CLOUD_SYNC_CACHE: 'RESET_CLOUD_SYNC_CACHE',

    // 快捷键相关
    TOGGLE_SEARCH: 'TOGGLE_SEARCH',

    // 设置页相关
    SWITCH_TO_TAB: 'SWITCH_TO_TAB',
    UPDATE_DOMAINS_LIST: 'UPDATE_DOMAINS_LIST',
    SETTINGS_CHANGED: 'SETTINGS_CHANGED',

    // 主题相关
    THEME_CHANGED: 'THEME_CHANGED',

    // Background脚本对外接口
    SEARCH_BOOKMARKS: 'SEARCH_BOOKMARKS',
    GET_FULL_BOOKMARKS: 'GET_FULL_BOOKMARKS',
    SET_BOOKMARKS: 'SET_BOOKMARKS',
    REMOVE_BOOKMARKS: 'REMOVE_BOOKMARKS',
    CLEAR_BOOKMARKS: 'CLEAR_BOOKMARKS',
    UPDATE_BOOKMARKS_AND_EMBEDDING: 'UPDATE_BOOKMARKS_AND_EMBEDDING',
}

const ExternalMessageType = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    CHECK_LOGIN_STATUS: 'CHECK_LOGIN_STATUS',
}

const ScheduleSyncReason = {
    BOOKMARKS: 'bookmarks',
    SETTINGS: 'settings',
    FILTERS: 'filters',
    SERVICES: 'services',
}

const SyncStatus = {
    IDLE: 'idle',
    SYNCING: 'syncing'
}

const MAX_PINNED_SITES = 10;

// 批量嵌入向量配置
const BATCH_EMBEDDING_CONFIG = {
    // 单次请求最大文本数量（保守设置，适配所有模型）
    MAX_BATCH_SIZE: 10,
    // 估算的最大 token 数（保守估计，避免超限）
    // 对于 bge-m3 模型，实际限制是 8192 tokens
    MAX_TOTAL_TOKENS: 8192
};

// 特性开关 - 用于暂时禁用某些功能
const FEATURE_FLAGS = {
    ENABLE_LOGIN: false,        // 暂时禁用登录功能
    ENABLE_CLOUD_SYNC: false,    // 暂时禁用云同步功能
    ENABLE_BROWSER_IMPORT: false, // 暂时禁用浏览器书签批量导入功能
};